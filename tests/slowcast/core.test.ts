import { describe, expect, it } from 'vitest'
import { contentV1 } from '@trmnl-games/slow-cast/content'
import { activeBait, bitePermille, candidates, simulateAngler, starterAngler, waterOf, type AnglerState, type CastInput, type StreamSeeds } from '@trmnl-games/slow-cast/sim'
import { articleFor, formatWeight, fishValue } from '@trmnl-games/slow-cast/sim/progress'
import { localHour, timeBand, effectiveBands } from '@trmnl-games/slow-cast/sim/conditions'
import { buyBait, buyRod, canFish, sell, travel, tubsThatFit } from '@trmnl-games/slow-cast/sim/shop'
import { deriveAnglerSeeds, forecast } from '@trmnl-games/slow-cast/sim/seed'

const content = contentV1
const DAWN = Date.UTC(2026, 9, 10, 6, 0)
const NOON = Date.UTC(2026, 9, 10, 12, 0)
const MIDNIGHT = Date.UTC(2026, 9, 10, 0, 0)

function input(overrides: Partial<CastInput> = {}, angler: Partial<AnglerState> = {}): CastInput {
  return {
    angler: { ...starterAngler(content, 0), ...angler },
    coolerCount: 0,
    tick: 10,
    tickAt: NOON,
    weather: 'clear',
    content,
    streams: deriveAnglerSeeds('seed', 'angler', 10, 1),
    ...overrides,
  }
}

/** Find seeds that make the given stream outcome happen, by scanning ticks deterministically. */
function seedsWhere(predicate: (streams: StreamSeeds) => boolean, base = 'angler'): StreamSeeds {
  for (let tick = 1; tick < 20_000; tick += 1) {
    const streams = deriveAnglerSeeds('seed', base, tick, 1)
    if (predicate(streams)) return streams
  }
  throw new Error('no seed found')
}

describe('conditions', () => {
  it('reads time bands from the local hour', () => {
    expect(timeBand(localHour(DAWN, undefined), content)).toBe('dawn')
    expect(timeBand(localHour(NOON, undefined), content)).toBe('day')
    expect(timeBand(17, content)).toBe('dusk')
    expect(timeBand(4, content)).toBe('night')
    // UTC 03:00 is 06:00 at +3 hours.
    expect(timeBand(localHour(Date.UTC(2026, 9, 10, 3), 3 * 3600), content)).toBe('dawn')
  })

  it('lets fog bring night fish out at dawn and dusk', () => {
    expect(effectiveBands('dawn', 'fog')).toEqual(['dawn', 'night'])
    expect(effectiveBands('day', 'fog')).toEqual(['day'])
  })

  it('shares one forecast per water and block', () => {
    const pond = waterOf(content, 'millpond')
    expect(forecast('w', pond, NOON)).toBe(forecast('w', pond, NOON + 60 * 60_000))
    const weathers = new Set(Array.from({ length: 200 }, (_, block) => forecast('w', pond, block * 6 * 3_600_000)))
    expect([...weathers].sort()).toEqual(['clear', 'fog', 'overcast', 'rain'])
  })
})

