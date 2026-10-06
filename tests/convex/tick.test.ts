// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { internal } from '@trmnl-games/backend/api'
import type { Id } from '@trmnl-games/backend/data-model'
import schema from '../../apps/backend/convex/schema'
import { starterHero, starterKit } from '@trmnl-games/desk-crawler/sim/core/starter'
import { contentV2 } from '@trmnl-games/desk-crawler/content/v2'
import { contentV4 } from '@trmnl-games/desk-crawler/content/v4'
import { simulateHero } from '@trmnl-games/desk-crawler/sim/core/simulate'
import { deriveStreamSeeds } from '@trmnl-games/desk-crawler/sim/seed'
import { toHeroState, toInventory } from '../../apps/backend/convex/sim/runs/adapter'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')

/** 2026-10-03 10:13:00 UTC: a regular (non-publication) slot. */
const SLOT = Date.UTC(2026, 9, 3, 10, 0, 0)

type T = ReturnType<typeof convexTest>

async function seedHero(t: T, overrides: Record<string, unknown> = {}): Promise<Id<'heroes'>> {
  return await t.run(async (ctx) => {
    const now = Date.now() - 60_000
    const userId = await ctx.db.insert('users', {
      tokenIdentifier: `issuer|user-${Math.random()}`,
      publicAlias: 'Tester',
      normalizedAlias: `tester-${Math.random()}`,
      timezone: 'UTC',
      state: 'active',
      createdAt: now,
      publicNameVersion: 1,
    })
    const base = starterHero('x', contentV2, 0)
    const heroId = await ctx.db.insert('heroes', {
      userId,
      name: 'Baz',
      class: 'warrior',
      createdAt: now,
      isActive: true,
      schemaVersion: 1,
      activationState: 'active',
      activatedAt: now,
      level: base.level,
      xp: base.xp,
      lifetimeXp: base.lifetimeXp,
      hp: base.hp,
      gold: base.gold,
      lastLevelUpTick: 0,
      status: 'exploring',
      biomeId: base.biomeId,
      eligibleFromTick: 1,
      lastTick: 0,
      lastProgressTick: 0,
      logSequence: 1,
      simulationState: 'healthy',
      counters: base.counters,
      scoreHourXp: 0,
      ...overrides,
    })
    const kit = starterKit(contentV2)
    const weaponId = await ctx.db.insert('items', { ...kit.weapon, heroId, createdAt: now })
    const armorId = await ctx.db.insert('items', { ...kit.armor, heroId, createdAt: now })
    await ctx.db.insert('items', { ...kit.potions, heroId, createdAt: now })
    await ctx.db.patch(heroId, { weaponId, armorId })
    await ctx.db.patch(userId, { activeHeroId: heroId })
    return heroId
  })
}

async function world(t: T) {
  return await t.run(async (ctx) => await ctx.db.query('worldState').first())
}

async function runTick(t: T) {
  const runId = await t.mutation(internal.sim.runs.tick.startTick, {})
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  return runId
}

