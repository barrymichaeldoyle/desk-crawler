import { gameProfile, DESK_CRAWLER } from './lib/gameProfile'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Doc, Id, TableNames } from './_generated/dataModel'
import { internalAction, internalMutation, internalQuery, mutation, type MutationCtx } from './_generated/server'
import { appError } from './lib/errors'
import { sha256Hex } from './lib/hash'
import { runIntent } from './lib/intent'

/**
 * Account deletion (D22, data-model.md "Deletion checkpoints"). Authority is
 * denied in the request transaction; a durable job then purges game data in
 * bounded batches, records minimal revocation hashes, deletes the dedicated
 * Clerk user and finally removes the user row. Restore never resurrects it.
 */
const BATCH = 100
const MAX_PROVIDER_ATTEMPTS = 5

export const identityHash = (tokenIdentifier: string) => sha256Hex(`auth:${tokenIdentifier}`)

export const requestDeletion = mutation({
  args: { operationId: v.string(), confirm: v.literal('DELETE') },
  returns: v.object({ operationId: v.string(), changed: v.boolean() }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw appError('UNAUTHENTICATED', 'Sign in to continue.')
    assertNotRevoked(await ctx.db.query('revokedAuthIdentities').withIndex('by_identityHash', (q) => q.eq('identityHash', identityHash(identity.tokenIdentifier))).first())
    const existing = await ctx.db.query('users').withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier)).unique()
    if (!existing) {
      // Clerk signup need not enroll in a game. This row exists only as the
      // durable provider-deletion owner and becomes deleting in this transaction.
      await ctx.db.insert('users', { tokenIdentifier: identity.tokenIdentifier, publicAlias: 'Deleted player', normalizedAlias: `deleted-${identityHash(identity.tokenIdentifier)}`, timezone: 'UTC', state: 'active', createdAt: Date.now(), publicNameVersion: 1 })
    }
    const result = await runIntent(ctx, args.operationId, 'deletion.requestDeletion', {}, async (user) => {
      return { changed: await startDeletion(ctx, user, Date.now()) }
    })
    return { operationId: result.operationId, changed: result.changed }
  },
})

/** Delete this game's progress and connections while retaining the shared account. */
export const requestGameDeletion = mutation({
  args: { operationId: v.string(), confirm: v.literal('DELETE') },
  returns: v.object({ operationId: v.string(), changed: v.boolean() }),
  handler: async (ctx, args) => {
    const result = await runIntent(ctx, args.operationId, 'deletion.requestGameDeletion', {}, async (user) => {
      const profile = await gameProfile(ctx, user._id)
      if (profile?.state === 'deleting') return { changed: false }
      if (profile) await ctx.db.patch(profile._id, { state: 'deleting' })
      else await ctx.db.insert('deskCrawlerProfiles', {
        userId: user._id, state: 'deleting', createdAt: Date.now(),
        ...(user.activeHeroId ? { activeHeroId: user.activeHeroId } : {}),
      })
      const now = Date.now()
      const jobId = await ctx.db.insert('gameDeletionJobs', { userId: user._id, gameSlug: DESK_CRAWLER, state: 'running', phase: 'connections', createdAt: now, lastProgressAt: now })
      await ctx.scheduler.runAfter(0, internal.deletion.purgeGameStep, { jobId })
      return { changed: true }
    })
    return { operationId: result.operationId, changed: result.changed }
  },
})