describe('the cast', () => {
  it('is deterministic for the same seeds', () => {
    expect(simulateAngler(input())).toEqual(simulateAngler(input()))
  })

  it('uses one bait for a kept fish, none for a quiet cast, and fishes a bare hook once the tub is empty', () => {
    const quiet = seedsWhere((st) => simulateAngler(input({ streams: st })).event?.kind !== 'catch' && simulateAngler(input({ streams: st })).angler.counters.bites === 0)
    expect(simulateAngler(input({ streams: quiet }, { bait: { worms: 5 } })).angler.bait.worms).toBe(5)
    const kept = seedsWhere((st) => simulateAngler(input({ streams: st })).event?.kind === 'catch')
    const result = simulateAngler(input({ streams: kept }, { bait: { worms: 1 } }))
    expect(result.angler.bait.worms).toBe(0)
    expect(result.extraEvents?.map((e) => e.kind)).toContain('bait_out')
    expect(result.angler.counters.baitRunOuts).toBe(1)
    expect(activeBait(result.angler, waterOf(content, 'millpond'))).toBeUndefined()
  })

  it('leaves the bait on the hook when a fish goes back from a full cooler', () => {
    const kept = seedsWhere((st) => simulateAngler(input({ streams: st })).event?.kind === 'catch')
    const released = simulateAngler(input({ streams: kept, coolerCount: 6 }, { bait: { worms: 3 } }))
    expect(released.event?.kind).toBe('release')
    expect(released.angler.bait.worms).toBe(3)
  })

  it('treats a bait the water does not use as a bare hook and keeps it', () => {
    const result = simulateAngler(input({}, { baitOnHook: 'ragworm', bait: { ragworm: 24 } }))
    expect(result.angler.bait.ragworm).toBe(24)
  })

  it('scales the bite chance by time, weather, rod and bait', () => {
    const pond = waterOf(content, 'millpond')
    expect(bitePermille(content, pond, 1, 'worms', { band: 'day', weather: 'clear' })).toBe(130)
    expect(bitePermille(content, pond, 1, 'worms', { band: 'dawn', weather: 'overcast' })).toBe(185)
    expect(bitePermille(content, pond, 4, 'worms', { band: 'day', weather: 'clear' })).toBe(149)
    expect(bitePermille(content, pond, 1, undefined, { band: 'day', weather: 'clear' })).toBe(52)
  })

  it('filters species by bait, time and weather', () => {
    const pond = waterOf(content, 'millpond')
    const ids = (band: 'dawn' | 'day' | 'night', weather: 'clear' | 'rain', bait?: 'bread' | 'worms') => candidates(content, pond, bait, { band, weather }).map(([s]) => s.id)
    expect(ids('dawn', 'clear', 'bread')).toContain('golden_carp')
    expect(ids('dawn', 'rain', 'bread')).not.toContain('golden_carp')
    expect(ids('night', 'clear', 'worms')).toContain('eel')
    expect(ids('day', 'clear', 'worms')).not.toContain('eel')
    expect(ids('day', 'clear')).toEqual(['minnow', 'roach'])
  })

  it('lands a fish into the cooler with logbook and story', () => {
    const streams = seedsWhere((s) => {
      const r = simulateAngler(input({ streams: s }))
      return r.event?.kind === 'catch'
    })
    const result = simulateAngler(input({ streams }))
    expect(result.catch).toMatchObject({ caughtTick: 10 })
    expect(result.event?.deltas).toEqual({ gold: 0 })
    expect(result.event?.summary).toMatch(/^An? .+ took the worm in the day\. First .+ in the logbook\.$/)
    expect(result.angler.logbook[result.catch!.speciesId]).toMatchObject({ count: 1, firstTick: 10 })
    expect(result.angler.counters).toMatchObject({ fishCaught: 1, bites: 1, casts: 1 })
  })

  it('releases a landed fish when the cooler is full, still counting it in the logbook', () => {
    const streams = seedsWhere((s) => simulateAngler(input({ streams: s })).event?.kind === 'catch')
    const result = simulateAngler(input({ streams, coolerCount: 6 }))
    expect(result.catch).toBeUndefined()
    expect(result.event?.kind).toBe('release')
    expect(result.event?.summary).toMatch(/^Cooler full\. Released an? .+\./)
    expect(result.angler.logbook[result.event!.detail.speciesId!]).toMatchObject({ count: 1 })
    expect(result.angler.counters.released).toBe(1)
    expect(result.metrics).toMatchObject({ landed: 1, released: 1 })
  })

  it('lets a fish heavier than the rod get away with no reward', () => {
    // Carp at dawn on bread reach 12 kg; the Cane Rod lands 1.5 kg.
    const streams = seedsWhere((s) => simulateAngler(input({ streams: s, tickAt: DAWN }, { baitOnHook: 'bread', bait: { bread: 24 } })).event?.kind === 'got_away')
    const result = simulateAngler(input({ streams, tickAt: DAWN }, { baitOnHook: 'bread', bait: { bread: 24 } }))
    expect(result.event).toMatchObject({ kind: 'got_away', deltas: { gold: 0 } })
    expect(result.catch).toBeUndefined()
    expect(result.angler.counters.gotAway).toBe(1)
  })

  it('writes an ambient line on every fourth quiet tick', () => {
    let angler = starterAngler(content, 0)
    const kinds: Array<string | undefined> = []
    for (let tick = 1; kinds.filter((k) => k === 'ambient').length < 2 && tick < 500; tick += 1) {
      const result = simulateAngler({ ...input(), angler: { ...angler, bait: { worms: 50 } }, tick, streams: deriveAnglerSeeds('seed', 'quiet', tick, 1) })
      if (result.event === undefined || result.event.kind === 'ambient') kinds.push(result.event?.kind)
      else kinds.length = 0
      angler = result.angler
    }
    expect(kinds.slice(0, 4)).toEqual([undefined, undefined, undefined, 'ambient'])
  })

  it('travels for a whole tick without casting', () => {
    const result = simulateAngler(input({}, { travelTo: 'river_bend', access: ['waders'] }))
    expect(result).toMatchObject({ disposition: 'travelled', angler: { waterId: 'river_bend' }, event: { kind: 'travel', summary: 'You set up on the bank at River Bend.' } })
    expect(result.angler.travelTo).toBeUndefined()
    expect(result.angler.counters).toMatchObject({ casts: 0, trips: 1 })
  })

  it('does nothing while paused', () => {
    const result = simulateAngler(input({}, { status: 'paused' }))
    expect(result.disposition).toBe('paused')
    expect(result.event).toBeUndefined()
  })

  it('announces a title and a water opening when a new species fills the logbook gate', () => {
    // Five Millpond species logged: the next new one makes six, River Bend's gate (the title came at four).
    const known = { minnow: { count: 1, bestGrams: 20, firstTick: 1 }, rudd: { count: 1, bestGrams: 60, firstTick: 1 }, perch: { count: 1, bestGrams: 200, firstTick: 1 }, bream: { count: 1, bestGrams: 400, firstTick: 1 }, tench: { count: 1, bestGrams: 900, firstTick: 1 } }
    const streams = seedsWhere((s) => {
      const r = simulateAngler(input({ streams: s }, { logbook: known }))
      return r.event?.kind === 'catch' && r.event.detail.firstOfSpecies === true
    })
    const result = simulateAngler(input({ streams }, { logbook: known }))
    const milestones = result.extraEvents?.filter((e) => e.kind === 'milestone').map((e) => e.summary)
    expect(milestones).toEqual(['6 Millpond species logged. River Bend is open with the Waders.'])
  })

  it('names the title earned by the fourth species', () => {
    const known = { minnow: { count: 1, bestGrams: 20, firstTick: 1 }, rudd: { count: 1, bestGrams: 60, firstTick: 1 }, perch: { count: 1, bestGrams: 200, firstTick: 1 } }
    const streams = seedsWhere((s) => {
      const r = simulateAngler(input({ streams: s }, { logbook: known }))
      return r.event?.kind === 'catch' && r.event.detail.firstOfSpecies === true
    })
    const result = simulateAngler(input({ streams }, { logbook: known }))
    expect(result.extraEvents?.find((e) => e.kind === 'milestone')?.summary).toBe('Now a Regular, with 4 species in the logbook.')
  })
})

