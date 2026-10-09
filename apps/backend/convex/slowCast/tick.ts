import { v } from 'convex/values'
import type { SlowCastCatalog } from '@trmnl-games/slow-cast/sim'
import { simulateAngler, SlowCastInvariantError } from '@trmnl-games/slow-cast/sim'
import { deriveAnglerSeeds, forecastFor } from '@trmnl-games/slow-cast/sim/seed'
import type { Doc, Id } from '../_generated/dataModel'
import { internalMutation, type MutationCtx } from '../_generated/server'
import { runBatch, startRun, watchdogStep, type SubjectStep } from '../lib/engine/runner'
import { accumulatorOf, addBucket, creditTick, foldScore, writeEngineRankInput, type RankSubject } from '../lib/engine/scores'
import { fromAnglerState, progressed, storedDetail, toAnglerState } from './adapter'
import { currentAngler } from './profile'
import { awardAngler, stateOf, tallyAnglerUnlocks } from './achievements'
import { needsFullPass } from '@trmnl-games/slow-cast/content/achievements'
import { SLOW_CAST_RUNTIME } from './runtime'

/**
 * Slow Cast's tick (slow-cast.md "The cast"), on the shared engine run frame:
 * cron at minutes 5, 20, 35 and 50 (crons.ts), the same guards, pages,
 * publication and watchdog as Desk Crawler, and this per-angler step.
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

/** The engine's rank view of an angler: anglers carry no name of their own, so the board shows the owner's public alias. */
function rankSubject(angler: Doc<'anglers'>, owner: Doc<'users'>): RankSubject {
  return { ...angler, _id: angler._id as unknown as Id<'heroes'>, name: owner.publicAlias }
}

async function publishInputs(ctx: MutationCtx, angler: Doc<'anglers'>, owner: Doc<'users'>, step: SubjectStep<SlowCastCatalog>, accumulator = accumulatorOf(angler)) {
  const id = angler._id as unknown as Id<'heroes'>
  const scores = await foldScore(ctx, SLOW_CAST_RUNTIME, id, step.run, accumulator)
  const fresh = (await ctx.db.get(angler._id))!
  await writeEngineRankInput(ctx, SLOW_CAST_RUNTIME, step.run, rankSubject(fresh, owner), owner, scores, fresh.status === 'paused')
  // Rarity is published from the same generation as the boards (D65).
  await tallyAnglerUnlocks(ctx, owner._id, step.tally.unlocks)
  step.tally.population += 1
}

/** One angler's share of a page: eligibility, dormant skip, quarantine, the pure cast, then its writes and rank input. */
async function simulateAnglerStep(ctx: MutationCtx, subject: Doc<'heroes'>, step: SubjectStep<SlowCastCatalog>): Promise<void> {
  const angler = subject as unknown as Doc<'anglers'>
  const { run, world, content, now, tally } = step
  const counts = tally.counts as Record<'eligible' | 'skippedDormant' | 'quarantined' | 'landed' | 'released' | 'gotAway' | 'levelUps', number>
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
    if (run.publishes) await publishInputs(ctx, angler, owner, step)
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
    if (run.publishes) await publishInputs(ctx, angler, owner, step)
    return
  }

  if (result.catch) {
    await ctx.db.insert('catches', { anglerId: angler._id, ...result.catch, contentVersion: run.contentVersion, createdAt: now })
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
  const credited = creditTick(accumulatorOf(angler), run.scoreAt, result.event?.deltas.xpEarned ?? 0)
  if (credited.fold) await addBucket(ctx, SLOW_CAST_RUNTIME, angler._id as unknown as Id<'heroes'>, credited.fold)
  patch.scoreHourXp = credited.accumulator.scoreHourXp
  patch.scoreHour = credited.accumulator.scoreHour
  await ctx.db.patch(angler._id, patch)
  // Achievements: diff lifetime state; an angler behind the catalog version gets one full pass.
  if (result.event !== undefined || result.extraEvents !== undefined || needsFullPass(angler.achievementsVersion)) {
    const updated = (await ctx.db.get(angler._id))!
    await awardAngler(ctx, updated, stateOf(angler), stateOf(updated), content, now, run.tick)
  }
  if (run.publishes) await publishInputs(ctx, angler, owner, step, credited.accumulator)

  counts.landed += result.metrics.landed
  counts.released += result.metrics.released
  counts.gotAway += result.metrics.gotAway
  counts.levelUps += result.metrics.levelUps
}
