// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import { sha256Hex } from '../../apps/backend/convex/lib/hash'
import { seedDeletionConfirmation, seedWorld, type T } from './helpers'
import { nextSlowCastTick, runSlowCastTick } from './slowCastHelpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
const DC_UUID = 'dddddddd-1111-4aed-8464-bad68368e97c'
const SC_UUID = 'cccccccc-2222-4aed-8464-bad68368e97c'

const screen = (t: T, token: string, uuid: string, path: string) =>
  t.fetch(path, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ user_uuid: uuid }).toString() })

/** Ana plays both games, each on its own installation, with a few Slow Cast ticks behind her. */
async function bothGames(t: T) {
  await t.mutation(internal.trmnl.linkInstall, { gameSlug: 'desk-crawler', tokenIdentifier: 'issuer|Ana', tokenHash: sha256Hex('dc-token-ana'), publicAlias: 'Ana', heroName: 'Baz', timezone: 'UTC' })
  await t.mutation(internal.trmnl.confirmInstance, { gameSlug: 'desk-crawler', tokenHash: sha256Hex('dc-token-ana'), uuid: DC_UUID, confirmedBy: 'success_callback' })
  await t.mutation(internal.trmnl.linkInstall, { gameSlug: 'slow-cast', tokenIdentifier: 'issuer|Ana', tokenHash: sha256Hex('sc-token-ana'), publicAlias: 'Ana', timezone: 'UTC' })
  await t.mutation(internal.trmnl.confirmInstance, { gameSlug: 'slow-cast', tokenHash: sha256Hex('sc-token-ana'), uuid: SC_UUID, confirmedBy: 'success_callback' })
  for (let i = 0; i < 6; i += 1) await nextSlowCastTick(t)
}

describe('Slow Cast deletion (D115, S2)', () => {
  let t: T
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.UTC(2026, 10, 2, 6, 5, 3))
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_fake')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 200 })))
    t = convexTest(schema, modules)
    await seedWorld(t)
    await runSlowCastTick(t)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })
  const ana = () => t.withIdentity({ issuer: 'issuer', subject: 'Ana' })

  it('deletes Slow Cast progress alone and leaves Desk Crawler playing', async () => {
    await bothGames(t)
    await ana().mutation(api.deletion.requestGameDeletion, { operationId: 'del-sc-0001', confirm: 'DELETE', gameSlug: 'slow-cast' })
    // Authority goes at once.
    expect((await screen(t, 'sc-token-ana', SC_UUID, '/trmnl/slow-cast/v1/screen')).status).toBe(404)
    await expect(ana().mutation(api.slowCast.anglers.pause, { operationId: 'pause-sc-01' })).rejects.toThrow()
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const state = await t.run(async (ctx) => ({
      anglers: await ctx.db.query('anglers').collect(),
      catches: await ctx.db.query('catches').collect(),
      logs: await ctx.db.query('swTickLogs').collect(),
      windows: await ctx.db.query('swScoreWindows').collect(),
      profile: await ctx.db.query('slowCastProfiles').first(),
      heroes: await ctx.db.query('heroes').collect(),
      grants: await ctx.db.query('trmnlGrants').collect(),
      revoked: (await ctx.db.query('revokedTrmnlCredentials').collect()).map((r) => r.tokenHash),
    }))
    expect(state).toMatchObject({ anglers: [], catches: [], logs: [], windows: [], profile: { state: 'active' }, revoked: [sha256Hex('sc-token-ana')] })
    expect(state.heroes).toHaveLength(1)
    expect(state.grants.map((g) => g.gameSlug)).toEqual(['desk-crawler'])
    expect((await screen(t, 'dc-token-ana', DC_UUID, '/trmnl/v1/screen')).status).toBe(200)
  })

  it('deletes Desk Crawler progress without cutting off the Slow Cast plugin', async () => {
    await bothGames(t)
    await ana().mutation(api.deletion.requestGameDeletion, { operationId: 'del-dc-0001', confirm: 'DELETE' })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const state = await t.run(async (ctx) => ({
      heroes: await ctx.db.query('heroes').collect(),
      anglers: await ctx.db.query('anglers').collect(),
      grants: (await ctx.db.query('trmnlGrants').collect()).map((g) => g.gameSlug),
      instances: (await ctx.db.query('trmnlInstances').collect()).map((i) => i.gameSlug),
    }))
    expect(state).toMatchObject({ heroes: [], grants: ['slow-cast'], instances: ['slow-cast'] })
    expect(state.anglers).toHaveLength(1)
    expect((await screen(t, 'sc-token-ana', SC_UUID, '/trmnl/slow-cast/v1/screen')).status).toBe(200)
  })

  it('purges the angler and its profile with the whole account', async () => {
    await bothGames(t)
    await ana().mutation(api.deletion.requestDeletion, { operationId: 'del-acct-001', confirm: 'DELETE', token: await seedDeletionConfirmation(t, 'Ana') })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const left = await t.run(async (ctx) => ({
      users: await ctx.db.query('users').collect(),
      anglers: await ctx.db.query('anglers').collect(),
      catches: await ctx.db.query('catches').collect(),
      logs: await ctx.db.query('swTickLogs').collect(),
      windows: await ctx.db.query('swScoreWindows').collect(),
      profiles: await ctx.db.query('slowCastProfiles').collect(),
      grants: await ctx.db.query('trmnlGrants').collect(),
    }))
    expect(left).toEqual({ users: [], anglers: [], catches: [], logs: [], windows: [], profiles: [], grants: [] })
  })
})
