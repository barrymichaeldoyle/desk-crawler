import { xpToLeave } from '@trmnl-games/engine/levels'
import { qrBase, sceneBase } from '../art/route'
import { poseFor } from '../art/scene'
import { WEATHER_WORD } from '../sim/conditions'
import { formatWeight } from '../sim/progress'
import type { AnglerStatus, BaitClass, SlowCastCatalog, TimeBand, WaterId, Weather } from '../sim/types'

/**
 * Slow Cast device payload v1 (slow-cast.md "Device"). Pure: the backend passes
 * stored facts in, and every layout reads the same flat fields. Required stats
 * are always present; optional ones are null, never zero by accident.
 */
export const PAYLOAD_VERSION = 1
/** Two missed Slow Cast ticks before the device says updates are delayed. */
export const STALE_AFTER_MS = 30 * 60 * 1000
export const MAX_STORIES = 5
/** The recap covers the last twelve hours of stories (slow-cast.md "Device"). */
export const RECAP_MS = 12 * 3_600_000
/** Stories the backend reads for the recap: a busy twelve hours is under 60 lines. */
export const MAX_RECAP_STORIES = 60

export interface PayloadAngler {
  readonly alias: string
  readonly activationState: 'pending_trmnl' | 'active'
  readonly status: AnglerStatus
  readonly quarantined: boolean
  readonly level: number
  readonly xp: number
  readonly gold: number
  readonly waterId: WaterId
  readonly travelTo?: WaterId
  readonly rodTier: number
  readonly coolerTier: number
  readonly baitOnHook?: BaitClass
  readonly bait: Readonly<Partial<Record<string, number>>>
  readonly speciesLogged: number
  /** The newest fly from the fly box, drawn on the hat; null for none. */
  readonly fly?: string | null
}

export interface PayloadStory {
  readonly kind: string
  readonly summary: string
  readonly at: number
  readonly speciesId?: string
  readonly grams?: number
}

export interface SlowCastPayloadInput {
  readonly content: SlowCastCatalog
  readonly now: number
  readonly world: { readonly lastCompletedAt?: number; readonly createdAt: number; readonly paused: boolean } | null
  /** Null when no angler is linked to this installation's account yet. */
  readonly angler: PayloadAngler | null
  readonly coolerUsed: number
  readonly weather: Weather
  readonly band: TimeBand
  readonly stories: readonly PayloadStory[]
  /** The Convex site origin that serves `/art/sc/`; null leaves image fields empty. */
  readonly artBaseUrl: string | null
  /** The seven-day board for the angler's level group, from the published set; null before the first one. */
  readonly board?: PayloadBoard | null
}

export interface PayloadBoard {
  readonly rank: number | null
  readonly cohortLabel: string
  readonly totalPlayers: number
  readonly top: ReadonlyArray<{ readonly rank: number; readonly name: string; readonly level: number; readonly score: number; readonly own: boolean }>
}

const BAND_WORD: Readonly<Record<TimeBand, string>> = { dawn: 'dawn', day: 'day', dusk: 'dusk', night: 'night' }

