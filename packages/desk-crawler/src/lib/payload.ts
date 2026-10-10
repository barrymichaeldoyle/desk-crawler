/**
 * Canonical TRMNL payload v1 (trmnl.md). Pure mapping: no reads, clocks, RNG or
 * writes. The caller supplies `now` and already-authorized, bounded inputs.
 */
import type { ContentCatalog, StanceId } from '../sim/core/types'
import { baseAttack, baseDefense, maxHp, xpToLeave } from '../sim/core/stats'
import { FULL_SCALE, LARGE_SCALE, MEDIUM_SCALE, SMALL_SCALE } from '../art/scene'
import { QR_LARGE_SCALE, QR_SCALE, qrBasePath, qrPath, type QrTarget } from '../art/qr'
import { sceneFor, scenePath, type LatestEvent } from '../art/sceneKey'
import { nextSlotAfter, slotEta, SLOT_MS } from '../sim/schedule'
import { bold } from '../sim/core/narrative'
import { logPresentation, type LogDeltas } from './logPresentation'
import { activityRecap, recapPeriod, type ActivityEntry } from './activityRecap'

export { activityRecap, MAX_RECAP_EVENTS, RECAP_WINDOW_MS, recapPeriod } from './activityRecap'
export type { ActivityEntry, ActivityRecap, RecapPeriod } from './activityRecap'

export const STALE_AFTER_MS = 30 * 60 * 1000
/** Ten newest stories, independent of the twelve-hour recap and visible layout count. */
export const MAX_LOGS = 20
/** Rows of the own group's board the device receives (`top10`); `top5` stays as the first five for older templates. */
export const TOP_ROWS = 10

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
  /** D78: an open merchant visit ends at this tick. */
  readonly merchantExpiresAtTick?: number
  /** D79: a pending choice resolves by itself at this tick. */
  readonly choiceExpiresAtTick?: number
  /** D76: absent means balanced. */
  readonly stance?: StanceId
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
  /** Attack bonus of the equipped weapon and defense bonus of the equipped armor; 0 with nothing equipped. */
  readonly weaponAttack: number
  readonly armorDefense: number
  readonly potions: number
  readonly bagUsed: number
  readonly bagCapacity: number
  /** P32: gear in the desk drawer; absent or 0 hides the HUD's "+N". */
  readonly drawerUsed?: number
  readonly heldItemName: string | null
  /** `compact`: D112's count form of a to-do line, for rows too narrow for its labels. */
  readonly logs: ReadonlyArray<{ readonly at: number; readonly kind: string; readonly summary: string; readonly deltas?: LogDeltas; readonly compact?: string }>
  /** Separate 12-hour read; the ten recent stories cannot imply a complete recap. */
  readonly activity?: { readonly entries: readonly ActivityEntry[]; readonly truncated: boolean }
  /** The owner's UTC offset in seconds (TRMNL's `trmnl[user][utc_offset]`, or the browser's); null means UTC. Sets the recap period (D75). */
  readonly utcOffset?: number | null
  readonly instanceName: string | null
  readonly content: ContentCatalog
  readonly spriteBaseUrl: string | null
  /** Public origin serving `/art/...` scene images (the Convex site URL). */
  readonly artBaseUrl: string | null
  readonly latestEvent: LatestEvent | null
  /** The newest log of any kind, for the celebration; defaults to `latestEvent`. An achievement log carries its `title` (D65). */
  readonly newestEvent?: LatestEvent | null
  /** Seven-day own-group ranking from the published set; null before any publication. */
  readonly ranking: PayloadRanking | null
}

