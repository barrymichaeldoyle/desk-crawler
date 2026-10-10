// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import type { T } from './helpers'
import { nextSlowCastTick, runSlowCastTick, seedAngler } from './slowCastHelpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')

describe('Slow Cast operator controls (D115)', () => {
  let t: T
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.UTC(2026, 10, 2, 6, 5, 3))
    vi.stubEnv('ADMIN_TOKEN_IDENTIFIERS', 'issuer|Admin')
    t = convexTest(schema, modules)
    await runSlowCastTick(t)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })
  const admin = () => t.withIdentity({ issuer: 'issuer', subject: 'Admin' })

  it('shows health to admins only and releases a quarantined angler with an audit row', async () => {
    const anglerId = await seedAngler(t, { simulationState: 'quarantined', quarantineReasonCode: 'UNKNOWN_WATER' }, 'Stuck')
    await expect(t.withIdentity({ issuer: 'issuer', subject: 'Stuck' }).query(api.slowCast.operations.health, {})).rejects.toThrow()
    const health = await admin().query(api.slowCast.operations.health, {})
    expect(health).toMatchObject({ world: { currentTick: 1, contentVersion: 'v1', ticksPaused: false }, quarantined: [{ name: 'Stuck', reasonCode: 'UNKNOWN_WATER' }] })
    await admin().mutation(api.slowCast.operations.releaseAngler, { anglerId, reasonCode: 'diagnosed' })
    expect((await t.run(async (ctx) => await ctx.db.get(anglerId)))!.simulationState).toBe('healthy')
    expect((await t.run(async (ctx) => await ctx.db.query('adminAuditEvents').collect())).map((e) => e.action)).toEqual(['release_angler'])
  })

  it('pauses new ticks and resumes without catch-up', async () => {
    await t.mutation(internal.slowCast.operations.setTicksPaused, { paused: true })
    expect(await nextSlowCastTick(t)).toBeNull()
    await t.mutation(internal.slowCast.operations.setTicksPaused, { paused: false })
    await nextSlowCastTick(t)
    const world = await t.run(async (ctx) => await ctx.db.query('swWorldState').first())
    expect(world!.currentTick).toBe(2)
  })

  it('refuses an unknown content version and reports engagement', async () => {
    await expect(t.mutation(internal.slowCast.operations.setActiveContentVersion, { contentVersion: 'v99' })).rejects.toThrow()
    await seedAngler(t, {}, 'Fin')
    const report = await t.query(internal.slowCast.operations.engagement, {})
    expect(report).toMatchObject({ activeAnglers: 1, waters: { millpond: 1 }, fish: { caught: 0 } })
  })

  it('pauses Desk Crawler ticks through its own switch', async () => {
    const { seedWorld } = await import('./helpers')
    await seedWorld(t)
    await t.mutation(internal.admin.setTicksPaused, { paused: true })
    expect(await t.mutation(internal.sim.runs.tick.startTick, {})).toBeNull()
  })
})
