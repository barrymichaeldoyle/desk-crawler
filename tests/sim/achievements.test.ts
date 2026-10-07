import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, ACHIEVEMENT_FAMILIES, MONSTER_LADDER, rarityBand } from '@trmnl-games/desk-crawler/content/achievements'
import { allSatisfied, familyProgress, measure, newlyUnlocked, satisfied, type AchievementState } from '@trmnl-games/desk-crawler/sim/core/achievements'
import { zeroCounters } from '@trmnl-games/desk-crawler/sim/core/starter'
import type { HeroCounters } from '@trmnl-games/desk-crawler/sim/core/types'
import { baseState, content, findSeed, run } from './helpers'

const state = (overrides: Partial<HeroCounters> = {}, extra: Partial<AchievementState> = {}): AchievementState => ({
  level: 1,
  bagCapacity: 6,
  keepsakeTotal: 0,
  ...extra,
  counters: { ...zeroCounters(), ...overrides },
})

describe('achievement catalog (D65)', () => {
  it('holds the launch set with unique, catalog-backed ids', () => {
    expect(ACHIEVEMENTS).toHaveLength(146)
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length)
    expect(ACHIEVEMENT_FAMILIES).toHaveLength(12 + 5 + 17 + 5)
    for (const def of ACHIEVEMENTS) {
      expect(ACHIEVEMENT_FAMILIES.some((f) => f.id === def.family)).toBe(true)
      expect(def.name.length).toBeLessThanOrEqual(24)
      expect(def.blurb.length).toBeLessThanOrEqual(90)
      const predicate = def.predicate
      if (predicate.kind === 'monster') expect(content.monsters.some((m) => m.id === predicate.monsterId)).toBe(true)
      if (predicate.kind === 'biomeMonsters') expect(content.biomes.some((b) => b.id === predicate.biomeId)).toBe(true)
      // Never satisfied by a fresh hero except by doing something.
      expect(measure(def.predicate, state(), content).target).toBeGreaterThan(0)
    }
  })

  it('gives every monster five tiers on the shared ladder, strictly increasing within each family', () => {
    for (const monster of content.monsters) {
      const tiers = ACHIEVEMENTS.filter((a) => a.family === `slay_${monster.id}`)
      expect(tiers.map((t) => t.tier)).toEqual([1, 2, 3, 4, 5])
      expect(tiers.map((t) => (t.predicate.kind === 'monster' ? t.predicate.atLeast : -1))).toEqual([...MONSTER_LADDER])
    }
    for (const family of ACHIEVEMENT_FAMILIES) {
      const targets = ACHIEVEMENTS.filter((a) => a.family === family.id).map((a) => measure(a.predicate, state(), content).target)
      const thresholds = ACHIEVEMENTS.filter((a) => a.family === family.id).map((a) => ('atLeast' in a.predicate ? a.predicate.atLeast : 0))
      for (let i = 1; i < thresholds.length; i += 1) expect(thresholds[i]!).toBeGreaterThan(thresholds[i - 1]!)
      expect(targets.every((t) => t > 0)).toBe(true)
    }
  })

  it('bands rarity by share of ranked heroes', () => {
    expect(rarityBand(0.9)).toBe('common')
    expect(rarityBand(0.5)).toBe('common')
    expect(rarityBand(0.3)).toBe('uncommon')
    expect(rarityBand(0.05)).toBe('rare')
    expect(rarityBand(0.009)).toBe('legendary')
    expect(rarityBand(0)).toBe('legendary')
  })
})

