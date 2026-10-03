// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '../../convex/_generated/api'
import schema from '../../convex/schema'
import { sha256Hex } from '../../convex/lib/hash'
import { seedHero, seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../convex/**/*.ts')

async function linkGrant(t: T, alias: string, tokenHash: string) {
  await t.run(async (ctx) => {
    const user = await ctx.db.query('users').withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', `issuer|${alias}`)).unique()
    const grantId = await ctx.db.insert('trmnlGrants', { userId: user!._id, tokenHash, state: 'active', createdAt: Date.now() })
    await ctx.db.insert('trmnlInstances', { grantId, userId: user!._id, uuid: 'ae48d6ac-48f4-4aed-8464-bad68368e97c', state: 'active', confirmedBy: 'success_callback', createdAt: Date.now() })
  })
}

describe('account deletion (D22)', () => {
  let t: T
  let fetchMock: ReturnType<typeof vi.fn>
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.UTC(2026, 9, 3, 10, 0))
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_fake')
    fetchMock = vi.fn(async () => new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    t = convexTest(schema, modules)
    await seedWorld(t)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('denies authority at once, purges game data, deletes the Clerk user and keeps only revocation hashes', async () => {
    const heroId = await seedHero(t, {}, 'Ana')
    const tokenHash = sha256Hex('installation-token-ana')
    await linkGrant(t, 'Ana', tokenHash)
    const user = t.withIdentity({ issuer: 'issuer', subject: 'Ana' })

    await user.mutation(api.deletion.requestDeletion, { operationId: 'delete-0001', confirm: 'DELETE' })
    // Immediate denial: commands fail before the purge runs.
    await expect(user.mutation(api.heroes.pause, { operationId: 'pause-0001' })).rejects.toThrow()

    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const remaining = await t.run(async (ctx) => ({
      users: (await ctx.db.query('users').collect()).length,
      heroes: await ctx.db.get(heroId),
      items: (await ctx.db.query('items').collect()).length,
      grants: (await ctx.db.query('trmnlGrants').collect()).length,
      instances: (await ctx.db.query('trmnlInstances').collect()).length,
      revokedTokens: (await ctx.db.query('revokedTrmnlCredentials').collect()).map((r) => r.tokenHash),
      revokedIdentities: (await ctx.db.query('revokedAuthIdentities').collect()).length,
      job: await ctx.db.query('accountDeletionJobs').first(),
    }))
    expect(remaining).toMatchObject({ users: 0, heroes: null, items: 0, grants: 0, instances: 0, revokedTokens: [tokenHash], revokedIdentities: 1 })
    expect(remaining.job).toMatchObject({ state: 'completed', phase: 'done' })
    expect(remaining.job?.userId).toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith('https://api.clerk.com/v1/users/Ana', expect.objectContaining({ method: 'DELETE' }))

    // Replays cannot recreate the account or relink the old installation token.
    await expect(t.mutation(internal.trmnl.linkInstall, { tokenIdentifier: 'issuer|Ana', tokenHash: sha256Hex('new-token'), publicAlias: 'Ana2', heroName: 'Baz', timezone: 'UTC' })).rejects.toThrow()
    await seedHero(t, {}, 'Bo')
    await expect(t.mutation(internal.trmnl.linkInstall, { tokenIdentifier: 'issuer|Bo', tokenHash, timezone: 'UTC' })).rejects.toThrow()
  })

  it('retries the provider step and blocks visibly after repeated failures', async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 500 }))
    await seedHero(t, {}, 'Cy')
    await t.withIdentity({ issuer: 'issuer', subject: 'Cy' }).mutation(api.deletion.requestDeletion, { operationId: 'delete-0002', confirm: 'DELETE' })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const job = await t.run(async (ctx) => await ctx.db.query('accountDeletionJobs').first())
    expect(job).toMatchObject({ state: 'blocked', phase: 'provider', reasonCode: 'PROVIDER_DELETE_FAILED' })
    // The account stays denied while blocked.
    expect((await t.run(async (ctx) => await ctx.db.query('users').first()))?.state).toBe('deleting')
  })
})