export const purgeGameStep = internalMutation({
  args: { jobId: v.id('gameDeletionJobs') },
  returns: v.null(),
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId)
    if (!job || job.state !== 'running') return null
    const now = Date.now()
    const again = async (phase: 'connections' | 'gameplay' = job.phase === 'connections' ? 'connections' : 'gameplay') => {
      await ctx.db.patch(jobId, { phase, lastProgressAt: now })
      await ctx.scheduler.runAfter(0, internal.deletion.purgeGameStep, { jobId })
      return null
    }
    if (job.phase === 'connections') {
      // Current registry has one game. These tables belong to Desk Crawler;
      // future games receive their own scoped tables and deletion handler.
      const grants = await ctx.db.query('trmnlGrants').withIndex('by_userId', (q) => q.eq('userId', job.userId)).take(BATCH)
      for (const grant of grants) {
        const known = await ctx.db.query('revokedTrmnlCredentials').withIndex('by_tokenHash', (q) => q.eq('tokenHash', grant.tokenHash)).first()
        if (!known) await ctx.db.insert('revokedTrmnlCredentials', { tokenHash: grant.tokenHash, revokedAt: now, reasonCode: 'game_progress_deleted' })
        await ctx.db.delete(grant._id)
      }
      const instances = await ctx.db.query('trmnlInstances').withIndex('by_userId', (q) => q.eq('userId', job.userId)).take(BATCH)
      const attempts = await ctx.db.query('trmnlInstallAttempts').withIndex('by_userId_and_state', (q) => q.eq('userId', job.userId)).take(BATCH)
      const removed = grants.length + await deleteBatch(ctx, instances) + await deleteBatch(ctx, attempts)
      return await again(removed ? 'connections' : 'gameplay')
    }
    const profile = await gameProfile(ctx, job.userId)
    if (profile?.activeHeroId) {
      const heroId = profile.activeHeroId
      const items = await ctx.db.query('items').withIndex('by_heroId', (q) => q.eq('heroId', heroId)).take(BATCH)
      const logs = await ctx.db.query('tickLogs').withIndex('by_heroId_and_at_and_sequence', (q) => q.eq('heroId', heroId)).take(BATCH)
      const windows = await ctx.db.query('heroScoreWindows').withIndex('by_heroId', (q) => q.eq('heroId', heroId)).take(BATCH)
      if (await deleteBatch(ctx, items) + await deleteBatch(ctx, logs) + await deleteBatch(ctx, windows) > 0) return await again()
      if (await ctx.db.get(heroId)) await ctx.db.delete(heroId)
      await ctx.db.patch(profile._id, { activeHeroId: undefined })
    }
    const user = await ctx.db.get(job.userId)
    if (user?.activeHeroId) await ctx.db.patch(user._id, { activeHeroId: undefined })
    const receipts = await ctx.db.query('operationReceipts').withIndex('by_userId_and_scope', (q) => q.eq('userId', job.userId).eq('scope', DESK_CRAWLER)).take(BATCH)
    const legacy = await ctx.db.query('operationReceipts').withIndex('by_userId_and_scope', (q) => q.eq('userId', job.userId).eq('scope', undefined)).take(BATCH)
    if (await deleteBatch(ctx, receipts) + await deleteBatch(ctx, legacy) > 0) return await again()
    // A new enrollment can now create a new hero, but every old token stays tombstoned.
    if (profile && user?.state === 'active') await ctx.db.patch(profile._id, { state: 'active' })
    await ctx.db.patch(jobId, { state: 'completed', phase: 'done', completedAt: now, lastProgressAt: now })
    return null
  },
})

/** Deny authority and enqueue the durable purge once per user. Shared by the companion request and the Clerk webhook. */
async function startDeletion(ctx: MutationCtx, user: Doc<'users'>, now: number): Promise<boolean> {
  const existing = await ctx.db
    .query('accountDeletionJobs')
    .withIndex('by_userId', (q) => q.eq('userId', user._id))
    .first()
  if (existing) return false
  await ctx.db.patch(user._id, { state: 'deleting', deletionRequestedAt: now })
  await revokeIdentity(ctx, user.tokenIdentifier, now)
  const clerkUserId = user.tokenIdentifier.split('|').at(-1)
  const jobId = await ctx.db.insert('accountDeletionJobs', {
    userId: user._id,
    ...(clerkUserId ? { clerkUserId } : {}),
    state: 'running',
    phase: 'connections',
    providerAttempts: 0,
    createdAt: now,
    lastProgressAt: now,
  })
  await ctx.scheduler.runAfter(0, internal.deletion.purgeStep, { jobId })
  return true
}

