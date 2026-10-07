import type { ContentCatalog, LogDetail } from '../sim/core/types'
import type { LogDeltas } from './logPresentation'

export const RECAP_WINDOW_MS = 12 * 60 * 60 * 1000
/** Includes commands; an extra row detects an incomplete window. */
export const MAX_RECAP_EVENTS = 200

/**
 * Recap periods follow the office day in the owner's local time (D75): the morning stand-up at 07:00 reports the night
 * (19:00 to 07:00) and the sprint retro at 19:00 reports the day (07:00 to 19:00). A recap is shown only once its
 * period has ended, so the device never summarises a window that is still running.
 */
export const STAND_UP_HOUR = 7
export const RETRO_HOUR = 19
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export interface RecapPeriod {
  /** 'Morning stand-up' (the night just ended) or 'Sprint retro' (the day just ended). */
  readonly label: string
  /** UTC milliseconds; the window is half-open, (from, to]. */
  readonly from: number
  readonly to: number
}

/** The most recently completed period at `now`, with the owner's UTC offset in seconds (0 when TRMNL sends none). */
export function recapPeriod(now: number, utcOffsetSeconds: number | null): RecapPeriod {
  const offset = (utcOffsetSeconds ?? 0) * 1000
  const local = now + offset
  const dayStart = Math.floor(local / DAY_MS) * DAY_MS
  const standUp = dayStart + STAND_UP_HOUR * HOUR_MS
  const retro = dayStart + RETRO_HOUR * HOUR_MS
  const end = local >= retro ? retro : local >= standUp ? standUp : retro - DAY_MS
  const label = end === standUp ? 'Morning stand-up' : 'Sprint retro'
  return { label, from: end - RECAP_WINDOW_MS - offset, to: end - offset }
}

export interface ActivityEntry {
  readonly at: number
  readonly deltas: LogDeltas
  readonly detail: Pick<LogDetail, 'outcome' | 'levelsGained' | 'heldFind'> | { readonly operation: string } | { readonly achievementId: string }
}

/** Read-only, deterministic digest of recorded outcomes within one completed period. Never infer facts from jokes. */
export function activityRecap(entries: readonly ActivityEntry[], period: RecapPeriod, content: ContentCatalog, truncated = false) {
  const totals = { xp: 0, gold: 0, wins: 0, gear: 0, potions: 0, breaks: 0, levels: 0, knockouts: 0, revivals: 0, rareFinds: 0, elites: 0, jackpots: 0 }
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
  }
  const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`
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
    totals.rareFinds ? plural(totals.rareFinds, 'rare find') : null,
    ...[...arrivals].map(id => `Reached ${content.biomes.find(biome => biome.id === id)?.name ?? 'a new area'}`),
    totals.elites ? plural(totals.elites, 'elite defeated', 'elites defeated') : null,
    totals.jackpots ? plural(totals.jackpots, 'jackpot') : null,
  ].filter((value): value is string => value !== null)
  const partial = truncated || entries.length > MAX_RECAP_EVENTS
  // Compact screens get one useful fact about progress and one about activity.
  const compact = (highlights[0] ? [highlights[0], gains[0]] : [gains[0], activity[0]]).filter(Boolean).join(' · ') || (events ? 'Adventures continued' : partial ? 'No adventures in sample' : 'No new adventures')
  return {
    label: partial ? `${period.label} · partial` : period.label,
    partial,
    from: Math.floor(period.from / 1000),
    to: Math.floor(period.to / 1000),
    events,
    totals,
    activity: activity.join(' · ') || (events ? 'Adventures continued' : partial ? 'No adventures in sample' : 'No new adventures'),
    gains: gains.join(' · '),
    highlights: highlights.slice(0, 2).join(' · '),
    compact,
  }
}

export type ActivityRecap = ReturnType<typeof activityRecap>
