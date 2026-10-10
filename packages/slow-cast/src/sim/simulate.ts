import { createRng, pickOne, pickWeighted, type Rng } from '@trmnl-games/engine/rng'
import { BAND_PHRASE, effectiveBands, localHour, timeBand } from './conditions'
import { applyXp, articleFor, fishValue, fishXp, formatWeight } from './progress'
import type { AnglerCounters, AnglerState, BaitClass, CastInput, CastResult, Conditions, SlowCastCatalog, SpeciesDef, TickEvent, WaterDef } from './types'

/**
 * The Slow Cast pure core (slow-cast.md "The cast"). One evaluation per eligible
 * tick, in a fixed order: conditions, bite, species, weight, landing, logbook and
 * XP, cooler, bait. Pure: no clock, no network, no storage; the adapter passes
 * the wall slot, offset, weather and stream seeds in. A kept fish or one that
 * gets away uses one unit of bait; a quiet cast or a release uses none.
 *
 * Draw order (part of the simulation version): `bite` draws once per cast;
 * `species` draws once after a bite; `size` draws once after a species;
 * `narrative` draws only to pick an ambient line.
 */
export const SIMULATION_VERSION = 1

export class SlowCastInvariantError extends Error {
  constructor(readonly code: string, message: string) {
    super(message)
  }
}

export function waterOf(content: SlowCastCatalog, id: string): WaterDef {
  const water = content.waters.find((w) => w.id === id)
  if (!water) throw new SlowCastInvariantError('UNKNOWN_WATER', `unknown water ${id}`)
  return water
}

export function rodOf(content: SlowCastCatalog, tier: number) {
  const rod = content.rods.find((r) => r.tier === tier)
  if (!rod) throw new SlowCastInvariantError('UNKNOWN_ROD', `unknown rod tier ${tier}`)
  return rod
}

export function coolerOf(content: SlowCastCatalog, tier: number) {
  const cooler = content.coolers.find((c) => c.tier === tier)
  if (!cooler) throw new SlowCastInvariantError('UNKNOWN_COOLER', `unknown cooler tier ${tier}`)
  return cooler
}

export function baitOf(content: SlowCastCatalog, cls: BaitClass) {
  const bait = content.baits.find((b) => b.class === cls)
  if (!bait) throw new SlowCastInvariantError('UNKNOWN_BAIT', `unknown bait ${cls}`)
  return bait
}

/** The bait actually on the hook at this water: the chosen class, if the water takes it and the tub is not empty. */
export function activeBait(angler: Pick<AnglerState, 'baitOnHook' | 'bait'>, water: WaterDef): BaitClass | undefined {
  const chosen = angler.baitOnHook
  if (chosen === undefined || !water.baits.includes(chosen)) return undefined
  return (angler.bait[chosen] ?? 0) > 0 ? chosen : undefined
}

/** Bite chance in permille for these conditions (each multiplier a whole percent, floored once at the end). */
export function bitePermille(content: SlowCastCatalog, water: WaterDef, rodTier: number, bait: BaitClass | undefined, conditions: Conditions): number {
  const rod = rodOf(content, rodTier)
  const baitPercent = bait === undefined ? content.bareHookPercent : 100
  return Math.floor((water.biteBasePermille * water.timePercent[conditions.band] * water.weatherPercent[conditions.weather] * (100 + rod.biteBonusPercent) * baitPercent) / 100 ** 4)
}

/** Species that could take this cast, with their draw weights. */
export function candidates(content: SlowCastCatalog, water: WaterDef, bait: BaitClass | undefined, conditions: Conditions): Array<readonly [SpeciesDef, number]> {
  const bands = effectiveBands(conditions.band, conditions.weather)
  return content.species
    .filter((s) => s.water === water.id)
    .filter((s) => (bait === undefined ? s.anyBait === true : s.baits.includes(bait)))
    .filter((s) => s.times === undefined || s.times.some((t) => bands.includes(t)))
    .filter((s) => s.weather === undefined || s.weather.includes(conditions.weather))
    .map((s) => [s, s.weight ?? content.rarityWeights[s.rarity]] as const)
}

