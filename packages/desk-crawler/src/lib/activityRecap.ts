import type { ContentCatalog, LogDetail } from '../sim/core/types'
import type { LogDeltas } from './logPresentation'

export const RECAP_WINDOW_MS = 12 * 60 * 60 * 1000
/** Includes commands; an extra row detects an incomplete window. */
export const MAX_RECAP_EVENTS = 200

export interface ActivityEntry {
  readonly at: number
  readonly deltas: LogDeltas
  readonly detail: Pick<LogDetail, 'outcome' | 'levelsGained' | 'heldFind'> | { readonly operation: string }
}

/** Read-only, deterministic digest of recorded outcomes. Never infer facts from jokes. */
export function activityRecap(entries: readonly ActivityEntry[], now: number, content: ContentCatalog, truncated = false) {
  const totals = { xp: 0, gold: 0, wins: 0, gear: 0, potions: 0, breaks: 0, levels: 0, knockouts: 0, revivals: 0, rareFinds: 0, elites: 0, jackpots: 0 }
  const arrivals = new Set<string>()
  let heldFind = false
  let events = 0
  for (const entry of entries.slice(0, MAX_RECAP_EVENTS)) {
    // Half-open window avoids counting a boundary event in both adjacent windows.
    if (entry.at <= now - RECAP_WINDOW_MS || entry.at > now) continue
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
    label: partial ? 'Last 12 hours · partial' : 'Last 12 hours',
    partial,
    from: Math.floor((now - RECAP_WINDOW_MS) / 1000),
    to: Math.floor(now / 1000),
    events,
    totals,
    activity: activity.join(' · ') || (events ? 'Adventures continued' : partial ? 'No adventures in sample' : 'No new adventures'),
    gains: gains.join(' · '),
    highlights: highlights.slice(0, 2).join(' · '),
    compact,
  }
}

export type ActivityRecap = ReturnType<typeof activityRecap>
