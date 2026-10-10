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

  it('publishes hourly with no XP rank inputs, and boards each water by the heaviest fish', async () => {
    // Paused, so the ticks publish without landing fish of their own; the records below are the only ones.
    const anglerId = await seedAngler(t, { status: 'paused' }, 'Reel')
    const rival = await seedAngler(t, { status: 'paused' }, 'Mo')
    // Slots 06:20, 06:35, 06:50: 06:50 is the hour's last slot for a five-past world.
    for (let i = 0; i < 3; i += 1) await nextSlowCastTick(t)
    const sets = await t.run(async (ctx) => ({
      published: await ctx.db.query('swLeaderboardPublications').withIndex('by_state', (q) => q.eq('state', 'published')).collect(),
      inputs: await ctx.db.query('swRankInputs').collect(),
    }))
    // The hourly set still carries achievement rarity; Slow Cast has no XP, so nothing is ranked by it.
    expect(sets.published.length).toBeGreaterThanOrEqual(1)
    expect(sets.inputs).toEqual([])
    // A heavier fish replaces the angler's row; a lighter one does not.
    const { recordCatch, weekKey } = await import('../../apps/backend/convex/slowCast/records')
    const at = Date.UTC(2026, 9, 7, 12)
    await t.run(async (ctx) => {
      const reel = (await ctx.db.get(anglerId))!
      const mo = (await ctx.db.get(rival))!
      await recordCatch(ctx, reel, { waterId: 'millpond', speciesId: 'roach', grams: 400 }, at)
      await recordCatch(ctx, reel, { waterId: 'millpond', speciesId: 'common_carp', grams: 6100 }, at + 1)
      await recordCatch(ctx, reel, { waterId: 'millpond', speciesId: 'perch', grams: 900 }, at + 2)
      await recordCatch(ctx, mo, { waterId: 'millpond', speciesId: 'bream', grams: 2400 }, at)
    })
    const rows = await t.run(async (ctx) => await ctx.db.query('swCatchRecords').collect())
    expect(rows.filter((r) => r.anglerId === anglerId).map((r) => [r.period, r.speciesId, r.grams])).toEqual([[weekKey(at), 'common_carp', 6100], ['all', 'common_carp', 6100]])
    const { api } = await import('@trmnl-games/backend/api')
    const view = await t.withIdentity({ issuer: 'issuer', subject: 'Mo' }).query(api.slowCast.leaderboard.view, { waterId: 'millpond', period: 'all' })
    expect(view).toMatchObject({ waterId: 'millpond', period: 'all', entries: [{ rank: 1, name: 'Reel', speciesId: 'common_carp', grams: 6100, own: false }, { rank: 2, name: 'Mo', grams: 2400, own: true }], own: { rank: 2, grams: 2400 } })
  })

  it('starts the weekly board on Monday in UTC', async () => {
    const { weekKey, weekEndsAt } = await import('../../apps/backend/convex/slowCast/records')
    expect(weekKey(Date.UTC(2026, 9, 11, 23, 59))).toBe('w2026-10-05')
    expect(weekKey(Date.UTC(2026, 9, 12, 0, 0))).toBe('w2026-10-12')
    expect(weekEndsAt(Date.UTC(2026, 9, 7))).toBe(Date.UTC(2026, 9, 12))
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
