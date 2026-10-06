// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import { sha256Hex } from '../../apps/backend/convex/lib/hash'
import { seedDeletionConfirmation, seedHero, seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
const UUID = 'ae48d6ac-48f4-4aed-8464-bad68368e97c'

async function linkGrant(t: T, alias: string, tokenHash: string) {
  await t.run(async (ctx) => {
    const user = await ctx.db.query('users').withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', `issuer|${alias}`)).unique()
    const grantId = await ctx.db.insert('trmnlGrants', { userId: user!._id, tokenHash, state: 'active', createdAt: Date.now() })
    await ctx.db.insert('trmnlInstances', { grantId, userId: user!._id, uuid: UUID, state: 'active', confirmedBy: 'success_callback', createdAt: Date.now() })
  })
}

const screen = (t: T, tokenHash: string) => t.query(internal.trmnlPayload.forInstance, { tokenHash, uuid: UUID, now: Date.now(), instanceName: null })

describe('Desk Crawler progress deletion', () => {
  let t: T
  let fetchMock: ReturnType<typeof vi.fn>
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.UTC(2026, 9, 4, 10, 0))
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

  it('denies game authority at once, purges game data and keeps the shared account', async () => {
    const heroId = await seedHero(t, {}, 'Ana')
    const tokenHash = sha256Hex('installation-token-ana')
    await linkGrant(t, 'Ana', tokenHash)
    const ana = t.withIdentity({ issuer: 'issuer', subject: 'Ana' })
    expect(await screen(t, tokenHash)).toMatchObject({ outcome: 'payload' })

    await ana.mutation(api.deletion.requestGameDeletion, { operationId: 'game-delete-0001', confirm: 'DELETE' })
    await expect(ana.mutation(api.heroes.pause, { operationId: 'pause-0001' })).rejects.toThrow()
    expect(await screen(t, tokenHash)).toBeNull()
    expect(await ana.query(api.users.me, {})).toMatchObject({ gameState: 'deleting', hero: null })

    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const state = await t.run(async (ctx) => ({
      user: await ctx.db.query('users').first(),
      hero: await ctx.db.get(heroId),
      items: (await ctx.db.query('items').collect()).length,
      grants: (await ctx.db.query('trmnlGrants').collect()).length,
      instances: (await ctx.db.query('trmnlInstances').collect()).length,
      revokedTokens: (await ctx.db.query('revokedTrmnlCredentials').collect()).map((r) => r.tokenHash),
      revokedIdentities: (await ctx.db.query('revokedAuthIdentities').collect()).length,
      profile: await ctx.db.query('deskCrawlerProfiles').first(),
      job: await ctx.db.query('gameDeletionJobs').first(),
    }))
    expect(state).toMatchObject({ user: { publicAlias: 'Ana', state: 'active' }, hero: null, items: 0, grants: 0, instances: 0, revokedTokens: [tokenHash], revokedIdentities: 0 })
    expect(state.user?.activeHeroId).toBeUndefined()
    expect(state.profile).toMatchObject({ state: 'active' })
    expect(state.profile?.activeHeroId).toBeUndefined()
    expect(state.job).toMatchObject({ state: 'completed', phase: 'done' })
    expect(fetchMock).not.toHaveBeenCalled() // the Clerk user stays

    // The old installation token stays dead; a fresh installation starts a new hero under the same account.
    await expect(t.mutation(internal.trmnl.linkInstall, { tokenIdentifier: 'issuer|Ana', tokenHash, heroName: 'Baz', timezone: 'UTC' })).rejects.toThrow()
    await t.mutation(internal.trmnl.linkInstall, { tokenIdentifier: 'issuer|Ana', tokenHash: sha256Hex('new-token-ana'), heroName: 'Bea', timezone: 'UTC' })
    expect(await ana.query(api.users.me, {})).toMatchObject({ gameState: 'active', user: { publicAlias: 'Ana' }, hero: { name: 'Bea' } })
  })

  it('leaves other players untouched', async () => {
    await seedHero(t, {}, 'Ana')
    const boHero = await seedHero(t, {}, 'Bo')
    const boToken = sha256Hex('installation-token-bo')
    await linkGrant(t, 'Bo', boToken)
    await t.withIdentity({ issuer: 'issuer', subject: 'Ana' }).mutation(api.deletion.requestGameDeletion, { operationId: 'game-delete-0002', confirm: 'DELETE' })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await t.run(async (ctx) => await ctx.db.get(boHero))).not.toBeNull()
    expect(await screen(t, boToken)).toMatchObject({ outcome: 'payload' })
  })

  it('reopens the game for an owner suspended during the purge once they are restored', async () => {
    await seedHero(t, {}, 'Cy')
    const cy = t.withIdentity({ issuer: 'issuer', subject: 'Cy' })
    await cy.mutation(api.deletion.requestGameDeletion, { operationId: 'game-delete-0003', confirm: 'DELETE' })
    await t.run(async (ctx) => { const user = await ctx.db.query('users').first(); await ctx.db.patch(user!._id, { state: 'suspended' }) })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    await t.run(async (ctx) => { const user = await ctx.db.query('users').first(); await ctx.db.patch(user!._id, { state: 'active' }) })
    expect(await cy.query(api.users.me, {})).toMatchObject({ gameState: 'active', hero: null })
  })

  it('deletes a signed-in identity that never joined a game, including its Clerk user', async () => {
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_fake')
    const eve = t.withIdentity({ issuer: 'issuer', subject: 'Eve' })
    expect(await eve.query(api.users.me, {})).toMatchObject({ user: null })
    await eve.mutation(api.deletion.requestDeletion, { operationId: 'delete-0005', confirm: 'DELETE', token: await seedDeletionConfirmation(t, 'Eve') })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(fetchMock).toHaveBeenCalledWith('https://api.clerk.com/v1/users/Eve', expect.objectContaining({ method: 'DELETE' }))
    expect(await t.run(async (ctx) => ({
      users: (await ctx.db.query('users').collect()).length,
      revoked: (await ctx.db.query('revokedAuthIdentities').collect()).length,
    }))).toEqual({ users: 0, revoked: 1 })
  })

  it('removes the game profile and its jobs when the whole account is deleted afterwards', async () => {
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_fake')
    await seedHero(t, {}, 'Di')
    const di = t.withIdentity({ issuer: 'issuer', subject: 'Di' })
    await di.mutation(api.deletion.requestGameDeletion, { operationId: 'game-delete-0004', confirm: 'DELETE' })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    await di.mutation(api.deletion.requestDeletion, { operationId: 'delete-0004', confirm: 'DELETE', token: await seedDeletionConfirmation(t, 'Di') })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await t.run(async (ctx) => ({
      users: (await ctx.db.query('users').collect()).length,
      profiles: (await ctx.db.query('deskCrawlerProfiles').collect()).length,
      gameJobs: (await ctx.db.query('gameDeletionJobs').collect()).length,
    }))).toEqual({ users: 0, profiles: 0, gameJobs: 0 })
  })
})
