import type { ContentCatalog, LogDetail } from '../sim/core/types'
import type { LogDeltas } from './logPresentation'

export const RECAP_WINDOW_MS = 12 * 60 * 60 * 1000
/** Includes commands; an extra row detects an incomplete window. */
export const MAX_RECAP_EVENTS = 200

/**
 * Recap periods follow the owner's local day (D75, D84): at 07:00 the night recap reports 19:00 to 07:00 and at
 * 19:00 the day recap reports 07:00 to 19:00. The office window's sky switches at the same hours. A recap is shown only
 * once its period has ended, so the device never summarises a window that is still running.
 */
export const DAY_START_HOUR = 7
export const NIGHT_START_HOUR = 19
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export interface RecapPeriod {
  /** 'Night recap' (the night just ended) or 'Day recap' (the day just ended). */
  readonly label: string
  /** The period's local clock span, '19:00-07:00' or '07:00-19:00', so the screen says which hours it covers. */
  readonly span: string
  /** UTC milliseconds; the window is half-open, (from, to]. */
  readonly from: number
  readonly to: number
}

/** The most recently completed period at `now`, with the owner's UTC offset in seconds (0 when TRMNL sends none). */
export function recapPeriod(now: number, utcOffsetSeconds: number | null): RecapPeriod {
  const offset = (utcOffsetSeconds ?? 0) * 1000
  const local = now + offset
  const dayStart = Math.floor(local / DAY_MS) * DAY_MS
  const morning = dayStart + DAY_START_HOUR * HOUR_MS
  const evening = dayStart + NIGHT_START_HOUR * HOUR_MS
  const end = local >= evening ? evening : local >= morning ? morning : evening - DAY_MS
  const label = end === morning ? 'Night recap' : 'Day recap'
  const clock = (hour: number) => `${String(hour).padStart(2, '0')}:00`
  const span = end === morning ? `${clock(NIGHT_START_HOUR)}-${clock(DAY_START_HOUR)}` : `${clock(DAY_START_HOUR)}-${clock(NIGHT_START_HOUR)}`
  return { label, span, from: end - RECAP_WINDOW_MS - offset, to: end - offset }
}

export interface ActivityEntry {
  readonly at: number
  readonly deltas: LogDeltas
  readonly detail: Pick<LogDetail, 'outcome' | 'levelsGained' | 'heldFind'> | { readonly operation: string } | { readonly achievementId: string }
}

