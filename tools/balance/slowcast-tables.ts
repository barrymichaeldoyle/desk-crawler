/** Prints Slow Cast content v1 as the spec's Markdown tables: `pnpm tsx tools/balance/slowcast-tables.ts`. */
import { contentV1 as c } from '@trmnl-games/slow-cast/content'
import { formatWeight } from '@trmnl-games/slow-cast/sim/progress'

const waterName = (id: string) => c.waters.find((w) => w.id === id)!.name
const list = (xs: readonly string[] | undefined) => (xs ? xs.join(', ') : '')
const out: string[] = []
out.push('| Water | Species | Rarity | Weight | Bait | Time / weather | Price | XP |', '| --- | --- | --- | --- | --- | --- | --- | --- |')
let last = ''
for (const s of c.species) {
  const water = s.water === last ? '' : waterName(s.water)
  last = s.water
  const bait = s.baits.map((b) => (b === 'strip' ? 'mackerel strip' : b)).join(', ') + (s.anyBait ? ', bare hook' : '')
  const when = [list(s.times), list(s.weather)].filter(Boolean).join(' / ')
  out.push(`| ${water} | ${s.name} | ${s.rarity}${s.weight ? ` (weight ${s.weight})` : ''} | ${formatWeight(s.minGrams)} to ${formatWeight(s.maxGrams)} | ${bait} | ${when} | ${s.price} | ${s.xp} |`)
}
out.push('', '| Water | Unlock | Base bite | Baits used |', '| --- | --- | --- | --- |')
for (const w of c.waters) {
  const access = w.access ? c.access.find((a) => a.id === w.access)! : undefined
  out.push(`| ${w.name} | ${w.unlockLevel === 1 ? 'start' : `level ${w.unlockLevel}${access ? ` and ${access.name} (${access.price} gold)` : ''}`} | ${w.biteBasePermille / 10}% | ${w.baits.map((b) => (b === 'strip' ? 'mackerel strip' : b)).join(', ')} |`)
}
out.push('', '| Rod | Lands up to | Bite bonus | Price |', '| --- | --- | --- | --- |')
for (const r of c.rods) out.push(`| ${r.name} | ${formatWeight(r.limitGrams)} | ${r.biteBonusPercent ? `+${r.biteBonusPercent}%` : '0'} | ${r.price || 'start'} |`)
out.push('', '| Bait | Fish per tub | Price |', '| --- | --- | --- |')
for (const b of c.baits) out.push(`| ${b.name} | ${b.castsPerTub} | ${b.price} |`)
out.push('', '| Cooler | Holds | Price |', '| --- | --- | --- |')
for (const k of c.coolers) out.push(`| ${k.name} | ${k.capacity} | ${k.price || 'start'} |`)
console.log(out.join('\n'))