async function revokeIdentity(ctx: MutationCtx, tokenIdentifier: string, now: number): Promise<void> {
  const hash = identityHash(tokenIdentifier)
  const known = await ctx.db.query('revokedAuthIdentities').withIndex('by_identityHash', (q) => q.eq('identityHash', hash)).first()
  if (!known) await ctx.db.insert('revokedAuthIdentities', { identityHash: hash, revokedAt: now, reasonCode: 'account_deleted' })
}

/**
 * Verified Clerk user.deleted (V09). Runs the same idempotent purge when the
 * provider deletes first; duplicates and late deliveries are no-ops, and an
 * unknown subject still gets a revocation hash so a stale JWT cannot recreate it.
 * The provider step then sees 404 from Clerk and treats it as done.
 */
export const providerDeleted = internalMutation({
  args: { clerkUserId: v.string() },
  returns: v.object({ started: v.boolean() }),
  handler: async (ctx, { clerkUserId }) => {
    const issuer = process.env.CLERK_JWT_ISSUER_DOMAIN
    if (!issuer) throw new Error('CLERK_JWT_ISSUER_DOMAIN is not set')
    const tokenIdentifier = `${issuer}|${clerkUserId}`
    const now = Date.now()
    const user = await ctx.db.query('users').withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', tokenIdentifier)).unique()
    if (user === null) {
      await revokeIdentity(ctx, tokenIdentifier, now)
      return { started: false }
    }
    return { started: await startDeletion(ctx, user, now) }
  },
})

async function deleteBatch(ctx: MutationCtx, rows: Array<{ _id: Id<TableNames> }>): Promise<number> {
  for (const row of rows) await ctx.db.delete(row._id)
  return rows.length
}

export const purgeStep = internalMutation({
  args: { jobId: v.id('accountDeletionJobs') },
  returns: v.null(),
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId)
    if (job === null || job.state !== 'running' || job.userId === undefined) return null
    const now = Date.now()
    const user = await ctx.db.get(job.userId)
    const advance = async (phase: Doc<'accountDeletionJobs'>['phase']) => {
      await ctx.db.patch(jobId, { phase, lastProgressAt: now })
      if (phase === 'provider') await ctx.scheduler.runAfter(0, internal.deletion.deleteProviderUser, { jobId })
      else await ctx.scheduler.runAfter(0, internal.deletion.purgeStep, { jobId })
    }
    const again = async () => {
      await ctx.db.patch(jobId, { lastProgressAt: now })
      await ctx.scheduler.runAfter(0, internal.deletion.purgeStep, { jobId })
    }

    switch (job.phase) {
      case 'connections': {
        const grants = await ctx.db.query('trmnlGrants').withIndex('by_userId', (q) => q.eq('userId', job.userId!)).take(BATCH)
        for (const grant of grants) {
          // Tokens never expire, so keep a minimal hash that denies replayed codes/tokens.
          const known = await ctx.db.query('revokedTrmnlCredentials').withIndex('by_tokenHash', (q) => q.eq('tokenHash', grant.tokenHash)).first()
          if (!known) await ctx.db.insert('revokedTrmnlCredentials', { tokenHash: grant.tokenHash, revokedAt: now, reasonCode: 'account_deleted' })
          await ctx.db.delete(grant._id)
        }
        const instances = await ctx.db.query('trmnlInstances').withIndex('by_userId', (q) => q.eq('userId', job.userId!)).take(BATCH)
        const attempts = await ctx.db.query('trmnlInstallAttempts').withIndex('by_userId_and_state', (q) => q.eq('userId', job.userId!)).take(BATCH)
        const done = grants.length + (await deleteBatch(ctx, instances)) + (await deleteBatch(ctx, attempts))
        return done > 0 ? await again() : await advance('gameplay')
      }
      case 'gameplay': {
        const profile = await gameProfile(ctx, job.userId)
        const heroId = profile ? profile.activeHeroId : user?.activeHeroId
        if (heroId) {
          const items = await ctx.db.query('items').withIndex('by_heroId', (q) => q.eq('heroId', heroId)).take(BATCH)
          const logs = await ctx.db.query('tickLogs').withIndex('by_heroId_and_at_and_sequence', (q) => q.eq('heroId', heroId)).take(BATCH)
          const windows = await ctx.db.query('heroScoreWindows').withIndex('by_heroId', (q) => q.eq('heroId', heroId)).take(BATCH)
          const removed = (await deleteBatch(ctx, items)) + (await deleteBatch(ctx, logs)) + (await deleteBatch(ctx, windows))
          if (removed > 0) return await again()
          // Copied names in published boards are masked by owner state and rotate out within two publications.
          if (await ctx.db.get(heroId)) await ctx.db.delete(heroId)
          if (user) await ctx.db.patch(job.userId, { activeHeroId: undefined })
          if (profile) await ctx.db.patch(profile._id, { activeHeroId: undefined })
        }
        const receipts = await ctx.db.query('operationReceipts').withIndex('by_userId_and_operationId', (q) => q.eq('userId', job.userId!)).take(BATCH)
        return (await deleteBatch(ctx, receipts)) > 0 ? await again() : await advance('provider')
      }
      case 'finalize': {
        const profile = await gameProfile(ctx, job.userId)
        if (profile) await ctx.db.delete(profile._id)
        const gameJobs = await ctx.db.query('gameDeletionJobs').withIndex('by_userId_and_state', (q) => q.eq('userId', job.userId!)).take(BATCH)
        if (gameJobs.length > 0) { await deleteBatch(ctx, gameJobs); return await again() }
        if (user) await ctx.db.delete(user._id)
        await ctx.db.patch(jobId, { state: 'completed', phase: 'done', completedAt: now, lastProgressAt: now, userId: undefined, clerkUserId: undefined })
        return null
      }
      default:
        return null
    }
  },
})

