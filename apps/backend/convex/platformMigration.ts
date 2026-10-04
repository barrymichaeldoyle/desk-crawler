import { v } from 'convex/values'
import { internalMutation } from './_generated/server'
import { DESK_CRAWLER, gameProfile } from './lib/gameProfile'
import { identityHash, assertNotRevoked } from './deletion'
import { appError } from './lib/errors'

/** Run each table to isDone before tightening optional legacy fields. No scheduler or live reset. */
export const backfill = internalMutation({
  args: {
    table: v.union(v.literal('users'), v.literal('trmnlGrants'), v.literal('trmnlInstallAttempts'), v.literal('trmnlInstances'), v.literal('operationReceipts')),
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.object({ migrated: v.number(), cursor: v.string(), isDone: v.boolean() }),
  handler: async (ctx, args) => {
    const options = { cursor: args.cursor, numItems: 100 }
    let migrated = 0
    if (args.table === 'users') {
      const page = await ctx.db.query('users').withIndex('by_state').paginate(options)
      for (const user of page.page) {
        if (!user.activeHeroId) continue
        const hero = await ctx.db.get(user.activeHeroId)
        if (!hero || hero.userId !== user._id) throw appError('OPERATION_CONFLICT', 'A legacy hero pointer does not belong to its owner.')
        const profile = await gameProfile(ctx, user._id)
        if (profile && profile.activeHeroId !== user.activeHeroId) throw appError('OPERATION_CONFLICT', 'Legacy and current game profiles disagree.')
        if (!profile) await ctx.db.insert('deskCrawlerProfiles', { userId: user._id, state: user.state === 'deleting' ? 'deleting' : 'active', activeHeroId: user.activeHeroId, createdAt: user.createdAt })
        await ctx.db.patch(user._id, { activeHeroId: undefined })
        migrated++
      }
      return { migrated, cursor: page.continueCursor, isDone: page.isDone }
    }
    if (args.table === 'operationReceipts') {
      const page = await ctx.db.query('operationReceipts').withIndex('by_expiresAt').paginate(options)
      for (const row of page.page) if (!row.scope) {
        await ctx.db.patch(row._id, { scope: row.operation === 'deletion.requestDeletion' || row.operation.startsWith('users.') ? 'platform' : DESK_CRAWLER })
        migrated++
      }
      return { migrated, cursor: page.continueCursor, isDone: page.isDone }
    }
    const page = args.table === 'trmnlGrants'
      ? await ctx.db.query('trmnlGrants').withIndex('by_tokenHash').paginate(options)
      : args.table === 'trmnlInstances'
        ? await ctx.db.query('trmnlInstances').withIndex('by_uuid').paginate(options)
        : await ctx.db.query('trmnlInstallAttempts').withIndex('by_expiresAt').paginate(options)
    for (const row of page.page) if (row.gameSlug === undefined) {
      await ctx.db.patch(row._id, { gameSlug: DESK_CRAWLER })
      migrated++
    }
    return { migrated, cursor: page.continueCursor, isDone: page.isDone }
  },
})

/** One-time owner preservation across the Clerk primary-domain change, never an auth fallback. */
export const rebindOwner = internalMutation({
  args: { clerkUserId: v.string(), oldIssuer: v.string(), newIssuer: v.string() },
  returns: v.object({ changed: v.boolean() }),
  handler: async (ctx, args) => {
    const allowlist = (process.env.ADMIN_TOKEN_IDENTIFIERS ?? '').split(',').map((value) => value.trim()).filter(Boolean)
    if ((!allowlist.includes(`${args.oldIssuer}|${args.clerkUserId}`) && !allowlist.includes(`${args.newIssuer}|${args.clerkUserId}`)) || !/^user_[A-Za-z0-9]{8,64}$/.test(args.clerkUserId)) throw appError('UNAUTHENTICATED', 'Only the explicitly allowlisted owner may be rebound.')
    const validIssuer = (issuer: string) => {
      try { const url = new URL(issuer); return url.protocol === 'https:' && url.origin === issuer && !url.username && !url.password } catch { return false }
    }
    if (!validIssuer(args.oldIssuer) || !validIssuer(args.newIssuer) || args.oldIssuer === args.newIssuer) throw appError('INVALID_INPUT', 'Provide the exact distinct Clerk issuer origins.')
    const oldIdentifier = `${args.oldIssuer}|${args.clerkUserId}`
    const newIdentifier = `${args.newIssuer}|${args.clerkUserId}`
    assertNotRevoked(await ctx.db.query('revokedAuthIdentities').withIndex('by_identityHash', (q) => q.eq('identityHash', identityHash(newIdentifier))).first())
    const oldUser = await ctx.db.query('users').withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', oldIdentifier)).unique()
    const newUser = await ctx.db.query('users').withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', newIdentifier)).unique()
    if (!oldUser && newUser?.state === 'active') return { changed: false }
    if (!oldUser || oldUser.state !== 'active') throw appError('ACCOUNT_UNAVAILABLE', 'The old owner must exist and be active.')
    if (newUser) throw appError('OPERATION_CONFLICT', 'The new identity already owns a different account.')
    assertNotRevoked(await ctx.db.query('revokedAuthIdentities').withIndex('by_identityHash', (q) => q.eq('identityHash', identityHash(oldIdentifier))).first())
    await ctx.db.patch(oldUser._id, { tokenIdentifier: newIdentifier })
    await ctx.db.insert('revokedAuthIdentities', { identityHash: identityHash(oldIdentifier), revokedAt: Date.now(), reasonCode: 'domain_migration' })
    await ctx.db.insert('adminAuditEvents', { actorRef: 'platform-migration', action: 'rebind_owner', targetRef: oldUser._id, reasonCode: 'CLERK_DOMAIN_CHANGE', outcome: 'rebound', at: Date.now() })
    return { changed: true }
  },
})
