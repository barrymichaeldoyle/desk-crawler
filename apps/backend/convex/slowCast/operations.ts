import { v } from 'convex/values'
import type { Doc, Id } from '../_generated/dataModel'
import { internalMutation, internalQuery, mutation, query } from '../_generated/server'
import { audit } from '../admin'
import { requireAdmin } from '../lib/adminAccess'
import { appError } from '../lib/errors'
import { getOrCreateEngineWorld, readEngineWorld, setEngineContentVersion } from '../lib/engine/world'
import { SLOW_CAST_RUNTIME } from './runtime'

/**
 * Slow Cast operator controls (operations.md, D115), the same controls Desk Crawler has: health, quarantine release,
 * resuming a blocked run, the content switch and pausing new ticks. Admin mutations are audited with a reason.
 */
const reason = v.string()

export const health = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const world = await readEngineWorld(ctx, SLOW_CAST_RUNTIME)
    const runId = world?.activeRunId as unknown as Id<'swSimulationRuns'> | undefined
    const run = runId ? await ctx.db.get(runId) : null
    const quarantined = await ctx.db.query('anglers').withIndex('by_simulationState', (q) => q.eq('simulationState', 'quarantined')).take(50)
    const owners = await Promise.all(quarantined.map((a) => ctx.db.get(a.userId)))
    return {
      world: world && { currentTick: world.currentTick, contentVersion: world.activeContentVersion, lastCompletedTick: world.lastCompletedTick ?? null, lastCompletedAt: world.lastCompletedAt ?? null, lastPublishedAt: world.lastPublishedAt ?? null, ticksPaused: world.ticksPaused },
      activeRun: run && { tick: run.tick, state: run.state, lastProgressAt: run.lastProgressAt, failureCode: run.failureCode ?? null, recoveryAttempts: run.recoveryAttempts },
      quarantined: quarantined.map((a, i) => ({ id: a._id, name: owners[i]?.publicAlias ?? 'Unknown', reasonCode: a.quarantineReasonCode ?? null })),
    }
  },
})

export const releaseAngler = mutation({
  args: { anglerId: v.id('anglers'), reasonCode: reason },
  returns: v.null(),
  handler: async (ctx, { anglerId, reasonCode }) => {
    const actor = await requireAdmin(ctx)
    const angler = await ctx.db.get(anglerId)
    if (angler === null || angler.simulationState !== 'quarantined') throw appError('INVALID_STATE', 'Angler is not quarantined.')
    await ctx.db.patch(anglerId, { simulationState: 'healthy', quarantineReasonCode: undefined })
    await audit(ctx, actor, 'release_angler', anglerId, reasonCode, 'healthy')
    return null
  },
})

/** Resume a blocked Slow Cast run at its saved phase and cursor after the cause is fixed. */
export const resumeBlockedRun = mutation({
  args: { reasonCode: reason },
  returns: v.null(),
  handler: async (ctx, { reasonCode }) => {
    const actor = await requireAdmin(ctx)
    const world = await readEngineWorld(ctx, SLOW_CAST_RUNTIME)
    const runId = world?.activeRunId as unknown as Id<'swSimulationRuns'> | undefined
    const run: Doc<'swSimulationRuns'> | null = runId ? await ctx.db.get(runId) : null
    if (run === null || run.state !== 'blocked') throw appError('INVALID_STATE', 'No blocked run.')
    const publication = await ctx.db.query('swLeaderboardPublications').withIndex('by_runId', (q) => q.eq('runId', run._id)).unique()
    const now = Date.now()
    if (publication && publication.state === 'building') {
      await ctx.db.patch(run._id, { state: 'ranking', failureCode: undefined, recoveryAttempts: 0, lastProgressAt: now })
      const scheduled = await ctx.scheduler.runAfter(0, SLOW_CAST_RUNTIME.refs.buildBatch, { publicationId: publication._id as unknown as Id<'leaderboardPublications'>, expectedSequence: publication.batchSequence })
      await ctx.db.patch(publication._id, { nextScheduledFunctionId: scheduled, lastProgressAt: now })
    } else {
      const scheduled = await ctx.scheduler.runAfter(0, SLOW_CAST_RUNTIME.refs.simulateBatch, { runId: run._id as unknown as Id<'simulationRuns'>, expectedSequence: run.batchSequence })
      await ctx.db.patch(run._id, { state: 'simulating', failureCode: undefined, recoveryAttempts: 0, lastProgressAt: now, nextScheduledFunctionId: scheduled })
    }
    await audit(ctx, actor, 'resume_run', run._id, reasonCode, `slow-cast tick ${run.tick}`)
    return null
  },
})

/** Switch the catalog Slow Cast's next run pins: `npx convex run --prod slowCast/operations:setActiveContentVersion '{"contentVersion":"v2"}'`. */
export const setActiveContentVersion = internalMutation({
  args: { contentVersion: v.string() },
  returns: v.object({ from: v.string(), to: v.string() }),
  handler: async (ctx, { contentVersion }) => await setEngineContentVersion(ctx, SLOW_CAST_RUNTIME, contentVersion),
})

/**
 * Stop or restart new Slow Cast tick starts (a breaking core change, operations.md "Content releases"). A run already
 * going finishes; nothing catches up afterwards. `npx convex run --prod slowCast/operations:setTicksPaused '{"paused":true}'`.
 */
export const setTicksPaused = internalMutation({
  args: { paused: v.boolean() },
  returns: v.object({ paused: v.boolean() }),
  handler: async (ctx, { paused }) => {
    const world = await getOrCreateEngineWorld(ctx, SLOW_CAST_RUNTIME)
    await ctx.db.patch(world._id, { ticksPaused: paused })
    return { paused }
  },
})

/**
 * Operator view of Slow Cast engagement over every active angler, consent or not (counters only, no logs):
 * `npx convex run --prod slowCast/operations:engagement`. Stops at 5,000 anglers and says so.
 */
export const engagement = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const scanned = await ctx.db.query('anglers').withIndex('by_createdAt').take(5000)
    const anglers = scanned.filter((a) => a.isActive && a.activationState === 'active')
    const tally = (values: Array<string | number>) => values.reduce<Record<string, number>>((acc, key) => ({ ...acc, [key]: (acc[key] ?? 0) + 1 }), {})
    const sum = (pick: (a: Doc<'anglers'>) => number) => anglers.reduce((total, a) => total + pick(a), 0)
    const flies = await ctx.db.query('flyBoxes').take(5000)
    return {
      truncated: scanned.length === 5000,
      activeAnglers: anglers.length,
      paused: anglers.filter((a) => a.status === 'paused').length,
      waters: tally(anglers.map((a) => a.waterId)),
      levels: tally(anglers.map((a) => a.level)),
      rods: tally(anglers.map((a) => a.rodTier)),
      coolers: tally(anglers.map((a) => a.coolerTier)),
      bareHook: anglers.filter((a) => !a.baitOnHook || (a.bait[a.baitOnHook] ?? 0) === 0).length,
      fish: { caught: sum((a) => a.counters.fishCaught), released: sum((a) => a.counters.released), gotAway: sum((a) => a.counters.gotAway), sold: sum((a) => a.counters.fishSold), epic: sum((a) => a.counters.epicCaught) },
      speciesLogged: tally(anglers.map((a) => Object.keys(a.logbook).length)),
      flyBoxes: { owners: flies.length, flies: flies.reduce((total, f) => total + f.totalCollected, 0) },
    }
  },
})
