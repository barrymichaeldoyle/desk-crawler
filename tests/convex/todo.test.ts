// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '@trmnl-games/backend/api'
import type { Doc, Id } from '@trmnl-games/backend/data-model'
import schema from '../../apps/backend/convex/schema'
import { sha256Hex } from '../../apps/backend/convex/lib/hash'
import { runTick, seedHero, seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
/** 10:00 UTC on 2026-10-09, two seconds into the slot. */
const SLOT = Date.UTC(2026, 9, 9, 10, 0, 2)
const UUID = 'aaaaaaaa-1111-4aed-8464-bad68368e97c'
const TOKEN = 'todo-test-token'
let op = 0
const opId = () => `todo-op-${String(++op).padStart(6, '0')}`
const as = (t: T, alias: string) => t.withIdentity({ issuer: 'issuer', subject: alias })

async function errorCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise
    return undefined
  } catch (error) {
    return (error as { data?: { code?: string } }).data?.code
  }
}

const heroDoc = (t: T, heroId: Id<'heroes'>) => t.run(async (ctx) => (await ctx.db.get(heroId))!)
const userDoc = async (t: T, heroId: Id<'heroes'>) => t.run(async (ctx) => (await ctx.db.get((await ctx.db.get(heroId))!.userId))!)
const logs = (t: T, heroId: Id<'heroes'>) => t.run(async (ctx) => await ctx.db.query('tickLogs').withIndex('by_heroId_and_at_and_sequence', (q) => q.eq('heroId', heroId)).collect())

type Task = NonNullable<Doc<'heroes'>['todo']>['tasks'][number]
const task = (overrides: Partial<Task> = {}): Task => ({ templateId: 'defeat_any', target: 5, progress: 0, reward: 5, addedTick: 1, refillsSeen: 0, ...overrides })
/** A list whose last stand-up was 07:00 UTC yesterday, with slot 0 already ticked off. */
const finishedList = (): NonNullable<Doc<'heroes'>['todo']> => ({
  tasks: [task({ target: 1, progress: 1, doneTick: 5 }), task({ templateId: 'find_gear', target: 2 }), task({ templateId: 'explore_biome', biomeId: 'office_cubicles', target: 30 })],
  lastRefillTick: 1,
  lastStandupAt: Date.UTC(2026, 9, 8, 7),
})

