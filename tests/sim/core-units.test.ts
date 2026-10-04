import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { catalogs } from '@trmnl-games/desk-crawler/content'
import { validateCatalog } from '@trmnl-games/desk-crawler/content/validate'
import { composeSummary } from '@trmnl-games/desk-crawler/sim/core/narrative'
import { createRng, pickWeighted } from '@trmnl-games/desk-crawler/sim/core/rng'
import { applyXp, levelGroup, maxHp, xpToLeave } from '@trmnl-games/desk-crawler/sim/core/stats'
import { creditTick, projectAtPublication } from '@trmnl-games/desk-crawler/sim/score'
import { deriveStreamSeed, deriveStreamSeeds } from '@trmnl-games/desk-crawler/sim/seed'

describe('rng', () => {
  it('is deterministic and stays inside its bounds', () => {
    const a = createRng(42)
    const b = createRng(42)
    for (let i = 0; i < 10_000; i += 1) {
      const x = a.int(80, 120)
      expect(x).toBe(b.int(80, 120))
      expect(x).toBeGreaterThanOrEqual(80)
      expect(x).toBeLessThanOrEqual(120)
    }
    expect(a.draws).toBe(10_000)
  })

  it('handles chance edges and weighted picks', () => {
    const rng = createRng(7)
    for (let i = 0; i < 1000; i += 1) {
      expect(rng.chance(0)).toBe(false)
      expect(rng.chance(100)).toBe(true)
      expect(pickWeighted(rng, [['a', 0], ['b', 5]])).toBe('b')
    }
  })
})

describe('seed v1', () => {
  it('derives stable, distinct stream seeds', () => {
    const pinned = deriveStreamSeed('world-seed', 'hero-1', 120, 1, 'encounter')
    expect(pinned).toBe(deriveStreamSeed('world-seed', 'hero-1', 120, 1, 'encounter'))
    const all = Object.values(deriveStreamSeeds('world-seed', 'hero-1', 120, 1))
    expect(new Set(all).size).toBe(4)
    expect(deriveStreamSeed('world-seed', 'hero-1', 121, 1, 'encounter')).not.toBe(pinned)
    expect(Number.isSafeInteger(pinned) && pinned >= 0 && pinned < 2 ** 32).toBe(true)
  })
})

describe('stats', () => {
  it('matches the documented formulas', () => {
    expect([maxHp(1), maxHp(4), maxHp(8)]).toEqual([100, 136, 184])
    expect([xpToLeave(1), xpToLeave(2), xpToLeave(4)]).toEqual([50, 151, 459])
  })

  it('applies multiple level-ups', () => {
    expect(applyXp(1, 0, 50 + 151 + 10)).toEqual({ level: 3, xp: 10, levelsGained: 2, maxHpGain: 24 })
  })

  it('uses the approved level groups', () => {
    expect([1, 3, 4, 7, 8, 11, 12, 15, 16].map((l) => levelGroup(l).key)).toEqual(['1-3', '1-3', '4-7', '4-7', '8-11', '8-11', '12-15', '12-15', '16-19'])
  })
})

describe('content catalogs', () => {
  it.each(Object.entries(catalogs))('%s passes validation including the D26 content floor', (_id, catalog) => {
    expect(validateCatalog(catalog)).toEqual([])
  })
})

describe('summaries', () => {
  it('shortens flavor before dropping consequences', () => {
    const long = 'A'.repeat(80)
    expect(composeSummary(long, 'Short.', ['Bag full: find held.'], 90)).toBe('Short. Bag full: find held.')
    expect([...composeSummary(long, long, ['x'.repeat(30)], 90)].length).toBeLessThanOrEqual(90)
  })
})

describe('hourly score projection (D31)', () => {
  it('reproduces the documented fixture exactly', () => {
    const fixture = JSON.parse(readFileSync('docs/fixtures/ranking-score-windows.json', 'utf8'))
    const ms = (iso: string) => Date.parse(iso)
    const buckets = fixture.bucketsBeforeFold.map((b: { hourStart: string; xp: number }) => ({ hourStart: ms(b.hourStart), xp: b.xp }))
    const acc = { scoreHour: ms(fixture.accumulatorBeforeFold.scoreHour), scoreHourXp: fixture.accumulatorBeforeFold.scoreHourXp }
    const result = projectAtPublication(buckets, acc, ms(fixture.scoreAt))
    expect(result.xp24h).toBe(fixture.expected.xp24h)
    expect(result.xp7d).toBe(fixture.expected.xp7d)
    expect(result.buckets.map((b) => ({ hourStart: new Date(b.hourStart).toISOString().replace('.000', ''), xp: b.xp }))).toEqual(fixture.expected.bucketsAfterFold)
    expect(result.accumulator).toEqual({ scoreHourXp: 0 })
  })

  it('folds a stale accumulator after a missed publication', () => {
    const h = 3_600_000
    const first = creditTick({ scoreHourXp: 0 }, 10 * h + 13 * 60_000, 20)
    expect(first).toEqual({ accumulator: { scoreHour: 10 * h, scoreHourXp: 20 } })
    const same = creditTick(first.accumulator, 10 * h + 28 * 60_000, 5)
    expect(same.accumulator).toEqual({ scoreHour: 10 * h, scoreHourXp: 25 })
    const later = creditTick(same.accumulator, 12 * h + 13 * 60_000, 7)
    expect(later).toEqual({ accumulator: { scoreHour: 12 * h, scoreHourXp: 7 }, fold: { hourStart: 10 * h, xp: 25 } })
  })
})

describe('narrative articles', () => {
  it('uses "an" before vowel-initial names and marks names bold', async () => {
    const { fill } = await import('@trmnl-games/desk-crawler/sim/core/narrative')
    expect(fill('Rebooted a {monster}. +{xp} XP.', { monster: 'Overheated Rack', xp: 3 })).toBe('Rebooted an [[Overheated Rack]]. +3 XP.')
    expect(fill('A {monster} crashed.', { monster: 'Overheated Rack' })).toBe('An [[Overheated Rack]] crashed.')
    expect(fill('Beat a {monster}.', { monster: 'Paper Imp' })).toBe('Beat a [[Paper Imp]].')
    expect(fill('Found a {item} and {gold} gold.', { item: 'Rare Mace', gold: 4 })).toBe('Found a [[Rare Mace]] and 4 gold.')
  })
})

describe('screen log wrapping', () => {
  it('keeps values with their units', async () => {
    const { keepUnitsTogether } = await import('@trmnl-games/desk-crawler/payload')
    expect(keepUnitsTogether('Beat a Paper Imp. +14 XP, +2 gold. Reached level 12! Revives in 8 ticks. -5 HP.')).toBe(
      'Beat a Paper Imp. +14 XP, +2 gold. Reached level 12! Revives in 8 ticks. -5 HP.',
    )
  })
})
