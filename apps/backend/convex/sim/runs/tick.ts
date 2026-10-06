import { currentHero } from '../../lib/gameProfile'
import { paginator } from 'convex-helpers/server/pagination'
import schema from '../../schema'
import { v } from 'convex/values'
import { internal } from '../../_generated/api'
import type { Doc, Id } from '../../_generated/dataModel'
import { internalMutation, type MutationCtx } from '../../_generated/server'
import { catalogs, type CatalogId } from '@trmnl-games/desk-crawler/content'
import { SimulationInvariantError } from '@trmnl-games/desk-crawler/sim/core/invariants'
import { simulateHero, SIMULATION_VERSION } from '@trmnl-games/desk-crawler/sim/core/simulate'
import { creditTick, projectAtPublication, type ScoreAccumulator, type ScoreBucket } from '@trmnl-games/desk-crawler/sim/score'
import { deriveStreamSeeds, SEED_VERSION } from '@trmnl-games/desk-crawler/sim/seed'
import { getOrCreateWorld } from '../../world'
import { applyResult, storedDetail, toHeroState, toInventory } from './adapter'
import { beginBuild, writeRankInput } from '../../leaderboard'
import { openIncident, recoverIncidents } from '../../incidents'
import { SLOT_MS, SLOT_OFFSET_MS, wallSlotFor } from '@trmnl-games/desk-crawler/sim/schedule'

export { SLOT_MS, SLOT_OFFSET_MS, wallSlotFor }

/**
 * Tick orchestration (simulation.md). One logical tick per accepted wall slot;
 * the run's active guard spans the whole page chain; every page is sequence-
 * guarded so duplicates are no-ops; recovery resumes the same run with the
 * same pinned versions and never increments the tick.
 */

export const PAGE_SIZE = 25
export const STALL_MS = 5 * 60 * 1000
export const MAX_RECOVERY_ATTEMPTS = 3
const HOUR_MS = 60 * 60 * 1000

/** D31: publish on the last slot of each UTC hour, or once after >60 minutes without a publication. */
export function shouldPublish(scoreAt: number, lastPublishedAt: number | undefined): boolean {
  const lastSlotOfHour = new Date(scoreAt).getUTCMinutes() === 45
  return lastSlotOfHour || lastPublishedAt === undefined || scoreAt - lastPublishedAt > HOUR_MS
}

export const startTick = internalMutation({
  args: {},
  returns: v.union(v.null(), v.id('simulationRuns')),
  handler: async (ctx) => {
    const now = Date.now()
    const world = await getOrCreateWorld(ctx)
    if (world.ticksPaused || world.maintenanceMode) return null
    if (world.activeRunId !== undefined) return world.activeRunId
    const wallSlot = wallSlotFor(now)
    if (world.lastStartedWallSlot !== undefined && wallSlot <= world.lastStartedWallSlot) return null

    const tick = world.currentTick + 1
    const contentVersion = world.activeContentVersion
    if (!(contentVersion in catalogs)) throw new Error(`content version ${contentVersion} is not available`)
    const runId = await ctx.db.insert('simulationRuns', {
      tick,
      wallSlot,
      scoreAt: wallSlot,
      publishes: shouldPublish(wallSlot, world.lastPublishedAt),
      startedAt: now,
      cohortCutoff: now,
      contentVersion,
      simulationVersion: world.activeSimulationVersion,
      seedVersion: SEED_VERSION,
      state: 'simulating',
      paginationVersion: 1,
      batchSequence: 0,
      lastProgressAt: now,
      processed: 0,
      eligible: 0,
      skippedDormant: 0,
      quarantined: 0,
      deaths: 0,
      levelUps: 0,
      heldFinds: 0,
      recoveryAttempts: 0,
    })
    await ctx.db.patch(world._id, { currentTick: tick, lastStartedWallSlot: wallSlot, activeRunId: runId })
    const scheduled = await ctx.scheduler.runAfter(0, internal.sim.runs.tick.simulateBatch, { runId, expectedSequence: 0 })
    await ctx.db.patch(runId, { nextScheduledFunctionId: scheduled })
    return runId
  },
})

