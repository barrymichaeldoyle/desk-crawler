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

  it('names the HP an automatic potion restored beside net HP, and not again for a manual drink', () => {
    const auto = displayLogDeltas({ deltas: { xpEarned: 9, gold: 0, hp: -3 }, detail: { outcome: { variant: 'combat' }, potionHealing: 12 } })
    expect(present('Beat [[Paper Imp]]. +9 XP. Drank a potion.', auto, 'combat').changes).toEqual(['+9 XP', '−3 HP', '+12 HP from potion'])
    const manual = displayLogDeltas({ deltas: { xpEarned: 0, gold: 0, hp: 12 }, detail: { operation: 'use_potion' } })
    expect(present('Drank a potion.', manual, 'command').changes).toEqual(['+12 HP'])
    expect(displayLogDeltas({ deltas: { xpEarned: 0, gold: 0, hp: 5 }, detail: { outcome: { variant: 'rest' } } }).potionHealing).toBe(0)
  })
  it('does not report a potion for full-stack gold fallback or narrative alone', () => {
    const zero = { xpEarned: 0, gold: 0, hp: 0 }
    const fallback = displayLogDeltas({ deltas: { ...zero, gold: 5 }, detail: { outcome: { variant: 'loot', found: 'gold', potionFullFallback: true } } })
    expect(present('Potion pouch full; sold a spare for 5 gold.', fallback, 'loot').changes).toEqual(['+5 gold'])
    expect(present('Found a healing potion.', zero, 'loot').changes).toEqual(['No effect'])
    // Travel and companion actions never meant to change stats, so they carry no "No effect" chip.
    expect(present('Set off for the Server Room.', zero, 'system').changes).toEqual([])
    expect(present('Arrived in the Server Room.', zero, 'travel').changes).toEqual([])
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

describe('merchant and pouch chips (D77/D78)', () => {
  it('names open offers, bought potions and a bigger pouch instead of No effect', () => {
    const visit = displayLogDeltas({ deltas: { xpEarned: 0, gold: 0, hp: 0 }, detail: { outcome: { variant: 'merchant', offers: [{}, {}] } } })
    expect(logPresentation({ summary: 'A [[Wandering Merchant]] set up a trestle table. Open for 4 adventures.', kind: 'merchant', deltas: visit }).changes).toEqual(['2 offers open'])
    const bought = displayLogDeltas({ deltas: { xpEarned: 0, gold: -48, hp: 0 }, detail: { operation: 'buy_offer', potionsBought: 2 } })
    expect(logPresentation({ summary: 'Bought 2 healing potions from the merchant.', kind: 'system', deltas: bought }).changes).toEqual(['−48 gold', '+2 healing potions'])
    const pouch = displayLogDeltas({ deltas: { xpEarned: 14, gold: 5, hp: -4 }, detail: { outcome: { variant: 'combat' }, pouchUpgrade: { from: 20, to: 30 } } })
    expect(logPresentation({ summary: 'Beat a [[Paper Imp]]. +14 XP, +5 gold. Found a [[Lunchbox]]! Holds 30 potions.', kind: 'combat', deltas: pouch }).changes).toEqual(['+14 XP', '+5 gold', '−4 HP', 'Pouch holds 30'])
  })
})

describe('to-do lines (D112)', () => {
  it('keep every number in a label and show the reward as the only change', () => {
    expect(present('Ticked off: Earn 50 gold adventuring.', { xpEarned: 0, gold: 16, hp: 0 }, 'todo')).toEqual({ narrative: 'Ticked off: Earn 50 gold adventuring.', changes: ['+16 gold'] })
    expect(present('Stand-up: Dodge 2 traps. Earn 140 gold adventuring.', { xpEarned: 0, gold: 0, hp: 0 }, 'todo')).toEqual({ narrative: 'Stand-up: Dodge 2 traps. Earn 140 gold adventuring.', changes: [] })
  })
})