/** Read-only, deterministic digest of recorded outcomes within one completed period. Never infer facts from jokes. */
export function activityRecap(entries: readonly ActivityEntry[], period: RecapPeriod, content: ContentCatalog, truncated = false) {
  const totals = { xp: 0, gold: 0, wins: 0, gear: 0, potions: 0, breaks: 0, levels: 0, knockouts: 0, revivals: 0, rareFinds: 0, elites: 0, jackpots: 0, raidsWon: 0, raidsLost: 0 }
  const arrivals = new Set<string>()
  let heldFind = false
  let events = 0
  for (const entry of entries.slice(0, MAX_RECAP_EVENTS)) {
    // Half-open window avoids counting a boundary event in both adjacent windows.
    if (entry.at <= period.from || entry.at > period.to) continue
    if (!('outcome' in entry.detail)) continue
    events++
    const { outcome, levelsGained } = entry.detail
    totals.xp += entry.deltas.xpEarned
    totals.levels += levelsGained
    heldFind ||= entry.detail.heldFind
    if (outcome.variant === 'combat') {
      totals.gold += outcome.goldGranted
      if (outcome.outcome === 'victory') {
        totals.wins++
        if (outcome.elite) totals.elites++
      }
      if (outcome.gearDropped) {
        totals.gear++
        if (outcome.gearRarity === 'rare') totals.rareFinds++
      }
      if (outcome.outcome === 'death') totals.knockouts++
    } else if (outcome.variant === 'loot') {
      totals.gold += outcome.goldGranted
      if (outcome.found === 'gear') {
        totals.gear++
        if (outcome.rarity === 'rare') totals.rareFinds++
      }
      if (outcome.found === 'potion' && !outcome.potionFullFallback) totals.potions++
      if (outcome.jackpot) totals.jackpots++
    } else if (outcome.variant === 'rest') totals.breaks++
    else if (outcome.variant === 'trap' && outcome.outcome === 'death') totals.knockouts++
    else if (outcome.variant === 'revival') totals.revivals++
    else if (outcome.variant === 'travel' && outcome.phase === 'arrive') arrivals.add(outcome.toBiomeId)
    else if (outcome.variant === 'raid') {
      // D110: both sides of a raid count, raiding or defending; a lethal one is also a knockout.
      if (outcome.won) totals.raidsWon++
      else totals.raidsLost++
      if (outcome.outcome === 'death') totals.knockouts++
    }
  }
  const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`
  const raids = totals.raidsWon + totals.raidsLost
  const raidFact = !raids ? null : !totals.raidsLost ? plural(totals.raidsWon, 'raid won', 'raids won') : !totals.raidsWon ? plural(totals.raidsLost, 'raid lost', 'raids lost') : `${plural(raids, 'raid')}, ${totals.raidsWon} won`
  const activity = [
    totals.wins ? plural(totals.wins, 'fight won', 'fights won') : null,
    totals.gear ? plural(totals.gear, 'gear find') : null,
    totals.potions ? plural(totals.potions, 'potion found', 'potions found') : null,
    totals.breaks ? plural(totals.breaks, 'break') : null,
  ].filter((value): value is string => value !== null)
  const gains = [totals.xp ? `+${totals.xp} XP` : null, totals.gold ? `${totals.gold} gold earned` : null].filter((value): value is string => value !== null)
  const highlights = [
    heldFind ? 'Bag filled up' : null,
    totals.knockouts ? `${plural(totals.knockouts, 'knockout')}${totals.revivals ? ` · ${plural(totals.revivals, 'revival')}` : ''}` : totals.revivals ? plural(totals.revivals, 'revival') : null,
    totals.levels ? `Gained ${plural(totals.levels, 'level')}` : null,
    raidFact,
    totals.rareFinds ? plural(totals.rareFinds, 'rare find') : null,
    ...[...arrivals].map(id => `Reached ${content.biomes.find(biome => biome.id === id)?.name ?? 'a new area'}`),
    totals.elites ? plural(totals.elites, 'elite defeated', 'elites defeated') : null,
    totals.jackpots ? plural(totals.jackpots, 'jackpot') : null,
  ].filter((value): value is string => value !== null)
  const partial = truncated || entries.length > MAX_RECAP_EVENTS
  /**
   * The same facts as short icon-led items for the device (`k` names its mark), most notable first so a line that
   * cannot hold them all drops the routine ones. 'none' carries the quiet-period text without a mark.
   */
  const items: RecapItem[] = [
    totals.levels ? { k: 'levelup', t: `+${plural(totals.levels, 'level')}` } : null,
    ...[...arrivals].map((id): RecapItem => ({ k: 'travel', t: `Reached ${content.biomes.find(biome => biome.id === id)?.name ?? 'a new area'}` })),
    totals.rareFinds ? { k: 'achievement', t: plural(totals.rareFinds, 'rare find') } : null,
    totals.elites ? { k: 'combat', t: plural(totals.elites, 'elite') } : null,
    totals.jackpots ? { k: 'coin', t: plural(totals.jackpots, 'jackpot') } : null,
    heldFind ? { k: 'loot', t: 'Bag full' } : null,
    totals.knockouts ? { k: 'death', t: plural(totals.knockouts, 'knockout') } : null,
    totals.revivals ? { k: 'revive', t: plural(totals.revivals, 'revival') } : null,
    raidFact ? { k: 'raid', t: raidFact } : null,
    totals.xp ? { k: 'xp', t: `+${totals.xp} XP` } : null,
    totals.gold ? { k: 'coin', t: `${totals.gold} gold` } : null,
    totals.wins ? { k: 'sword', t: plural(totals.wins, 'win') } : null,
    totals.gear ? { k: 'loot', t: plural(totals.gear, 'gear find') } : null,
    totals.potions ? { k: 'potion', t: plural(totals.potions, 'potion') } : null,
    totals.breaks ? { k: 'rest', t: plural(totals.breaks, 'break') } : null,
  ].filter((value): value is RecapItem => value !== null)
  const label = partial ? `${period.label} · partial` : period.label
  // Compact screens get one useful fact about progress and one about activity.
  const compact = (highlights[0] ? [highlights[0], gains[0]] : [gains[0], activity[0]]).filter(Boolean).join(' · ') || (events ? 'Adventures continued' : partial ? 'No adventures in sample' : 'No new adventures')
  return {
    label,
    span: period.span,
    partial,
    from: Math.floor(period.from / 1000),
    to: Math.floor(period.to / 1000),
    events,
    totals,
    activity: activity.join(' · ') || (events ? 'Adventures continued' : partial ? 'No adventures in sample' : 'No new adventures'),
    gains: gains.join(' · '),
    highlights: highlights.slice(0, 2).join(' · '),
    compact,
    items: items.length ? items : [{ k: 'none', t: events ? 'Adventures continued' : partial ? 'No adventures in sample' : 'No new adventures' }],
  }
}

export interface RecapItem {
  /** Icon key: a log glyph, or 'xp', 'coin', 'sword', 'potion' from the HUD marks, or 'none'. */
  readonly k: string
  readonly t: string
}

export type ActivityRecap = ReturnType<typeof activityRecap>