describe('to-do list backend (D112 Q2)', () => {
  let t: T
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(SLOT)
    t = convexTest(schema, modules)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('fills the list at the first v9 tick and logs the stand-up after the story', { timeout: 30_000 }, async () => {
    await seedWorld(t, { activeContentVersion: 'v9', currentTick: 10 })
    const heroId = await seedHero(t, {}, 'Ana')
    await runTick(t)
    const hero = await heroDoc(t, heroId)
    expect(hero.todo?.tasks).toHaveLength(3)
    expect(hero.todo?.lastRefillTick).toBe(11)
    const rows = (await logs(t, heroId)).filter((log) => log.tick === 11).sort((a, b) => a.sequence - b.sequence)
    // The story, then the stand-up; achievements the tick earned follow.
    const kinds = rows.map((log) => log.kind).filter((kind) => kind !== 'achievement')
    expect(kinds).toHaveLength(2)
    expect(kinds[1]).toBe('todo')
    expect(rows.find((log) => log.kind === 'todo')?.summary).toMatch(/^Stand-up: /)
    expect(rows.map((log) => log.sequence)).toEqual(rows.map((_, i) => rows[0]!.sequence + i))
    expect(hero.logSequence).toBe(rows.at(-1)!.sequence)
  })

  it('writes no list under v8', { timeout: 30_000 }, async () => {
    await seedWorld(t, { activeContentVersion: 'v8', currentTick: 10 })
    const heroId = await seedHero(t, {}, 'Ana')
    await runTick(t)
    expect((await heroDoc(t, heroId)).todo).toBeUndefined()
    expect((await logs(t, heroId)).some((log) => log.kind === 'todo')).toBe(false)
  })

  it("refills at the owner's stored offset", { timeout: 30_000 }, async () => {
    await seedWorld(t, { activeContentVersion: 'v9', currentTick: 10 })
    // In UTC the 07:00 stand-up has passed, 24 hours after the last.
    const utc = await seedHero(t, { todo: finishedList() }, 'Ana')
    // At UTC-5 it is 05:00, before the local stand-up.
    const west = await seedHero(t, { todo: finishedList() }, 'Bo')
    await t.run(async (ctx) => await ctx.db.patch((await ctx.db.get(west))!.userId, { trmnlUtcOffset: -5 * 3600 }))
    await runTick(t)
    expect((await heroDoc(t, utc)).todo?.lastRefillTick).toBe(11)
    expect((await heroDoc(t, utc)).todo?.lastStandupAt).toBe(Date.UTC(2026, 9, 9, 7))
    expect((await heroDoc(t, west)).todo?.lastRefillTick).toBe(1)
  })

  it('stores the TRMNL offset only when it changes and never clears it', async () => {
    vi.stubEnv('CONVEX_SITE_URL', 'https://example.test')
    await seedWorld(t, { activeContentVersion: 'v9' })
    const heroId = await seedHero(t, {}, 'Ana')
    const userId = (await heroDoc(t, heroId)).userId
    await t.run(async (ctx) => {
      const grantId = await ctx.db.insert('trmnlGrants', { userId, tokenHash: sha256Hex(TOKEN), state: 'active', createdAt: SLOT })
      await ctx.db.insert('trmnlInstances', { userId, grantId, uuid: UUID, state: 'active', confirmedBy: 'success_callback', createdAt: SLOT })
    })
    const screen = (offset: string) =>
      t.fetch('/trmnl/v1/screen', { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ user_uuid: UUID, 'trmnl[user][utc_offset]': offset }).toString() })
    const query = (utcOffset: number | null) => t.query(internal.trmnlPayload.forInstance, { tokenHash: sha256Hex(TOKEN), uuid: UUID, now: SLOT, instanceName: null, utcOffset })
    expect(await query(7200)).toMatchObject({ recordOffsetFor: userId })
    expect((await screen('7200')).status).toBe(200)
    expect((await userDoc(t, heroId)).trmnlUtcOffset).toBe(7200)
    // The same value asks for no write; a missing or invalid one keeps the stored value.
    expect(await query(7200)).not.toHaveProperty('recordOffsetFor')
    expect(await query(null)).not.toHaveProperty('recordOffsetFor')
    for (const offset of ['', 'invalid', '7200']) expect((await screen(offset)).status).toBe(200)
    expect((await userDoc(t, heroId)).trmnlUtcOffset).toBe(7200)
    expect((await screen('-18000')).status).toBe(200)
    expect((await userDoc(t, heroId)).trmnlUtcOffset).toBe(-18000)
    // The mutation rechecks and bounds the value.
    await t.mutation(internal.trmnl.recordUtcOffset, { userId, utcOffset: 99 * 3600 })
    expect((await userDoc(t, heroId)).trmnlUtcOffset).toBe(-18000)
  })

  it('swaps a task once per refill period; a duplicate receipt swaps nothing more', { timeout: 30_000 }, async () => {
    await seedWorld(t, { activeContentVersion: 'v9', currentTick: 10 })
    const heroId = await seedHero(t, { todo: finishedList() }, 'Ana')
    const ana = as(t, 'Ana')
    const id = opId()
    expect(await ana.mutation(api.heroes.swapTask, { operationId: id, slot: 1 })).toMatchObject({ changed: true })
    const once = (await heroDoc(t, heroId)).todo!
    expect(once.tasks[1]!.templateId).not.toBe('find_gear')
    expect(once.tasks[1]!.addedTick).toBe(10)
    expect(once.swapUsedTick).toBe(10)
    expect(await ana.mutation(api.heroes.swapTask, { operationId: id, slot: 1 })).toMatchObject({ changed: true })
    expect((await heroDoc(t, heroId)).todo).toEqual(once)
    expect((await logs(t, heroId)).filter((log) => log.source === 'command' && 'operation' in log.detail && log.detail.operation === 'swap_task')).toHaveLength(1)
    expect(await errorCode(ana.mutation(api.heroes.swapTask, { operationId: opId(), slot: 2 }))).toBe('SWAP_USED')
    expect(await errorCode(ana.mutation(api.heroes.swapTask, { operationId: id, slot: 2 }))).toBe('OPERATION_CONFLICT')
  })

  it('refuses a finished task, a bad slot and a hero without a list', async () => {
    await seedWorld(t, { activeContentVersion: 'v9', currentTick: 10 })
    await seedHero(t, { todo: finishedList() }, 'Ana')
    await seedHero(t, {}, 'Bo')
    expect(await errorCode(as(t, 'Ana').mutation(api.heroes.swapTask, { operationId: opId(), slot: 0 }))).toBe('TASK_DONE')
    expect(await errorCode(as(t, 'Ana').mutation(api.heroes.swapTask, { operationId: opId(), slot: 5 }))).toBe('INVALID_INPUT')
    expect(await errorCode(as(t, 'Bo').mutation(api.heroes.swapTask, { operationId: opId(), slot: 0 }))).toBe('TODO_UNAVAILABLE')
  })

  it('returns the list with labels, progress and the next stand-up', async () => {
    await seedWorld(t, { activeContentVersion: 'v9', currentTick: 10 })
    await seedHero(t, { todo: finishedList() }, 'Ana')
    const mine = await as(t, 'Ana').query(api.heroes.mine, {})
    expect(mine.todo).toMatchObject({
      swapAvailable: true,
      refillHour: 7,
      nextStandupAt: Date.UTC(2026, 9, 9, 7),
      tasks: [
        { slot: 0, label: 'Win a fight', done: true, progress: 1, target: 1, reward: 5, local: true },
        { slot: 1, label: 'Find 2 pieces of gear', done: false },
        { slot: 2, label: 'Explore the [[Office Cubicles]] for 30 adventures', biomeId: 'office_cubicles', local: true },
      ],
    })
    await t.run(async (ctx) => await ctx.db.patch((await ctx.db.query('worldState').first())!._id, { activeContentVersion: 'v8' }))
    expect((await as(t, 'Ana').query(api.heroes.mine, {})).todo).toBeNull()
  })

  it('awards Tasks done when a tick ticks off the first task, and publishes its rarity', { timeout: 30_000 }, async () => {
    await seedWorld(t, { activeContentVersion: 'v9', currentTick: 10 })
    const one = finishedList()
    // Every exploring tick explores the Office, so a one-adventure task finishes on the first exploring tick.
    const list = { ...one, lastStandupAt: Date.UTC(2026, 9, 9, 7), tasks: [one.tasks[1]!, task({ templateId: 'explore_biome', biomeId: 'office_cubicles', target: 1 }), task({ templateId: 'elite', target: 1 })] }
    const heroId = await seedHero(t, { todo: list }, 'Ana')
    for (let i = 0; i < 4 && ((await heroDoc(t, heroId)).counters.tasksCompleted ?? 0) === 0; i += 1) {
      vi.setSystemTime(SLOT + i * 15 * 60_000)
      await runTick(t)
    }
    const hero = await heroDoc(t, heroId)
    expect(hero.counters.tasksCompleted).toBe(1)
    const unlocked = await t.run(async (ctx) => await ctx.db.query('heroAchievements').withIndex('by_userId_and_achievementId', (q) => q.eq('userId', hero.userId)).collect())
    expect(unlocked.map((row) => row.achievementId)).toContain('tasks_done_1')
    const done = (await logs(t, heroId)).find((log) => log.kind === 'todo' && log.summary.startsWith('Ticked off'))
    expect(done?.summary).toBe('Ticked off: Explore the [[Office Cubicles]].')
    expect(done?.deltas.gold).toBe(5)
    const stats = await t.run(async (ctx) => await ctx.db.query('achievementStats').order('desc').first())
    expect(stats?.counts.tasks_done_1).toBe(1)
  })
})
