import { currentHero, gameProfile } from './lib/gameProfile'
import { v } from 'convex/values'
import { isGame } from './lib/gameHooks'
import { gameSlug } from './schema'
import { currentAngler, slowCastProfile } from './slowCast/profile'
import type { Doc, Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { appError } from './lib/errors'
import { currentUser, runIntent } from './lib/intent'

/** D115: each game's connections are its own; a game being deleted shows none. */
async function gameDeleting(ctx: QueryCtx, userId: Id<'users'>, slug: 'desk-crawler' | 'slow-cast'): Promise<boolean> {
  return slug === 'slow-cast' ? (await slowCastProfile(ctx, userId))?.state === 'deleting' : (await gameProfile(ctx, userId))?.state === 'deleting'
}

/** The name the management page shows: the hero, or for Slow Cast the angler's public name. */
async function characterName(ctx: QueryCtx, user: Doc<'users'>, slug: 'desk-crawler' | 'slow-cast'): Promise<string | null> {
  if (slug === 'slow-cast') return (await currentAngler(ctx, user)) ? user.publicAlias : null
  return (await currentHero(ctx, user))?.name ?? null
}

const instanceView = v.object({
  id: v.id('trmnlInstances'),
  uuid: v.string(),
  state: v.union(v.literal('active'), v.literal('uninstalled'), v.literal('disconnected')),
  pluginSettingId: v.union(v.string(), v.null()),
  createdAt: v.number(),
})

/** Own plugin instances (not physical devices), bounded page. Never returns tokens or hashes. */
export const mine = query({
  args: { gameSlug: v.optional(gameSlug) },
  returns: v.array(instanceView),
  handler: async (ctx, args) => {
    const slug = args.gameSlug ?? 'desk-crawler'
    const user = await currentUser(ctx)
    if (user === null || user.state !== 'active' || (await gameDeleting(ctx, user._id, slug))) return []
    const rows = await ctx.db
      .query('trmnlInstances')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(20)
    return rows.filter((row) => isGame(row, slug)).map((row) => ({ id: row._id, uuid: row.uuid, state: row.state, pluginSettingId: row.pluginSettingId ?? null, createdAt: row.createdAt }))
  },
})

/**
 * Management landing lookup: returns the instance only when it belongs to the
 * signed-in owner. A verified TRMNL UUID alone never reveals another account.
 */
export const forManagement = query({
  args: { gameSlug: v.optional(gameSlug), uuid: v.string() },
  returns: v.union(v.null(), v.object({ owned: v.literal(false) }), v.object({ owned: v.literal(true), instance: instanceView, heroName: v.union(v.string(), v.null()) })),
  handler: async (ctx, { uuid, gameSlug: requested }) => {
    const slug = requested ?? 'desk-crawler'
    const user = await currentUser(ctx)
    if (user === null || user.state !== 'active' || (await gameDeleting(ctx, user._id, slug))) return null
    const row = await ctx.db
      .query('trmnlInstances')
      .withIndex('by_uuid', (q) => q.eq('uuid', uuid))
      .unique()
    if (row === null || !isGame(row, slug) || row.userId !== user._id) return { owned: false as const }
    return {
      owned: true as const,
      instance: { id: row._id, uuid: row.uuid, state: row.state, pluginSettingId: row.pluginSettingId ?? null, createdAt: row.createdAt },
      heroName: await characterName(ctx, user, slug),
    }
  },
})

/** Local revocation of one installation; the hero and other installations are untouched. */
export const disconnect = mutation({
  args: { gameSlug: v.optional(gameSlug), operationId: v.string(), instanceId: v.id('trmnlInstances') },
  returns: v.object({ operationId: v.string(), changed: v.boolean() }),
  handler: async (ctx, args) => {
    const result = await runIntent(ctx, args.operationId, 'connections.disconnect', { instanceId: args.instanceId }, async (user) => {
      const row = await ctx.db.get(args.instanceId)
      if (row === null || !isGame(row, args.gameSlug ?? 'desk-crawler') || row.userId !== user._id) throw appError('CONNECTION_UNAVAILABLE', 'That connection is not available.')
      if (row.state !== 'active') return { changed: false }
      await ctx.db.patch(row._id, { state: 'disconnected' })
      return { changed: true }
    })
    return { operationId: result.operationId, changed: result.changed }
  },
})
