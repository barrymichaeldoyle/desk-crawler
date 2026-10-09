import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

/**
 * Delete one angler's rows in bounded batches: cooler, stories, score windows, then the angler. Returns how many
 * rows went, so callers repeat until it is zero. Copied names in published boards are masked by owner state and
 * rotate out within two publications, as for heroes.
 */
export async function purgeAngler(ctx: MutationCtx, anglerId: Id<'anglers'>, batch: number): Promise<number> {
  let removed = 0
  for (const row of await ctx.db.query('catches').withIndex('by_anglerId', (q) => q.eq('anglerId', anglerId)).take(batch)) {
    await ctx.db.delete(row._id)
    removed += 1
  }
  for (const row of await ctx.db.query('swTickLogs').withIndex('by_anglerId_and_at_and_sequence', (q) => q.eq('anglerId', anglerId)).take(batch)) {
    await ctx.db.delete(row._id)
    removed += 1
  }
  for (const row of await ctx.db.query('swScoreWindows').withIndex('by_heroId', (q) => q.eq('heroId', anglerId)).take(batch)) {
    await ctx.db.delete(row._id)
    removed += 1
  }
  if (removed > 0) return removed
  const angler = await ctx.db.get(anglerId)
  if (angler) {
    for (const row of await ctx.db.query('swAchievements').withIndex('by_userId_and_achievementId', (q) => q.eq('userId', angler.userId)).take(batch)) {
      await ctx.db.delete(row._id)
      removed += 1
    }
    if (removed > 0) return removed
  }
  if (angler) {
    await ctx.db.delete(anglerId)
    return 1
  }
  return 0
}
