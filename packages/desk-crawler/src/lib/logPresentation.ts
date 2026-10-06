import { markedRuns } from '../sim/core/narrative'

export interface LogDeltas {
  readonly xpEarned: number
  readonly gold: number
  readonly hp: number
  /** Gross acquisition from the stored loot outcome, derived on read, not net stack change. */
  readonly potionsFound?: number
  /** Bag slots gained, from the stored bag upgrade (D61). */
  readonly bagSlots?: number
}

/** Reveal only display changes, never the simulator's internal event detail. */
export function displayLogDeltas(entry: { readonly deltas: LogDeltas; readonly detail: { readonly outcome: { readonly variant: string; readonly found?: string; readonly potionFullFallback?: boolean }; readonly bagUpgrade?: { readonly from: number; readonly to: number } } | { readonly operation: string; readonly bagSlots?: number } | { readonly achievementId: string } }): LogDeltas {
  const outcome = 'outcome' in entry.detail ? entry.detail.outcome : null
  const upgrade = 'outcome' in entry.detail ? entry.detail.bagUpgrade : undefined
  const bagSlots = upgrade ? upgrade.to - upgrade.from : 'operation' in entry.detail ? entry.detail.bagSlots ?? 0 : 0
  return { ...entry.deltas, potionsFound: outcome?.variant === 'loot' && outcome.found === 'potion' && !outcome.potionFullFallback ? 1 : 0, bagSlots }
}

/** Shared display copy. Persisted, versioned simulator summaries stay replayable. */
export function logPresentation(entry: { readonly summary: string; readonly kind: string; readonly deltas?: LogDeltas }) {
  if (!entry.deltas || entry.kind === 'achievement') return { narrative: entry.summary, changes: [] as string[] }
  const deltas = entry.deltas
  // Transform only plain runs: numbers/units inside marked item names are names.
  let narrative = markedRuns(entry.summary).map((run) => run.bold ? `[[${run.text}]]` : run.text
    .replace(/[+−-]\d+ (?:XP|gold|HP)(?:,\s*[+−-]\d+ (?:XP|gold|HP))*\.?/g, '')
    .replace(/\b(?:Lost|Dropped) \d+ gold\./g, '')
    .replace(/:\s*\d+ gold\./g, '.')
    .replace(/\bA trap hit for \d+ HP\./g, 'A trap struck.')
    .replace(/\s+(?:for \d+ gold|with \d+ HP)(?=\.)/g, '')
    .replace(/\b\d+ HP\./g, '')
    .replace(/\b\d+ gold\b/g, 'gold')
  ).join('').replace(/\s+/g, ' ').trim()
  if (!narrative) narrative = deltas.gold > 0 ? 'Found gold.' : 'Recovered.'
  const signed = (value: number, unit: string) => `${value > 0 ? '+' : '−'}${Math.abs(value)} ${unit}`
  const changes = [
    deltas.xpEarned ? signed(deltas.xpEarned, 'XP') : null,
    deltas.gold ? signed(deltas.gold, 'gold') : null,
    deltas.potionsFound ? signed(deltas.potionsFound, deltas.potionsFound === 1 ? 'healing potion' : 'healing potions') : null,
    deltas.hp ? signed(deltas.hp, 'HP') : null,
    deltas.bagSlots ? signed(deltas.bagSlots, deltas.bagSlots === 1 ? 'bag slot' : 'bag slots') : null,
  ].filter((part): part is string => part !== null)
  return { narrative, changes: changes.length > 0 ? changes : ['No effect'] }
}
