// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { internal } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import { seedHero, seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
const SLOT = Date.UTC(2026, 9, 3, 10, 0, 2)

async function stallRun(t: T) {
  const runId = (await t.mutation(internal.sim.runs.tick.startTick, {}))!
  await t.run(async (ctx) => {
    const run = await ctx.db.get(runId)
    if (run?.nextScheduledFunctionId) await ctx.scheduler.cancel(run.nextScheduledFunctionId)
  })
  vi.setSystemTime(SLOT + 6 * 60_000)
  return runId
}

describe('incident notices (D27)', () => {
  let t: T
  let fetchMock: ReturnType<typeof vi.fn>
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(SLOT)
    fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    t = convexTest(schema, modules)
    await seedWorld(t, { lastPublishedAt: SLOT - 30 * 60_000 })
    await seedHero(t)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('opens one incident per stalled run, sends one alert, then one recovery notice', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_fake')
    const runId = await stallRun(t)
    // Two watchdog passes before the resumed chain finishes.
    await t.mutation(internal.sim.runs.tick.watchdog, {})
    await t.mutation(internal.sim.runs.tick.watchdog, {})
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const incidents = await t.run(async (ctx) => await ctx.db.query('operationalIncidents').collect())
    expect(incidents).toHaveLength(1)
    expect(incidents[0]).toMatchObject({ runId, state: 'recovered', alert: { state: 'sent' }, recovery: { state: 'sent' } })
    const subjects = fetchMock.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string).subject)
    expect(subjects).toEqual(['Desk Crawler: world tick 1 has stalled', 'Desk Crawler: world tick 1 recovered'])
    const keys = fetchMock.mock.calls.map(([, init]) => ((init as RequestInit).headers as Record<string, string>)['Idempotency-Key'])
    expect(new Set(keys).size).toBe(2)
  })

  it('records delivery as disabled without a Resend key and still recovers the run', async () => {
    await stallRun(t)
    await t.mutation(internal.sim.runs.tick.watchdog, {})
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const incident = await t.run(async (ctx) => await ctx.db.query('operationalIncidents').first())
    expect(incident).toMatchObject({ state: 'recovered', alert: { state: 'disabled' }, recovery: { state: 'disabled' } })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