describe('shop and setup', () => {
  it('buys the next rod only with enough gold', () => {
    const angler = starterAngler(content, 0)
    expect(buyRod(content, angler)).toEqual({ ok: false, code: 'NOT_ENOUGH_GOLD' })
    expect(buyRod(content, { ...angler, gold: 250 })).toMatchObject({ ok: true, spent: 250, angler: { rodTier: 2, gold: 0 } })
  })

  it('caps each bait at 72 units', () => {
    const angler = { ...starterAngler(content, 0), gold: 1000 }
    expect(tubsThatFit(content, angler, 'worms')).toBe(5)
    expect(buyBait(content, angler, 'worms', 6)).toEqual({ ok: false, code: 'BAIT_FULL' })
    expect(buyBait(content, angler, 'worms', 5)).toMatchObject({ ok: true, spent: 125, angler: { bait: { worms: 72 } } })
  })

  it('needs both the logbook gate and the access item to travel', () => {
    const angler = starterAngler(content, 0)
    const five = Object.fromEntries(['minnow', 'roach', 'rudd', 'perch', 'bream', 'tench'].map((id) => [id, { count: 1, bestGrams: 100, firstTick: 1 }]))
    expect(travel(content, angler, 'river_bend')).toEqual({ ok: false, code: 'LOCKED' })
    expect(canFish(content, { logbook: five, access: [], waterId: 'millpond' }, 'river_bend')).toBe(false)
    expect(canFish(content, { logbook: {}, access: ['waders'], waterId: 'millpond' }, 'river_bend')).toBe(false)
    expect(travel(content, { ...angler, logbook: five, access: ['waders'] }, 'river_bend')).toMatchObject({ ok: true, angler: { travelTo: 'river_bend' } })
    // An angler who already fished River Bend keeps it, whatever the Millpond count.
    expect(canFish(content, { logbook: { chub: { count: 1, bestGrams: 300, firstTick: 1 } }, access: ['waders'], waterId: 'millpond' }, 'river_bend')).toBe(true)
    expect(travel(content, angler, 'millpond')).toEqual({ ok: false, code: 'SAME_WATER' })
  })

  it('switches to a held bait the destination takes when the chosen one does not work there', () => {
    const five = Object.fromEntries(['minnow', 'roach', 'rudd', 'perch', 'bream', 'tench'].map((id) => [id, { count: 1, bestGrams: 100, firstTick: 1 }]))
    const angler = { ...starterAngler(content, 0), logbook: five, access: ['waders' as const] }
    expect(travel(content, { ...angler, baitOnHook: 'bread', bait: { bread: 12, maggots: 24, spinner: 72 } }, 'river_bend')).toMatchObject({ ok: true, angler: { baitOnHook: 'spinner' } })
    expect(travel(content, { ...angler, baitOnHook: 'worms', bait: { worms: 12, maggots: 24 } }, 'river_bend')).toMatchObject({ ok: true, angler: { baitOnHook: 'worms' } })
    expect(travel(content, { ...angler, baitOnHook: 'worms', bait: { worms: 0, maggots: 24 } }, 'river_bend')).toMatchObject({ ok: true, angler: { baitOnHook: 'maggots' } })
    expect(travel(content, { ...angler, baitOnHook: 'bread', bait: { bread: 12 } }, 'river_bend')).toMatchObject({ ok: true, angler: { baitOnHook: 'bread' } })
  })

  it('sells for the summed value and counts it', () => {
    expect(sell(starterAngler(content, 0), [5, 7])).toMatchObject({ gold: 12, counters: { goldEarned: 12, fishSold: 2 } })
  })
})

describe('presentation', () => {
  it('formats weights and their articles', () => {
    expect(formatWeight(640)).toBe('640 g')
    expect(formatWeight(1449)).toBe('1.4 kg')
    expect(articleFor('8.0 kg')).toBe('An')
    expect(articleFor('11.2 kg')).toBe('An')
    expect(articleFor('800 g')).toBe('An')
    expect(articleFor('1.4 kg')).toBe('A')
    expect(fishValue(10, 3500, 3500)).toBe(20)
  })
})