describe('tick scheduler', () => {
  let t: T
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(SLOT + 2_000)
    t = convexTest(schema, modules)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('records combat-drop rarity from the awarded item without changing the simulator outcome or rewards', async () => {
    const heroId = await seedHero(t, { level: 5, hp: 148 })
    const expected = await t.run(async ctx => {
      const hero = (await ctx.db.get(heroId))!
      const items = await ctx.db.query('items').withIndex('by_heroId', q => q.eq('heroId', heroId)).take(40)
      for (let n = 0; n < 3000; n++) {
        const worldSeed = `rare-combat-${n}`
        const result = simulateHero({ hero: toHeroState(hero), inventory: toInventory(items), tick: 1, content: contentV4, simulationVersion: 1, streams: deriveStreamSeeds(worldSeed, heroId, 1, 1) })
        if (result.event?.detail.outcome.variant !== 'combat' || !result.itemChanges.some(change => change.type === 'create' && change.item.kind !== 'potion')) continue
        await ctx.db.insert('worldState', { key: 'world', currentTick: 0, activeContentVersion: 'v4', activeSimulationVersion: 1, worldSeed, ticksPaused: false, maintenanceMode: false, createdAt: Date.now() - 3_600_000, schemaVersion: 1 })
        return result
      }
      throw new Error('No seeded combat drop found')
    })
    await runTick(t)
    const latest = await t.run(ctx => ctx.db.query('tickLogs').withIndex('by_heroId_and_at_and_sequence', q => q.eq('heroId', heroId)).order('desc').first())
    const awarded = expected.itemChanges.find(change => change.type === 'create' && change.item.kind !== 'potion')!
    expect(awarded.type).toBe('create')
    expect(latest?.detail).toMatchObject({ outcome: { variant: 'combat', gearDropped: true, gearRarity: awarded.type === 'create' ? awarded.item.rarity : undefined } })
    expect(latest?.summary).toBe(expected.event!.summary)
    expect(latest?.deltas).toEqual(expected.event!.deltas)
    expect(expected.event!.detail.outcome).not.toHaveProperty('gearRarity')
  })

  it('feeds the last two stories into v4 so a third cable trip becomes a different mishap', async () => {
    const heroId = await seedHero(t)
    const expected = await t.run(async (ctx) => {
      const hero = (await ctx.db.get(heroId))!
      const items = await ctx.db.query('items').withIndex('by_heroId', (q) => q.eq('heroId', heroId)).take(40)
      for (let n = 0; n < 3000; n += 1) {
        const worldSeed = `callback-${n}`
        const input = { hero: toHeroState(hero), inventory: toInventory(items), tick: 1, content: contentV4, simulationVersion: 1, streams: deriveStreamSeeds(worldSeed, heroId, 1, 1) }
        const result = simulateHero(input)
        if (!result.event?.summary.startsWith('Tripped over a loose cable.')) continue
        await ctx.db.insert('worldState', { key: 'world', currentTick: 0, activeContentVersion: 'v4', activeSimulationVersion: 1, worldSeed, ticksPaused: false, maintenanceMode: false, createdAt: Date.now() - 3_600_000, schemaVersion: 1 })
        for (const [sequence, summary] of [[1, 'Tripped over a loose cable. -3 HP.'], [2, 'Tripped over another loose cable. -9 HP.']] as const) {
          await ctx.db.insert('tickLogs', { heroId, source: 'tick', tick: 0, sequence, at: Date.now() - 30_000, kind: 'trap', summary, detail: result.event.detail, deltas: result.event.deltas })
        }
        await ctx.db.patch(heroId, { logSequence: 2 })
        return simulateHero({ ...input, recentSummaries: ['Tripped over another loose cable. -9 HP.', 'Tripped over a loose cable. -3 HP.'] })
      }
      throw new Error('No seeded cable trip found')
    })
    await runTick(t)
    const latest = await t.run(async (ctx) => ctx.db.query('tickLogs').withIndex('by_heroId_and_at_and_sequence', (q) => q.eq('heroId', heroId)).order('desc').first())
    expect(latest?.summary).toBe(expected.event!.summary)
    expect(latest?.summary).not.toContain('loose cable')
    expect(latest?.deltas).toEqual(expected.event!.deltas)
  })

  it('creates one logical tick per wall slot and completes the chain', async () => {
    await t.run(async (ctx) => {
      // World singleton as created at install time, on the tuned catalog.
      await ctx.db.insert('worldState', { key: 'world', currentTick: 0, activeContentVersion: 'v2', activeSimulationVersion: 1, worldSeed: 'seed', ticksPaused: false, maintenanceMode: false, createdAt: Date.now() - 3_600_000, schemaVersion: 1 })
    })
    const heroId = await seedHero(t)
    const runId = await runTick(t)
    expect(runId).not.toBeNull()
    const w = await world(t)
    expect(w).toMatchObject({ currentTick: 1, lastCompletedTick: 1 })
    expect(w?.activeRunId).toBeUndefined()

    const hero = await t.run(async (ctx) => await ctx.db.get(heroId))
    expect(hero?.lastTick).toBe(1)
    const run = await t.run(async (ctx) => await ctx.db.get(runId!))
    expect(run).toMatchObject({ state: 'completed', tick: 1, eligible: 1, scoreAt: SLOT })

    // Same wall slot again: no second tick.
    expect(await t.mutation(internal.sim.runs.tick.startTick, {})).toBeNull()
    expect((await world(t))?.currentTick).toBe(1)

    // Next slot: tick 2.
    vi.setSystemTime(SLOT + 15 * 60_000 + 1_000)
    await runTick(t)
    expect((await world(t))?.currentTick).toBe(2)
    expect((await t.run(async (ctx) => await ctx.db.get(heroId)))?.lastTick).toBe(2)
  })

  it('never simulates pending heroes or heroes not yet eligible', async () => {
    const pending = await seedHero(t, { activationState: 'pending_trmnl' })
    const later = await seedHero(t, { eligibleFromTick: 5 })
    await runTick(t)
    const [p, l] = await t.run(async (ctx) => [await ctx.db.get(pending), await ctx.db.get(later)])
    expect(p?.lastTick).toBe(0)
    expect(l?.lastTick).toBe(0)
    const logs = await t.run(async (ctx) => await ctx.db.query('tickLogs').collect())
    expect(logs).toHaveLength(0)
  })

  it('treats a duplicate or stale page worker as a no-op', async () => {
    const heroId = await seedHero(t)
    const runId = (await t.mutation(internal.sim.runs.tick.startTick, {}))!
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const before = await t.run(async (ctx) => await ctx.db.get(heroId))
    await t.mutation(internal.sim.runs.tick.simulateBatch, { runId, expectedSequence: 0 })
    const after = await t.run(async (ctx) => await ctx.db.get(heroId))
    expect(after).toEqual(before)
  })

  it.each([false, true])('drains a cohort with identical createdAt values with legacy pagination=%s', async (legacy) => {
    const heroes = []
    for (let i = 0; i < 51; i++) heroes.push(await seedHero(t))
    const runId = (await t.mutation(internal.sim.runs.tick.startTick, {}))!
    if (legacy) await t.run(async ctx => { await ctx.db.patch(runId, { paginationVersion: undefined }) })
    await t.mutation(internal.sim.runs.tick.simulateBatch, { runId, expectedSequence: 0 })
    const first = (await t.run(async ctx => ctx.db.get(runId)))!
    expect(first.processed).toBe(25)
    if (!legacy) expect(JSON.parse(first.cursor!)).toBeInstanceOf(Array)
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const completed = await t.run(async ctx => ctx.db.get(runId))
    expect(completed).toMatchObject({ state: 'completed', processed: 51, eligible: 51 })
    for (const id of heroes) expect((await t.run(async ctx => ctx.db.get(id)))?.lastTick).toBe(1)
    await t.mutation(internal.sim.runs.tick.simulateBatch, { runId, expectedSequence: 1 })
    expect(await t.run(async ctx => ctx.db.get(runId))).toEqual(completed)
  })

  it('skips dormant heroes between publications without writes', async () => {
    await t.run(async (ctx) => {
      await ctx.db.insert('worldState', { key: 'world', currentTick: 0, activeContentVersion: 'v2', activeSimulationVersion: 1, worldSeed: 'seed', ticksPaused: false, maintenanceMode: false, createdAt: Date.now(), lastPublishedAt: Date.UTC(2026, 9, 3, 9, 45), schemaVersion: 1 })
    })
    const sleeper = await seedHero(t, { status: 'sleeping' })
    await runTick(t)
    const hero = await t.run(async (ctx) => await ctx.db.get(sleeper))
    expect(hero?.lastTick).toBe(0)
    const run = await t.run(async (ctx) => await ctx.db.query('simulationRuns').first())
    expect(run?.skippedDormant).toBe(1)
  })

  it('folds hourly score on publication runs', async () => {
    vi.setSystemTime(Date.UTC(2026, 9, 3, 10, 45, 1))
    await t.run(async (ctx) => {
      await ctx.db.insert('worldState', { key: 'world', currentTick: 0, activeContentVersion: 'v2', activeSimulationVersion: 1, worldSeed: 'seed', ticksPaused: false, maintenanceMode: false, createdAt: Date.now(), lastPublishedAt: Date.UTC(2026, 9, 3, 9, 45), schemaVersion: 1 })
    })
    const heroId = await seedHero(t)
    await runTick(t)
    const run = await t.run(async (ctx) => await ctx.db.query('simulationRuns').first())
    expect(run?.publishes).toBe(true)
    const [hero, window] = await t.run(async (ctx) => [await ctx.db.get(heroId), await ctx.db.query('heroScoreWindows').first()])
    expect(hero?.scoreHourXp).toBe(0)
    expect(window?.xp7d).toBe(hero?.lifetimeXp)
    expect((await world(t))?.lastPublishedAt).toBe(Date.UTC(2026, 9, 3, 10, 45))

    // The next slot (11:13) is a regular, non-publication run.
    vi.setSystemTime(Date.UTC(2026, 9, 3, 11, 0, 1))
    await runTick(t)
    const runs = await t.run(async (ctx) => await ctx.db.query('simulationRuns').collect())
    expect(runs.map((r) => r.publishes)).toEqual([true, false])
  })

  it('does not start a newer tick while a run is active, and the watchdog resumes a stalled chain', async () => {
    await seedHero(t)
    const runId = (await t.mutation(internal.sim.runs.tick.startTick, {}))!
    // Simulate a lost continuation: cancel the scheduled job, then let the run stall.
    await t.run(async (ctx) => {
      const run = await ctx.db.get(runId)
      if (run?.nextScheduledFunctionId) await ctx.scheduler.cancel(run.nextScheduledFunctionId)
    })
    vi.setSystemTime(SLOT + 15 * 60_000 + 1_000)
    expect(await t.mutation(internal.sim.runs.tick.startTick, {})).toBe(runId)
    expect((await world(t))?.currentTick).toBe(1)
    await t.mutation(internal.sim.runs.tick.watchdog, {})
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const run = await t.run(async (ctx) => await ctx.db.get(runId))
    expect(run).toMatchObject({ state: 'completed', recoveryAttempts: 1 })
    expect((await world(t))?.activeRunId).toBeUndefined()
  })
})