export function buildPayload(input: SlowCastPayloadInput) {
  const { content, now, world, angler } = input
  const stale = world !== null && now - (world.lastCompletedAt ?? world.createdAt) > STALE_AFTER_MS
  const servicePaused = world?.paused ?? false
  const conditions = `${BAND_WORD[input.band]}, ${WEATHER_WORD[input.weather]}`
  if (angler === null || angler.activationState !== 'active') {
    return {
      v: PAYLOAD_VERSION,
      game: 'slow-cast' as const,
      data_state: servicePaused ? ('service_paused' as const) : ('unlinked' as const),
      status: angler === null ? ('unlinked' as const) : ('pending' as const),
      status_label: angler === null ? 'Not set up yet' : 'Waiting for TRMNL Save',
      alias: angler?.alias ?? null,
      attention: servicePaused ? 'Slow Cast is down for maintenance.' : 'Sign in to the companion, then save this plugin in TRMNL.',
      qr: 'app' as const,
      qr_base: input.artBaseUrl && !servicePaused ? `${input.artBaseUrl}${qrBase('home')}` : '',
      scene_base: '',
      stories: [] as Array<{ kind: string; summary: string }>,
      stale: false,
    }
  }
  const water = content.waters.find((w) => w.id === angler.waterId)!
  const rod = content.rods.find((r) => r.tier === angler.rodTier)!
  const cooler = content.coolers.find((c) => c.tier === angler.coolerTier)!
  const coolerFull = input.coolerUsed >= cooler.capacity
  const travelling = angler.travelTo !== undefined
  const destination = travelling ? content.waters.find((w) => w.id === angler.travelTo)! : null
  const hook = angler.baitOnHook ? content.baits.find((b) => b.class === angler.baitOnHook) : undefined
  const hookUnits = hook ? (angler.bait[hook.class] ?? 0) : 0
  const hookUsedHere = hook !== undefined && water.baits.includes(hook.class) && hookUnits > 0
  const statusLabel = angler.status === 'paused' ? 'Rod on the rest' : destination ? `Heading to ${destination.name}` : `Casting at ${water.the}`
  let attention: string | null = null
  if (angler.quarantined || servicePaused) attention = 'Paused for a service check. Nothing is lost.'
  else if (stale) attention = 'Updates delayed. Nothing is lost.'
  else if (coolerFull) attention = 'Cooler full: sell in the companion.'
  else if (!hookUsedHere) attention = hook && hookUnits === 0 ? `Out of ${hook.name.toLowerCase()}: bare hook.` : 'Fishing a bare hook.'
  const stories = input.stories.slice(0, MAX_STORIES)
  // Twelve-hour recap: fish landed (kept or released), the heaviest, and any that got away.
  const recent = input.stories.filter((story) => now - story.at <= RECAP_MS)
  const landed = recent.filter((story) => story.kind === 'catch' || story.kind === 'release')
  const best = landed.reduce<PayloadStory | null>((top, story) => (story.grams !== undefined && (top === null || story.grams > (top.grams ?? 0)) ? story : top), null)
  const gotAway = recent.filter((story) => story.kind === 'got_away').length
  const bestName = best?.speciesId ? content.species.find((s) => s.id === best.speciesId)?.name : undefined
  const recapParts = [`${landed.length} ${landed.length === 1 ? 'fish' : 'fish'}`, ...(best && bestName && best.grams !== undefined ? [`best ${formatWeight(best.grams)} ${bestName}`] : []), ...(gotAway ? [`${gotAway} got away`] : [])]
  const recap = landed.length + gotAway > 0 ? `Last 12 hours: ${recapParts.join(', ')}` : null
  const latest = stories[0]
  const latestCatch =
    latest && (latest.kind === 'catch' || latest.kind === 'release') && latest.speciesId
      ? { species_id: latest.speciesId, name: content.species.find((s) => s.id === latest.speciesId)?.name ?? latest.speciesId, weight_label: latest.grams === undefined ? null : formatWeight(latest.grams) }
      : null
  const toNext = xpToLeave(angler.level)
  const status = angler.status === 'paused' ? ('paused' as const) : travelling ? ('travelling' as const) : ('fishing' as const)
  const pose = poseFor(status, latest?.kind ?? null)
  const scene = sceneBase({ water: (destination ?? water).id, band: input.band, weather: input.weather, pose, fish: latestCatch?.species_id ?? null, fly: angler.fly ?? null })
  return {
    v: PAYLOAD_VERSION,
    game: 'slow-cast' as const,
    data_state: angler.quarantined || servicePaused ? ('service_paused' as const) : ('ready' as const),
    status,
    status_label: statusLabel,
    conditions_label: conditions,
    weather: input.weather,
    band: input.band,
    alias: angler.alias,
    level: angler.level,
    xp: angler.xp,
    xp_to_next: toNext,
    xp_pct: Math.min(100, Math.floor((angler.xp / toNext) * 100)),
    gold: angler.gold,
    water_id: water.id,
    water_name: water.name,
    rod_name: rod.name,
    cooler_used: input.coolerUsed,
    cooler_capacity: cooler.capacity,
    cooler_full: coolerFull,
    cooler_label: `${input.coolerUsed}/${cooler.capacity}`,
    bait_label: hookUsedHere ? `${hook!.name} ${hookUnits}` : 'Bare hook',
    species_logged: angler.speciesLogged,
    species_total: content.species.length,
    stories: stories.map((s) => ({ kind: s.kind, summary: s.summary })),
    recap,
    // The board shows the group's first rows; an angler outside them gets its own row appended.
    board: input.board
      ? {
          label: `${input.board.cohortLabel}, 7 days`,
          rank_label: input.board.rank === null ? 'Ranked at the next hourly update' : `#${input.board.rank} of ${input.board.totalPlayers}`,
          rows: [
            ...input.board.top.map((row) => ({ rank: row.rank, name: row.name, level: row.level, score: row.score, own: row.own })),
            ...(input.board.rank !== null && !input.board.top.some((row) => row.own) ? [{ rank: input.board.rank, name: angler.alias, level: angler.level, score: null, own: true }] : []),
          ],
        }
      : null,
    latest_catch: latestCatch,
    attention,
    // A full cooler sends the code to the cooler page; otherwise to the dock.
    qr: coolerFull ? ('cooler' as const) : ('app' as const),
    qr_base: input.artBaseUrl ? `${input.artBaseUrl}${qrBase(coolerFull ? 'cooler' : 'home')}` : '',
    qr_label: coolerFull ? 'Sell your catch' : 'Your dock',
    scene_base: input.artBaseUrl ? `${input.artBaseUrl}${scene}` : '',
    stale,
  }
}

export type SlowCastPayload = ReturnType<typeof buildPayload>
