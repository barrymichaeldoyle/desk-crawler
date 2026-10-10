import { v } from 'convex/values'
import { internalMutation } from '../_generated/server'

const PAGE = 100

/**
 * One-off (2026-10-10): Slow Cast dropped XP and levels. Unset the retired angler fields and delete the angler's XP
 * score windows, a page at a time; rerun with the returned cursor until `done`. Once every deployment has run it,
 * the retired fields leave the schema.
 *   npx convex run slowCast/migrations:clearRetiredFields '{}'
 */
export const clearRetiredFields = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  returns: v.object({ cleared: v.number(), done: v.boolean(), cursor: v.union(v.string(), v.null()) }),
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db.query('anglers').paginate({ numItems: PAGE, cursor: cursor ?? null })
    let cleared = 0
    for (const angler of page.page) {
      if ([angler.level, angler.xp, angler.lifetimeXp, angler.lastLevelUpTick, angler.scoreHour, angler.scoreHourXp].some((field) => field !== undefined)) {
        await ctx.db.patch(angler._id, { level: undefined, xp: undefined, lifetimeXp: undefined, lastLevelUpTick: undefined, scoreHour: undefined, scoreHourXp: undefined })
        cleared += 1
      }
      for (const row of await ctx.db.query('swScoreWindows').withIndex('by_heroId', (q) => q.eq('heroId', angler._id)).take(10)) await ctx.db.delete(row._id)
    }
    return { cleared, done: page.isDone, cursor: page.isDone ? null : page.continueCursor }
  },
})