export interface PayloadRanking {
  readonly rank: number | null
  readonly rankDelta: number | null
  readonly status: 'ranked' | 'awaiting' | 'dormant'
  readonly cohortKey: string | null
  readonly cohortLabel: string
  readonly score: number | null
  readonly scoreAt: number
  readonly asOfTick: number
  readonly builtAt: number
  readonly windowStart: number
  readonly totalPlayers: number
  readonly globalTotalPlayers: number
  /** The group's first `TOP_ROWS` rows. */
  readonly top: ReadonlyArray<{ rank: number; name: string; hero_name: string; level: number; score: number }>
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

function rankingFields(ranking: PayloadRanking | null, unlinked: boolean, timeZone: string) {
  if (ranking === null || unlinked) {
    return {
      rank: null as number | null,
      rank_delta: null as number | null,
      rank_status: 'awaiting' as 'ranked' | 'awaiting' | 'dormant',
      leaderboard_board: 'recent_7d' as const,
      leaderboard_cohort: null as string | null,
      leaderboard_cohort_label: '',
      leaderboard_score: null as number | null,
      leaderboard_window_start: null as string | null,
      leaderboard_window_end: null as string | null,
      leaderboard_tick: null as number | null,
      leaderboard_built_at: null as string | null,
      total_players: 0,
      global_total_players: unlinked ? 0 : (ranking?.globalTotalPlayers ?? 0),
      top5: [] as Array<{ rank: number; name: string; hero_name: string; level: number; class: string; score: number }>,
      top10: [] as Array<{ rank: number; name: string; hero_name: string; level: number; class: string; score: number }>,
      leaderboard_as_of_label: 'Ranking within the hour',
    }
  }
  const asOf = formatLocal(ranking.scoreAt, timeZone)
  return {
    rank: ranking.rank,
    rank_delta: ranking.rankDelta,
    rank_status: ranking.status,
    leaderboard_board: 'recent_7d' as const,
    leaderboard_cohort: ranking.cohortKey,
    leaderboard_cohort_label: ranking.cohortLabel,
    leaderboard_score: ranking.score,
    leaderboard_window_start: iso(ranking.windowStart),
    leaderboard_window_end: iso(ranking.scoreAt),
    leaderboard_tick: ranking.asOfTick,
    leaderboard_built_at: iso(ranking.builtAt),
    total_players: ranking.totalPlayers,
    global_total_players: ranking.globalTotalPlayers,
    top5: ranking.top.slice(0, 5).map((row) => ({ ...row, class: 'warrior' })),
    top10: ranking.top.slice(0, TOP_ROWS).map((row) => ({ ...row, class: 'warrior' })),
    leaderboard_as_of_label: `${asOf.label} ${asOf.offset}`,
  }
}

/**
 * Joins numbers to their units with a no-break space so wrapped log lines never
 * strand "+2" at the end of a row and "gold" at the start of the next. A reward
 * run ("+7 XP, +2 gold") also stays together across its comma.
 */
export const keepUnitsTogether = (text: string) =>
  text
    .replace(/([+-]?\d+) (XP|gold|HP|ticks?|healing potions?)\b/g, '$1\u00a0$2')
    .replace(/\b(level|Level) (\d+)/g, '$1\u00a0$2')
    .replace(/([+-]\d+\u00a0(?:XP|gold|HP)), (?=[+-]\d)/g, '$1,\u00a0')

/**
 * A short cheer for the newest event when it is a big moment: a level-up, an elite win, a jackpot or a rare find.
 * Shown above the newest story until the next adventure replaces it.
 */
export function celebrationFor(latest: LatestEvent | null, level: number): string | null {
  if (latest === null) return null
  if (latest.kind === 'achievement') return latest.title ? `Achievement: ${latest.title}` : null
  if (latest.kind === 'levelup') return `Level up! Now level ${level}`
  const outcome = latest.outcome
  if (outcome?.variant === 'combat' && outcome.elite === true && outcome.outcome === 'victory') return 'Elite defeated!'
  if (outcome?.variant === 'loot' && outcome.jackpot === true) return 'Jackpot!'
  if (outcome?.variant === 'loot' && outcome.found === 'gear' && outcome.rarity === 'epic') return 'Epic find!'
  if (outcome?.variant === 'loot' && outcome.found === 'gear' && outcome.rarity === 'rare') return 'Rare find!'
  return null
}

/** "45 min", "2 h", "1 h 15 min" for a number of quarter-hour ticks. */
export function aboutDuration(ticks: number): string {
  const minutes = (ticks * SLOT_MS) / 60_000
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours === 0 ? `${rest} min` : rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

export function buildPayload(input: PayloadInput) {
  const { now, world, hero, content } = input
  const biomeName = (id: string | undefined) => content.biomes.find((b) => b.id === id)?.name ?? ''
  const lastCompletedAt = world?.lastCompletedAt
  const stale = world === null ? false : now - (lastCompletedAt ?? world.createdAt) > STALE_AFTER_MS
  const servicePaused = world !== null && (world.ticksPaused || world.maintenanceMode)
  const gameAsOf = lastCompletedAt === undefined ? null : formatLocal(lastCompletedAt, input.timezone)
  const logs = input.logs.slice(0, MAX_LOGS).map((log) => {
    const { narrative, changes } = logPresentation(log, { compactGold: true })
    return { at: iso(log.at), u: Math.floor(log.at / 1000), t: formatLocal(log.at, input.timezone).label, k: log.kind, s: keepUnitsTogether(log.summary), n: keepUnitsTogether(narrative), d: keepUnitsTogether(changes.join(' · ')), ...(log.compact === undefined ? {} : { c: log.compact }) }
  })

  const common = {
    v: 1 as const,
    generated_at: iso(now),
    tick: world?.currentTick ?? 0,
    last_completed_tick: world?.lastCompletedTick ?? null,
    last_completed_at: lastCompletedAt === undefined ? null : iso(lastCompletedAt),
    stale,
    plugin_instance_name: sanitizeLabel(input.instanceName, 40, 'Desk Crawler'),
    game_as_of_label: gameAsOf ? `${gameAsOf.label} ${gameAsOf.offset}` : 'Waiting for the first adventure',
    recap: hero !== null && input.activity ? activityRecap(input.activity.entries, recapPeriod(now, input.utcOffset ?? null), content, input.activity.truncated) : null,
    ...rankingFields(input.ranking, hero === null, input.timezone),
  }

  const sceneUrls = (biomeId: string, scene: ReturnType<typeof sceneFor>) =>
    input.artBaseUrl
      ? {
          scene_url: `${input.artBaseUrl}${scenePath(biomeId, scene.pose, scene.subject, FULL_SCALE)}`,
          scene_url_small: `${input.artBaseUrl}${scenePath(biomeId, scene.pose, scene.subject, SMALL_SCALE)}`,
          scene_url_large: `${input.artBaseUrl}${scenePath(biomeId, scene.pose, scene.subject, LARGE_SCALE)}`,
          scene_url_medium: `${input.artBaseUrl}${scenePath(biomeId, scene.pose, scene.subject, MEDIUM_SCALE)}`,
        }
      : { scene_url: '', scene_url_small: '', scene_url_large: '', scene_url_medium: '' }

  /** A QR code back to the companion, only when the player has something to do there. */
  const qrFields = (target: QrTarget | null, label: string) =>
    target !== null && input.artBaseUrl
      ? {
          qr_url: `${input.artBaseUrl}${qrPath(target, QR_SCALE)}`,
          qr_url_large: `${input.artBaseUrl}${qrPath(target, QR_LARGE_SCALE)}`,
          qr_base: `${input.artBaseUrl}${qrBasePath(target)}`,
          qr_label: label,
        }
      : { qr_url: '', qr_url_large: '', qr_base: '', qr_label: '' }

  if (hero === null) {
    return {
      ...common,
      ...qrFields(servicePaused ? null : 'app', 'Scan to finish setup'),
      companion_qr_base: '',
      home_qr_base: '',
      corner_qr_base: '',
      first_run: false,
      ...sceneUrls(content.safeBiomeId, { pose: 'idle', subject: { kind: 'prop', id: 'signpost' } }),
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
      attack: null,
      defense: null,
      gold: null,
      status: 'unlinked' as const,
      status_label: 'Setup not finished',
      status_eta_ticks: 0,
      status_eta_at: null,
      status_eta_label: '',
      next_tick_at: null,
      biome_id: '',
      biome_name: '',
      sprite: '',
      sprite_url: '',
      weapon: '',
      armor: '',
      potions: 0,
      bag_used: null,
      bag_capacity: null,
      drawer_used: 0,
      stance: '' as const,
      stance_name: '',
      held_item: '',
      wake_at_tick: null,
      log: [],
      celebration: null,
      attention: servicePaused ? 'Desk Crawler is down for maintenance.' : 'Sign in to the companion, then save this plugin in TRMNL.',
      notice: null,
    }
  }

  const stance = content.stances?.[hero.stance ?? 'balanced']
  const max = maxHp(hero.level)
  const xpToNext = xpToLeave(hero.level)
  const eta = (deadline: number | undefined) => (deadline === undefined ? 0 : Math.max(0, deadline - hero.lastTick))
  // Area names carry bold marks, rendered by the templates like log summaries.
  const area = (id: string | undefined) => bold(biomeName(id))
  let statusLabel: string
  /** With an ETA, the status leading into its HH:MM ("Knocked out, back at"); the template appends the time. */
  let etaLabel = ''
  let etaTicks = 0
  switch (hero.status) {
    case 'exploring':
      statusLabel = `Exploring the ${area(hero.biomeId)}`
      break
    case 'resting':
      statusLabel = `Resting in the ${area(hero.biomeId)}`
      break
    case 'travelling':
      etaTicks = eta(hero.arriveAtTick)
      statusLabel = etaTicks === 0 ? 'Arrival pending' : `Travelling to the ${area(hero.targetBiomeId)}`
      etaLabel = `To the ${area(hero.targetBiomeId)}, arriving`
      break
    case 'dead':
      etaTicks = eta(hero.reviveAtTick)
      statusLabel = etaTicks === 0 ? 'Revival pending' : `Knocked out. Back in about ${aboutDuration(etaTicks)}`
      etaLabel = 'Knocked out, back at'
      break
    case 'paused':
      statusLabel = 'Paused by you'
      break
    case 'sleeping':
      if (hero.wakeAtTick !== undefined) {
        etaTicks = eta(hero.wakeAtTick)
        statusLabel = etaTicks === 0 ? 'Resume pending' : 'Adventures resume soon'
        etaLabel = 'Adventures resume at'
      } else if (input.heldItemName) {
        statusLabel = 'Bag full, holding a new find'
      } else {
        statusLabel = 'Bag full. Free a slot to resume.'
      }
      break
  }

  // While travelling, the destination and arrival lead the story list, where players look for what is happening; the
  // header keeps its status line. The entry is live, never stored, and says the owner-local arrival time in its story
  // (D91): the HH:MM column is when something happened, so `live` tells the template to leave it empty here.
  const arrivesAt = hero.status === 'travelling' && etaTicks > 0 ? slotEta(now, etaTicks) : null
  const travelLine = arrivesAt === null ? null : (() => {
    const offset = input.utcOffset
    const story = typeof offset === 'number' && Number.isInteger(offset)
      ? `Off to the ${area(hero.targetBiomeId)}, arriving ${new Date(arrivesAt + offset * 1000).toISOString().slice(11, 16)}.`
      : `Off to the ${area(hero.targetBiomeId)}.`
    return { at: iso(arrivesAt), u: Math.floor(arrivesAt / 1000), t: formatLocal(arrivesAt, input.timezone).label, k: 'travel', s: story, n: story, d: '', live: true }
  })()

  let attention: string | null = null
  if (hero.quarantined || servicePaused) attention = 'Paused for a service check.'
  else if (stale) attention = 'Updates are delayed.'
  else if (hero.status === 'dead') attention = 'Revives automatically with all XP and gear.'
  else if (hero.status === 'sleeping' && hero.wakeAtTick === undefined) attention = 'Make room in your bag in the companion, then resume.'
  // D78: a merchant visit is a cheerful notice, never an attention line (attention collapses the stories), and only while its offers are open.
  const tickNow = world?.currentTick ?? hero.lastTick
  // D79 outranks D78: a decision waiting is the more useful line; neither ever outranks a problem.
  const notice = attention !== null ? null : hero.choiceExpiresAtTick !== undefined && hero.choiceExpiresAtTick > tickNow ? 'A decision is waiting in the companion.' : hero.merchantExpiresAtTick !== undefined && hero.merchantExpiresAtTick > tickNow ? 'Merchant visiting. Shop in the companion soon.' : null

  const needsBag = hero.status === 'sleeping' && hero.wakeAtTick === undefined && !hero.quarantined && !servicePaused
  // A brand-new hero has no adventures yet: the screen welcomes them and links the companion.
  const firstRun = input.logs.length === 0 && attention === null && (hero.status === 'exploring' || hero.status === 'resting')
  // D42: when the next scheduled tick starts (UTC seconds), only while this hero will take part in it.
  // The template formats it in the owner's TRMNL timezone; nothing is promised when delayed or stopped.
  const adventuring = hero.status === 'exploring' || hero.status === 'resting' || hero.status === 'travelling'
  const nextTickAt = adventuring && attention === null ? Math.floor(nextSlotAfter(now) / 1000) : null
  return {
    ...common,
    ...(needsBag ? qrFields('bag', 'Scan to open your bag') : qrFields(firstRun ? 'app' : null, 'Scan to open your companion')),
    // The standing link to the bag (gear and potions): the full layout shows it whenever no action QR takes its place.
    companion_qr_base: input.artBaseUrl ? `${input.artBaseUrl}${qrBasePath('bag')}` : '',
    // D88: the full layout's small corner code to the companion home; the bag link stays for older templates and narrow views.
    // D108: both go through the `/dc` short link; the OG landscape draws `corner`, flush into the screen's corner.
    home_qr_base: input.artBaseUrl ? `${input.artBaseUrl}${qrBasePath('home')}` : '',
    corner_qr_base: input.artBaseUrl ? `${input.artBaseUrl}${qrBasePath('corner')}` : '',
    first_run: firstRun,
    ...sceneUrls(hero.biomeId, sceneFor(hero.status, hero.wakeAtTick !== undefined, input.latestEvent)),
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
    // The same derived stats the companion HUD shows (deriveStats): level base plus the equipped gear bonus.
    attack: baseAttack(hero.level) + input.weaponAttack,
    defense: baseDefense(hero.level) + input.armorDefense,
    gold: hero.gold,
    status: hero.status,
    status_label: statusLabel,
    status_eta_ticks: etaTicks,
    // D44/D45: when a pending status ends (UTC seconds); the template shows `status_eta_label` + HH:MM, else `status_label`.
    status_eta_at: etaTicks > 0 ? Math.floor(slotEta(now, etaTicks) / 1000) : null,
    status_eta_label: etaTicks > 0 ? etaLabel : '',
    next_tick_at: nextTickAt,
    biome_id: hero.biomeId,
    biome_name: biomeName(hero.biomeId),
    sprite: hero.status === 'dead' ? 'warrior_dead_v1' : 'warrior_idle_v1',
    sprite_url: input.spriteBaseUrl ? `${input.spriteBaseUrl}/sprites/${hero.status === 'dead' ? 'warrior-dead-v1' : 'warrior-idle-v1'}.png` : '',
    weapon: input.weaponName ?? '',
    armor: input.armorName ?? '',
    potions: input.potions,
    bag_used: input.bagUsed,
    bag_capacity: input.bagCapacity,
    drawer_used: input.drawerUsed ?? 0,
    // D103: the stance outlasts its log line, so the HUD shows it under its gauge mark; empty under a catalog without stances.
    stance: stance ? stance.id : ('' as const),
    stance_name: stance?.name ?? '',
    held_item: input.heldItemName ?? '',
    wake_at_tick: hero.wakeAtTick ?? null,
    log: travelLine === null ? logs : [travelLine, ...logs].slice(0, MAX_LOGS),
    // The badge sits above the newest story, so it waits while the travel line leads.
    celebration: attention === null && travelLine === null && logs.length > 0 ? celebrationFor(input.newestEvent === undefined ? input.latestEvent : input.newestEvent, hero.level) : null,
    attention,
    notice,
  }
}

export type CanonicalPayload = ReturnType<typeof buildPayload>
