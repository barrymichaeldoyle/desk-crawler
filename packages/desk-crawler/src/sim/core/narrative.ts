import { pickOne, type Rng } from './rng'

export type NarrativeVars = Readonly<Record<string, string | number>>

/**
 * Names (monsters, items, areas) are stored wrapped in [[...]] so screens can set them in bold.
 * Displays turn the marks into bold or strip them; old summaries simply have none.
 */
export const BOLD_OPEN = '[['
export const BOLD_CLOSE = ']]'
const BOLD_VARS = new Set(['monster', 'item', 'destination'])

export const bold = (text: string) => `${BOLD_OPEN}${text}${BOLD_CLOSE}`
export const stripMarks = (text: string) => text.replaceAll(BOLD_OPEN, '').replaceAll(BOLD_CLOSE, '')

/** Plain and bold runs of a marked summary, for displays that render rich text. */
export function markedRuns(text: string): Array<{ text: string; bold: boolean }> {
  const runs: Array<{ text: string; bold: boolean }> = []
  for (const [index, part] of text.split(/\[\[|\]\]/).entries()) if (part !== '') runs.push({ text: part, bold: index % 2 === 1 })
  return runs
}

/** Visible length: the bold marks are not shown, so they do not count against the budget. */
export const codePoints = (text: string): number => [...stripMarks(text)].length

export function fill(template: string, vars: NarrativeVars): string {
  // "a {monster}" becomes "an Overheated Rack" when the name starts with a vowel.
  const articled = template.replace(/\b([Aa]) \{(\w+)\}/g, (match, article: string, key: string) => {
    const value = vars[key]
    return typeof value === 'string' && /^[AEIOU]/i.test(value) ? `${article}n {${key}}` : match
  })
  return articled.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key]
    if (value === undefined) throw new Error(`missing narrative variable ${key} in "${template}"`)
    return BOLD_VARS.has(key) ? bold(String(value)) : String(value)
  })
}

/** Choose a variant with the narrative stream only, so text never shifts reward draws. */
export function variant(rng: Rng, templates: readonly string[], vars: NarrativeVars): string {
  return fill(pickOne(rng, templates), vars)
}

/**
 * Compose a self-contained summary within the code-point budget. Consequences
 * are ordered by priority (most important first). Flavor is shortened before any
 * consequence is dropped: full primary, then compact primary, then lowest-priority
 * consequences removed, then a hard clamp.
 */
export function composeSummary(primary: string, compact: string, consequences: readonly string[], max: number): string {
  const join = (head: string, tail: readonly string[]) => [head, ...tail].join(' ')
  for (const head of [primary, compact]) {
    const text = join(head, consequences)
    if (codePoints(text) <= max) return text
  }
  for (let keep = consequences.length - 1; keep >= 0; keep -= 1) {
    const text = join(compact, consequences.slice(0, keep))
    if (codePoints(text) <= max) return text
  }
  return [...stripMarks(compact)].slice(0, max - 1).join('') + '…'
}

export const rarityLabel = (rarity: string): string => rarity.charAt(0).toUpperCase() + rarity.slice(1)

/** "a [[Rare Mace]]", "an [[Uncommon Cable Cutter]]": the name in bold marks. */
export const withArticle = (name: string) => `${/^[AEIOU]/i.test(name) ? 'an' : 'a'} ${bold(name)}`
