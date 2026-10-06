// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import { deletionToken, DELETION_LINK_TTL_MS } from '../../apps/backend/convex/lib/deletionConfirmation'
import { identityHash } from '../../apps/backend/convex/deletion'
import { sha256Hex } from '../../apps/backend/convex/lib/hash'
import { seedDeletionConfirmation, seedHero, seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
const KEY = 'test-deletion-link-signing-secret-32-characters'
const clerkUser = { primary_email_address_id: 'email_1', email_addresses: [{ id: 'email_1', email_address: 'owner@example.com', verification: { status: 'verified' } }] }

describe('account deletion email confirmation', () => {
  let t: T
  let fetchMock: ReturnType<typeof vi.fn>
  const owner = () => t.withIdentity({ issuer: 'issuer', subject: 'Ana' })
  const row = () => t.run(ctx => ctx.db.query('accountDeletionConfirmations').first())
  const proof = async () => deletionToken(KEY, (await row())!)
  const messages = () => fetchMock.mock.calls.filter(([url]) => url === 'https://api.resend.com/emails')
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.UTC(2026, 9, 6, 12))
    vi.stubEnv('ACCOUNT_DELETION_LINK_KEY', KEY)
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_fake')
    vi.stubEnv('RESEND_API_KEY', 're_test_fake')
    vi.stubEnv('COMPANION_ORIGIN', 'https://trmnlgames.com')
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => new Response(url.startsWith('https://api.clerk.com') && init?.method !== 'DELETE' ? JSON.stringify(clerkUser) : null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    t = convexTest(schema, modules)
    await seedWorld(t)
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  it('sends to the verified primary address once; duplicate requests leave the account active', async () => {
    const hero = await seedHero(t, {}, 'Ana')
    await owner().action(api.deletion.requestDeletionEmail, {})
    await owner().action(api.deletion.requestDeletionEmail, {})
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    await owner().action(api.deletion.requestDeletionEmail, {})
    expect(messages()).toHaveLength(1)
    expect(await row()).toMatchObject({ state: 'sent', attempts: 1, email: 'owner@example.com' })
    expect(await owner().query(api.deletion.deletionEmailStatus, {})).toEqual({ state: 'sent', email: 'owner@example.com', expiresAt: (await row())!.expiresAt })
    expect(await t.withIdentity({ issuer: 'issuer', subject: 'Bo' }).query(api.deletion.deletionEmailStatus, {})).toBeNull()
    expect(await t.run(ctx => ctx.db.get(hero))).not.toBeNull()
    expect(await t.run(ctx => ctx.db.query('users').first())).toMatchObject({ state: 'active' })
    expect(await t.run(ctx => ctx.db.query('accountDeletionJobs').collect())).toEqual([])
    const body = JSON.parse(messages()[0]![1]!.body as string)
    expect(body.to).toEqual(['owner@example.com'])
    expect(body.text).toContain(`/account/delete?token=${await proof()}`)
    expect(JSON.stringify(await row())).not.toContain(await proof())
  })

  it('does not permit the former immediate call, incorrect tokens, or another account', async () => {
    await seedHero(t, {}, 'Ana')
    await seedHero(t, {}, 'Bo')
    await expect(owner().mutation(api.deletion.requestDeletion, { operationId: 'no-email-proof', confirm: 'DELETE' })).rejects.toThrow(/deletion link/)
    await owner().action(api.deletion.requestDeletionEmail, {})
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    await expect(owner().mutation(api.deletion.requestDeletion, { operationId: 'bad-email-proof', confirm: 'DELETE', token: '0'.repeat(64) })).rejects.toThrow(/expired or unavailable/)
    await expect(t.withIdentity({ issuer: 'issuer', subject: 'Bo' }).mutation(api.deletion.requestDeletion, { operationId: 'foreign-email-proof', confirm: 'DELETE', token: await proof() })).rejects.toThrow(/expired or unavailable/)
    expect(await t.run(ctx => ctx.db.query('accountDeletionJobs').collect())).toEqual([])
    expect((await row())?.state).toBe('sent')
  })

  it('reserves one request when multiple clients ask concurrently', async () => {
    await Promise.all([owner().action(api.deletion.requestDeletionEmail, {}), owner().action(api.deletion.requestDeletionEmail, {})])
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await t.run(ctx => ctx.db.query('accountDeletionConfirmations').collect())).toHaveLength(1)
    expect(messages()).toHaveLength(1)
  })

  it('purges expired email data in retention cleanup without touching an active request', async () => {
    await owner().action(api.deletion.requestDeletionEmail, {})
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    vi.advanceTimersByTime(DELETION_LINK_TTL_MS + 1)
    await t.withIdentity({ issuer: 'issuer', subject: 'Bo' }).action(api.deletion.requestDeletionEmail, {})
    await t.mutation(internal.maintenance.cleanup, { job: 'deletionConfirmations' })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await row()).toMatchObject({ tokenIdentifier: 'issuer|Bo', state: 'sent' })
    expect(await t.run(ctx => ctx.db.query('accountDeletionConfirmations').collect())).toHaveLength(1)
  })

  it('requires delivery; expires and rotates the link only after the cooldown', async () => {
    await owner().action(api.deletion.requestDeletionEmail, {})
    const oldToken = await proof()
    await expect(owner().mutation(api.deletion.requestDeletion, { operationId: 'pending-email-proof', confirm: 'DELETE', token: oldToken })).rejects.toThrow(/expired or unavailable/)
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    vi.advanceTimersByTime(DELETION_LINK_TTL_MS)
    await expect(owner().mutation(api.deletion.requestDeletion, { operationId: 'expired-email-proof', confirm: 'DELETE', token: oldToken })).rejects.toThrow(/expired or unavailable/)
    await owner().action(api.deletion.requestDeletionEmail, {})
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(messages()).toHaveLength(2)
    expect(await proof()).not.toBe(oldToken)
    await expect(owner().mutation(api.deletion.requestDeletion, { operationId: 'old-email-proof', confirm: 'DELETE', token: oldToken })).rejects.toThrow()
    expect(await t.run(ctx => ctx.db.query('accountDeletionConfirmations').collect())).toHaveLength(1)
  })

  it('retries an unknown delivery outcome using the same message and provider idempotency key', async () => {
    let sends = 0
    fetchMock.mockImplementation(async (url: string) => {
      if (url === 'https://api.resend.com/emails' && ++sends === 1) throw new TypeError('timeout after acceptance')
      return new Response(url.startsWith('https://api.clerk.com') ? JSON.stringify(clerkUser) : null, { status: 200 })
    })
    await owner().action(api.deletion.requestDeletionEmail, {})
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(messages()).toHaveLength(2)
    expect(messages()[0]![1]!.body).toEqual(messages()[1]![1]!.body)
    expect(messages()[0]![1]!.headers).toEqual(messages()[1]![1]!.headers)
    expect(messages()[0]![1]!.headers).toMatchObject({ 'Idempotency-Key': `account-deletion/${(await row())!._id}` })
    expect(await row()).toMatchObject({ state: 'sent', attempts: 2 })
  })

  it('caps failed delivery attempts and prevents repeated requests from sending more', async () => {
    fetchMock.mockImplementation(async (url: string) => new Response(url.startsWith('https://api.clerk.com') ? JSON.stringify(clerkUser) : null, { status: url.startsWith('https://api.clerk.com') ? 200 : 500 }))
    await owner().action(api.deletion.requestDeletionEmail, {})
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await row()).toMatchObject({ state: 'failed', attempts: 3 })
    await owner().action(api.deletion.requestDeletionEmail, {})
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(messages()).toHaveLength(3)
    expect(await t.run(ctx => ctx.db.query('accountDeletionJobs').collect())).toEqual([])
  })

  it('fails closed for missing configuration and unverified primary email', async () => {
    vi.stubEnv('ACCOUNT_DELETION_LINK_KEY', '')
    await expect(owner().action(api.deletion.requestDeletionEmail, {})).rejects.toThrow(/unavailable/)
    vi.stubEnv('ACCOUNT_DELETION_LINK_KEY', KEY)
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ ...clerkUser, primary_email_address_id: 'other_email' }), { status: 200 }))
    await expect(owner().action(api.deletion.requestDeletionEmail, {})).rejects.toThrow(/verified primary email/)
    expect(await row()).toBeNull()
    expect(messages()).toEqual([])
  })

  it('confirms a never-enrolled account once and purges the temporary email record', async () => {
    await owner().action(api.deletion.requestDeletionEmail, {})
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await t.run(ctx => ctx.db.query('users').collect())).toEqual([])
    const token = await proof()
    await owner().mutation(api.deletion.requestDeletion, { operationId: 'confirm-account-delete', confirm: 'DELETE', token })
    expect(await owner().mutation(api.deletion.requestDeletion, { operationId: 'confirm-account-delete', confirm: 'DELETE', token })).toEqual({ operationId: 'confirm-account-delete', changed: false })
    expect(await t.run(ctx => ctx.db.query('accountDeletionJobs').collect())).toHaveLength(1)
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await row()).toBeNull()
    expect(await t.run(ctx => ctx.db.query('users').collect())).toEqual([])
    const job = (await t.run(ctx => ctx.db.query('accountDeletionJobs').first()))!
    expect(job.state).toBe('completed')
    expect(job.userId).toBeUndefined()
    expect(job.clerkUserId).toBeUndefined()
    expect(job.heroRef).toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith('https://api.clerk.com/v1/users/Ana', expect.objectContaining({ method: 'DELETE' }))
  })

  it('removes more than one batch of rate buckets and scrubs actor, owner and hero audit references', async () => {
    const heroId = await seedHero(t, {}, 'Ana')
    const otherHeroId = await seedHero(t, {}, 'Bo')
    const userId = await t.run(async ctx => (await ctx.db.get(heroId))!.userId)
    const otherUserId = await t.run(async ctx => (await ctx.db.get(otherHeroId))!.userId)
    await t.run(async ctx => {
      for (let i = 0; i < 130; i++) {
        await ctx.db.insert('rateLimitBuckets', { key: `intent:${userId}`, windowStart: i, count: 1, expiresAt: Date.now() + 100_000 })
        await ctx.db.insert('adminAuditEvents', { actorRef: i % 2 ? 'issuer|Ana' : 'Ana', targetRef: i % 2 ? heroId : userId, action: 'rebind_owner', reasonCode: 'test', outcome: 'applied', at: Date.now() })
      }
      await ctx.db.insert('rateLimitBuckets', { key: `intent:${otherUserId}`, windowStart: 1, count: 1, expiresAt: Date.now() + 100_000 })
      await ctx.db.insert('adminAuditEvents', { actorRef: 'issuer|Bo', targetRef: otherUserId, action: 'test', reasonCode: 'test', outcome: 'applied', at: Date.now() })
    })
    await owner().mutation(api.deletion.requestDeletion, { operationId: 'delete-many-references', confirm: 'DELETE', token: await seedDeletionConfirmation(t, 'Ana') })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const state = await t.run(async ctx => ({ buckets: await ctx.db.query('rateLimitBuckets').collect(), audits: await ctx.db.query('adminAuditEvents').collect(), otherHero: await ctx.db.get(otherHeroId) }))
    expect(state.buckets).toHaveLength(1)
    expect(state.buckets[0]!.key).toBe(`intent:${otherUserId}`)
    expect(state.audits.filter(a => a.action === 'rebind_owner')).toHaveLength(130)
    expect(state.audits.filter(a => a.action === 'rebind_owner').every(a => a.actorRef === 'deleted-account' && a.targetRef === 'deleted-account')).toBe(true)
    expect(state.audits.find(a => a.action === 'test')).toMatchObject({ actorRef: 'issuer|Bo', targetRef: otherUserId })
    expect(state.otherHero).not.toBeNull()
  })

  it('repairs historical deleted-account references, refusing live and unrevoked identities', async () => {
    const heroId = await seedHero(t, {}, 'Ana')
    const userId = await t.run(async ctx => (await ctx.db.get(heroId))!.userId)
    const args = { userId, tokenIdentifier: 'issuer|Ana', heroRef: heroId }
    await expect(t.mutation(internal.deletion.scrubDeletedAccountReferences, args)).rejects.toThrow(/deleted account/)
    await t.run(async ctx => { await ctx.db.delete(heroId); await ctx.db.delete(userId) })
    await expect(t.mutation(internal.deletion.scrubDeletedAccountReferences, args)).rejects.toThrow(/revocation/)
    await t.run(async ctx => {
      await ctx.db.insert('revokedAuthIdentities', { identityHash: identityHash('issuer|Ana'), revokedAt: Date.now(), reasonCode: 'account_deleted' })
      await ctx.db.insert('adminAuditEvents', { actorRef: 'platform-migration', targetRef: userId, action: 'rebind_owner', reasonCode: 'test', outcome: 'applied', at: Date.now() })
      await ctx.db.insert('rateLimitBuckets', { key: `intent:${userId}`, windowStart: 0, count: 1, expiresAt: Date.now() + 100_000 })
    })
    expect(await t.mutation(internal.deletion.scrubDeletedAccountReferences, args)).toEqual({ changed: 2 })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await t.run(ctx => ctx.db.query('rateLimitBuckets').collect())).toEqual([])
    expect(await t.run(ctx => ctx.db.query('adminAuditEvents').first())).toMatchObject({ targetRef: 'deleted-account', actorRef: 'platform-migration' })
    expect(await t.mutation(internal.deletion.scrubDeletedAccountReferences, args)).toEqual({ changed: 0 })
  })
})
