// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@trmnl-games/backend/api'
import type { Id } from '@trmnl-games/backend/data-model'
import schema from '../../apps/backend/convex/schema'
import { contentV1 } from '@trmnl-games/desk-crawler/content/v1'
import { starterKit } from '@trmnl-games/desk-crawler/sim/core/starter'
import { SLOT_MS } from '../../apps/backend/convex/sim/runs/tick'
import { runTick, seedHero, seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
const SLOT = Date.UTC(2026, 9, 3, 10, 0, 2)
let op = 0
const opId = () => `drawer-op-${String(++op).padStart(6, '0')}`
const as = (t: T, alias: string) => t.withIdentity({ issuer: 'issuer', subject: alias })

async function errorCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise
    return undefined
  } catch (error) {
    return (error as { data?: { code?: string } }).data?.code
  }
}

/** Unequipped gear rows; `stronger` gives each a little more attack so an equip is visible. */
async function addGear(t: T, heroId: Id<'heroes'>, count: number, stronger = 0): Promise<Id<'items'>[]> {
  return await t.run(async (ctx) => {
    const ids: Id<'items'>[] = []
    for (let i = 0; i < count; i += 1) ids.push(await ctx.db.insert('items', { ...starterKit(contentV1).weapon, attack: starterKit(contentV1).weapon.attack + stronger, heroId, createdAt: Date.now() }))
    return ids
  })
}

const heroDoc = (t: T, heroId: Id<'heroes'>) => t.run(async (ctx) => (await ctx.db.get(heroId))!)

/** A hero with a full six-slot bag and `drawer` items already in the drawer. */
async function fullHero(t: T, alias: string, drawer: number, overrides: Record<string, unknown> = {}) {
  const heroId = await seedHero(t, overrides, alias)
  const bag = await addGear(t, heroId, 6)
  const inDrawer = await addGear(t, heroId, drawer, 2)
  if (drawer > 0) await t.run(async (ctx) => await ctx.db.patch(heroId, { drawer: inDrawer }))
  return { heroId, bag, inDrawer }
}

