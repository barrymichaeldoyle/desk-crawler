import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { appError } from './lib/errors'
import { currentUser, runIntent } from './lib/intent'

const instanceView = v.object({
  id: v.id('trmnlInstances'),
  uuid: v.string(),
  state: v.union(v.literal('active'), v.literal('uninstalled'), v.literal('disconnected')),
  pluginSettingId: v.union(v.string(), v.null()),
  createdAt: v.number(),
})

/** Own plugin instances (not physical devices), bounded page. Never returns tokens or hashes. */
export const mine = query({
  args: {},
  returns: v.array(instanceView),
  handler: async (ctx) => {
    const user = await currentUser(ctx)
    if (user === null) return []
    const rows = await ctx.db
      .query('trmnlInstances')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(20)
    return rows.map((row) => ({ id: row._id, uuid: row.uuid, state: row.state, pluginSettingId: row.pluginSettingId ?? null, createdAt: row.createdAt }))
  },
})

/**
 * Management landing lookup: returns the instance only when it belongs to the
 * signed-in owner. A verified TRMNL UUID alone never reveals another account.
 */
export const forManagement = query({
  args: { uuid: v.string() },
  returns: v.union(v.null(), v.object({ owned: v.literal(false) }), v.object({ owned: v.literal(true), instance: instanceView, heroName: v.union(v.string(), v.null()) })),
  handler: async (ctx, { uuid }) => {
    const user = await currentUser(ctx)
    if (user === null) return null
    const row = await ctx.db
      .query('trmnlInstances')
      .withIndex('by_uuid', (q) => q.eq('uuid', uuid))
      .unique()
    if (row === null || row.userId !== user._id) return { owned: false as const }
    const hero = user.activeHeroId ? await ctx.db.get(user.activeHeroId) : null
    return {
      owned: true as const,
      instance: { id: row._id, uuid: row.uuid, state: row.state, pluginSettingId: row.pluginSettingId ?? null, createdAt: row.createdAt },
      heroName: hero?.name ?? null,
    }
  },
})

/** Local revocation of one installation; the hero and other installations are untouched. */
export const disconnect = mutation({
  args: { operationId: v.string(), instanceId: v.id('trmnlInstances') },
  returns: v.object({ operationId: v.string(), changed: v.boolean() }),
  handler: async (ctx, args) => {
    const result = await runIntent(ctx, args.operationId, 'connections.disconnect', { instanceId: args.instanceId }, async (user) => {
      const row = await ctx.db.get(args.instanceId)
      if (row === null || row.userId !== user._id) throw appError('CONNECTION_UNAVAILABLE', 'That connection is not available.')
      if (row.state !== 'active') return { changed: false }
      await ctx.db.patch(row._id, { state: 'disconnected' })
      return { changed: true }
    })
    return { operationId: result.operationId, changed: result.changed }
  },
})
