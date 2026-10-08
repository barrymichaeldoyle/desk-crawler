import { describe, expect, it } from 'vitest'
import { contentV1 } from '@trmnl-games/desk-crawler/content/v1'
import { validateCatalog } from '@trmnl-games/desk-crawler/content/validate'
import { applyItemChanges } from '@trmnl-games/desk-crawler/sim/core/apply'
import { bagUsed, nextEarlyTier } from '@trmnl-games/desk-crawler/sim/core/bag'
import { codePoints } from '@trmnl-games/desk-crawler/sim/core/narrative'
import { simulateHero, SIMULATION_VERSION } from '@trmnl-games/desk-crawler/sim/core/simulate'
import { starterHero, starterKit } from '@trmnl-games/desk-crawler/sim/core/starter'
import { xpToLeave } from '@trmnl-games/desk-crawler/sim/core/stats'
import type { ContentCatalog, HeroState, ItemSnapshot, SimulationResult } from '@trmnl-games/desk-crawler/sim/core/types'
import { seeds, withId } from './helpers'

const content = contentV1
const tiers = content.bagLadder!.tiers

function newHero(overrides: Partial<HeroState> = {}, catalog: ContentCatalog = content): { hero: HeroState; inventory: ItemSnapshot[] } {
  const kit = starterKit(catalog)
  const inventory = [withId(kit.weapon, 'i000'), withId(kit.armor, 'i001'), withId(kit.potions, 'i999')]
  return { hero: { ...starterHero('hero1', catalog, 0), weaponId: 'i000', armorId: 'i001', ...overrides }, inventory }
}

/** Add `count` unequipped gear rows. */
function withSpares(inventory: ItemSnapshot[], count: number): ItemSnapshot[] {
  const spare = starterKit(content).weapon
  const extra = Array.from({ length: count }, (_, i) => withId(spare, `i${String(i + 2).padStart(3, '0')}`))
  return [...inventory, ...extra].sort((a, b) => (a.id < b.id ? -1 : 1))
}

const run = (hero: HeroState, inventory: ItemSnapshot[], seed: number, tick = 10, catalog: ContentCatalog = content): SimulationResult =>
  simulateHero({ hero, inventory, tick, content: catalog, simulationVersion: SIMULATION_VERSION, streams: seeds(seed) })

function findSeed(hero: HeroState, inventory: ItemSnapshot[], predicate: (result: SimulationResult) => boolean, limit = 50_000) {
  for (let seed = 0; seed < limit; seed += 1) {
    const result = run(hero, inventory, seed)
    if (predicate(result)) return result
  }
  throw new Error('no seed satisfied the predicate')
}

