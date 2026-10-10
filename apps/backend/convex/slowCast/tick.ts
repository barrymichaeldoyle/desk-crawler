import { v } from 'convex/values'
import type { SlowCastCatalog } from '@trmnl-games/slow-cast/sim'
import { simulateAngler, SlowCastInvariantError } from '@trmnl-games/slow-cast/sim'
import { deriveAnglerSeeds, forecastFor } from '@trmnl-games/slow-cast/sim/seed'
import type { Doc, Id } from '../_generated/dataModel'
import { internalMutation, type MutationCtx } from '../_generated/server'
import { runBatch, startRun, watchdogStep, type SubjectStep } from '../lib/engine/runner'
import { fromAnglerState, progressed, storedDetail, toAnglerState } from './adapter'
import { currentAngler } from './profile'
import { awardAngler, stateOf, tallyAnglerUnlocks } from './achievements'
import { needsFullPass } from '@trmnl-games/slow-cast/content/achievements'
import { coolerOf } from '@trmnl-games/slow-cast/sim'
import { queueSlowCastAlerts } from '../lib/alerts'
import { SLOW_CAST_RUNTIME } from './runtime'
import { recordCatch } from './records'

/**
 * Slow Cast's tick (slow-cast.md "The cast"), on the shared engine run frame:
 * cron at minutes 5, 20, 35 and 50 (crons.ts), the same guards, pages,
 * publication and watchdog as Desk Crawler, and this per-angler step. Slow Cast
 * has no XP, so it writes no rank inputs: the hourly publication carries only
 * achievement rarity, and the boards are the catch records (records.ts).
 */

export const startTick = internalMutation({
  args: {},
  returns: v.union(v.null(), v.id('swSimulationRuns')),
  handler: async (ctx) => (await startRun(ctx, SLOW_CAST_RUNTIME)) as unknown as Id<'swSimulationRuns'> | null,
})

export const simulateBatch = internalMutation({
  args: { runId: v.id('swSimulationRuns'), expectedSequence: v.number() },
  returns: v.null(),
  handler: async (ctx, { runId, expectedSequence }) => await runBatch(ctx, SLOW_CAST_RUNTIME, runId as unknown as Id<'simulationRuns'>, expectedSequence, simulateAnglerStep),
})

export const watchdog = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => await watchdogStep(ctx, SLOW_CAST_RUNTIME),
})

/** A publication run's share for one angler: achievement rarity, published with the hourly set (D65). */
async function publishInputs(ctx: MutationCtx, owner: Doc<'users'>, step: SubjectStep<SlowCastCatalog>) {
  await tallyAnglerUnlocks(ctx, owner._id, step.tally.unlocks)
  step.tally.population += 1
}

