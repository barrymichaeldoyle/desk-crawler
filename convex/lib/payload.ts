/**
 * Canonical TRMNL payload v1 (trmnl.md). Pure mapping: no reads, clocks, RNG or
 * writes. The caller supplies `now` and already-authorized, bounded inputs.
 */
import type { ContentCatalog } from '../sim/core/types'
import { maxHp, xpToLeave } from '../sim/core/stats'

export const STALE_AFTER_MS = 30 * 60 * 1000
const MAX_LOGS = 6

export interface PayloadWorld {
  readonly currentTick: number
  readonly lastCompletedTick?: number
  readonly lastCompletedAt?: number
  readonly createdAt: number
  readonly ticksPaused: boolean
  readonly maintenanceMode: boolean
}

export interface PayloadHero {
  readonly name: string
  readonly level: number
  readonly xp: number
  readonly hp: number
  readonly gold: number
  readonly status: 'exploring' | 'resting' | 'travelling' | 'dead' | 'paused' | 'sleeping'
  readonly biomeId: string
  readonly targetBiomeId?: string
  readonly arriveAtTick?: number
  readonly reviveAtTick?: number
  readonly wakeAtTick?: number
  readonly lastTick: number
  readonly lastAdvancedAt?: number
  readonly quarantined: boolean
}

export interface PayloadInput {
  readonly now: number
  readonly world: PayloadWorld | null
  readonly ownerAlias: string | null
  readonly timezone: string
  /** Null for no activated hero (including pending setup): the privacy-safe unlinked payload. */
  readonly hero: PayloadHero | null
  readonly weaponName: string | null
  readonly armorName: string | null
  readonly potions: number
  readonly bagUsed: number
  readonly bagCapacity: number
  readonly heldItemName: string | null
  readonly logs: ReadonlyArray<{ readonly at: number; readonly kind: string; readonly summary: string }>
  readonly instanceName: string | null
  readonly content: ContentCatalog
  readonly spriteBaseUrl: string | null
}

const iso = (timestamp: number) => new Date(timestamp).toISOString().replace(/\.\d{3}Z$/, 'Z')
const clampPct = (value: number) => Math.max(0, Math.min(100, value))

/** Local "DD Mon HH:mm" plus numeric offset ("UTC+02:00"); falls back to UTC for unknown zones. */
export function formatLocal(timestamp: number, timeZone: string): { label: string; offset: string } {
  const format = (zone: string) => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'longOffset',
    }).formatToParts(new Date(timestamp))
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
    const zoneName = get('timeZoneName').replace('GMT', '')
    return { label: `${get('day')} ${get('month')} ${get('hour')}:${get('minute')}`, offset: `UTC${zoneName === '' ? '+00:00' : zoneName}` }
  }
  try {
    return format(timeZone)
  } catch {
    return format('UTC')
  }
}

