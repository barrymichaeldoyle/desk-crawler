import { markedRuns } from '../sim/core/narrative'

export interface LogDeltas {
  readonly xpEarned: number
  readonly gold: number
  readonly hp: number
  /** Gross acquisition from the stored loot outcome, derived on read, not net stack change. */
  readonly potionsFound?: number
  /** Bag slots gained, from the stored bag upgrade (D61). */
  readonly bagSlots?: number
  /** HP a potion restored, shown apart from net HP so the player learns what a potion does. */
  readonly potionHealing?: number
  /** Merchant offers opened by a visit (D78). */
  readonly offers?: number
  /** Potions a merchant purchase added, or a pouch's new cap (D77/D78). */
  readonly potionsBought?: number
  readonly pouchCap?: number
  /** An effect gained (D80), by id; the companion names it from the catalog. */
  readonly effectGained?: string
}

/** Reveal only display changes, never the simulator's internal event detail. */
export function displayLogDeltas(entry: { readonly deltas: LogDeltas; readonly detail: { readonly outcome: { readonly variant: string; readonly found?: string; readonly potionFullFallback?: boolean; readonly offers?: readonly unknown[] }; readonly bagUpgrade?: { readonly from: number; readonly to: number }; readonly pouchUpgrade?: { readonly from: number; readonly to: number }; readonly potionHealing?: number; readonly effectGained?: string } | { readonly operation: string; readonly bagSlots?: number; readonly potionsBought?: number; readonly effectGained?: string } | { readonly achievementId: string } }): LogDeltas {
  const outcome = 'outcome' in entry.detail ? entry.detail.outcome : null
  const offers = outcome?.variant === 'merchant' ? outcome.offers?.length ?? 0 : 0
  const potionsBought = 'operation' in entry.detail ? entry.detail.potionsBought ?? 0 : 0
  const pouchCap = 'outcome' in entry.detail ? entry.detail.pouchUpgrade?.to ?? 0 : 0
  const effectGained = 'achievementId' in entry.detail ? undefined : entry.detail.effectGained
  const upgrade = 'outcome' in entry.detail ? entry.detail.bagUpgrade : undefined
  const bagSlots = upgrade ? upgrade.to - upgrade.from : 'operation' in entry.detail ? entry.detail.bagSlots ?? 0 : 0
  // A manual drink's whole HP delta is the potion; an automatic drink stores its share beside combat damage.
  const potionHealing = 'outcome' in entry.detail ? entry.detail.potionHealing ?? 0 : 'operation' in entry.detail && entry.detail.operation === 'use_potion' ? Math.max(0, entry.deltas.hp) : 0
  return { ...entry.deltas, potionsFound: outcome?.variant === 'loot' && outcome.found === 'potion' && !outcome.potionFullFallback ? 1 : 0, bagSlots, potionHealing, offers, potionsBought, pouchCap, ...(effectGained === undefined ? {} : { effectGained }) }
}

/** Shared display copy. Persisted, versioned simulator summaries stay replayable. */
export function logPresentation(entry: { readonly summary: string; readonly kind: string; readonly deltas?: LogDeltas }, options: { readonly compactGold?: boolean } = {}) {
  if (!entry.deltas || entry.kind === 'achievement') return { narrative: entry.summary, changes: [] as string[] }
  const deltas = entry.deltas
  const signed = (value: number, unit: string) => `${value > 0 ? '+' : '−'}${Math.abs(value)} ${unit}`
  // D112: to-do labels carry targets ("Earn 50 gold adventuring"), never changes, so they keep every number; a
  // ticked-off line's reward is its gold chip and a stand-up changes nothing, so it stands alone.
  if (entry.kind === 'todo') return { narrative: entry.summary, changes: deltas.gold ? [signed(deltas.gold, 'gold')] : [] }
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
  // D110: a raid can swing five-figure gold; the device's gold column holds four digits, so it reads "12k" from 10,000.
  const goldChange = (value: number) => (options.compactGold && Math.abs(value) >= 10_000 ? `${value > 0 ? '+' : '−'}${Math.floor(Math.abs(value) / 1000)}k gold` : signed(value, 'gold'))
  const changes = [
    deltas.xpEarned ? signed(deltas.xpEarned, 'XP') : null,
    deltas.gold ? goldChange(deltas.gold) : null,
    deltas.potionsFound ? signed(deltas.potionsFound, deltas.potionsFound === 1 ? 'healing potion' : 'healing potions') : null,
    // Net HP stays the single HP figure (D48); the potion chip names the part a potion restored.
    deltas.hp ? signed(deltas.hp, 'HP') : null,
    deltas.potionHealing && deltas.potionHealing !== deltas.hp ? `${signed(deltas.potionHealing, 'HP')} from potion` : null,
    deltas.bagSlots ? signed(deltas.bagSlots, deltas.bagSlots === 1 ? 'bag slot' : 'bag slots') : null,
    deltas.potionsBought ? signed(deltas.potionsBought, deltas.potionsBought === 1 ? 'healing potion' : 'healing potions') : null,
    deltas.pouchCap ? `Pouch holds ${deltas.pouchCap}` : null,
    deltas.offers ? `${deltas.offers} ${deltas.offers === 1 ? 'offer' : 'offers'} open` : null,
    deltas.effectGained ? `${deltas.effectGained.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())}` : null,
  ].filter((part): part is string => part !== null)
  // "No effect" explains an adventure that changed nothing (a coffee break at full HP); travel and companion actions
  // (kind `system`) were never meant to change stats, so they stand alone.
  const quiet = entry.kind === 'travel' || entry.kind === 'system'
  return { narrative, changes: changes.length > 0 || quiet ? changes : ['No effect'] }
}