export const simulateBatch = internalMutation({
  args: { runId: v.id('simulationRuns'), expectedSequence: v.number() },
  returns: v.null(),
  handler: async (ctx, { runId, expectedSequence }) => {
    const run = await ctx.db.get(runId)
    // Stale duplicate or late worker: nothing to do.
    if (run === null || run.state !== 'simulating' || run.batchSequence !== expectedSequence) return null
    const world = await getOrCreateWorld(ctx)
    if (world.activeRunId !== runId) return null
    if (run.simulationVersion !== SIMULATION_VERSION) {
      await block(ctx, run, world, 'SIMULATION_VERSION_UNAVAILABLE')
      return null
    }
    const content = catalogs[run.contentVersion as CatalogId]
    if (content === undefined) {
      await block(ctx, run, world, 'CONTENT_VERSION_UNAVAILABLE')
      return null
    }

    const now = Date.now()
    // Exported index-key cursors survive an isolated restore.
    const db = paginator(ctx.db, schema)
    const page = await db
      .query('heroes')
      .withIndex('by_createdAt', (q) => q.lt('createdAt', run.cohortCutoff))
      .paginate({ numItems: PAGE_SIZE, cursor: run.cursor ?? null })

    const counts = { processed: 0, eligible: 0, skippedDormant: 0, quarantined: 0, deaths: 0, levelUps: 0, heldFinds: 0 }
    for (const hero of page.page) {
      counts.processed += 1
      if (!hero.isActive || hero.activationState !== 'active' || hero.eligibleFromTick > run.tick || hero.lastTick >= run.tick) continue
      const owner = await ctx.db.get(hero.userId)
      if (owner === null || (await currentHero(ctx, owner))?._id !== hero._id) continue
      counts.eligible += 1

      const dormant = hero.status === 'paused' || (hero.status === 'sleeping' && hero.wakeAtTick === undefined)
      if (dormant && !run.publishes) {
        // D32: no state can change without an intent, so skip all reads/writes between publications.
        counts.skippedDormant += 1
        continue
      }
      if (hero.simulationState === 'quarantined') {
        counts.quarantined += 1
        await ctx.db.patch(hero._id, { lastTick: run.tick })
        if (run.publishes) {
          const scores = await foldScore(ctx, hero, run, { scoreHourXp: hero.scoreHourXp, ...(hero.scoreHour === undefined ? {} : { scoreHour: hero.scoreHour }) })
          await writeRankInput(ctx, run, (await ctx.db.get(hero._id))!, owner, scores)
        }
        continue
      }

      const items = await ctx.db
        .query('items')
        .withIndex('by_heroId', (q) => q.eq('heroId', hero._id))
        .take(40)
      let result
      const recentLogs = await ctx.db.query('tickLogs').withIndex('by_heroId_and_at_and_sequence', (q) => q.eq('heroId', hero._id)).order('desc').take(2)
      try {
        result = simulateHero({
          hero: toHeroState(hero),
          inventory: toInventory(items),
          tick: run.tick,
          content,
          simulationVersion: run.simulationVersion,
          streams: deriveStreamSeeds(world.worldSeed, hero._id, run.tick, run.simulationVersion),
          recentSummaries: recentLogs.map((log) => log.summary),
        })
      } catch (error) {
        // Only recognized pure-core failures are isolated; anything else rolls back the page.
        if (!(error instanceof SimulationInvariantError)) throw error
        counts.quarantined += 1
        await ctx.db.patch(hero._id, { simulationState: 'quarantined', quarantineReasonCode: error.code, lastTick: run.tick })
        if (run.publishes) {
          const scores = await foldScore(ctx, hero, run, { scoreHourXp: hero.scoreHourXp, ...(hero.scoreHour === undefined ? {} : { scoreHour: hero.scoreHour }) })
          await writeRankInput(ctx, run, (await ctx.db.get(hero._id))!, owner, scores)
        }
        await ctx.db.insert('simulationFailures', {
          runId,
          heroId: hero._id,
          reasonCode: error.code,
          simulationVersion: run.simulationVersion,
          contentVersion: run.contentVersion,
          tick: run.tick,
          message: error.message.slice(0, 500),
          createdAt: now,
        })
        continue
      }

      await applyResult(ctx, hero, items, result, now)
      const progressed = !['waiting_dead', 'waiting_travel', 'paused', 'sleeping'].includes(result.disposition)
      const markers: Partial<Doc<'heroes'>> = { lastTick: run.tick }
      if (progressed) {
        markers.lastProgressTick = run.tick
        markers.lastAdvancedAt = now
      }
      if (result.event) {
        const sequence = hero.logSequence + 1
        markers.logSequence = sequence
        await ctx.db.insert('tickLogs', {
          heroId: hero._id,
          source: 'tick',
          tick: run.tick,
          runId,
          sequence,
          at: now,
          kind: result.event.kind,
          summary: result.event.summary,
          detail: storedDetail(result.event.detail, result.itemChanges),
          deltas: result.event.deltas,
        })
      }
      // Credit this tick's granted XP to the current-hour accumulator (D31).
      const credited = creditTick(
        { scoreHourXp: hero.scoreHourXp, ...(hero.scoreHour === undefined ? {} : { scoreHour: hero.scoreHour }) },
        run.scoreAt,
        result.event?.deltas.xpEarned ?? 0,
      )
      if (credited.fold) await addBucket(ctx, hero._id, credited.fold)
      markers.scoreHourXp = credited.accumulator.scoreHourXp
      markers.scoreHour = credited.accumulator.scoreHour
      await ctx.db.patch(hero._id, markers)
      if (run.publishes) {
        const updated = (await ctx.db.get(hero._id))!
        const scores = await foldScore(ctx, updated, run, credited.accumulator)
        await writeRankInput(ctx, run, (await ctx.db.get(hero._id))!, owner, scores)
      }

      counts.deaths += result.metrics.deaths
      counts.levelUps += result.metrics.levelUps
      counts.heldFinds += result.metrics.heldFinds
    }

    const progress = {
      cursor: page.continueCursor,
      batchSequence: run.batchSequence + 1,
      lastProgressAt: now,
      processed: run.processed + counts.processed,
      eligible: run.eligible + counts.eligible,
      skippedDormant: run.skippedDormant + counts.skippedDormant,
      quarantined: run.quarantined + counts.quarantined,
      deaths: run.deaths + counts.deaths,
      levelUps: run.levelUps + counts.levelUps,
      heldFinds: run.heldFinds + counts.heldFinds,
    }
    if (!page.isDone) {
      const scheduled = await ctx.scheduler.runAfter(0, internal.sim.runs.tick.simulateBatch, { runId, expectedSequence: progress.batchSequence })
      await ctx.db.patch(runId, { ...progress, nextScheduledFunctionId: scheduled })
      return null
    }
    if (run.publishes) {
      // Publication run: freeze progress, then build and atomically publish all three boards.
      await ctx.db.patch(runId, progress)
      await beginBuild(ctx, (await ctx.db.get(runId))!, world, now)
      return null
    }
    await ctx.db.patch(runId, { ...progress, state: 'completed', finishedAt: now, nextScheduledFunctionId: undefined })
    await ctx.db.patch(world._id, { activeRunId: undefined, lastCompletedTick: run.tick, lastCompletedAt: now })
    await recoverIncidents(ctx, runId, now)
    return null
  },
})

