// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import { sha256Hex } from '../../apps/backend/convex/lib/hash'
import { verifySvix } from '../../apps/backend/convex/lib/svix'
import { seedHero, seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')

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

  it('reconciles a verified Clerk user.deleted once, and refuses unsigned or stale deliveries (V09)', async () => {
    vi.stubEnv('CLERK_JWT_ISSUER_DOMAIN', 'issuer')
    const secret = 'whsec_' + btoa('desk-crawler-test-signing-key-32b')
    vi.stubEnv('CLERK_WEBHOOK_SECRET', secret)
    await seedHero(t, {}, 'user_Dana12345')
    // Clerk already deleted the user, so the provider step sees 404 and completes.
    fetchMock.mockImplementation(async () => new Response(null, { status: 404 }))

    const body = JSON.stringify({ type: 'user.deleted', data: { id: 'user_Dana12345', deleted: true } })
    const sign = async (id: string, ts: number, payload: string) => {
      const key = await crypto.subtle.importKey('raw', Uint8Array.from(atob(secret.slice(6)), (c) => c.charCodeAt(0)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${payload}`))
      return `v1,${btoa(String.fromCharCode(...new Uint8Array(mac)))}`
    }
    const deliver = async (payload: string, ts = Math.floor(Date.now() / 1000), signature?: string) =>
      await t.fetch('/auth/clerk/webhook', {
        method: 'POST',
        headers: { 'svix-id': 'msg_1', 'svix-timestamp': String(ts), 'svix-signature': signature ?? (await sign('msg_1', ts, payload)) },
        body: payload,
      })

    expect((await deliver(body, undefined, 'v1,AAAA')).status).toBe(401)
    expect((await deliver(body, Math.floor(Date.now() / 1000) - 600)).status).toBe(401)
    expect(await t.run(async (ctx) => (await ctx.db.query('accountDeletionJobs').collect()).length)).toBe(0)

    expect((await deliver(body)).status).toBe(200)
    expect((await deliver(body)).status).toBe(200) // duplicate delivery
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const state = await t.run(async (ctx) => ({
      users: (await ctx.db.query('users').collect()).length,
      jobs: (await ctx.db.query('accountDeletionJobs').collect()).map((j) => j.state),
      revoked: (await ctx.db.query('revokedAuthIdentities').collect()).length,
    }))
    expect(state).toEqual({ users: 0, jobs: ['completed'], revoked: 1 })
    // A late redelivery after the purge only keeps the single revocation hash.
    expect((await deliver(body)).status).toBe(200)
    expect(await t.run(async (ctx) => (await ctx.db.query('revokedAuthIdentities').collect()).length)).toBe(1)
    // Other event types are acknowledged and ignored.
    expect((await deliver(JSON.stringify({ type: 'user.updated', data: { id: 'user_Dana12345' } }))).status).toBe(200)
    expect(await verifySvix(secret, { id: 'msg_1', timestamp: '1', signature: 'v1,x' }, body, Date.now())).toBe(false)
  })
})
