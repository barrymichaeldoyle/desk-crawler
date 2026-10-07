// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@trmnl-games/backend/api'
import type { Id } from '@trmnl-games/backend/data-model'
import schema from '../../apps/backend/convex/schema'
import { seedHero, seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
const SLOT = Date.UTC(2026, 9, 3, 10, 0, 2)
let op = 0
const opId = () => `op-${String(++op).padStart(6, '0')}`
const as = (t: T, alias: string) => t.withIdentity({ issuer: 'issuer', subject: alias })
const heroDoc = (t: T, heroId: Id<'heroes'>) => t.run(async (ctx) => await ctx.db.get(heroId))
const potions = (t: T, heroId: Id<'heroes'>) => t.run(async (ctx) => (await ctx.db.query('items').withIndex('by_heroId_and_kind', (q) => q.eq('heroId', heroId).eq('kind', 'potion')).first())?.quantity ?? 0)

async function errorCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise
    return undefined
  } catch (error) {
    return (error as { data?: { code?: string } }).data?.code
  }
}

const VISIT = { offers: [{ id: 'potions' as const, name: '2 healing potions', quantity: 2, price: 48 }, { id: 'pouch' as const, name: 'Lunchbox', quantity: 1, price: 120, tierId: 'lunchbox' }, { id: 'bag' as const, name: 'Tote Bag', quantity: 1, price: 40, tierId: 'tote_bag' }], expiresAtTick: 5, biomeId: 'server_room' }

describe('potion pouch and merchant intents (D77/D78)', () => {
  let t: T
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(SLOT)
    t = convexTest(schema, modules)
    await seedWorld(t, { activeContentVersion: 'v4', currentTick: 1, lastPublishedAt: SLOT - 30 * 60_000 })
  })
  afterEach(() => vi.useRealTimers())

  it('shows the pouch ladder, buys the next pouch once, and never runs two ahead of the milestones', async () => {
    const heroId = await seedHero(t, { gold: 1000 }, 'Ana')
    const user = as(t, 'Ana')
    expect((await user.query(api.inventory.mine, {})).pouch).toEqual({ name: 'Thermos', cap: 20, next: { id: 'lunchbox', name: 'Lunchbox', cap: 30, price: 120, milestoneLevel: 6, buyable: true, lockedUntilLevel: null } })
    expect(await errorCode(user.mutation(api.inventory.buyPouch, { operationId: opId(), tierId: 'cooler_bag' }))).toBe('POUCH_UNAVAILABLE')
    expect(await user.mutation(api.inventory.buyPouch, { operationId: opId(), tierId: 'lunchbox' })).toMatchObject({ changed: true, gold: -120, count: 30 })
    expect(await heroDoc(t, heroId)).toMatchObject({ gold: 880, potionCap: 30 })
    const view = (await user.query(api.inventory.mine, {})).pouch
    expect(view.name).toBe('Lunchbox')
    expect(view.next).toMatchObject({ id: 'cooler_bag', buyable: false, lockedUntilLevel: 6 })
    expect(await errorCode(user.mutation(api.inventory.buyPouch, { operationId: opId(), tierId: 'cooler_bag' }))).toBe('POUCH_UNAVAILABLE')
  })

  it('sells each merchant offer once, respects gold and the pouch cap, closes on the last sale and refuses after expiry', async () => {
    const heroId = await seedHero(t, { gold: 100, merchant: VISIT }, 'Ana')
    const user = as(t, 'Ana')
    expect((await user.query(api.inventory.mine, {})).merchant).toMatchObject({ ticksLeft: 4, expiresAtTick: 5 })
    expect((await user.query(api.heroes.mine, {})).merchantTicksLeft).toBe(4)
    // Potions: the starter kit holds 3, the bundle adds 2.
    expect(await user.mutation(api.inventory.buyOffer, { operationId: opId(), offerId: 'potions' })).toMatchObject({ changed: true, gold: -48, count: 2 })
    expect(await potions(t, heroId)).toBe(5)
    expect(await errorCode(user.mutation(api.inventory.buyOffer, { operationId: opId(), offerId: 'potions' }))).toBe('OFFER_UNAVAILABLE')
    // A bundle that would overflow the pouch is refused whole.
    await t.run(async (ctx) => {
      const hero = (await ctx.db.get(heroId))!
      await ctx.db.patch(heroId, { merchant: { ...hero.merchant!, offers: [{ id: 'potions', name: '2 healing potions', quantity: 2, price: 10 }, ...hero.merchant!.offers] } })
      const row = (await ctx.db.query('items').withIndex('by_heroId_and_kind', (q) => q.eq('heroId', heroId).eq('kind', 'potion')).first())!
      await ctx.db.patch(row._id, { quantity: 19 })
    })
    expect(await errorCode(user.mutation(api.inventory.buyOffer, { operationId: opId(), offerId: 'potions' }))).toBe('POUCH_FULL')
    // The pouch offer sets the cap; gold is checked first.
    expect(await errorCode(user.mutation(api.inventory.buyOffer, { operationId: opId(), offerId: 'pouch' }))).toBe('NOT_ENOUGH_GOLD')
    await t.run(async (ctx) => await ctx.db.patch(heroId, { gold: 500 }))
    expect(await user.mutation(api.inventory.buyOffer, { operationId: opId(), offerId: 'pouch' })).toMatchObject({ changed: true, gold: -120, count: 30 })
    expect(await heroDoc(t, heroId)).toMatchObject({ potionCap: 30, gold: 380 })
    expect(await errorCode(user.mutation(api.inventory.buyOffer, { operationId: opId(), offerId: 'pouch' }))).toBe('OFFER_UNAVAILABLE')
    const log = await t.run(async (ctx) => await ctx.db.query('tickLogs').withIndex('by_heroId_and_at_and_sequence', (q) => q.eq('heroId', heroId)).order('desc').first())
    expect(log).toMatchObject({ source: 'command', detail: { operation: 'buy_offer' }, deltas: { gold: -120 } })
    expect(log?.summary).toContain('Lunchbox')
    expect((await heroDoc(t, heroId))?.counters.purchases).toBe(2)
    // Buying the potions bundle (now affordable, pouch has room again) then the bag closes the visit.
    await t.run(async (ctx) => {
      const row = (await ctx.db.query('items').withIndex('by_heroId_and_kind', (q) => q.eq('heroId', heroId).eq('kind', 'potion')).first())!
      await ctx.db.patch(row._id, { quantity: 3 })
    })
    expect(await user.mutation(api.inventory.buyOffer, { operationId: opId(), offerId: 'potions' })).toMatchObject({ changed: true })
    expect(await user.mutation(api.inventory.buyOffer, { operationId: opId(), offerId: 'bag' })).toMatchObject({ changed: true, gold: -40, count: 10 })
    const closed = await heroDoc(t, heroId)
    expect(closed?.bagCapacity).toBe(10)
    expect(closed?.merchant).toBeUndefined()
    expect((await user.query(api.inventory.mine, {})).merchant).toBeNull()
    // An expired visit refuses sales.
    await t.run(async (ctx) => {
      await ctx.db.patch(heroId, { merchant: VISIT })
      const world = (await ctx.db.query('worldState').first())!
      await ctx.db.patch(world._id, { currentTick: 5 })
    })
    expect(await errorCode(user.mutation(api.inventory.buyOffer, { operationId: opId(), offerId: 'bag' }))).toBe('MERCHANT_GONE')
    expect((await user.query(api.inventory.mine, {})).merchant).toBeNull()
  })
})
