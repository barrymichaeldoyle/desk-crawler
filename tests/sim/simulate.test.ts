import { describe, expect, it } from 'vitest'
import { applyItemChanges } from '@trmnl-games/desk-crawler/sim/core/apply'
import { SimulationInvariantError } from '@trmnl-games/desk-crawler/sim/core/invariants'
import { codePoints } from '@trmnl-games/desk-crawler/sim/core/narrative'
import { maxHp, xpToLeave } from '@trmnl-games/desk-crawler/sim/core/stats'
import type { HeroState, ItemSnapshot } from '@trmnl-games/desk-crawler/sim/core/types'
import { baseState, content, fillBag, findSeed, run } from './helpers'

const c = content.constants

describe('determinism', () => {
  it('returns identical results for identical complete inputs', () => {
    const { hero, inventory } = baseState({ biomeId: 'server_room', level: 5, hp: 120 })
    for (let seed = 0; seed < 200; seed += 1) {
      expect(run(hero, inventory, 10, seed)).toEqual(run(hero, inventory, 10, seed))
    }
  })

  it('never lets the narrative stream change rewards or state', () => {
    const { hero, inventory } = baseState({ biomeId: 'server_room', level: 5, hp: 120 })
    for (let seed = 0; seed < 300; seed += 1) {
      const a = run(hero, inventory, 10, seed)
      const input = { hero, inventory, tick: 10, content, simulationVersion: 1, streams: { ...baseSeeds(seed), narrative: 12345 } }
      const b = simulate(input)
      expect(b.nextHero).toEqual(a.nextHero)
      expect(b.itemChanges).toEqual(a.itemChanges)
      expect(b.event?.deltas).toEqual(a.event?.deltas)
    }
  })
})

describe('waiting states', () => {
  it('leaves a paused hero unchanged with no event', () => {
    const { hero, inventory } = baseState({ status: 'paused', pausedFromStatus: 'exploring' })
    const result = run(hero, inventory)
    expect(result.disposition).toBe('paused')
    expect(result.event).toBeUndefined()
    expect(result.nextHero).toEqual(hero)
  })

  it('keeps a sleeping hero asleep until its wake tick', () => {
    const { hero, inventory } = baseState({ status: 'sleeping', wakeAtTick: 11 })
    const result = run(hero, inventory, 10)
    expect(result.disposition).toBe('sleeping')
    expect(result.nextHero).toEqual(hero)
  })

  it('wakes into an ordinary encounter when no destination is pending', () => {
    const { hero, inventory } = baseState({ status: 'sleeping', wakeAtTick: 10 })
    const result = run(hero, inventory, 10, 3)
    expect(result.metrics.wakes).toBe(1)
    expect(result.metrics.encounter).not.toBe('none')
    expect(result.nextHero.wakeAtTick).toBeUndefined()
  })

  it('wakes into travel with a D29 destination: no encounter, arrival next tick', () => {
    const { hero, inventory } = baseState({ status: 'sleeping', wakeAtTick: 10, targetBiomeId: 'server_room', level: 4, hp: maxHp(4) })
    const result = run(hero, inventory, 10)
    expect(result.disposition).toBe('departed')
    expect(result.nextHero).toMatchObject({ status: 'travelling', arriveAtTick: 11, targetBiomeId: 'server_room' })
    expect(result.metrics.encounter).toBe('none')
    expect(result.nextHero.counters.ticksExplored).toBe(0)
    const arrived = run(result.nextHero, inventory, 11)
    expect(arrived.disposition).toBe('arrived')
    expect(arrived.nextHero.biomeId).toBe('server_room')
    expect(arrived.event?.deltas).toEqual({ xpEarned: 0, gold: 0, hp: 0 })
  })

  it('treats a due wake with a held find as an invariant failure', () => {
    const { hero, inventory } = baseState({ status: 'sleeping', wakeAtTick: 10, heldItemId: 'i000' })
    const { weaponId: _unequipped, ...holding } = hero
    expect(() => run(holding, inventory, 10)).toThrow(SimulationInvariantError)
  })

  it('revives exactly at T+8 in the safe biome at half HP', () => {
    const { hero, inventory } = baseState({ status: 'dead', hp: 0, reviveAtTick: 18, biomeId: 'server_room', level: 5 })
    expect(run(hero, inventory, 17).disposition).toBe('waiting_dead')
    const revived = run(hero, inventory, 18)
    expect(revived.disposition).toBe('revived')
    expect(revived.nextHero).toMatchObject({ status: 'exploring', biomeId: 'office_cubicles', hp: Math.ceil(maxHp(5) / 2) })
    expect(revived.nextHero.reviveAtTick).toBeUndefined()
    expect(revived.metrics.encounter).toBe('none')
  })

  it('heals a resting hero and resumes exploring only at 75%', () => {
    const max = maxHp(1)
    const below = run(baseState({ status: 'resting', hp: 50 }).hero, baseState().inventory)
    expect(below.nextHero).toMatchObject({ hp: 70, status: 'resting' })
    const reach = run(baseState({ status: 'resting', hp: 55 }).hero, baseState().inventory)
    expect(reach.nextHero).toMatchObject({ hp: 75, status: 'exploring' })
    expect(reach.nextHero.hp * 100).toBeGreaterThanOrEqual(max * 75)
    expect(below.metrics.encounter).toBe('none')
  })
})

