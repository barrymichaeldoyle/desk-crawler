import { currentHero } from '../../lib/gameProfile'
import { v } from 'convex/values'
import type { Doc } from '../../_generated/dataModel'
import { internalMutation, type MutationCtx } from '../../_generated/server'
import type { ContentCatalog } from '@trmnl-games/desk-crawler/sim/core/types'
import { SimulationInvariantError } from '@trmnl-games/desk-crawler/sim/core/invariants'
import { simulateHero } from '@trmnl-games/desk-crawler/sim/core/simulate'
import { deriveStreamSeeds } from '@trmnl-games/desk-crawler/sim/seed'
import { applyResult, storedDetail, toHeroState, toInventory } from './adapter'
import { joinRaidPool, nextIncomingRaid, pickRaidTarget, raidRival, settleRaids, type PendingRaid, type RaidPick } from '../../lib/raids'
import { planRaid, type RaidPlan } from '@trmnl-games/desk-crawler/sim/core/raid'
import { writeRankInput } from '../../leaderboard'
import { achievementState, awardAchievements, keepsakeTotal, tallyUnlocks } from '../../lib/achievements'
import { needsFullPass } from '@trmnl-games/desk-crawler/sim/core/achievements'
import { SLOT_MS, SLOT_OFFSET_MS, wallSlotFor } from '@trmnl-games/desk-crawler/sim/schedule'
import { queueAlerts } from '../../lib/alerts'
import { DESK_CRAWLER_RUNTIME } from '../../lib/engine/deskCrawler'
import { runBatch, startRun, watchdogStep, type SubjectStep } from '../../lib/engine/runner'
import { accumulatorOf, addBucket, creditTick, foldScore } from '../../lib/engine/scores'
import { shouldPublish as engineShouldPublish } from '@trmnl-games/engine/schedule'

export { SLOT_MS, SLOT_OFFSET_MS, wallSlotFor }
export { PAGE_SIZE, STALL_MS, MAX_RECOVERY_ATTEMPTS } from '../../lib/engine/runner'

/**
 * Desk Crawler's tick (simulation.md). The run frame (guards, pages, progress,
 * publication, watchdog) is shared engine code in lib/engine/runner.ts; this
 * module registers Desk Crawler's functions and its per-hero step.
 */

/** D31: publish on the last slot of each UTC hour, or once after >60 minutes without a publication. */
export function shouldPublish(scoreAt: number, lastPublishedAt: number | undefined): boolean {
  return engineShouldPublish(scoreAt, lastPublishedAt)
}

export const startTick = internalMutation({
  args: {},
  returns: v.union(v.null(), v.id('simulationRuns')),
  handler: async (ctx) => await startRun(ctx, DESK_CRAWLER_RUNTIME),
})

export const simulateBatch = internalMutation({
  args: { runId: v.id('simulationRuns'), expectedSequence: v.number() },
  returns: v.null(),
  handler: async (ctx, { runId, expectedSequence }) => await runBatch(ctx, DESK_CRAWLER_RUNTIME, runId, expectedSequence, simulateHeroStep),
})

