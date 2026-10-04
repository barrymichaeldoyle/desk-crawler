import { v } from 'convex/values'
import { internal } from './_generated/api'
import { internalMutation } from './_generated/server'

/**
 * Bounded retention cleanup (data-model.md "Retention plan"). Each job deletes
 * at most BATCH rows per invocation and reschedules itself until done. Active
 * or blocked runs and published leaderboard sets are never touched here.
 */
const BATCH = 200
const HOUR = 3_600_000
const DAY = 24 * HOUR
export const RETENTION = {
  tickLogsMs: 72 * HOUR,
  failuresMs: 7 * DAY,
  runsMs: 30 * DAY,
  installAttemptsMs: DAY,
} as const

type Job = 'tickLogs' | 'receipts' | 'rateLimits' | 'installAttempts' | 'failures' | 'runs'
const ORDER: readonly Job[] = ['tickLogs', 'receipts', 'rateLimits', 'installAttempts', 'failures', 'runs']

export const cleanup = internalMutation({
  args: { job: v.optional(v.union(...ORDER.map((j) => v.literal(j)))) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = args.job ?? 'tickLogs'
    const now = Date.now()
    let deleted = 0
    switch (job) {
      case 'tickLogs': {
        const rows = await ctx.db.query('tickLogs').withIndex('by_at', (q) => q.lt('at', now - RETENTION.tickLogsMs)).take(BATCH)
        for (const row of rows) await ctx.db.delete(row._id)
        deleted = rows.length
        break
      }
      case 'receipts': {
        const rows = await ctx.db.query('operationReceipts').withIndex('by_expiresAt', (q) => q.lt('expiresAt', now)).take(BATCH)
        for (const row of rows) await ctx.db.delete(row._id)
        deleted = rows.length
        break
      }
      case 'rateLimits': {
        const rows = await ctx.db.query('rateLimitBuckets').withIndex('by_expiresAt', (q) => q.lt('expiresAt', now)).take(BATCH)
        for (const row of rows) await ctx.db.delete(row._id)
        deleted = rows.length
        break
      }
      case 'installAttempts': {
        // Expired attempts are refused at use time; this only purges them within a day.
        const rows = await ctx.db.query('trmnlInstallAttempts').withIndex('by_expiresAt', (q) => q.lt('expiresAt', now - RETENTION.installAttemptsMs)).take(BATCH)
        for (const row of rows) await ctx.db.delete(row._id)
        deleted = rows.length
        break
      }
      case 'failures': {
        const rows = await ctx.db.query('simulationFailures').withIndex('by_createdAt', (q) => q.lt('createdAt', now - RETENTION.failuresMs)).take(BATCH)
        for (const row of rows) await ctx.db.delete(row._id)
        deleted = rows.length
        break
      }
      case 'runs': {
        const rows = await ctx.db
          .query('simulationRuns')
          .withIndex('by_state_and_startedAt', (q) => q.eq('state', 'completed').lt('startedAt', now - RETENTION.runsMs))
          .take(BATCH)
        const world = await ctx.db.query('worldState').withIndex('by_key', (q) => q.eq('key', 'world')).unique()
        for (const row of rows) {
          // A run still referenced by a kept leaderboard publication stays until that set is cleaned.
          const publication = await ctx.db.query('leaderboardPublications').withIndex('by_runId', (q) => q.eq('runId', row._id)).unique()
          if (publication || row._id === world?.activeRunId) continue
          await ctx.db.delete(row._id)
          deleted += 1
        }
        break
      }
    }
    if (deleted === BATCH) {
      await ctx.scheduler.runAfter(0, internal.maintenance.cleanup, { job })
    } else {
      const next = ORDER[ORDER.indexOf(job) + 1]
      if (next) await ctx.scheduler.runAfter(0, internal.maintenance.cleanup, { job: next })
    }
    return null
  },
})