describe('sustain', () => {
  it('drinks one potion below 35% and not at exactly 35%', () => {
    const at = run(baseState({ hp: 35 }).hero, baseState().inventory)
    expect(at.metrics.potionsUsed).toBe(0)
    const below = run(baseState({ hp: 34 }).hero, baseState().inventory)
    expect(below.metrics.potionsUsed).toBe(1)
  })

  it('rests below 25% after an empty potion check, keeping the potion consumption', () => {
    const { hero, inventory } = baseState({ hp: 10 }, 0)
    const result = run(hero, inventory)
    expect(result.disposition).toBe('rested')
    expect(result.nextHero).toMatchObject({ status: 'resting', hp: 30 })
    expect(result.metrics.encounter).toBe('none')
  })

  it('removes an emptied potion stack row', () => {
    const { hero, inventory } = baseState({ hp: 20 }, 1)
    const result = findSeed(hero, inventory, (r) => r.metrics.potionsUsed === 1 && !r.itemChanges.some((x) => x.type !== 'potion_decrement')).result
    expect(result.itemChanges).toContainEqual({ type: 'potion_decrement', itemId: 'i999', deleteRow: true })
  })
})

describe('encounters and outcomes', () => {
  it('never kills a hero in the Office: rescue at 1 HP instead', () => {
    const { hero, inventory } = baseState({ hp: 40 }, 0)
    for (let seed = 0; seed < 3000; seed += 1) {
      const result = run({ ...hero, hp: 26 }, inventory, 10, seed)
      expect(result.nextHero.status).not.toBe('dead')
      if (result.metrics.rescues) {
        expect(result.nextHero).toMatchObject({ hp: 1, status: 'resting' })
        expect(result.nextHero.gold).toBe(hero.gold)
      }
    }
  })

  it('applies death outside the Office: 10% gold loss, revival in 8 ticks, gear kept', () => {
    const { hero, inventory } = baseState({ biomeId: 'cafeteria_depths', level: 8, hp: 60, gold: 105 }, 0)
    const { result } = findSeed(hero, inventory, (r) => r.metrics.deaths === 1, 40)
    expect(result.nextHero).toMatchObject({ status: 'dead', hp: 0, gold: 95, reviveAtTick: 48 })
    expect(result.event?.kind).toBe('death')
    // The story leaves the revive time to the status line (D45).
    expect(result.event?.summary).toMatch(/Lost 10 gold\./)
    expect(result.event?.summary).not.toMatch(/\bticks?\b/)
    expect(result.itemChanges).toEqual([])
  })

  it('retreats after six rounds and drops 5% gold', () => {
    const { hero, inventory } = baseState({ biomeId: 'cafeteria_depths', level: 8, hp: maxHp(8), gold: 200 }, 0)
    const { result } = findSeed(hero, inventory, (r) => r.metrics.retreats === 1)
    const detail = result.event?.detail.outcome
    expect(detail).toMatchObject({ variant: 'combat', outcome: 'retreat' })
    expect(detail && 'rounds' in detail ? detail.rounds.length : 0).toBe(6)
    expect(result.nextHero.gold).toBe(190)
  })

  it('levels up across multiple levels, adding only the max-HP increase', () => {
    const { hero, inventory } = baseState({ level: 1, xp: xpToLeave(1) - 1, hp: 60 })
    const { result } = findSeed(hero, inventory, (r) => r.metrics.victories === 1)
    expect(result.nextHero.level).toBe(2)
    const outcome = result.event!.detail.outcome
    const taken = outcome.variant === 'combat' ? outcome.rounds.reduce((sum, round) => sum + round.monsterDamage, 0) : 0
    expect(result.nextHero.hp).toBe(Math.min(maxHp(2), 60 - taken + (maxHp(2) - maxHp(1))))
    expect(result.nextHero.lastLevelUpTick).toBe(10)
    expect(result.event?.kind).toBe('levelup')
    expect(result.nextHero.lifetimeXp).toBe(result.event?.deltas.xpEarned)
  })

  it('turns a full potion stack into a gold outcome without creating a potion', () => {
    const { hero, inventory } = baseState({}, c.potionStackCap)
    const { result } = findSeed(hero, inventory, (r) => r.event?.detail.outcome.variant === 'loot' && r.event.detail.outcome.potionFullFallback)
    expect(result.itemChanges).toEqual([])
    expect(result.nextHero.gold).toBeGreaterThan(0)
  })

  it('keeps exploring with a full bag until an actual gear find', () => {
    const { hero, inventory } = baseState()
    const full = fillBag(inventory, hero.bagCapacity + 2)
    const quiet = findSeed(hero, full, (r) => r.metrics.encounter === 'rest').result
    expect(quiet.nextHero.status).toBe('exploring')
  })

  it('holds the first overflow find, finishes earned effects, then sleeps', () => {
    const { hero, inventory } = baseState()
    const full = fillBag(inventory, hero.bagCapacity + 2)
    const { result } = findSeed(hero, full, (r) => r.metrics.heldFinds === 1)
    expect(result.disposition).toBe('inventory_sleep_started')
    expect(result.nextHero.status).toBe('sleeping')
    expect(result.itemChanges).toContainEqual(expect.objectContaining({ type: 'create', destination: 'held' }))
    expect(result.event?.summary).toMatch(/Bag full/)
    let n = 0
    const applied = applyItemChanges(result.nextHero, full, result.itemChanges, () => `z${n++}`)
    expect(applied.hero.heldItemId).toBe('z0')
    const asleep = run(applied.hero, applied.inventory, 11)
    expect(asleep.disposition).toBe('sleeping')
    expect(asleep.event).toBeUndefined()
  })

  it('produces elite victories and jackpots at roughly their configured rates', () => {
    const { hero, inventory } = baseState({ level: 20, hp: maxHp(20) })
    let combats = 0
    let elites = 0
    let goldLoot = 0
    let jackpots = 0
    for (let seed = 0; seed < 20_000; seed += 1) {
      const result = run(hero, inventory, 10, seed)
      if (result.metrics.encounter === 'combat') combats += 1
      elites += result.metrics.elites
      const outcome = result.event?.detail.outcome
      if (outcome?.variant === 'loot' && outcome.found === 'gold') goldLoot += 1
      jackpots += result.metrics.jackpots
    }
    expect(elites / combats).toBeGreaterThan(0.015)
    expect(elites / combats).toBeLessThan(0.045)
    expect(jackpots / goldLoot).toBeGreaterThan(0.004)
    expect(jackpots / goldLoot).toBeLessThan(0.02)
  })
})

