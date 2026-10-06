// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { internal } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import { runTick, seedHero, seedWorld, world, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
const SLOT = Date.UTC(2026, 9, 3, 10, 0, 2)

describe('pre-launch game reset (D63)', () => {
  let t: T
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(SLOT)
    t = convexTest(schema, modules)
    await seedWorld(t, { activeContentVersion: 'v1', lastPublishedAt: SLOT - 30 * 60_000 })
  })
  afterEach(() => vi.useRealTimers())

  it('deletes heroes and gameplay history, keeps accounts, and pins the world to v1', async () => {
    const heroId = await seedHero(t, {}, 'Ana')
    await runTick(t)
    await t.mutation(internal.resetGame.start, { confirm: 'RESET DESK CRAWLER BEFORE LAUNCH' })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const left = await t.run(async (ctx) => ({
      heroes: (await ctx.db.query('heroes').collect()).length,
      items: (await ctx.db.query('items').collect()).length,
      logs: (await ctx.db.query('tickLogs').collect()).length,
      runs: (await ctx.db.query('simulationRuns').collect()).length,
      users: await ctx.db.query('users').collect(),
      audit: (await ctx.db.query('adminAuditEvents').collect()).map((event) => event.outcome),
    }))
    expect(left).toMatchObject({ heroes: 0, items: 0, logs: 0, runs: 0 })
    expect(left.users).toHaveLength(1)
    expect(left.users[0]!.activeHeroId).toBeUndefined()
    expect(left.audit).toEqual(['started', expect.stringMatching(/^completed:\d+$/)])
    expect(await world(t)).toMatchObject({ activeContentVersion: 'v1', ticksPaused: false })
    expect(await t.run(async (ctx) => await ctx.db.get(heroId))).toBeNull()
  })

  it('refuses while a run is active', async () => {
    await seedHero(t, {}, 'Ana')
    await t.mutation(internal.sim.runs.tick.startTick, {})
    expect((await world(t))?.activeRunId).toBeDefined()
    await expect(t.mutation(internal.resetGame.start, { confirm: 'RESET DESK CRAWLER BEFORE LAUNCH' })).rejects.toThrow(/run is active/)
  })
})