async function addBucket(ctx: MutationCtx, heroId: Id<'heroes'>, bucket: ScoreBucket): Promise<void> {
  const existing = await ctx.db
    .query('heroScoreWindows')
    .withIndex('by_heroId', (q) => q.eq('heroId', heroId))
    .unique()
  const buckets = existing?.buckets ?? []
  const merged = buckets.some((b) => b.hourStart === bucket.hourStart)
    ? buckets.map((b) => (b.hourStart === bucket.hourStart ? { hourStart: b.hourStart, xp: b.xp + bucket.xp } : b))
    : [...buckets, bucket].sort((a, b) => a.hourStart - b.hourStart)
  if (existing) await ctx.db.patch(existing._id, { buckets: merged })
  else await ctx.db.insert('heroScoreWindows', { heroId, buckets: merged, xp24h: 0, xp7d: 0, scoreVersion: 1 })
}

/** Publication run: fold the accumulator, expire, and materialize both window totals (D31). */
async function foldScore(ctx: MutationCtx, hero: Doc<'heroes'>, run: Doc<'simulationRuns'>, accumulator: ScoreAccumulator): Promise<{ xp24h: number; xp7d: number }> {
  const existing = await ctx.db
    .query('heroScoreWindows')
    .withIndex('by_heroId', (q) => q.eq('heroId', hero._id))
    .unique()
  const projected = projectAtPublication(existing?.buckets ?? [], accumulator, run.scoreAt)
  const doc = { buckets: projected.buckets, xp24h: projected.xp24h, xp7d: projected.xp7d, lastFoldedRunId: run._id, scoreVersion: 1 }
  if (existing) await ctx.db.patch(existing._id, doc)
  else await ctx.db.insert('heroScoreWindows', { heroId: hero._id, ...doc })
  await ctx.db.patch(hero._id, { scoreHourXp: 0, scoreHour: undefined })
  return { xp24h: projected.xp24h, xp7d: projected.xp7d }
}