const sanitizeLabel = (raw: string | null, max: number, fallback: string) => {
  const cleaned = (raw ?? '').normalize('NFC').replace(/[^\p{L}\p{N} ._'()&-]/gu, '').trim()
  return cleaned === '' ? fallback : [...cleaned].slice(0, max).join('')
}

export function buildPayload(input: PayloadInput) {
  const { now, world, hero, content } = input
  const biomeName = (id: string | undefined) => content.biomes.find((b) => b.id === id)?.name ?? ''
  const lastCompletedAt = world?.lastCompletedAt
  const stale = world === null ? false : now - (lastCompletedAt ?? world.createdAt) > STALE_AFTER_MS
  const servicePaused = world !== null && (world.ticksPaused || world.maintenanceMode)
  const gameAsOf = lastCompletedAt === undefined ? null : formatLocal(lastCompletedAt, input.timezone)
  const logs = input.logs.slice(0, MAX_LOGS).map((log) => ({ at: iso(log.at), t: formatLocal(log.at, input.timezone).label, k: log.kind, s: log.summary }))

  const common = {
    v: 1 as const,
    generated_at: iso(now),
    tick: world?.currentTick ?? 0,
    last_completed_tick: world?.lastCompletedTick ?? null,
    last_completed_at: lastCompletedAt === undefined ? null : iso(lastCompletedAt),
    stale,
    plugin_instance_name: sanitizeLabel(input.instanceName, 40, 'Desk Crawler'),
    game_as_of_label: gameAsOf ? `${gameAsOf.label} ${gameAsOf.offset}` : 'Awaiting first game tick',
    // Ranking arrives with A06; until then the coherent empty state.
    rank: null,
    rank_delta: null,
    rank_status: 'awaiting' as const,
    leaderboard_board: 'recent_7d' as const,
    leaderboard_cohort: null,
    leaderboard_cohort_label: '',
    leaderboard_score: null,
    leaderboard_window_start: null,
    leaderboard_window_end: null,
    leaderboard_tick: null,
    leaderboard_built_at: null,
    total_players: 0,
    global_total_players: 0,
    top5: [] as Array<{ rank: number; name: string; hero_name: string; level: number; class: string; score: number }>,
    leaderboard_as_of_label: 'Ranking within the hour',
  }

  if (hero === null) {
    return {
      ...common,
      hero_tick: null,
      hero_updated_at: null,
      data_state: servicePaused ? ('service_paused' as const) : ('unlinked' as const),
      hero_name: '',
      owner_name: '',
      class: '',
      level: null,
      xp: null,
      xp_to_next: null,
      xp_pct: null,
      hp: null,
      max_hp: null,
      hp_pct: null,
      gold: null,
      status: 'unlinked' as const,
      status_label: 'Finish setup in the Desk Crawler companion',
      status_eta_ticks: 0,
      biome_id: '',
      biome_name: '',
      sprite: '',
      sprite_url: '',
      weapon: '',
      armor: '',
      potions: 0,
      bag_used: null,
      bag_capacity: null,
      held_item: '',
      wake_at_tick: null,
      log: [],
      attention: servicePaused ? 'Desk Crawler is paused for maintenance.' : 'Open the Desk Crawler companion and save this plugin in TRMNL to start.',
    }
  }

  const max = maxHp(hero.level)
  const xpToNext = xpToLeave(hero.level)
  const eta = (deadline: number | undefined) => (deadline === undefined ? 0 : Math.max(0, deadline - hero.lastTick))
  let statusLabel: string
  let etaTicks = 0
  switch (hero.status) {
    case 'exploring':
      statusLabel = `Exploring the ${biomeName(hero.biomeId)}`
      break
    case 'resting':
      statusLabel = `Resting in the ${biomeName(hero.biomeId)}`
      break
    case 'travelling':
      etaTicks = eta(hero.arriveAtTick)
      statusLabel = etaTicks === 0 ? 'Arrival pending' : `Travelling to the ${biomeName(hero.targetBiomeId)}`
      break
    case 'dead':
      etaTicks = eta(hero.reviveAtTick)
      statusLabel = etaTicks === 0 ? 'Revival pending' : `Knocked out. Revives in ${etaTicks} tick${etaTicks === 1 ? '' : 's'}`
      break
    case 'paused':
      statusLabel = 'Paused by you'
      break
    case 'sleeping':
      if (hero.wakeAtTick !== undefined) {
        etaTicks = eta(hero.wakeAtTick)
        statusLabel = etaTicks === 0 ? 'Resume pending' : 'Adventures resume next tick'
      } else if (input.heldItemName) {
        statusLabel = 'Taking a break: bag full. A new find is waiting.'
      } else {
        statusLabel = 'Taking a break: free a bag slot, then resume.'
      }
      break
  }

  let attention: string | null = null
  if (hero.quarantined || servicePaused) attention = 'Desk Crawler paused this hero for a service check. Progress is safe.'
  else if (stale) attention = 'Updates delayed. Your progress is safe.'
  else if (hero.status === 'dead') attention = 'Revival is automatic. XP and gear are safe.'
  else if (hero.status === 'sleeping' && hero.wakeAtTick === undefined) attention = 'Your find is safe. Manage gear in the companion, then resume adventures.'

  return {
    ...common,
    hero_tick: hero.lastTick,
    hero_updated_at: hero.lastAdvancedAt === undefined ? null : iso(hero.lastAdvancedAt),
    data_state: hero.quarantined || servicePaused ? ('service_paused' as const) : ('ready' as const),
    hero_name: hero.name,
    owner_name: input.ownerAlias ?? '',
    class: 'warrior',
    level: hero.level,
    xp: hero.xp,
    xp_to_next: xpToNext,
    xp_pct: clampPct(Math.floor((hero.xp * 100) / xpToNext)),
    hp: hero.hp,
    max_hp: max,
    hp_pct: clampPct(Math.round((hero.hp * 100) / max)),
    gold: hero.gold,
    status: hero.status,
    status_label: statusLabel,
    status_eta_ticks: etaTicks,
    biome_id: hero.biomeId,
    biome_name: biomeName(hero.biomeId),
    sprite: hero.status === 'dead' ? 'warrior_dead_v1' : 'warrior_idle_v1',
    sprite_url: input.spriteBaseUrl ? `${input.spriteBaseUrl}/sprites/${hero.status === 'dead' ? 'warrior-dead-v1' : 'warrior-idle-v1'}.png` : '',
    weapon: input.weaponName ?? '',
    armor: input.armorName ?? '',
    potions: input.potions,
    bag_used: input.bagUsed,
    bag_capacity: input.bagCapacity,
    held_item: input.heldItemName ?? '',
    wake_at_tick: hero.wakeAtTick ?? null,
    log: logs,
    attention,
  }
}

export type CanonicalPayload = ReturnType<typeof buildPayload>
