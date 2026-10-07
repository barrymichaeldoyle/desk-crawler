import { describe, expect, it } from 'vitest'
import { contentV3 } from '@trmnl-games/desk-crawler/content/v3'
import { contentV4 } from '@trmnl-games/desk-crawler/content/v4'
import { validateCatalog } from '@trmnl-games/desk-crawler/content/validate'
import { simulateHero, SIMULATION_VERSION } from '@trmnl-games/desk-crawler/sim/core/simulate'
import { nextEarlyPouchTier, potionCap, pouchMilestoneUpgrade } from '@trmnl-games/desk-crawler/sim/core/pouch'
import { maxHp } from '@trmnl-games/desk-crawler/sim/core/stats'
import type { ContentCatalog, HeroState, SimulationResult } from '@trmnl-games/desk-crawler/sim/core/types'
import { baseState, seeds } from './helpers'

const tick = (hero: HeroState, inventory: ReturnType<typeof baseState>['inventory'], content: ContentCatalog, seed = 1, at = 10) =>
  simulateHero({ hero, inventory, tick: at, content, simulationVersion: SIMULATION_VERSION, streams: seeds(seed) })
const first = (hero: HeroState, inventory: ReturnType<typeof baseState>['inventory'], predicate: (r: SimulationResult) => boolean, limit = 3000) => {
  for (let seed = 0; seed < limit; seed += 1) {
    const result = tick(hero, inventory, contentV4, seed)
    if (predicate(result)) return { seed, result }
  }
  throw new Error('no seed matched')
}

describe('potion pouch (D77)', () => {
  it('validates the v4 ladder, starts at the old cap and treats a missing cap as the first tier', () => {
    expect(validateCatalog(contentV4)).toEqual([])
    expect(contentV4.potionPouch!.tiers[0]!.cap).toBe(contentV4.constants.potionStackCap)
    expect(potionCap(contentV4, {})).toBe(20)
    expect(potionCap(contentV3, {})).toBe(20)
    expect(potionCap(contentV4, { potionCap: 40 })).toBe(40)
    expect(nextEarlyPouchTier(contentV4, { level: 1 })?.id).toBe('lunchbox')
    expect(nextEarlyPouchTier(contentV4, { level: 1, potionCap: 30 })).toBeUndefined()
    expect(nextEarlyPouchTier(contentV4, { level: 6, potionCap: 30 })?.id).toBe('cooler_bag')
    expect(pouchMilestoneUpgrade(contentV4, { level: 6 })?.id).toBe('lunchbox')
    expect(pouchMilestoneUpgrade(contentV4, { level: 6, potionCap: 30 })).toBeUndefined()
  })

  it('grants the pouch milestone on the tick the level is held, before any potion is placed', () => {
    const { hero, inventory } = baseState({ level: 6, hp: maxHp(6), biomeId: 'server_room', potionCap: 20, bagCapacity: 13 }, 20)
    const result = tick(hero, inventory, contentV4, 3)
    expect(result.nextHero.potionCap).toBe(30)
    expect(result.metrics.pouchUpgrades).toBe(1)
    expect(result.event?.detail.pouchUpgrade).toEqual({ from: 20, to: 30, tierId: 'lunchbox', source: 'milestone' })
    expect(result.event?.summary).toContain('Lunchbox')
  })

  it('finds the next pouch on the dedicated draw and lets a bigger pouch hold more potions', () => {
    const { hero, inventory } = baseState({ level: 3, hp: maxHp(3), biomeId: 'office_cubicles', potionCap: 20 }, 20)
    const { result } = first(hero, inventory, (r) => r.event?.detail.outcome.variant === 'loot' && r.event.detail.outcome.found === 'pouch')
    expect(result.nextHero.potionCap).toBe(30)
    expect(result.event?.detail.pouchUpgrade).toMatchObject({ from: 20, to: 30, source: 'find' })
    // At 20 potions the old cap sold a found potion for gold; with a Lunchbox the find is kept.
    const full = baseState({ level: 3, hp: maxHp(3), biomeId: 'office_cubicles', potionCap: 20 }, 20)
    const { seed } = first(full.hero, full.inventory, (r) => r.event?.detail.outcome.variant === 'loot' && r.event.detail.outcome.potionFullFallback)
    const roomy = baseState({ level: 3, hp: maxHp(3), biomeId: 'office_cubicles', potionCap: 30 }, 20)
    const kept = tick(roomy.hero, roomy.inventory, contentV4, seed)
    expect(kept.event?.detail.outcome).toMatchObject({ variant: 'loot', found: 'potion', potionFullFallback: false })
    expect(kept.itemChanges).toEqual([{ type: 'potion_increment', itemId: 'i999' }])
  })

  it('rejects a cap that is not a pouch tier, and never shrinks the pouch', () => {
    const { hero, inventory } = baseState({ level: 3, hp: maxHp(3), potionCap: 25 })
    expect(() => tick(hero, inventory, contentV4)).toThrow(/not a pouch tier/)
  })
})

describe('wandering merchant (D78)', () => {
  const ready = () => baseState({ level: 5, hp: maxHp(5), biomeId: 'server_room', potionCap: 20, bagCapacity: 13 })

  it('appears on a loot draw with one to three priced offers and leaves after four ticks', () => {
    const { hero, inventory } = ready()
    const { result, seed } = first(hero, inventory, (r) => r.event?.kind === 'merchant')
    const visit = result.nextHero.merchant!
    expect(result.event?.detail.outcome.variant).toBe('merchant')
    expect(visit.expiresAtTick).toBe(14)
    expect(visit.biomeId).toBe('server_room')
    expect(visit.offers.length).toBeGreaterThanOrEqual(1)
    expect(visit.offers.length).toBeLessThanOrEqual(3)
    const potions = visit.offers.find((offer) => offer.id === 'potions')!
    expect(potions.price).toBe(12 * 2 * potions.quantity)
    expect(visit.offers.find((offer) => offer.id === 'pouch')).toMatchObject({ tierId: 'lunchbox', price: 120 })
    expect(visit.offers.find((offer) => offer.id === 'bag')).toMatchObject({ tierId: 'messenger_bag', price: 600 })
    expect(result.nextHero.counters.merchantVisits).toBe(1)
    expect(result.event?.summary).toMatch(/Wandering Merchant/)
    // The visit replays exactly and does not move XP, gold or HP.
    expect(tick(hero, inventory, contentV4, seed).nextHero.merchant).toEqual(visit)
    expect(result.event?.deltas).toEqual({ xpEarned: 0, gold: 0, hp: 0 })
    // It stays through the next ticks and leaves quietly at its expiry tick, whatever the hero is doing.
    const open = { ...result.nextHero }
    expect(tick(open, inventory, contentV4, 1, 13).nextHero.merchant).toEqual(visit)
    const paused: HeroState = { ...open, status: 'paused', pausedFromStatus: 'exploring' }
    expect(tick(paused, inventory, contentV4, 1, 14).nextHero.merchant).toBeUndefined()
    expect(tick(paused, inventory, contentV4, 1, 14).event).toBeUndefined()
  })

  it('never visits under a catalog without merchant rules', () => {
    const { hero, inventory } = ready()
    for (let seed = 0; seed < 300; seed += 1) expect(tick(hero, inventory, contentV3, seed).nextHero.merchant).toBeUndefined()
  })
})