describe('bag ladder (D61)', () => {
  it('is a valid catalog that fits the bounded inventory read', () => {
    expect(validateCatalog(content)).toEqual([])
    expect(tiers.map((tier) => tier.capacity)).toEqual([6, 10, 13, 16, 20])
  })

  it('starts a new hero with a six-slot bag that excludes equipped gear', () => {
    const { hero, inventory } = newHero()
    expect(hero.bagCapacity).toBe(6)
    expect(bagUsed(hero, inventory)).toBe(0)
    expect(bagUsed(hero, withSpares(inventory, 6))).toBe(6)
  })

  it('holds the find that would be the seventh unequipped item', () => {
    const { hero, inventory } = newHero({ counters: { ...newHero().hero.counters, ticksExplored: 3 } })
    const full = withSpares(inventory, 6)
    const result = findSeed(hero, full, (r) => r.itemChanges.some((change) => change.type === 'create' && change.item.kind !== 'potion'))
    expect(result.disposition).toBe('inventory_sleep_started')
  })

  it('guarantees the Tote Bag on the sixth adventure, about two hours in', () => {
    let ticksToTote: number[] = []
    for (let heroIndex = 0; heroIndex < 200; heroIndex += 1) {
      let { hero, inventory } = newHero()
      let n = 0
      for (let tick = 1; tick <= 40; tick += 1) {
        const before = hero.counters.ticksExplored
        const result = run(hero, inventory, heroIndex * 1000 + tick, tick)
        ;({ hero, inventory } = applyItemChanges(result.nextHero, inventory, result.itemChanges, () => `n${String(n++).padStart(6, '0')}`))
        const upgrade = result.event?.detail.bagUpgrade
        if (upgrade !== undefined) expect(result.event?.summary).toContain('[[Tote Bag]]')
        if (before < 6 && hero.counters.ticksExplored === 6) {
          // A rare find may already have delivered it; otherwise the milestone does now.
          expect(hero.bagCapacity).toBe(10)
          if (upgrade !== undefined) expect(upgrade).toEqual({ from: 6, to: 10, tierId: 'tote_bag', source: 'milestone' })
          ticksToTote.push(tick)
          break
        }
        expect([6, 10]).toContain(hero.bagCapacity)
      }
    }
    ticksToTote = ticksToTote.sort((a, b) => a - b)
    expect(ticksToTote).toHaveLength(200)
    // Six 15-minute ticks is 90 minutes; rest ticks can add a little.
    expect(ticksToTote[Math.floor(ticksToTote.length * 0.9)]).toBeLessThanOrEqual(8)
  })

  it('grants the level milestone on the level-up tick, before gear is placed', () => {
    const base = newHero().hero
    const { hero, inventory } = newHero({ level: 3, xp: xpToLeave(3) - 1, bagCapacity: 10, counters: { ...base.counters, ticksExplored: 50 } })
    const full = withSpares(inventory, 10)
    const result = findSeed(hero, full, (r) => r.metrics.levelUps > 0)
    expect(result.nextHero.bagCapacity).toBe(13)
    expect(result.event?.detail.bagUpgrade).toMatchObject({ from: 10, to: 13, source: 'milestone' })
    expect(result.nextHero.status).not.toBe('sleeping')
  })

  it('finds a bag at most one tier ahead of the guaranteed tier', () => {
    const base = newHero().hero
    const ahead = newHero({ level: 2, bagCapacity: 13, counters: { ...base.counters, ticksExplored: 50 } })
    expect(nextEarlyTier(content, ahead.hero)).toBeUndefined()
    for (let seed = 0; seed < 3000; seed += 1) expect(run(ahead.hero, ahead.inventory, seed).metrics.bagUpgrades).toBe(0)

    const eligible = newHero({ level: 2, bagCapacity: 10, counters: { ...base.counters, ticksExplored: 50 } })
    const found = findSeed(eligible.hero, eligible.inventory, (r) => r.metrics.bagUpgrades === 1)
    expect(found.nextHero.bagCapacity).toBe(13)
    expect(found.event?.detail.outcome).toMatchObject({ variant: 'loot', found: 'bag' })
    expect(found.event?.detail.bagUpgrade).toEqual({ from: 10, to: 13, tierId: 'laptop_backpack', source: 'find' })
    expect(found.event?.deltas).toEqual({ xpEarned: 0, gold: 0, hp: 0 })
  })

  it('rejects a stored capacity that is not a tier', () => {
    const { hero, inventory } = newHero({ bagCapacity: 7 })
    expect(() => run(hero, inventory, 1)).toThrow(/BAG_CAPACITY/)
  })

  it('keeps every invariant across 100 heroes x 1,000 ticks and never exceeds the MVP ceiling', { timeout: 30_000 }, () => {
    let n = 0
    for (let heroIndex = 0; heroIndex < 100; heroIndex += 1) {
      let { hero, inventory } = newHero()
      for (let tick = 1; tick <= 1000; tick += 1) {
        const result = run(hero, inventory, heroIndex * 100_000 + tick, tick)
        if (result.event) expect(codePoints(result.event.summary)).toBeLessThanOrEqual(content.constants.summaryMaxCodePoints)
        ;({ hero, inventory } = applyItemChanges(result.nextHero, inventory, result.itemChanges, () => `n${String(n++).padStart(8, '0')}`))
        // Daily visit: sell spares, claim, resume.
        if (tick % 96 === 0) {
          const next: { -readonly [K in keyof HeroState]: HeroState[K] } = { ...hero }
          delete next.heldItemId
          if (next.status === 'sleeping') next.wakeAtTick = tick + 1
          hero = next
          inventory = inventory.filter((item) => item.kind === 'potion' || item.id === hero.weaponId || item.id === hero.armorId)
        }
      }
      expect(hero.bagCapacity).toBeLessThanOrEqual(20)
    }
  })
})