async function block(ctx: MutationCtx, run: Doc<'simulationRuns'>, _world: Doc<'worldState'>, code: string): Promise<void> {
  // Blocked keeps the cursor and the active guard: no newer run starts until recovery.
  await ctx.db.patch(run._id, { state: 'blocked', failureCode: code, nextScheduledFunctionId: undefined })
}

/**
 * Every 5 minutes (simulation.md "Watchdog"): resume a stalled run only when its
 * scheduled continuation failed, was cancelled or vanished; never duplicate a
 * pending/running job; block after three automated attempts.
 */
export const watchdog = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const world = await getOrCreateWorld(ctx)
    if (world.activeRunId === undefined) return null
    const run = await ctx.db.get(world.activeRunId)
    if (run === null) return null
    const now = Date.now()
    if (run.state === 'ranking') {
      const publication = await ctx.db
        .query('leaderboardPublications')
        .withIndex('by_runId', (q) => q.eq('runId', run._id))
        .unique()
      if (publication === null || publication.state !== 'building' || now - publication.lastProgressAt < STALL_MS) return null
      await openIncident(ctx, run._id, 'stall', now)
      const job = publication.nextScheduledFunctionId ? await ctx.db.system.get(publication.nextScheduledFunctionId) : null
      if (job?.state.kind === 'pending' || job?.state.kind === 'inProgress') return null
      if (run.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
        await block(ctx, run, world, 'RANKING_STALLED_AFTER_RECOVERY')
        return null
      }
      const scheduled = await ctx.scheduler.runAfter(0, internal.leaderboard.buildBatch, { publicationId: publication._id, expectedSequence: publication.batchSequence })
      await ctx.db.patch(publication._id, { nextScheduledFunctionId: scheduled, lastProgressAt: now })
      await ctx.db.patch(run._id, { recoveryAttempts: run.recoveryAttempts + 1 })
      return null
    }
    if (run.state !== 'simulating') return null
    if (now - run.lastProgressAt < STALL_MS) return null
    await openIncident(ctx, run._id, 'stall', now)
    const job = run.nextScheduledFunctionId ? await ctx.db.system.get(run.nextScheduledFunctionId) : null
    const kind = job?.state.kind
    if (kind === 'pending' || kind === 'inProgress') return null
    if (run.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
      await block(ctx, run, world, 'STALLED_AFTER_RECOVERY')
      return null
    }
    const scheduled = await ctx.scheduler.runAfter(0, internal.sim.runs.tick.simulateBatch, { runId: run._id, expectedSequence: run.batchSequence })
    await ctx.db.patch(run._id, { nextScheduledFunctionId: scheduled, recoveryAttempts: run.recoveryAttempts + 1, lastProgressAt: now })
    return null
  },
})
