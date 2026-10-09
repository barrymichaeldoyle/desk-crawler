// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import schema from '../../apps/backend/convex/schema'
import { runTick, seedHero, seedWorld, type T } from './helpers'
import { nextSlowCastTick, runSlowCastTick, seedAngler } from './slowCastHelpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')

describe('Slow Cast tick on the shared engine (D115, S2)', () => {
  let t: T
  beforeEach(() => {
    vi.useFakeTimers()
    // 06:05 UTC: a Slow Cast slot, at dawn.
    vi.setSystemTime(Date.UTC(2026, 10, 2, 6, 5, 3))
    t = convexTest(schema, modules)
  })
  afterEach(() => vi.useRealTimers())

  it('ticks on its own five-past slots and runs an empty world cleanly', async () => {
    const runId = await runSlowCastTick(t)
    const run = await t.run(async (ctx) => await ctx.db.get(runId!))
    expect(run).toMatchObject({ tick: 1, state: 'completed', wallSlot: Date.UTC(2026, 10, 2, 6, 5), processed: 0, landed: 0 })
    // The same slot never starts a second tick.
    expect(await runSlowCastTick(t)).toBeNull()
  })

  it('casts every tick: logs, catches up to the cooler and progress markers', async () => {
    const anglerId = await seedAngler(t)
    for (let i = 0; i < 40; i += 1) await nextSlowCastTick(t)
    const state = await t.run(async (ctx) => ({
      angler: await ctx.db.get(anglerId),
      catches: await ctx.db.query('catches').withIndex('by_anglerId', (q) => q.eq('anglerId', anglerId)).collect(),
      logs: await ctx.db.query('swTickLogs').withIndex('by_anglerId_and_at_and_sequence', (q) => q.eq('anglerId', anglerId)).collect(),
      runs: await ctx.db.query('swSimulationRuns').collect(),
    }))
    expect(state.angler!.lastTick).toBe(40)
    expect(state.angler!.counters.casts).toBe(40)
    expect(state.catches.length).toBeLessThanOrEqual(6)
    expect(state.catches.length).toBe(Math.min(6, state.angler!.counters.fishCaught - state.angler!.counters.released))
    expect(state.logs.length).toBeGreaterThan(0)
    expect(state.logs.map((l) => l.sequence)).toEqual(state.logs.map((_, i) => i + 2))
    expect(state.runs.every((r) => r.state === 'completed' && r.eligible === 1)).toBe(true)
  })

  it('publishes boards with the owner alias at the end of the hour', async () => {
    const anglerId = await seedAngler(t, {}, 'Reel')
    // Slots 06:20, 06:35, 06:50: 06:50 is the hour's last slot for a five-past world.
    for (let i = 0; i < 3; i += 1) await nextSlowCastTick(t)
    const sets = await t.run(async (ctx) => ({
      published: await ctx.db.query('swLeaderboardPublications').withIndex('by_state', (q) => q.eq('state', 'published')).collect(),
      world: await ctx.db.query('swWorldState').first(),
      inputs: await ctx.db.query('swRankInputs').collect(),
      generations: await ctx.db.query('swLeaderboardGenerations').collect(),
    }))
    expect(sets.published.length).toBeGreaterThanOrEqual(1)
    expect(sets.world?.publishedPublicationId).toBe(sets.published.at(-1)!._id)
    expect(sets.inputs.at(-1)).toMatchObject({ heroId: anglerId, heroName: 'Reel', ownerAlias: 'Reel' })
    expect(sets.generations.some((g) => g.board === 'overall' && g.entries[0]?.heroId === anglerId)).toBe(true)
  })

  it('skips a paused angler between publications without writing', async () => {
    const anglerId = await seedAngler(t, { status: 'paused' })
    // A new world's first run publishes, which visits every eligible angler once.
    await runSlowCastTick(t)
    expect(await t.run(async (ctx) => (await ctx.db.get(anglerId))!.lastTick)).toBe(1)
    await nextSlowCastTick(t)
    const angler = await t.run(async (ctx) => await ctx.db.get(anglerId))
    expect(angler).toMatchObject({ lastTick: 1, counters: { casts: 0 } })
    expect((await t.run(async (ctx) => await ctx.db.query('swSimulationRuns').collect())).at(-1)).toMatchObject({ skippedDormant: 1 })
  })

  it('keeps the two worlds apart', async () => {
    await seedWorld(t)
    const heroId = await seedHero(t)
    const anglerId = await seedAngler(t)
    await runTick(t)
    const afterDc = await t.run(async (ctx) => ({ hero: await ctx.db.get(heroId), angler: await ctx.db.get(anglerId), swRuns: (await ctx.db.query('swSimulationRuns').collect()).length }))
    expect(afterDc.hero!.lastTick).toBe(1)
    expect(afterDc.angler!.lastTick).toBe(0)
    expect(afterDc.swRuns).toBe(0)
    await runSlowCastTick(t)
    const afterSc = await t.run(async (ctx) => ({ hero: await ctx.db.get(heroId), angler: await ctx.db.get(anglerId) }))
    expect(afterSc.hero!.lastTick).toBe(1)
    expect(afterSc.angler!.lastTick).toBe(1)
  })
})

describe('Slow Cast retention (D115)', () => {
  it('cleans old Slow Cast logs and completed runs with the daily job', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.UTC(2026, 10, 2, 6, 5, 3))
    const t = convexTest(schema, modules)
    const anglerId = await seedAngler(t)
    await runSlowCastTick(t)
    await nextSlowCastTick(t)
    vi.advanceTimersByTime(31 * 24 * 3_600_000)
    const { internal } = await import('@trmnl-games/backend/api')
    await t.mutation(internal.maintenance.cleanup, {})
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const left = await t.run(async (ctx) => ({ logs: (await ctx.db.query('swTickLogs').collect()).filter((l) => l.anglerId === anglerId).length, runs: await ctx.db.query('swSimulationRuns').collect() }))
    expect(left.logs).toBe(0)
    // The run behind a kept publication stays until that set is cleaned.
    expect(left.runs.length).toBeLessThanOrEqual(1)
    vi.useRealTimers()
  })
})