describe('fuzzed long runs', () => {
  it('keeps every invariant and summary budget across 200 heroes x 500 ticks', () => {
    let nextId = 0
    for (let heroIndex = 0; heroIndex < 200; heroIndex += 1) {
      let { hero, inventory } = baseState()
      for (let tick = 1; tick <= 500; tick += 1) {
        const result = run(hero, inventory, tick, heroIndex * 10_000 + tick)
        if (result.event) expect(codePoints(result.event.summary)).toBeLessThanOrEqual(c.summaryMaxCodePoints)
        const applied = applyItemChanges(result.nextHero, inventory, result.itemChanges, () => `n${String(nextId++).padStart(8, '0')}`)
        hero = applied.hero
        inventory = applied.inventory
        hero = manage(hero, inventory, tick)
        inventory = keepEquipped(hero, inventory)
      }
    }
  })
})

// --------------------------------------------------------------- local helpers

import { simulateHero as simulate } from '@trmnl-games/desk-crawler/sim/core/simulate'
import { seeds as baseSeeds } from './helpers'

/** Crude occasional management so long runs exercise sleep, wake and travel. */
function manage(hero: HeroState, inventory: ItemSnapshot[], tick: number): HeroState {
  if (tick % 288 !== 0) return hero
  const next: { -readonly [K in keyof HeroState]: HeroState[K] } = { ...hero }
  delete next.heldItemId
  if (next.status === 'sleeping') next.wakeAtTick = tick + 1
  const unlocked = content.biomes.filter((b) => b.unlockLevel <= next.level).at(-1)!
  if (next.status === 'sleeping' && unlocked.id !== next.biomeId) next.targetBiomeId = unlocked.id
  void inventory
  return next
}

function keepEquipped(hero: HeroState, inventory: ItemSnapshot[]): ItemSnapshot[] {
  return inventory.filter((item) => item.kind === 'potion' || item.id === hero.weaponId || item.id === hero.armorId || item.id === hero.heldItemId)
}