/** One hero's share of a page: eligibility, dormant skip, quarantine, the pure core, then its writes and rank input. */
async function simulateHeroStep(ctx: MutationCtx, hero: Doc<'heroes'>, { run, world, content, now, tally }: SubjectStep<ContentCatalog>): Promise<void> {
  const counts = tally.counts as Record<'eligible' | 'skippedDormant' | 'quarantined' | 'deaths' | 'levelUps' | 'heldFinds', number>
  if (!hero.isActive || hero.activationState !== 'active' || hero.eligibleFromTick > run.tick || hero.lastTick >= run.tick) return
  const owner = await ctx.db.get(hero.userId)
  if (owner === null || (await currentHero(ctx, owner))?._id !== hero._id) return
  counts.eligible += 1

  const dormant = hero.status === 'paused' || (hero.status === 'sleeping' && hero.wakeAtTick === undefined)
  if (dormant && !run.publishes) {
    // D32: no state can change without an intent, so skip all reads/writes between publications.
    counts.skippedDormant += 1
    return
  }
  if (hero.simulationState === 'quarantined') {
    counts.quarantined += 1
    await ctx.db.patch(hero._id, { lastTick: run.tick })
    if (run.publishes) {
      const scores = await foldScore(ctx, DESK_CRAWLER_RUNTIME, hero._id, run, accumulatorOf(hero))
      await writeRankInput(ctx, run, (await ctx.db.get(hero._id))!, owner, scores)
      await tallyUnlocks(ctx, owner._id, tally.unlocks)
      tally.population += 1
    }
    return
  }

  const items = await ctx.db
    .query('items')
    .withIndex('by_heroId', (q) => q.eq('heroId', hero._id))
    .take(40)
  // D110: under a catalog with raids, the oldest raid waiting to land, and a target when the launch draw hits.
  const streams = deriveStreamSeeds(world.worldSeed, hero._id, run.tick, run.simulationVersion)
  let plan: RaidPlan | undefined
  let pick: RaidPick | undefined
  let pending: PendingRaid | undefined
  if (content.raids !== undefined) {
    plan = planRaid(streams, hero.stance, content)
    if (plan !== undefined) pick = await pickRaidTarget(ctx, hero, plan, run.tick, content)
    pending = await nextIncomingRaid(ctx, hero._id)
  }
  let result
  const recentLogs = (await ctx.db.query('tickLogs').withIndex('by_heroId_and_at_and_sequence', (q) => q.eq('heroId', hero._id)).order('desc').take(4))
    // Achievements and P31 to-do lines are not stories, so they never steer the next variant.
    .filter((log) => log.kind !== 'achievement' && log.kind !== 'todo')
    .slice(0, 2)
  try {
    result = simulateHero({
      hero: toHeroState(hero),
      inventory: toInventory(items),
      tick: run.tick,
      content,
      simulationVersion: run.simulationVersion,
      streams,
      recentSummaries: recentLogs.map((log) => log.summary),
      ...(pick === undefined ? {} : { raidTarget: pick.target }),
      ...(pending === undefined ? {} : { incomingRaid: pending.incoming }),
      // P31: the stand-up turns on the run's wall slot, never the clock, in the owner's last TRMNL offset.
      tickAt: run.wallSlot,
      ...(owner.trmnlUtcOffset === undefined ? {} : { utcOffsetSeconds: owner.trmnlUtcOffset }),
    })
  } catch (error) {
    // Only recognized pure-core failures are isolated; anything else rolls back the page.
    if (!(error instanceof SimulationInvariantError)) throw error
    counts.quarantined += 1
    await ctx.db.patch(hero._id, { simulationState: 'quarantined', quarantineReasonCode: error.code, lastTick: run.tick })
    if (run.publishes) {
      const scores = await foldScore(ctx, DESK_CRAWLER_RUNTIME, hero._id, run, accumulatorOf(hero))
      await writeRankInput(ctx, run, (await ctx.db.get(hero._id))!, owner, scores)
      await tallyUnlocks(ctx, owner._id, tally.unlocks)
      tally.population += 1
    }
    await ctx.db.insert('simulationFailures', {
      runId: run._id,
      heroId: hero._id,
      reasonCode: error.code,
      simulationVersion: run.simulationVersion,
      contentVersion: run.contentVersion,
      tick: run.tick,
      message: error.message.slice(0, 500),
      createdAt: now,
    })
    return
  }

  await applyResult(ctx, hero, items, result, now)
  if (content.raids !== undefined) await settleRaids(ctx, { hero, owner, result, plan, pick, pending, tick: run.tick })
  // P33: an outbox row for a nap or an affordable bag or pouch, only when the owner turned that alert on.
  if (owner.alerts !== undefined) await queueAlerts(ctx, { owner, hero, result, tick: run.tick, now })
  const progressed = !['waiting_dead', 'waiting_travel', 'paused', 'sleeping'].includes(result.disposition)
  const markers: Partial<Doc<'heroes'>> = { lastTick: run.tick, ...(content.raids === undefined ? {} : await joinRaidPool(ctx, hero)) }
  if (progressed) {
    markers.lastProgressTick = run.tick
    markers.lastAdvancedAt = now
  }
  let sequence = hero.logSequence
  if (result.event) {
    sequence += 1
    await ctx.db.insert('tickLogs', {
      heroId: hero._id,
      source: 'tick',
      tick: run.tick,
      runId: run._id,
      sequence,
      at: now,
      kind: result.event.kind,
      summary: result.event.summary,
      detail: storedDetail(result.event.detail, result.itemChanges, raidRival(result, pick, pending)),
      deltas: result.event.deltas,
    })
  }
  // P31: tasks ticked off, then the stand-up, logged after the tick's story.
  for (const extra of result.extraEvents ?? []) {
    sequence += 1
    await ctx.db.insert('tickLogs', { heroId: hero._id, source: 'tick', tick: run.tick, runId: run._id, sequence, at: now, kind: extra.kind, summary: extra.summary, detail: storedDetail(extra.detail), deltas: extra.deltas })
  }
  if (sequence !== hero.logSequence) markers.logSequence = sequence
  // Credit this tick's granted XP to the current-hour accumulator (D31).
  const credited = creditTick(accumulatorOf(hero), run.scoreAt, result.event?.deltas.xpEarned ?? 0)
  if (credited.fold) await addBucket(ctx, DESK_CRAWLER_RUNTIME, hero._id, credited.fold)
  markers.scoreHourXp = credited.accumulator.scoreHourXp
  markers.scoreHour = credited.accumulator.scoreHour
  await ctx.db.patch(hero._id, markers)
  // D65: diff lifetime state for new achievements; a hero behind the catalog gets one full pass.
  if (result.event !== undefined || result.extraEvents !== undefined || needsFullPass(hero.achievementsVersion)) {
    const keepsakes = needsFullPass(hero.achievementsVersion) ? await keepsakeTotal(ctx, owner._id) : 0
    const updated = (await ctx.db.get(hero._id))!
    await awardAchievements(ctx, updated, achievementState(hero, keepsakes), achievementState(updated, keepsakes), content, now, run.tick)
  }
  if (run.publishes) {
    const scores = await foldScore(ctx, DESK_CRAWLER_RUNTIME, hero._id, run, credited.accumulator)
    await writeRankInput(ctx, run, (await ctx.db.get(hero._id))!, owner, scores)
    await tallyUnlocks(ctx, owner._id, tally.unlocks)
    tally.population += 1
  }

  counts.deaths += result.metrics.deaths
  counts.levelUps += result.metrics.levelUps
  counts.heldFinds += result.metrics.heldFinds
}

/**
 * Every 5 minutes (simulation.md "Watchdog"): resume a stalled run only when its
 * scheduled continuation failed, was cancelled or vanished; never duplicate a
 * pending/running job; block after three automated attempts.
 */
export const watchdog = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => await watchdogStep(ctx, DESK_CRAWLER_RUNTIME),
})
