import { describe, expect, it } from 'vitest'
import { catalogs } from '@trmnl-games/desk-crawler/content'
import { displayLogDeltas, logPresentation } from '@trmnl-games/desk-crawler/log'
import { fill } from '@trmnl-games/desk-crawler/sim/core/narrative'

const deltas = { xpEarned: 14, gold: 5, hp: -12 }
const present = (summary: string, changes = deltas, kind = 'combat') => logPresentation({ summary, kind, deltas: changes })

describe('story and stat changes', () => {
  it('shows a found potion even when it cancels consumption in the same tick', () => {
    const changes = displayLogDeltas({ deltas: { xpEarned: 0, gold: 0, hp: 20 }, detail: { outcome: { variant: 'loot', found: 'potion', potionFullFallback: false } } })
    expect(present('Found a healing potion. Drank a potion.', changes, 'loot'))
      .toEqual({ narrative: 'Found a healing potion. Drank a potion.', changes: ['+1 healing potion', '+20 HP'] })
  })

  it('does not report a potion for full-stack gold fallback or narrative alone', () => {
    const zero = { xpEarned: 0, gold: 0, hp: 0 }
    const fallback = displayLogDeltas({ deltas: { ...zero, gold: 5 }, detail: { outcome: { variant: 'loot', found: 'gold', potionFullFallback: true } } })
    expect(present('Potion pouch full; sold a spare for 5 gold.', fallback, 'loot').changes).toEqual(['+5 gold'])
    expect(present('Found a healing potion.', zero, 'loot').changes).toEqual(['No effect'])
    expect(displayLogDeltas({ deltas: zero, detail: { operation: 'drink_potion' } }).potionsFound).toBe(0)
  })
  it('keeps expense-claim flavor and shows the reward once', () => {
    expect(present('An old expense claim finally paid out: 2 gold.', { xpEarned: 0, gold: 2, hp: 0 }, 'loot'))
      .toEqual({ narrative: 'An old expense claim finally paid out.', changes: ['+2 gold'] })
  })

  it('uses net HP and earned XP, preserving milestone, gear and potion consequences', () => {
    const story = 'Beat [[Cable Serpent]]. +14 XP, +5 gold. Reached level 6! Found a [[Rare Mace]]. Drank a potion.'
    expect(present(story)).toEqual({ narrative: 'Beat [[Cable Serpent]]. Reached level 6! Found a [[Rare Mace]]. Drank a potion.', changes: ['+14 XP', '+5 gold', '−12 HP'] })
    expect(present(story, { ...deltas, hp: 8 }).changes).toEqual(['+14 XP', '+5 gold', '+8 HP'])
  })

  it.each([
    ['Knocked out by a [[Gremlin]]. Lost 64 gold.', 'Knocked out by a [[Gremlin]].'],
    ['Retreated from a [[Gremlin]]. Dropped 2 gold.', 'Retreated from a [[Gremlin]].'],
    ['Tripped over another loose cable. -12 HP.', 'Tripped over another loose cable.'],
    ['Caught a power nap. +20 HP.', 'Caught a power nap.'],
    ['Revived in the [[Office Cubicles]] with 30 HP.', 'Revived in the [[Office Cubicles]].'],
    ['Back on their feet in the [[Office Cubicles]]. 30 HP.', 'Back on their feet in the [[Office Cubicles]].'],
    ['A trap hit for 12 HP.', 'A trap struck.'],
    ['Potion pouch full; sold a spare for 5 gold.', 'Potion pouch full; sold a spare.'],
    ['Found 5 gold under a raised floor tile.', 'Found gold under a raised floor tile.'],
  ])('removes amounts from %s', (summary, narrative) => {
    expect(present(summary).narrative).toBe(narrative)
  })

  it('preserves numbers in names and non-stat consequences, omitting zero deltas', () => {
    expect(present('Found a [[24 gold Mace]]. Bag full. Holding it until you make room. Reached level 12!', { xpEarned: 0, gold: 0, hp: 0 }))
      .toEqual({ narrative: 'Found a [[24 gold Mace]]. Bag full. Holding it until you make room. Reached level 12!', changes: ['No effect'] })
    expect(present('+5 gold.').narrative).toBe('Found gold.')
  })

  it('keeps summaries when no structured deltas are supplied', () => {
    expect(logPresentation({ summary: 'Beat a Paper Imp. +8 XP, +3 gold.', kind: 'combat' }))
      .toEqual({ narrative: 'Beat a Paper Imp. +8 XP, +3 gold.', changes: [] })
  })

  it('covers every authored stat-bearing narrative in every catalog', () => {
    const strings = (value: unknown): string[] => typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : []
    for (const catalog of Object.values(catalogs)) {
      for (const template of strings(catalog.narrative)) {
        const summary = fill(template, { gold: 5, xp: 14, damage: 12, heal: 20, monster: 'Cable Serpent', item: 'Rare Mace', destination: 'Office Cubicles', ticks: 8, capacity: 16 })
        const { narrative } = present(summary)
        expect(narrative, `${catalog.contentVersion}: ${template}`).not.toMatch(/\d+ (?:gold|HP|XP)/)
        expect(narrative).not.toMatch(/:\s*\.|for\s*\.|with\s*\./)
        expect(narrative.length).toBeGreaterThan(0)
      }
    }
  })
})
