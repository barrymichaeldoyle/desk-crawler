import { gameProfile, DESK_CRAWLER } from './lib/gameProfile'
import { isGame } from './lib/gameHooks'
import { slowCastProfile } from './slowCast/profile'
import { purgeAngler } from './slowCast/purge'
import { gameSlug as gameSlugValidator } from './schema'
import { purgeRaidRows } from './lib/raids'
import { purgeAlertRows } from './alerts'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Doc, Id, TableNames } from './_generated/dataModel'
import { action, internalAction, internalMutation, internalQuery, mutation, query, type MutationCtx } from './_generated/server'
import { appError } from './lib/errors'
import { sha256Hex } from './lib/hash'
import { runIntent } from './lib/intent'
import { eraseAnalyticsPerson } from './analytics'
import { DELETION_EMAIL_ATTEMPTS, DELETION_LINK_TTL_MS, deletionToken, validDeletionToken, verifiedPrimaryEmail } from './lib/deletionConfirmation'
import schema from './schema'

/**
 * Account deletion (D22, data-model.md "Deletion checkpoints"). Authority is
 * denied in the request transaction; a durable job then purges game data in
 * bounded batches, records minimal revocation hashes, deletes the dedicated
 * Clerk user and finally removes the user row. Restore never resurrects it.
 */
const BATCH = 100
/** One page of a user's TRMNL connections; far above any real user's count. */
const CONNECTION_PAGE = 500
const MAX_PROVIDER_ATTEMPTS = 5

export const identityHash = (tokenIdentifier: string) => sha256Hex(`auth:${tokenIdentifier}`)

export const requestDeletion = mutation({
  // Optional only for a rolling deploy: the former immediate-delete call fails safely.
  args: { operationId: v.string(), confirm: v.literal('DELETE'), token: v.optional(v.string()) },
  returns: v.object({ operationId: v.string(), changed: v.boolean() }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw appError('UNAUTHENTICATED', 'Sign in to continue.')
    if (!args.token || !validDeletionToken(args.token)) throw appError('DELETION_CONFIRMATION_REQUIRED', 'Request a deletion link from Account, then confirm from that email.')
    const confirmation = await ctx.db.query('accountDeletionConfirmations').withIndex('by_tokenHash', (q) => q.eq('tokenHash', sha256Hex(args.token!))).unique()
    if (!confirmation || confirmation.tokenIdentifier !== identity.tokenIdentifier) {
      throw appError('DELETION_LINK_EXPIRED', 'That deletion link is expired or unavailable. Request a new one from Account.')
    }
    // A lost response can be retried with the consumed proof. Never enqueue a second purge.
    if (confirmation.state === 'confirmed') return { operationId: args.operationId, changed: false }
    if (confirmation.expiresAt <= Date.now() || confirmation.state !== 'sent') {
      throw appError('DELETION_LINK_EXPIRED', 'That deletion link is expired or unavailable. Request a new one from Account.')
    }
    assertNotRevoked(await ctx.db.query('revokedAuthIdentities').withIndex('by_identityHash', (q) => q.eq('identityHash', identityHash(identity.tokenIdentifier))).first())
    const existing = await ctx.db.query('users').withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier)).unique()
    if (!existing) {
      // Clerk signup need not enroll in a game. This row exists only as the
      // durable provider-deletion owner and becomes deleting in this transaction.
      await ctx.db.insert('users', { tokenIdentifier: identity.tokenIdentifier, publicAlias: 'Deleted player', normalizedAlias: `deleted-${identityHash(identity.tokenIdentifier)}`, timezone: 'UTC', state: 'active', createdAt: Date.now(), publicNameVersion: 1 })
    }
    const result = await runIntent(ctx, args.operationId, 'deletion.requestDeletion', { tokenHash: confirmation.tokenHash }, async (user) => {
      await ctx.db.patch(confirmation._id, { state: 'confirmed' })
      return { changed: await startDeletion(ctx, user, Date.now()) }
    })
    return { operationId: result.operationId, changed: result.changed }
  },
})