/** One angler's share of a page: eligibility, dormant skip, quarantine, the pure cast, then its writes and rank input. */
async function simulateAnglerStep(ctx: MutationCtx, subject: Doc<'heroes'>, step: SubjectStep<SlowCastCatalog>): Promise<void> {
  const angler = subject as unknown as Doc<'anglers'>
  const { run, world, content, now, tally } = step
  const counts = tally.counts as Record<'eligible' | 'skippedDormant' | 'quarantined' | 'landed' | 'released' | 'gotAway', number>
  if (!angler.isActive || angler.activationState !== 'active' || angler.eligibleFromTick > run.tick || angler.lastTick >= run.tick) return
  const owner = await ctx.db.get(angler.userId)
  if (owner === null || (await currentAngler(ctx, owner))?._id !== angler._id) return
  counts.eligible += 1

  // A paused angler cannot change without an intent: skip it between publications (D32).
  if (angler.status === 'paused' && !run.publishes) {
    counts.skippedDormant += 1
    return
  }
  if (angler.simulationState === 'quarantined') {
    counts.quarantined += 1
    await ctx.db.patch(angler._id, { lastTick: run.tick })
    if (run.publishes) await publishInputs(ctx, owner, step)
    return
  }

  const coolerCount = (await ctx.db.query('catches').withIndex('by_anglerId', (q) => q.eq('anglerId', angler._id)).take(32)).length
  const state = toAnglerState(angler)
  let result
  try {
    result = simulateAngler({
      angler: state,
      coolerCount,
      tick: run.tick,
      tickAt: run.wallSlot,
      ...(owner.trmnlUtcOffset === undefined ? {} : { utcOffsetSeconds: owner.trmnlUtcOffset }),
      // The forecast for the water the angler will be at; travel resolves before any cast.
      weather: forecastFor(world.worldSeed, content, state.travelTo ?? state.waterId, run.wallSlot),
      content,
      streams: deriveAnglerSeeds(world.worldSeed, angler._id, run.tick, run.simulationVersion),
    })
  } catch (error) {
    if (!(error instanceof SlowCastInvariantError)) throw error
    counts.quarantined += 1
    await ctx.db.patch(angler._id, { simulationState: 'quarantined', quarantineReasonCode: error.code, lastTick: run.tick })
    await ctx.db.insert('swSimulationFailures', {
      runId: run._id as unknown as Id<'swSimulationRuns'>,
      heroId: angler._id,
      reasonCode: error.code,
      simulationVersion: run.simulationVersion,
      contentVersion: run.contentVersion,
      tick: run.tick,
      message: error.message.slice(0, 500),
      createdAt: now,
    })
    if (run.publishes) await publishInputs(ctx, owner, step)
    return
  }

  if (result.catch) {
    await ctx.db.insert('catches', { anglerId: angler._id, ...result.catch, contentVersion: run.contentVersion, createdAt: now })
  }
  // D115 alerts: the cooler filled on this cast, or the bait on the hook ran out.
  if (owner.alerts !== undefined) {
    const filledCooler = result.catch !== undefined && coolerCount + 1 >= coolerOf(content, angler.coolerTier).capacity
    const ranOut = (result.extraEvents ?? []).some((event) => event.kind === 'bait_out')
    if (filledCooler || ranOut) await queueSlowCastAlerts(ctx, { owner, anglerId: angler._id, filledCooler, ranOut, tick: run.tick, now })
  }
  const patch: Partial<Doc<'anglers'>> = { ...fromAnglerState(result.angler), lastTick: run.tick }
  if (progressed(result)) {
    patch.lastProgressTick = run.tick
    patch.lastAdvancedAt = now
  }
  let sequence = angler.logSequence
  for (const event of [...(result.event ? [result.event] : []), ...(result.extraEvents ?? [])]) {
    sequence += 1
    await ctx.db.insert('swTickLogs', {
      anglerId: angler._id,
      source: 'tick',
      tick: run.tick,
      runId: run._id as unknown as Id<'swSimulationRuns'>,
      sequence,
      at: now,
      kind: event.kind,
      summary: event.summary,
      detail: storedDetail(event),
      deltas: event.deltas,
    })
  }
  if (sequence !== angler.logSequence) patch.logSequence = sequence
  await ctx.db.patch(angler._id, patch)
  // The boards: a landed fish, kept or released, may be the angler's heaviest at this water this week or ever.
  const landed = result.event && (result.event.kind === 'catch' || result.event.kind === 'release') ? result.event.detail : undefined
  if (landed?.speciesId !== undefined && landed.grams !== undefined && landed.waterId !== undefined) await recordCatch(ctx, angler, { waterId: landed.waterId, speciesId: landed.speciesId, grams: landed.grams }, run.wallSlot)
  // Achievements: diff lifetime state; an angler behind the catalog version gets one full pass.
  if (result.event !== undefined || result.extraEvents !== undefined || needsFullPass(angler.achievementsVersion)) {
    const updated = (await ctx.db.get(angler._id))!
    // The fly count matters only on a full pass; a tick never changes it.
    const flies = needsFullPass(angler.achievementsVersion) ? ((await ctx.db.query('flyBoxes').withIndex('by_userId', (q) => q.eq('userId', owner._id)).unique())?.totalCollected ?? 0) : 0
    await awardAngler(ctx, updated, stateOf(angler, flies), stateOf(updated, flies), content, now, run.tick)
  }
  if (run.publishes) await publishInputs(ctx, owner, step)

  counts.landed += result.metrics.landed
  counts.released += result.metrics.released
  counts.gotAway += result.metrics.gotAway
}
