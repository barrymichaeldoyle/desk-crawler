// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@trmnl-games/backend/api'
import type { Id } from '@trmnl-games/backend/data-model'
import schema from '../../apps/backend/convex/schema'
import { contentV1 } from '@trmnl-games/desk-crawler/content/v1'
import { starterKit } from '@trmnl-games/desk-crawler/sim/core/starter'
import { runTick, seedHero, seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
const SLOT = Date.UTC(2026, 9, 3, 10, 0, 2)
let op = 0
const opId = () => `bag-${String(++op).padStart(6, '0')}`
const as = (t: T, alias: string) => t.withIdentity({ issuer: 'issuer', subject: alias })

async function errorCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise
    return undefined
  } catch (error) {
    return (error as { data?: { code?: string } }).data?.code
  }
}

async function addGear(t: T, heroId: Id<'heroes'>, count: number): Promise<Id<'items'>[]> {
  return await t.run(async (ctx) => {
    const ids: Id<'items'>[] = []
    for (let i = 0; i < count; i += 1) ids.push(await ctx.db.insert('items', { ...starterKit(contentV1).weapon, heroId, createdAt: Date.now() }))
    return ids
  })
}

const heroDoc = (t: T, heroId: Id<'heroes'>) => t.run(async (ctx) => await ctx.db.get(heroId))

describe('bag ladder intents (D61)', () => {
  let t: T
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(SLOT)
    t = convexTest(schema, modules)
    await seedWorld(t, { activeContentVersion: 'v1', lastPublishedAt: SLOT - 30 * 60_000 })
  })
  afterEach(() => vi.useRealTimers())

  it('shows a six-slot bag that excludes equipped gear, with the Tote Bag next', async () => {
    await seedHero(t, {}, 'Ana')
    const bag = await as(t, 'Ana').query(api.inventory.mine, {})
    expect(bag).toMatchObject({ capacity: 6, used: 0 })
    expect(bag.ladder).toEqual({
      name: 'Paper Bag',
      next: { id: 'tote_bag', name: 'Tote Bag', capacity: 10, price: 40, milestoneLevel: null, milestoneAdventures: 6, buyable: true, lockedUntilLevel: null },
    })
  })

  it('buys the next bag once, needs the gold, and never runs two bags ahead of the milestones', async () => {
    const heroId = await seedHero(t, { gold: 30 }, 'Ana')
    const user = as(t, 'Ana')
    expect(await errorCode(user.mutation(api.inventory.buyBag, { operationId: opId(), tierId: 'tote_bag' }))).toBe('NOT_ENOUGH_GOLD')
    await t.run(async (ctx) => await ctx.db.patch(heroId, { gold: 1000 }))
    expect(await errorCode(user.mutation(api.inventory.buyBag, { operationId: opId(), tierId: 'laptop_backpack' }))).toBe('BAG_UNAVAILABLE')
    const id = opId()
    const bought = await user.mutation(api.inventory.buyBag, { operationId: id, tierId: 'tote_bag' })
    expect(await user.mutation(api.inventory.buyBag, { operationId: id, tierId: 'tote_bag' })).toEqual(bought)
    expect(await heroDoc(t, heroId)).toMatchObject({ bagCapacity: 10, gold: 960 })
    // Tote is one ahead of the guaranteed Paper Bag, so the Backpack waits for the Tote milestone.
    const bag = await user.query(api.inventory.mine, {})
    expect(bag.ladder.next).toMatchObject({ id: 'laptop_backpack', buyable: false })
    expect(await errorCode(user.mutation(api.inventory.buyBag, { operationId: opId(), tierId: 'laptop_backpack' }))).toBe('BAG_UNAVAILABLE')
    const history = await user.query(api.heroes.recentLog, { paginationOpts: { numItems: 5, cursor: null } })
    expect(history.page[0]).toMatchObject({ summary: 'Bought a [[Tote Bag]]. Bag holds 10.', deltas: { gold: -40, bagSlots: 4 } })
  })

  it('needs a free slot to unequip, while swapping stays possible with a full bag', async () => {
    const heroId = await seedHero(t, {}, 'Ana')
    const [spare] = await addGear(t, heroId, 6)
    const user = as(t, 'Ana')
    expect(await errorCode(user.mutation(api.inventory.unequip, { operationId: opId(), slot: 'armor' }))).toBe('BAG_FULL')
    await user.mutation(api.inventory.equip, { operationId: opId(), itemId: spare! })
    expect((await user.query(api.inventory.mine, {})).used).toBe(6)
    const unequipped = (await user.query(api.inventory.mine, {})).gear.find((item: { equipped: boolean }) => !item.equipped)
    await user.mutation(api.inventory.sell, { operationId: opId(), itemId: unequipped.id })
    await user.mutation(api.inventory.unequip, { operationId: opId(), slot: 'armor' })
    expect(await user.query(api.inventory.mine, {})).toMatchObject({ used: 6, capacity: 6 })
  })

  it('grants the Tote Bag milestone in a tick and stores the upgrade', async () => {
    const heroId = await seedHero(t, {}, 'Ana')
    await t.run(async (ctx) => {
      const hero = (await ctx.db.get(heroId))!
      await ctx.db.patch(heroId, { counters: { ...hero.counters, ticksExplored: 5 } })
    })
    await runTick(t)
    expect(await heroDoc(t, heroId)).toMatchObject({ bagCapacity: 10 })
    const log = await t.run(async (ctx) => await ctx.db.query('tickLogs').withIndex('by_heroId_and_at_and_sequence', (q) => q.eq('heroId', heroId)).order('desc').first())
    expect(log?.detail).toMatchObject({ contentVersion: 'v1', bagUpgrade: { from: 6, to: 10, tierId: 'tote_bag', source: 'milestone' } })
  })
})
