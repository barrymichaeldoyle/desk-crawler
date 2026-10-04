// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@trmnl-games/backend/api'
import type { Id } from '@trmnl-games/backend/data-model'
import schema from '../../apps/backend/convex/schema'
import { contentV2 } from '@trmnl-games/desk-crawler/content/v2'
import { starterKit } from '@trmnl-games/desk-crawler/sim/core/starter'
import { runTick, seedHero, seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
const SLOT = Date.UTC(2026, 9, 3, 10, 13, 2)
let op = 0
const opId = () => `op-${String(++op).padStart(6, '0')}`
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
    for (let i = 0; i < count; i += 1) ids.push(await ctx.db.insert('items', { ...starterKit(contentV2).weapon, heroId, createdAt: Date.now() }))
    return ids
  })
}

describe('player intents', () => {
  let t: T
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(SLOT)
    t = convexTest(schema, modules)
    await seedWorld(t, { lastPublishedAt: SLOT - 30 * 60_000 })
  })
  afterEach(() => vi.useRealTimers())

  it('replays a receipt for the same operation and rejects a reused ID with new arguments', async () => {
    const heroId = await seedHero(t, {}, 'Ana')
    const [itemId, other] = await addGear(t, heroId, 2)
    const id = opId()
    const first = await as(t, 'Ana').mutation(api.inventory.sell, { operationId: id, itemId: itemId! })
    const again = await as(t, 'Ana').mutation(api.inventory.sell, { operationId: id, itemId: itemId! })
    expect(again).toEqual(first)
    const hero = await t.run(async (ctx) => await ctx.db.get(heroId))
    expect(hero?.gold).toBe(first.gold)
    expect(await errorCode(as(t, 'Ana').mutation(api.inventory.sell, { operationId: id, itemId: other! }))).toBe('OPERATION_CONFLICT')
  })

  it("refuses another owner's items and requires a signed-in active hero", async () => {
    const anaHero = await seedHero(t, {}, 'Ana')
    await seedHero(t, {}, 'Bo')
    const [anaItem] = await addGear(t, anaHero, 1)
    expect(await errorCode(as(t, 'Bo').mutation(api.inventory.sell, { operationId: opId(), itemId: anaItem! }))).toBe('ITEM_NOT_AVAILABLE')
    expect(await errorCode(t.mutation(api.heroes.pause, { operationId: opId() }))).toBe('UNAUTHENTICATED')
    await seedHero(t, { activationState: 'pending_trmnl' }, 'Cy')
    expect(await errorCode(as(t, 'Cy').mutation(api.heroes.pause, { operationId: opId() }))).toBe('TRMNL_REQUIRED')
  })

  it('locks travel by level and starts one-tick travel when unlocked', async () => {
    await seedHero(t, {}, 'Ana')
    expect(await errorCode(as(t, 'Ana').mutation(api.heroes.changeBiome, { operationId: opId(), biomeId: 'server_room' }))).toBe('BIOME_LOCKED')
    const heroId = await seedHero(t, { level: 4, hp: 136 }, 'Dee')
    const result = await as(t, 'Dee').mutation(api.heroes.changeBiome, { operationId: opId(), biomeId: 'server_room' })
    expect(result).toMatchObject({ changed: true, tick: 1 })
    expect(await t.run(async (ctx) => await ctx.db.get(heroId))).toMatchObject({ status: 'travelling', targetBiomeId: 'server_room', arriveAtTick: 1 })
  })

  it('sells many items atomically: one invalid item sells nothing', async () => {
    const heroId = await seedHero(t, {}, 'Ana')
    const ids = await addGear(t, heroId, 3)
    const hero = (await t.run(async (ctx) => await ctx.db.get(heroId)))!
    expect(await errorCode(as(t, 'Ana').mutation(api.inventory.sellMany, { operationId: opId(), itemIds: [...ids, hero.weaponId!] }))).toBe('ITEM_EQUIPPED')
    expect(await t.run(async (ctx) => (await ctx.db.query('items').collect()).length)).toBe(6)
    const sold = await as(t, 'Ana').mutation(api.inventory.sellMany, { operationId: opId(), itemIds: ids })
    expect(sold).toMatchObject({ changed: true, count: 3, gold: 15 })
  })

  it('runs the inventory-sleep return in one visit: sell, claim, resume with destination, depart next tick', async () => {
    const heroId = await seedHero(t, { level: 4, hp: 136, status: 'sleeping' }, 'Ana')
    const extra = await addGear(t, heroId, 28)
    const [held] = await addGear(t, heroId, 1)
    await t.run(async (ctx) => await ctx.db.patch(heroId, { heldItemId: held }))
    const user = as(t, 'Ana')
    expect(await errorCode(user.mutation(api.inventory.resumeAdventures, { operationId: opId() }))).toBe('HELD_ITEM_PENDING')
    expect(await errorCode(user.mutation(api.inventory.claimHeld, { operationId: opId() }))).toBe('BAG_FULL')
    await user.mutation(api.inventory.sellMany, { operationId: opId(), itemIds: extra.slice(0, 5) })
    await user.mutation(api.inventory.claimHeld, { operationId: opId() })
    const resumed = await user.mutation(api.inventory.resumeAdventures, { operationId: opId(), biomeId: 'server_room' })
    expect(resumed).toMatchObject({ changed: true, tick: 1 })
    await runTick(t)
    expect(await t.run(async (ctx) => await ctx.db.get(heroId))).toMatchObject({ status: 'travelling', targetBiomeId: 'server_room', arriveAtTick: 2 })
  })

  it('pauses and resumes without catch-up, and potions respect full HP', async () => {
    const heroId = await seedHero(t, {}, 'Ana')
    const user = as(t, 'Ana')
    expect(await errorCode(user.mutation(api.inventory.usePotion, { operationId: opId() }))).toBe('FULL_HP')
    await user.mutation(api.heroes.pause, { operationId: opId() })
    expect(await t.run(async (ctx) => await ctx.db.get(heroId))).toMatchObject({ status: 'paused', pausedFromStatus: 'exploring' })
    await user.mutation(api.heroes.resume, { operationId: opId() })
    expect((await t.run(async (ctx) => await ctx.db.get(heroId)))?.status).toBe('exploring')
  })
})