/** Skewed weight: most fish in the lower third of the range, a long tail to the maximum. One draw. */
export function drawGrams(rng: Rng, species: SpeciesDef): number {
  const u = rng.next()
  return species.minGrams + Math.floor((species.maxGrams - species.minGrams) * u * u)
}

const NO_METRICS = { landed: 0, released: 0, gotAway: 0, levelUps: 0 } as const

function bump(counters: AnglerCounters, patch: Partial<Record<keyof AnglerCounters, number>>): AnglerCounters {
  const next = { ...counters } as Record<keyof AnglerCounters, number>
  for (const [key, add] of Object.entries(patch) as Array<[keyof AnglerCounters, number]>) next[key] = (next[key] ?? 0) + add
  return next
}

export function conditionsAt(input: Pick<CastInput, 'tickAt' | 'utcOffsetSeconds' | 'weather' | 'content'>): Conditions {
  return { band: timeBand(localHour(input.tickAt, input.utcOffsetSeconds), input.content), weather: input.weather }
}

export function simulateAngler(input: CastInput): CastResult {
  const { content, tick } = input
  let angler = input.angler
  const conditions = conditionsAt(input)

  if (angler.status === 'paused') return { angler, conditions, metrics: NO_METRICS, disposition: 'paused' }

  // Travel takes the whole tick: arrive, no cast (slow-cast.md "Waters").
  if (angler.travelTo !== undefined) {
    const to = waterOf(content, angler.travelTo)
    const { travelTo: _drop, ...rest } = angler
    angler = { ...rest, waterId: to.id, quietTicks: 0, counters: bump(angler.counters, { trips: 1 }) }
    const event: TickEvent = { kind: 'travel', summary: `You set up on the bank at ${to.the}.`.replace('on the bank at the Harbour Pier', 'at the end of the Harbour Pier'), detail: { waterId: to.id }, deltas: { xpEarned: 0, gold: 0 } }
    return { angler, event, conditions, metrics: NO_METRICS, disposition: 'travelled' }
  }

  const water = waterOf(content, angler.waterId)
  const bait = activeBait(angler, water)
  const extraEvents: TickEvent[] = []

  angler = { ...angler, counters: bump(angler.counters, { casts: 1 }) }

  const biteRng = createRng(input.streams.bite)
  const bit = biteRng.int(1, 1000) <= bitePermille(content, water, angler.rodTier, bait, conditions)
  const pool = bit ? candidates(content, water, bait, conditions) : []
  if (pool.length === 0) {
    // Quiet: every Nth quiet tick writes one ambient line so the story never goes stale for long.
    const quietTicks = angler.quietTicks + 1
    angler = { ...angler, quietTicks: quietTicks % content.ambientEvery }
    const event: TickEvent | undefined =
      quietTicks % content.ambientEvery === 0
        ? { kind: 'ambient', summary: pickOne(createRng(input.streams.narrative), content.ambient[water.id]), detail: { waterId: water.id, ...conditions }, deltas: { xpEarned: 0, gold: 0 } }
        : undefined
    return { angler, ...(event ? { event } : {}), ...(extraEvents.length ? { extraEvents } : {}), conditions, metrics: NO_METRICS, disposition: 'cast' }
  }

  angler = { ...angler, quietTicks: 0, counters: bump(angler.counters, { bites: 1 }) }
  const species = pickWeighted(createRng(input.streams.species), pool)
  const grams = drawGrams(createRng(input.streams.size), species)
  const rod = rodOf(content, angler.rodTier)
  const capacity = coolerOf(content, angler.coolerTier).capacity
  const kept = input.coolerCount < capacity
  const escapes = grams > rod.limitGrams
  // Bait: a fish that is kept or gets away takes one unit; a fish released from a full cooler leaves it on
  // the hook, so an angler between visits spends nothing (S1 change from the spec's per-cast use).
  if (bait !== undefined && (kept || escapes)) {
    const left = (angler.bait[bait] ?? 0) - 1
    angler = { ...angler, bait: { ...angler.bait, [bait]: left } }
    if (left === 0) {
      angler = { ...angler, counters: bump(angler.counters, { baitRunOuts: 1 }) }
      extraEvents.push({ kind: 'bait_out', summary: `The ${baitOf(content, bait).name.toLowerCase()} ran out. Fishing a bare hook.`, detail: { bait }, deltas: { xpEarned: 0, gold: 0 } })
    }
  }
  const baitPhrase = bait === undefined ? 'a bare hook' : baitOf(content, bait).the

  if (escapes) {
    angler = { ...angler, counters: bump(angler.counters, { gotAway: 1 }) }
    const event: TickEvent = { kind: 'got_away', summary: `Something heavy took ${baitPhrase} and kept going.`, detail: { speciesId: species.id, grams, waterId: water.id, ...conditions }, deltas: { xpEarned: 0, gold: 0 } }
    return { angler, event, ...(extraEvents.length ? { extraEvents } : {}), conditions, metrics: { ...NO_METRICS, gotAway: 1 }, disposition: 'cast' }
  }

  // Landed: logbook, XP and level, then the cooler or a release.
  const previous = angler.logbook[species.id]
  const record = previous !== undefined && grams > previous.bestGrams
  const firstOfSpecies = previous === undefined
  angler = {
    ...angler,
    logbook: { ...angler.logbook, [species.id]: { count: (previous?.count ?? 0) + 1, bestGrams: Math.max(previous?.bestGrams ?? 0, grams), firstTick: previous?.firstTick ?? tick } },
    counters: bump(angler.counters, {
      fishCaught: 1,
      rareCaught: species.rarity === 'rare' || species.rarity === 'epic' ? 1 : 0,
      epicCaught: species.rarity === 'epic' ? 1 : 0,
      nightCatches: conditions.band === 'night' ? 1 : 0,
    }),
  }
  if (grams > angler.counters.heaviestGrams) angler = { ...angler, counters: { ...angler.counters, heaviestGrams: grams } }
  const xpEarned = fishXp(species.xp, grams, species.maxGrams)
  const levelled = applyXp(angler.level, angler.xp, xpEarned)
  angler = { ...angler, level: levelled.level, xp: levelled.xp, lifetimeXp: angler.lifetimeXp + xpEarned, ...(levelled.levelsGained > 0 ? { lastLevelUpTick: tick } : {}) }

  const value = fishValue(species.price, grams, species.maxGrams)
  const weight = formatWeight(grams)
  const lead = `${articleFor(weight)} ${weight} ${species.name}`
  const tail = record ? ' A new personal best.' : firstOfSpecies ? ` First ${species.name} in the logbook.` : ''
  const detail = { speciesId: species.id, grams, value, record, firstOfSpecies, waterId: water.id, ...(bait ? { bait } : {}), ...conditions }
  let event: TickEvent
  let catchRecord
  if (kept) {
    catchRecord = { speciesId: species.id, grams, value, caughtTick: tick }
    event = { kind: 'catch', summary: `${lead} took ${baitPhrase} ${BAND_PHRASE[conditions.band]}.${tail}`, detail, deltas: { xpEarned, gold: 0 } }
  } else {
    angler = { ...angler, counters: bump(angler.counters, { released: 1 }) }
    event = { kind: 'release', summary: `Cooler full. Released ${lead.charAt(0).toLowerCase()}${lead.slice(1)}.${tail}`, detail, deltas: { xpEarned, gold: 0 } }
  }
  if (levelled.levelsGained > 0) extraEvents.push(levelUpEvent(content, levelled.level))
  return {
    angler,
    ...(catchRecord ? { catch: catchRecord } : {}),
    event,
    ...(extraEvents.length ? { extraEvents } : {}),
    conditions,
    metrics: { landed: 1, released: kept ? 0 : 1, gotAway: 0, levelUps: levelled.levelsGained },
    disposition: 'cast',
  }
}

function levelUpEvent(content: SlowCastCatalog, level: number): TickEvent {
  const opens = content.waters.find((w) => w.unlockLevel === level)
  const access = opens?.access ? content.access.find((a) => a.id === opens.access) : undefined
  const tail = opens ? (access ? ` ${opens.name} is open with the ${access.name}.` : ` ${opens.name} is open.`) : ''
  return { kind: 'levelup', summary: `Level ${level}.${tail}`, detail: { level }, deltas: { xpEarned: 0, gold: 0 } }
}