/** Delete this game's progress and connections while retaining the shared account. */
export const requestGameDeletion = mutation({
  args: { operationId: v.string(), confirm: v.literal('DELETE'), gameSlug: v.optional(gameSlugValidator) },
  returns: v.object({ operationId: v.string(), changed: v.boolean() }),
  handler: async (ctx, args) => {
    // D115: Slow Cast progress is deleted on its own; the account and Desk Crawler stay.
    if (args.gameSlug === 'slow-cast') {
      const result = await runIntent(ctx, args.operationId, 'deletion.requestGameDeletion', { gameSlug: 'slow-cast' }, async (user) => {
        const profile = await slowCastProfile(ctx, user._id)
        if (profile?.state === 'deleting') return { changed: false }
        if (profile) await ctx.db.patch(profile._id, { state: 'deleting' })
        else await ctx.db.insert('slowCastProfiles', { userId: user._id, state: 'deleting', createdAt: Date.now() })
        const now = Date.now()
        const jobId = await ctx.db.insert('gameDeletionJobs', { userId: user._id, gameSlug: 'slow-cast', state: 'running', phase: 'connections', createdAt: now, lastProgressAt: now })
        await ctx.scheduler.runAfter(0, internal.deletion.purgeGameStep, { jobId })
        return { changed: true }
      })
      return { operationId: result.operationId, changed: result.changed }
    }
    const result = await runIntent(ctx, args.operationId, 'deletion.requestGameDeletion', {}, async (user) => {
      const reconnect = await ctx.db.query('trmnlReconnectAttempts').withIndex('by_tokenIdentifier', q => q.eq('tokenIdentifier', user.tokenIdentifier)).unique()
      if (reconnect) await ctx.db.delete(reconnect._id)
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
      // D115: only this game's connections; the other game's installations keep working. A user has a
      // handful of connections, so a page of them always includes this game's remaining rows.
      const ours = <R extends { gameSlug?: string }>(rows: R[]) => rows.filter((row) => isGame(row, job.gameSlug))
      const grants = ours(await ctx.db.query('trmnlGrants').withIndex('by_userId', (q) => q.eq('userId', job.userId)).take(CONNECTION_PAGE))
      for (const grant of grants) {
        const known = await ctx.db.query('revokedTrmnlCredentials').withIndex('by_tokenHash', (q) => q.eq('tokenHash', grant.tokenHash)).first()
        if (!known) await ctx.db.insert('revokedTrmnlCredentials', { tokenHash: grant.tokenHash, revokedAt: now, reasonCode: 'game_progress_deleted' })
        await ctx.db.delete(grant._id)
      }
      const instances = ours(await ctx.db.query('trmnlInstances').withIndex('by_userId', (q) => q.eq('userId', job.userId)).take(CONNECTION_PAGE))
      const attempts = ours(await ctx.db.query('trmnlInstallAttempts').withIndex('by_userId_and_state', (q) => q.eq('userId', job.userId)).take(CONNECTION_PAGE))
      const removed = grants.length + await deleteBatch(ctx, instances) + await deleteBatch(ctx, attempts)
      return await again(removed ? 'connections' : 'gameplay')
    }
    if (job.gameSlug === 'slow-cast') {
      const profile = await slowCastProfile(ctx, job.userId)
      if (profile?.anglerId) {
        if ((await purgeAngler(ctx, profile.anglerId, BATCH)) > 0) return await again()
        await ctx.db.patch(profile._id, { anglerId: undefined })
      }
      const receipts = await ctx.db.query('operationReceipts').withIndex('by_userId_and_scope', (q) => q.eq('userId', job.userId).eq('scope', 'slow-cast')).take(BATCH)
      if ((await deleteBatch(ctx, receipts)) > 0) return await again()
      if (profile) await ctx.db.patch(profile._id, { state: 'active' })
      await ctx.db.patch(jobId, { state: 'completed', phase: 'done', completedAt: now, lastProgressAt: now })
      return null
    }
    const profile = await gameProfile(ctx, job.userId)
    if (profile?.activeHeroId) {
      const heroId = profile.activeHeroId
      const items = await ctx.db.query('items').withIndex('by_heroId', (q) => q.eq('heroId', heroId)).take(BATCH)
      const logs = await ctx.db.query('tickLogs').withIndex('by_heroId_and_at_and_sequence', (q) => q.eq('heroId', heroId)).take(BATCH)
      const windows = await ctx.db.query('heroScoreWindows').withIndex('by_heroId', (q) => q.eq('heroId', heroId)).take(BATCH)
      if (await deleteBatch(ctx, items) + await deleteBatch(ctx, logs) + await deleteBatch(ctx, windows) + await purgeRaidRows(ctx, heroId, BATCH) > 0) return await again()
      if (await ctx.db.get(heroId)) await ctx.db.delete(heroId)
      await ctx.db.patch(profile._id, { activeHeroId: undefined })
    }
    const user = await ctx.db.get(job.userId)
    if (user?.activeHeroId) await ctx.db.patch(user._id, { activeHeroId: undefined })
    const keepsakes = await ctx.db.query('deskKeepsakes').withIndex('by_userId', (q) => q.eq('userId', job.userId)).take(BATCH)
    const unlocks = await ctx.db.query('heroAchievements').withIndex('by_userId_and_achievementId', (q) => q.eq('userId', job.userId)).take(BATCH)
    // P33: alert preferences, push devices and outbox rows are Desk Crawler's.
    if (await deleteBatch(ctx, keepsakes) + await deleteBatch(ctx, unlocks) + await purgeAlertRows(ctx, job.userId, BATCH) > 0) return await again()
    const receipts = await ctx.db.query('operationReceipts').withIndex('by_userId_and_scope', (q) => q.eq('userId', job.userId).eq('scope', DESK_CRAWLER)).take(BATCH)
    const legacy = await ctx.db.query('operationReceipts').withIndex('by_userId_and_scope', (q) => q.eq('userId', job.userId).eq('scope', undefined)).take(BATCH)
    if (await deleteBatch(ctx, receipts) + await deleteBatch(ctx, legacy) > 0) return await again()
    // A new enrollment can now create a new hero, but every old token stays tombstoned.
    // Account state still gates authority, so a suspended owner regains the game only when restored.
    if (profile) await ctx.db.patch(profile._id, { state: 'active' })
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
  const heroRef = (await gameProfile(ctx, user._id))?.activeHeroId ?? user.activeHeroId
  const jobId = await ctx.db.insert('accountDeletionJobs', {
    userId: user._id,
    ...(clerkUserId ? { clerkUserId } : {}),
    ...(heroRef ? { heroRef } : {}),
    state: 'running',
    phase: 'connections',
    providerAttempts: 0,
    analyticsDeletionRequired: Boolean(process.env.POSTHOG_PROJECT_ID) || user.analyticsConsent === true,
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
      const revoked = await ctx.db.query('revokedAuthIdentities').withIndex('by_identityHash', (q) => q.eq('identityHash', identityHash(tokenIdentifier))).first()
      if (!revoked && process.env.POSTHOG_PROJECT_ID) {
        // A player may have consented and been identified before enrolling in any game.
        const userId = await ctx.db.insert('users', { tokenIdentifier, publicAlias: 'Deleted player', normalizedAlias: `deleted-${identityHash(tokenIdentifier)}`, timezone: 'UTC', state: 'active', createdAt: now, publicNameVersion: 1 })
        return { started: await startDeletion(ctx, (await ctx.db.get(userId))!, now) }
      }
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
        const keepsakes = await ctx.db.query('deskKeepsakes').withIndex('by_userId', (q) => q.eq('userId', job.userId!)).take(BATCH)
        const unlocks = await ctx.db.query('heroAchievements').withIndex('by_userId_and_achievementId', (q) => q.eq('userId', job.userId!)).take(BATCH)
        if ((await deleteBatch(ctx, keepsakes)) + (await deleteBatch(ctx, unlocks)) + (await purgeAlertRows(ctx, job.userId, BATCH)) > 0) return await again()
        const profile = await gameProfile(ctx, job.userId)
        const heroId = profile ? profile.activeHeroId : user?.activeHeroId
        if (heroId) {
          const items = await ctx.db.query('items').withIndex('by_heroId', (q) => q.eq('heroId', heroId)).take(BATCH)
          const logs = await ctx.db.query('tickLogs').withIndex('by_heroId_and_at_and_sequence', (q) => q.eq('heroId', heroId)).take(BATCH)
          const windows = await ctx.db.query('heroScoreWindows').withIndex('by_heroId', (q) => q.eq('heroId', heroId)).take(BATCH)
          // D110: the hero's raid pool row and ledger rows; the other party keeps its own log line.
          const removed = (await deleteBatch(ctx, items)) + (await deleteBatch(ctx, logs)) + (await deleteBatch(ctx, windows)) + (await purgeRaidRows(ctx, heroId, BATCH))
          if (removed > 0) return await again()
          // Copied names in published boards are masked by owner state and rotate out within two publications.
          if (await ctx.db.get(heroId)) await ctx.db.delete(heroId)
          if (user) await ctx.db.patch(job.userId, { activeHeroId: undefined })
          if (profile) await ctx.db.patch(profile._id, { activeHeroId: undefined })
        }
        // D115: the account's Slow Cast angler and its rows.
        const sc = await slowCastProfile(ctx, job.userId)
        if (sc?.anglerId) {
          if ((await purgeAngler(ctx, sc.anglerId, BATCH)) > 0) return await again()
          await ctx.db.patch(sc._id, { anglerId: undefined })
        }
        const receipts = await ctx.db.query('operationReceipts').withIndex('by_userId_and_operationId', (q) => q.eq('userId', job.userId!)).take(BATCH)
        return (await deleteBatch(ctx, receipts)) > 0 ? await again() : await advance('provider')
      }
      case 'finalize': {
        // Remove diagnostic references while the account identity is still available.
        if (user && await scrubAccountReferences(ctx, { userId: job.userId, tokenIdentifier: user.tokenIdentifier, ...(job.heroRef ? { heroRef: job.heroRef } : {}) }) > 0) { await again(); return null }
        if (user) {
          const reconnect = await ctx.db.query('trmnlReconnectAttempts').withIndex('by_tokenIdentifier', q => q.eq('tokenIdentifier', user.tokenIdentifier)).unique()
          if (reconnect) await ctx.db.delete(reconnect._id)
          // An entry the account attached to the launch list goes with it (D105); email-only entries are not linked.
          const waitlist = await ctx.db.query('waitlist').withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', user.tokenIdentifier)).take(BATCH)
          for (const row of waitlist) await ctx.db.delete(row._id)
          // Feedback the account sent goes with it (D107).
          const feedback = await ctx.db.query('feedback').withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', user.tokenIdentifier)).take(BATCH)
          if (feedback.length) { await deleteBatch(ctx, feedback); await again(); return null }
          const confirmations = await ctx.db.query('accountDeletionConfirmations').withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', user.tokenIdentifier)).take(BATCH)
          if (confirmations.length) { await deleteBatch(ctx, confirmations); await again(); return null }
        }
        const profile = await gameProfile(ctx, job.userId)
        if (profile) await ctx.db.delete(profile._id)
        const scProfile = await slowCastProfile(ctx, job.userId)
        if (scProfile) await ctx.db.delete(scProfile._id)
        const gameJobs = await ctx.db.query('gameDeletionJobs').withIndex('by_userId_and_state', (q) => q.eq('userId', job.userId!)).take(BATCH)
        if (gameJobs.length > 0) { await deleteBatch(ctx, gameJobs); return await again() }
        if (user) await ctx.db.delete(user._id)
        await ctx.db.patch(jobId, { state: 'completed', phase: 'done', completedAt: now, lastProgressAt: now, userId: undefined, clerkUserId: undefined, heroRef: undefined })
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
    let reasonCode: 'PROVIDER_DELETE_FAILED' | 'ANALYTICS_DELETE_FAILED' = 'PROVIDER_DELETE_FAILED'
    if (job.clerkUserId && secret) {
      try {
        const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(job.clerkUserId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${secret}` } })
        ok = response.ok || response.status === 404
      } catch {
        // Network failures consume the same bounded retry budget as HTTP failures.
        ok = false
      }
    }
    if (ok && job.analyticsDeletionRequired) {
      ok = await eraseAnalyticsPerson(job.clerkUserId!)
      reasonCode = 'ANALYTICS_DELETE_FAILED'
    }
    await ctx.runMutation(internal.deletion.providerResult, { jobId, ok, reasonCode })
    return null
  },
})

export const getJob = internalQuery({
  args: { jobId: v.id('accountDeletionJobs') },
  returns: v.union(v.null(), v.object({ state: v.string(), phase: v.string(), clerkUserId: v.union(v.string(), v.null()), analyticsDeletionRequired: v.boolean() })),
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId)
    return job ? { state: job.state, phase: job.phase, clerkUserId: job.clerkUserId ?? null, analyticsDeletionRequired: job.analyticsDeletionRequired ?? Boolean(process.env.POSTHOG_PROJECT_ID) } : null
  },
})

export const providerResult = internalMutation({
  args: { jobId: v.id('accountDeletionJobs'), ok: v.boolean(), reasonCode: v.optional(v.union(v.literal('PROVIDER_DELETE_FAILED'), v.literal('ANALYTICS_DELETE_FAILED'))) },
  returns: v.null(),
  handler: async (ctx, { jobId, ok, reasonCode }) => {
    const job = await ctx.db.get(jobId)
    if (job === null || job.state !== 'running' || job.phase !== 'provider') return null
    const now = Date.now()
    if (ok) {
      await ctx.db.patch(jobId, { phase: 'finalize', lastProgressAt: now })
      await ctx.scheduler.runAfter(0, internal.deletion.purgeStep, { jobId })
      return null
    }
    const attempts = job.providerAttempts + 1
    if (attempts >= MAX_PROVIDER_ATTEMPTS) {
      await ctx.db.patch(jobId, { state: 'blocked', providerAttempts: attempts, reasonCode: reasonCode ?? 'PROVIDER_DELETE_FAILED', lastProgressAt: now })
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

const confirmationStatus = v.object({ state: v.union(v.literal('pending'), v.literal('sent'), v.literal('failed'), v.literal('confirmed')), email: v.string(), expiresAt: v.number() })
const statusOf = (row: Doc<'accountDeletionConfirmations'>) => ({ state: row.state, email: row.email, expiresAt: row.expiresAt })

/** The signed-in owner can see delivery status, never the link or its hash. */
export const deletionEmailStatus = query({
  args: {}, returns: v.union(v.null(), confirmationStatus),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    const row = await ctx.db.query('accountDeletionConfirmations').withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier)).unique()
    return row ? statusOf(row) : null
  },
})

export const getEmailRequest = internalQuery({
  args: { tokenIdentifier: v.string() }, returns: v.union(v.null(), confirmationStatus),
  handler: async (ctx, { tokenIdentifier }) => {
    const row = await ctx.db.query('accountDeletionConfirmations').withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', tokenIdentifier)).unique()
    return row ? statusOf(row) : null
  },
})

/** No caller-supplied recipient; duplicates reuse the current 30-minute request. */
export const requestDeletionEmail = action({
  args: {}, returns: confirmationStatus,
  handler: async (ctx): Promise<{ state: 'pending' | 'sent' | 'failed' | 'confirmed'; email: string; expiresAt: number }> => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw appError('UNAUTHENTICATED', 'Sign in to continue.')
    const existing = await ctx.runQuery(internal.deletion.getEmailRequest, { tokenIdentifier: identity.tokenIdentifier })
    if (existing && existing.expiresAt > Date.now()) return existing
    const key = process.env.ACCOUNT_DELETION_LINK_KEY
    const clerkSecret = process.env.CLERK_SECRET_KEY
    if (!key || key.length < 32 || !clerkSecret || !process.env.RESEND_API_KEY) throw appError('EMAIL_UNAVAILABLE', 'Deletion email is unavailable. Please contact support.')
    let email: { id: string; address: string } | null = null
    try {
      const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(identity.subject)}`, { headers: { Authorization: `Bearer ${clerkSecret}` }, signal: AbortSignal.timeout(10_000) })
      if (response.ok) email = verifiedPrimaryEmail(await response.json())
    } catch { /* Fail closed: no guessed or unverified recipient. */ }
    if (!email) throw appError('EMAIL_UNAVAILABLE', 'Add a verified primary email to your account before requesting deletion.')
    const origin = new URL(process.env.COMPANION_ORIGIN ?? 'https://trmnlgames.com').origin
    return await ctx.runMutation(internal.deletion.reserveDeletionEmail, { tokenIdentifier: identity.tokenIdentifier, email: email.address, emailId: email.id, origin, from: process.env.DELETION_EMAIL_FROM ?? 'TRMNL Games <alerts@trmnlgames.com>' })
  },
})

export const reserveDeletionEmail = internalMutation({
  args: { tokenIdentifier: v.string(), email: v.string(), emailId: v.string(), from: v.string(), origin: v.string() }, returns: confirmationStatus,
  handler: async (ctx, args) => {
    const now = Date.now()
    assertNotRevoked(await ctx.db.query('revokedAuthIdentities').withIndex('by_identityHash', (q) => q.eq('identityHash', identityHash(args.tokenIdentifier))).first())
    const user = await ctx.db.query('users').withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', args.tokenIdentifier)).unique()
    if (user && user.state !== 'active') throw appError('ACCOUNT_UNAVAILABLE', 'This account is not available.')
    const existing = await ctx.db.query('accountDeletionConfirmations').withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', args.tokenIdentifier)).unique()
    if (existing && existing.expiresAt > now) return statusOf(existing)
    if (existing) await ctx.db.delete(existing._id)
    const key = process.env.ACCOUNT_DELETION_LINK_KEY
    if (!key || key.length < 32) throw appError('EMAIL_UNAVAILABLE', 'Deletion email is unavailable. Please contact support.')
    const expiresAt = now + DELETION_LINK_TTL_MS
    const requestId = await ctx.db.insert('accountDeletionConfirmations', { ...args, state: 'pending', attempts: 0, tokenHash: '', createdAt: now, expiresAt })
    const tokenHash = sha256Hex(deletionToken(key, { _id: requestId, tokenIdentifier: args.tokenIdentifier, expiresAt }))
    await ctx.db.patch(requestId, { tokenHash })
    await ctx.scheduler.runAfter(0, internal.deletion.sendDeletionEmail, { requestId })
    return { state: 'pending' as const, email: args.email, expiresAt }
  },
})

export const getDeletionEmail = internalQuery({
  args: { requestId: v.id('accountDeletionConfirmations') },
  returns: v.union(v.null(), v.object({ _id: v.id('accountDeletionConfirmations'), _creationTime: v.number(), ...schema.tables.accountDeletionConfirmations.validator.fields })),
  handler: async (ctx, { requestId }) => {
    const row = await ctx.db.get(requestId)
    if (!row || row.state !== 'pending') return null
    if (await ctx.db.query('revokedAuthIdentities').withIndex('by_identityHash', (q) => q.eq('identityHash', identityHash(row.tokenIdentifier))).first()) return null
    const user = await ctx.db.query('users').withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', row.tokenIdentifier)).unique()
    return !user || user.state === 'active' ? row : null
  },
})

export const sendDeletionEmail = internalAction({
  args: { requestId: v.id('accountDeletionConfirmations') }, returns: v.null(),
  handler: async (ctx, { requestId }) => {
    const row = await ctx.runQuery(internal.deletion.getDeletionEmail, { requestId })
    if (!row || row.expiresAt <= Date.now() || row.attempts >= DELETION_EMAIL_ATTEMPTS) return null
    const secret = process.env.ACCOUNT_DELETION_LINK_KEY
    const key = process.env.RESEND_API_KEY
    let ok = false
    if (secret && key) {
      const token = deletionToken(secret, row)
      if (sha256Hex(token) !== row.tokenHash) return null // A rotated key invalidates outstanding links.
      const link = new URL('/account/delete', row.origin)
      link.searchParams.set('token', token)
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST', signal: AbortSignal.timeout(10_000),
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `account-deletion/${requestId}` },
          body: JSON.stringify({ from: row.from, to: [row.email], subject: 'Confirm deletion of your TRMNL Games account', text: `You requested deletion of your TRMNL Games account. This removes every game's progress, your connections and your sign-in. It cannot be undone.\n\nTo continue, open this link, sign in to the same account, and confirm deletion:\n${link.toString()}\n\nThe link expires 30 minutes after your request. Opening it does not delete anything. If you did not request this, ignore this email; your account stays active.` }),
        })
        ok = response.ok
      } catch { /* Retry exactly the same message and provider idempotency key. */ }
    }
    await ctx.runMutation(internal.deletion.recordDeletionEmail, { requestId, ok })
    return null
  },
})

