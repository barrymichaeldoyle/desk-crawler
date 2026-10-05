import { markedRuns } from '../sim/core/narrative'

export interface LogDeltas {
  readonly xpEarned: number
  readonly gold: number
  readonly hp: number
}

/** Shared display copy. Persisted, versioned simulator summaries stay replayable. */
export function logPresentation(entry: { readonly summary: string; readonly kind: string; readonly deltas?: LogDeltas }) {
  if (!entry.deltas) return { narrative: entry.summary, changes: [] as string[] }
  let deltas = entry.deltas
  // Older companion commands stored zero deltas. Only these two exact command
  // forms encode an applied change; never infer combat HP/rewards from flavor.
  if (entry.kind === 'system' && deltas.xpEarned === 0 && deltas.gold === 0 && deltas.hp === 0) {
    const potion = entry.summary.match(/^Drank a potion\. \+(\d+) HP\.$/)
    const sale = entry.summary.match(/^Sold .+ for (\d+) gold\.$/)
    if (potion) deltas = { ...deltas, hp: Number(potion[1]) }
    if (sale) deltas = { ...deltas, gold: Number(sale[1]) }
  }
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
    deltas.hp ? signed(deltas.hp, 'HP') : null,
  ].filter((part): part is string => part !== null)
  return { narrative, changes }
}
