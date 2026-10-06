import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { TableNames } from './_generated/dataModel'
import { internalMutation } from './_generated/server'

/**
 * One-off pre-launch reset (D63). Deletes every Desk Crawler hero and all
 * gameplay, run and ranking history, then pins the world to content v1.
 * Accounts, game profiles, keepsakes, TRMNL connections, revocations and the
 * audit log are kept. Owners create a fresh hero by reinstalling.
 *
 * Deliberately schema-neutral (deletes and world/pointer patches only) so it
 * can deploy on its own before the single-catalog release, whose schema the
 * old documents would not satisfy. Never run after public launch.
 */

const GAMEPLAY_TABLES = [
  'items',
  'tickLogs',
  'heroScoreWindows',
  'rankInputs',
  'heroRanks',
  'leaderboardGenerations',
  'leaderboardPublications',
  'simulationFailures',
  // Incidents belong to runs; an open one could never recover once its run is gone.
  'operationalIncidents',
  'simulationRuns',
  'heroes',
] as const satisfies readonly TableNames[]

const BATCH = 200

export const start = internalMutation({
  args: { confirm: v.literal('RESET DESK CRAWLER BEFORE LAUNCH') },
  returns: v.null(),
  handler: async (ctx) => {
    const world = await ctx.db.query('worldState').withIndex('by_key', (q) => q.eq('key', 'world')).unique()
    if (world === null) throw new Error('no world to reset')
    if (world.activeRunId !== undefined) throw new Error('a run is active; retry after it completes')
    // Stop new runs while history disappears; `step` restores the previous setting when done.
    await ctx.db.patch(world._id, { ticksPaused: true })
    await ctx.db.insert('adminAuditEvents', { actorRef: 'pre-launch-reset', action: 'reset_game_data', targetRef: 'world', reasonCode: 'single_catalog_v1', outcome: 'started', at: Date.now() })
    await ctx.scheduler.runAfter(0, internal.resetGame.step, { resumeTicks: !world.ticksPaused, deleted: 0 })
    return null
  },
})

export const step = internalMutation({
  args: { resumeTicks: v.boolean(), deleted: v.number() },
  returns: v.null(),
  handler: async (ctx, { resumeTicks, deleted }) => {
    for (const table of GAMEPLAY_TABLES) {
      const rows = await ctx.db.query(table).take(BATCH)
      if (rows.length === 0) continue
      for (const row of rows) await ctx.db.delete(row._id)
      await ctx.scheduler.runAfter(0, internal.resetGame.step, { resumeTicks, deleted: deleted + rows.length })
      return null
    }
    // Hero pointers last: every hero row is gone, so nothing can be re-pointed meanwhile.
    // One batch is enough before launch (a handful of accounts); cleared pointers re-run the step.
    const profiles = await ctx.db.query('deskCrawlerProfiles').take(BATCH)
    const users = await ctx.db.query('users').take(BATCH)
    let cleared = 0
    for (const profile of profiles) if (profile.activeHeroId !== undefined) {
      await ctx.db.patch(profile._id, { activeHeroId: undefined })
      cleared += 1
    }
    for (const user of users) if (user.activeHeroId !== undefined) {
      await ctx.db.patch(user._id, { activeHeroId: undefined })
      cleared += 1
    }
    if (cleared > 0) {
      await ctx.scheduler.runAfter(0, internal.resetGame.step, { resumeTicks, deleted })
      return null
    }
    const world = (await ctx.db.query('worldState').withIndex('by_key', (q) => q.eq('key', 'world')).unique())!
    await ctx.db.patch(world._id, {
      activeContentVersion: 'v1',
      activeSimulationVersion: 1,
      activeRunId: undefined,
      publishedPublicationId: undefined,
      ticksPaused: !resumeTicks,
    })
    await ctx.db.insert('adminAuditEvents', { actorRef: 'pre-launch-reset', action: 'reset_game_data', targetRef: 'world', reasonCode: 'single_catalog_v1', outcome: `completed:${deleted}`, at: Date.now() })
    return null
  },
})