/** Delete the shared TRMNL Games Clerk user; retried with backoff, blocks visibly after repeated failure. */
export const deleteProviderUser = internalAction({
  args: { jobId: v.id('accountDeletionJobs') },
  returns: v.null(),
  handler: async (ctx, { jobId }) => {
    const job = await ctx.runQuery(internal.deletion.getJob, { jobId })
    if (job === null || job.state !== 'running' || job.phase !== 'provider') return null
    const secret = process.env.CLERK_SECRET_KEY
    let ok = false
    if (job.clerkUserId && secret) {
      const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(job.clerkUserId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${secret}` } })
      ok = response.ok || response.status === 404
    }
    await ctx.runMutation(internal.deletion.providerResult, { jobId, ok })
    return null
  },
})

export const getJob = internalQuery({
  args: { jobId: v.id('accountDeletionJobs') },
  returns: v.union(v.null(), v.object({ state: v.string(), phase: v.string(), clerkUserId: v.union(v.string(), v.null()) })),
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId)
    return job ? { state: job.state, phase: job.phase, clerkUserId: job.clerkUserId ?? null } : null
  },
})

export const providerResult = internalMutation({
  args: { jobId: v.id('accountDeletionJobs'), ok: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { jobId, ok }) => {
    const job = await ctx.db.get(jobId)
    if (job === null || job.phase !== 'provider') return null
    const now = Date.now()
    if (ok) {
      await ctx.db.patch(jobId, { phase: 'finalize', lastProgressAt: now })
      await ctx.scheduler.runAfter(0, internal.deletion.purgeStep, { jobId })
      return null
    }
    const attempts = job.providerAttempts + 1
    if (attempts >= MAX_PROVIDER_ATTEMPTS) {
      await ctx.db.patch(jobId, { state: 'blocked', providerAttempts: attempts, reasonCode: 'PROVIDER_DELETE_FAILED', lastProgressAt: now })
      return null
    }
    await ctx.db.patch(jobId, { providerAttempts: attempts, lastProgressAt: now })
    await ctx.scheduler.runAfter(60_000 * 2 ** attempts, internal.deletion.deleteProviderUser, { jobId })
    return null
  },
})

export function assertNotRevoked(revoked: unknown): void {
  if (revoked) throw appError('ACCOUNT_UNAVAILABLE', 'This account was deleted. Contact support to start again.')
}