describe('desk drawer backend (D111 L2)', () => {
  let t: T
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(SLOT)
    t = convexTest(schema, modules)
  })
  afterEach(() => vi.useRealTimers())

  it('drops overflow finds in the drawer during ticks, keeps the hero exploring and counts them apart from the bag', { timeout: 30_000 }, async () => {
    await seedWorld(t, { activeContentVersion: 'v8', currentTick: 10, lastPublishedAt: SLOT - 30 * 60_000 })
    // A Tote Bag already earned, so no milestone grows the bag mid-test.
    const { heroId } = await fullHero(t, 'Ana', 0, { bagCapacity: 10, counters: { ...starterKitCounters(), ticksExplored: 10 } })
    await addGear(t, heroId, 4)
    let hero = await heroDoc(t, heroId)
    for (let slot = 0; slot < 200 && (hero.drawer?.length ?? 0) === 0; slot += 1) {
      vi.setSystemTime(SLOT + slot * SLOT_MS)
      await runTick(t)
      hero = await heroDoc(t, heroId)
    }
    expect(hero.drawer?.length).toBeGreaterThan(0)
    expect(hero.heldItemId).toBeUndefined()
    expect(hero.counters.drawerFinds).toBe(hero.drawer!.length)
    const log = await t.run(async (ctx) => (await ctx.db.query('tickLogs').collect()).find((entry) => entry.detail && 'drawerFind' in entry.detail && entry.detail.drawerFind))
    expect(log?.summary).toContain('desk drawer')
    const bag = await as(t, 'Ana').query(api.inventory.mine, {})
    expect(bag.used).toBeLessThanOrEqual(bag.capacity)
    expect(bag.drawer).toEqual({ capacity: 6, itemIds: hero.drawer })
    expect(bag.gear.filter((item: { inDrawer: boolean }) => item.inDrawer).map((item: { id: string }) => item.id).sort()).toEqual([...hero.drawer!].sort())
    const payload = await as(t, 'Ana').query(api.trmnlPayload.mine, { now: Date.now() })
    expect(payload.drawer_used).toBe(hero.drawer!.length)
  })

  it('moves a drawer item into the bag only when the bag has room, once per receipt', async () => {
    await seedWorld(t, { activeContentVersion: 'v8', lastPublishedAt: SLOT - 30 * 60_000 })
    const { heroId, bag, inDrawer } = await fullHero(t, 'Ana', 2)
    const user = as(t, 'Ana')
    expect(await errorCode(user.mutation(api.inventory.claimFromDrawer, { operationId: opId(), itemId: inDrawer[0]! }))).toBe('BAG_FULL')
    expect(await errorCode(user.mutation(api.inventory.claimFromDrawer, { operationId: opId(), itemId: bag[0]! }))).toBe('ITEM_NOT_AVAILABLE')
    await user.mutation(api.inventory.sell, { operationId: opId(), itemId: bag[0]! })
    const id = opId()
    const first = await user.mutation(api.inventory.claimFromDrawer, { operationId: id, itemId: inDrawer[0]! })
    expect(await user.mutation(api.inventory.claimFromDrawer, { operationId: id, itemId: inDrawer[0]! })).toEqual(first)
    expect((await heroDoc(t, heroId)).drawer).toEqual([inDrawer[1]])
    const view = await user.query(api.inventory.mine, {})
    expect(view.used).toBe(6)
  })

  it('equips from the drawer and puts the replaced piece in the slot it frees', async () => {
    await seedWorld(t, { activeContentVersion: 'v8', lastPublishedAt: SLOT - 30 * 60_000 })
    const { heroId, inDrawer } = await fullHero(t, 'Ana', 3)
    const before = await heroDoc(t, heroId)
    const user = as(t, 'Ana')
    expect(await errorCode(user.mutation(api.inventory.equip, { operationId: opId(), itemId: inDrawer[1]! }))).toBe('ITEM_IN_DRAWER')
    const id = opId()
    const first = await user.mutation(api.inventory.equipFromDrawer, { operationId: id, itemId: inDrawer[1]! })
    expect(await user.mutation(api.inventory.equipFromDrawer, { operationId: id, itemId: inDrawer[1]! })).toEqual(first)
    const after = await heroDoc(t, heroId)
    expect(after.weaponId).toBe(inDrawer[1])
    expect(after.drawer).toEqual([inDrawer[0], before.weaponId, inDrawer[2]])
    const tooHigh = await t.run(async (ctx) => {
      await ctx.db.patch(inDrawer[0]!, { requiredLevel: 9 })
      return inDrawer[0]!
    })
    expect(await errorCode(user.mutation(api.inventory.equipFromDrawer, { operationId: opId(), itemId: tooHigh }))).toBe('LEVEL_REQUIREMENT')
  })

  it('sells drawer items alone or with bag items and takes them out of the drawer', async () => {
    await seedWorld(t, { activeContentVersion: 'v8', lastPublishedAt: SLOT - 30 * 60_000 })
    const { heroId, bag, inDrawer } = await fullHero(t, 'Ana', 3)
    const user = as(t, 'Ana')
    await user.mutation(api.inventory.sell, { operationId: opId(), itemId: inDrawer[0]! })
    expect((await heroDoc(t, heroId)).drawer).toEqual([inDrawer[1], inDrawer[2]])
    const sold = await user.mutation(api.inventory.sellMany, { operationId: opId(), itemIds: [bag[0]!, inDrawer[1]!, inDrawer[2]!] })
    expect(sold).toMatchObject({ count: 3 })
    expect((await heroDoc(t, heroId)).drawer).toBeUndefined()
  })

  it('claims a held find into the drawer when the bag is full, and resumes with room only in the drawer', async () => {
    await seedWorld(t, { activeContentVersion: 'v8', lastPublishedAt: SLOT - 30 * 60_000 })
    const { heroId } = await fullHero(t, 'Ana', 5, { status: 'sleeping' })
    const [held] = await addGear(t, heroId, 1)
    await t.run(async (ctx) => await ctx.db.patch(heroId, { heldItemId: held }))
    const user = as(t, 'Ana')
    const id = opId()
    const first = await user.mutation(api.inventory.claimHeld, { operationId: id })
    expect(await user.mutation(api.inventory.claimHeld, { operationId: id })).toEqual(first)
    const claimed = await heroDoc(t, heroId)
    expect(claimed.heldItemId).toBeUndefined()
    expect(claimed.drawer).toHaveLength(6)
    expect(claimed.drawer!.at(-1)).toBe(held)
    // Bag and drawer both full now: resuming needs room for the next find.
    expect((await user.query(api.inventory.mine, {})).canResume).toBe(false)
    expect(await errorCode(user.mutation(api.inventory.resumeAdventures, { operationId: opId() }))).toBe('BAG_FULL')
    await user.mutation(api.inventory.sell, { operationId: opId(), itemId: claimed.drawer![0]! })
    expect((await user.query(api.inventory.mine, {})).canResume).toBe(true)
    expect(await user.mutation(api.inventory.resumeAdventures, { operationId: opId() })).toMatchObject({ changed: true })
    await runTick(t)
    expect((await heroDoc(t, heroId)).status).toBe('exploring')
  })

  it('keeps the old rules under a catalog without a drawer', async () => {
    await seedWorld(t, { activeContentVersion: 'v7', lastPublishedAt: SLOT - 30 * 60_000 })
    const { heroId } = await fullHero(t, 'Ana', 0, { status: 'sleeping' })
    const [held] = await addGear(t, heroId, 1)
    await t.run(async (ctx) => await ctx.db.patch(heroId, { heldItemId: held }))
    const user = as(t, 'Ana')
    expect(await errorCode(user.mutation(api.inventory.claimHeld, { operationId: opId() }))).toBe('BAG_FULL')
    expect((await user.query(api.inventory.mine, {})).drawer).toEqual({ capacity: 0, itemIds: [] })
  })

  it('reads stay within the 32-row bound with a full bag, full drawer and held find', async () => {
    await seedWorld(t, { activeContentVersion: 'v8', lastPublishedAt: SLOT - 30 * 60_000 })
    const { heroId } = await fullHero(t, 'Ana', 6, { status: 'sleeping', bagCapacity: 20, level: 12 })
    await addGear(t, heroId, 14)
    const [held] = await addGear(t, heroId, 1)
    await t.run(async (ctx) => await ctx.db.patch(heroId, { heldItemId: held }))
    const rows = await t.run(async (ctx) => (await ctx.db.query('items').withIndex('by_heroId', (q) => q.eq('heroId', heroId)).collect()).length)
    expect(rows).toBe(30)
    const view = await as(t, 'Ana').query(api.inventory.mine, {})
    expect(view.used).toBe(20)
    expect(view.gear).toHaveLength(29)
  })
})

function starterKitCounters() {
  return { combatWins: 0, retreats: 0, deaths: 0, rescues: 0, goldEarned: 0, itemsFound: 0, ticksExplored: 0 }
}
