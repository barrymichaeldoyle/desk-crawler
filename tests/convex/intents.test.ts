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
    for (let i = 0; i < count; i += 1) ids.push(await ctx.db.insert('items', { ...starterKit(contentV1).weapon, heroId, createdAt: Date.now() }))
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

  it('records sale and potion changes once, separately from command descriptions', async () => {
    const heroId = await seedHero(t, { hp: 40 }, 'Ana')
    const [itemId] = await addGear(t, heroId, 1)
    const owner = as(t, 'Ana')
    const saleOp = opId()
    const sold = await owner.mutation(api.inventory.sell, { operationId: saleOp, itemId: itemId! })
    await owner.mutation(api.inventory.sell, { operationId: saleOp, itemId: itemId! })
    const potionOp = opId()
    const potion = await owner.mutation(api.inventory.usePotion, { operationId: potionOp })
    await owner.mutation(api.inventory.usePotion, { operationId: potionOp })
    // D65: the first sale and potion also earn achievements, logged separately.
    const logs = (await t.run(async (ctx) => ctx.db.query('tickLogs').withIndex('by_heroId_and_at_and_sequence', (q) => q.eq('heroId', heroId)).order('desc').take(10))).filter((log) => log.kind !== 'achievement')
    expect(logs).toHaveLength(2)
    expect(logs[0]).toMatchObject({ summary: 'Drank a potion.', deltas: { xpEarned: 0, gold: 0, hp: potion.hp! - 40 } })
    expect(logs[1]!.summary).not.toMatch(/\d+ gold/)
    expect(logs[1]!.deltas).toEqual({ xpEarned: 0, gold: sold.gold, hp: 0 })
    const preview = await owner.query(api.trmnlPayload.mine, { now: Date.now() })
    // D65: the first potion earns "First Aid", logged after the command.
    const stories = preview.log.filter((entry: { k: string }) => entry.k !== 'achievement')
    expect(stories[0]).toMatchObject({ n: 'Drank a potion.', d: `+${potion.hp! - 40} HP` })
    expect(stories[1].d).toBe(`+${sold.gold} gold`)
    expect(preview.log.find((entry: { k: string }) => entry.k === 'achievement')).toMatchObject({ n: 'Achievement: [[First Aid]]', d: '' })
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
    const extra = await addGear(t, heroId, 6)
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

  it('switches stance as a policy in any status, counts the switch, and treats the current stance as a no-op (D76)', async () => {
    const heroId = await seedHero(t, {}, 'Ana')
    const user = as(t, 'Ana')
    const view = (await user.query(api.heroes.mine, {})) as { stance: string; stances: Array<{ id: string; potionBelowPct: number }> }
    expect(view.stance).toBe('balanced')
    expect(view.stances.map((s) => s.id)).toEqual(['cautious', 'balanced', 'bold'])
    expect(await user.mutation(api.heroes.setStance, { operationId: opId(), stance: 'balanced' })).toMatchObject({ changed: false })
    expect(await user.mutation(api.heroes.setStance, { operationId: opId(), stance: 'bold' })).toMatchObject({ changed: true })
    const hero = await t.run(async (ctx) => await ctx.db.get(heroId))
    expect(hero).toMatchObject({ stance: 'bold', status: 'exploring' })
    expect(hero?.counters.stanceChanges).toBe(1)
    const log = await t.run(async (ctx) => await ctx.db.query('tickLogs').withIndex('by_heroId_and_at_and_sequence', (q) => q.eq('heroId', heroId)).order('desc').first())
    expect(log).toMatchObject({ source: 'command', kind: 'system', summary: 'Switched to the bold stance.', detail: { operation: 'set_stance' }, deltas: { xpEarned: 0, gold: 0, hp: 0 } })
    // Allowed while paused: a stance is not an action.
    await user.mutation(api.heroes.pause, { operationId: opId() })
    expect(await user.mutation(api.heroes.setStance, { operationId: opId(), stance: 'cautious' })).toMatchObject({ changed: true })
    expect((await t.run(async (ctx) => await ctx.db.get(heroId)))?.counters.stanceChanges).toBe(2)
    expect((await user.query(api.heroes.mine, {}) as { stance: string }).stance).toBe('cautious')
  })
})