export const recordDeletionEmail = internalMutation({
  args: { requestId: v.id('accountDeletionConfirmations'), ok: v.boolean() }, returns: v.null(),
  handler: async (ctx, { requestId, ok }) => {
    const row = await ctx.db.get(requestId)
    if (!row || row.state !== 'pending') return null
    const attempts = row.attempts + 1
    const state = ok ? 'sent' as const : attempts >= DELETION_EMAIL_ATTEMPTS || row.expiresAt <= Date.now() ? 'failed' as const : 'pending' as const
    await ctx.db.patch(requestId, { state, attempts })
    if (state === 'pending') await ctx.scheduler.runAfter(60_000 * 2 ** attempts, internal.deletion.sendDeletionEmail, { requestId })
    return null
  },
})

/** Bounded scrub of all known exact references; repeat until no account references remain. */
async function scrubAccountReferences(ctx: MutationCtx, args: { userId: Id<'users'>; tokenIdentifier: string; heroRef?: string }): Promise<number> {
  let changed = 0
  for (const key of [`intent:${args.userId}`, `keepsake:${args.userId}`, `feedback:${args.tokenIdentifier}`]) {
    changed += await deleteBatch(ctx, await ctx.db.query('rateLimitBuckets').withIndex('by_key', (q) => q.eq('key', key)).take(BATCH))
  }
  const refs = [args.userId, args.tokenIdentifier, args.tokenIdentifier.split('|').at(-1), args.heroRef].filter((ref): ref is string => !!ref)
  for (const ref of new Set(refs)) {
    const targets = await ctx.db.query('adminAuditEvents').withIndex('by_targetRef', (q) => q.eq('targetRef', ref)).take(BATCH)
    for (const row of targets) { await ctx.db.patch(row._id, { targetRef: 'deleted-account' }); changed += 1 }
    const actors = await ctx.db.query('adminAuditEvents').withIndex('by_actorRef', (q) => q.eq('actorRef', ref)).take(BATCH)
    for (const row of actors) { await ctx.db.patch(row._id, { actorRef: 'deleted-account' }); changed += 1 }
  }
  return changed
}

/** Repair references left by an older completed deletion; never touches a live account. */
export const scrubDeletedAccountReferences = internalMutation({
  args: { userId: v.id('users'), tokenIdentifier: v.string(), heroRef: v.optional(v.string()) }, returns: v.object({ changed: v.number() }),
  handler: async (ctx, args) => {
    const activeIdentity = await ctx.db.query('users').withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', args.tokenIdentifier)).unique()
    if (await ctx.db.get(args.userId) || activeIdentity) throw appError('INVALID_STATE', 'Only a deleted account can be scrubbed.')
    const revoked = await ctx.db.query('revokedAuthIdentities').withIndex('by_identityHash', (q) => q.eq('identityHash', identityHash(args.tokenIdentifier))).first()
    if (!revoked) throw appError('INVALID_STATE', 'Deletion revocation must exist before scrubbing references.')
    const changed = await scrubAccountReferences(ctx, args)
    if (changed) await ctx.scheduler.runAfter(0, internal.deletion.scrubDeletedAccountReferences, args)
    return { changed }
  },
})