describe('achievement evaluation', () => {
  it('unlocks exactly the thresholds crossed between two states', () => {
    const before = state({ monsterWins: { paper_imp: 4 } })
    const after = state({ monsterWins: { paper_imp: 5 }, combatWins: 5 })
    expect(newlyUnlocked(before, after, content).map((a) => a.id)).toEqual(['slay_paper_imp_2'])
    expect(newlyUnlocked(after, after, content)).toEqual([])
  })

  it('fast path over many small steps equals one full pass', () => {
    const steps: AchievementState[] = []
    for (let i = 0; i <= 30; i += 1) steps.push(state({ monsterWins: { paper_imp: i, cable_serpent: Math.floor(i / 2) }, combatWins: i, ticksExplored: i * 3, eliteWins: Math.floor(i / 10) }, { level: 1 + Math.floor(i / 5) }))
    const incremental = new Set<string>()
    for (let i = 1; i < steps.length; i += 1) for (const def of newlyUnlocked(steps[i - 1]!, steps[i]!, content)) incremental.add(def.id)
    for (const def of allSatisfied(steps[0]!, content)) incremental.add(def.id)
    expect([...incremental].sort()).toEqual(allSatisfied(steps.at(-1)!, content).map((a) => a.id).sort())
  })

  it('evaluates set pieces over the pinned catalog', () => {
    const everyOnce = Object.fromEntries(content.monsters.map((m) => [m.id, 1]))
    expect(satisfied(ACHIEVEMENT_BY_ID.get('office_census')!.predicate, state({ monsterWins: everyOnce }), content)).toBe(true)
    expect(satisfied(ACHIEVEMENT_BY_ID.get('office_census')!.predicate, state({ monsterWins: { ...everyOnce, paper_imp: 0 } }), content)).toBe(false)
    expect(satisfied(ACHIEVEMENT_BY_ID.get('full_tour')!.predicate, state({ monsterWins: { paper_imp: 1, cable_serpent: 1, coffee_slime: 1 } }), content)).toBe(true)
    expect(satisfied(ACHIEVEMENT_BY_ID.get('full_tour')!.predicate, state({ monsterWins: { paper_imp: 9, cable_serpent: 9 } }), content)).toBe(false)
    const cubicles = Object.fromEntries(content.biomes[0]!.monsterIds.map((id) => [id, 25]))
    expect(satisfied(ACHIEVEMENT_BY_ID.get('floor_cleared_1')!.predicate, state({ monsterWins: cubicles }), content)).toBe(true)
    expect(measure(ACHIEVEMENT_BY_ID.get('floor_cleared_1')!.predicate, state({ monsterWins: { ...cubicles, paper_imp: 24 } }), content)).toEqual({ value: 3, target: 4 })
  })

  it('reads level, bag and keepsake predicates from the state', () => {
    expect(satisfied(ACHIEVEMENT_BY_ID.get('levels_1')!.predicate, state({}, { level: 4 }), content)).toBe(true)
    expect(satisfied(ACHIEVEMENT_BY_ID.get('bags_4')!.predicate, state({}, { bagCapacity: 20 }), content)).toBe(true)
    expect(satisfied(ACHIEVEMENT_BY_ID.get('bags_4')!.predicate, state({}, { bagCapacity: 16 }), content)).toBe(false)
    expect(satisfied(ACHIEVEMENT_BY_ID.get('keepsakes_3')!.predicate, state({}, { keepsakeTotal: 12 }), content)).toBe(true)
  })

  it('reports family progress toward the next tier', () => {
    const progress = familyProgress(state({ monsterWins: { paper_imp: 23 } }), content, new Set(['slay_paper_imp_1', 'slay_paper_imp_2']))
    const imp = progress.find((f) => f.family === 'slay_paper_imp')!
    expect(imp).toMatchObject({ tier: 2, tiers: 5, value: 23, target: 25 })
    expect(imp.earned?.id).toBe('slay_paper_imp_2')
    expect(imp.next?.id).toBe('slay_paper_imp_3')
    const unearned = progress.find((f) => f.family === 'elites')!
    expect(unearned).toMatchObject({ tier: 0, earned: null, value: 0, target: 1 })
    const done = familyProgress(state({ trips: 500 }), content, new Set(['trips_1', 'trips_2', 'trips_3'])).find((f) => f.family === 'trips')!
    expect(done.next).toBeNull()
    expect(done.tier).toBe(3)
  })
})

describe('simulator lifetime counters (O14)', () => {
  it('counts wins per monster and elite wins', () => {
    const { hero, inventory } = baseState({ level: 3, hp: 90 })
    const { result } = findSeed(hero, inventory, (r) => r.event?.detail.outcome.variant === 'combat' && r.event.detail.outcome.outcome === 'victory')
    const outcome = result.event!.detail.outcome as { monsterId: string; elite: boolean }
    expect(result.nextHero.counters.monsterWins).toEqual({ [outcome.monsterId]: 1 })
    expect(result.nextHero.counters.combatWins).toBe(1)
    expect(result.nextHero.counters.eliteWins).toBe(outcome.elite ? 1 : 0)
    expect(hero.counters.monsterWins).toEqual({})
  })

  it('counts avoided traps, rest ticks, jackpots and rare finds', () => {
    const { hero, inventory } = baseState()
    const avoided = findSeed(hero, inventory, (r) => r.event?.detail.outcome.variant === 'trap' && r.event.detail.outcome.avoided).result
    expect(avoided.nextHero.counters.trapsAvoided).toBe(1)
    const rested = findSeed(hero, inventory, (r) => r.event?.detail.outcome.variant === 'rest').result
    expect(rested.nextHero.counters.restTicks).toBe(1)
    const jackpot = findSeed(hero, inventory, (r) => r.event?.detail.outcome.variant === 'loot' && r.event.detail.outcome.jackpot).result
    expect(jackpot.nextHero.counters.jackpots).toBe(1)
    const rare = findSeed(hero, inventory, (r) => r.itemChanges.some((c) => c.type === 'create' && c.item.rarity === 'rare')).result
    expect(rare.nextHero.counters.rareFinds).toBe(1)
    expect(rare.nextHero.counters.itemsFound).toBe(1)
  })

  it('counts trips on arrival and resting ticks while resting', () => {
    const { hero, inventory } = baseState({ status: 'travelling', targetBiomeId: 'server_room', arriveAtTick: 10, level: 4, hp: 100 })
    const arrived = run(hero, inventory, 10)
    expect(arrived.nextHero.counters.trips).toBe(1)
    const resting = baseState({ status: 'resting', hp: 10 })
    expect(run(resting.hero, resting.inventory).nextHero.counters.restTicks).toBe(1)
  })

  it('counts an automatic potion', () => {
    const { hero, inventory } = baseState({ hp: 5 })
    const result = run(hero, inventory)
    expect(result.metrics.potionsUsed).toBe(1)
    expect(result.nextHero.counters.potionsUsed).toBe(1)
  })
})
