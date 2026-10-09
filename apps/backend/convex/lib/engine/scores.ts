import { levelGroup } from '@trmnl-games/engine/levels'
import { creditTick, projectAtPublication, type ScoreAccumulator, type ScoreBucket } from '@trmnl-games/engine/score'
import type { Doc, Id } from '../../_generated/dataModel'
import type { MutationCtx } from '../../_generated/server'
import { typedTables, type EngineRuntime } from './runtime'

export { creditTick }
export type { ScoreAccumulator, ScoreBucket }

/** The engine's view of a player character: the fields ranking reads (a hero, or an angler). */
export type RankSubject = Pick<Doc<'heroes'>, '_id' | 'level' | 'xp' | 'lastLevelUpTick' | 'createdAt' | 'activatedAt' | 'name' | 'scoreHourXp' | 'scoreHour'>

export function accumulatorOf(subject: Pick<RankSubject, 'scoreHourXp' | 'scoreHour'>): ScoreAccumulator {
  return { scoreHourXp: subject.scoreHourXp, ...(subject.scoreHour === undefined ? {} : { scoreHour: subject.scoreHour }) }
}

/** Fold a stale hour (a missed publication) into the subject's buckets. */
export async function addBucket(ctx: MutationCtx, runtime: EngineRuntime<unknown>, heroId: Id<'heroes'>, bucket: ScoreBucket): Promise<void> {
  const table = typedTables(runtime).scoreWindows
  const existing = await ctx.db.query(table).withIndex('by_heroId', (q) => q.eq('heroId', heroId)).unique()
  const buckets = existing?.buckets ?? []
  const merged = buckets.some((b) => b.hourStart === bucket.hourStart)
    ? buckets.map((b) => (b.hourStart === bucket.hourStart ? { hourStart: b.hourStart, xp: b.xp + bucket.xp } : b))
    : [...buckets, bucket].sort((a, b) => a.hourStart - b.hourStart)
  if (existing) await ctx.db.patch(existing._id, { buckets: merged })
  else await ctx.db.insert(table, { heroId, buckets: merged, xp24h: 0, xp7d: 0, scoreVersion: 1 })
}

/** Publication run: fold the accumulator, expire, and materialize both window totals (D31). */
export async function foldScore(ctx: MutationCtx, runtime: EngineRuntime<unknown>, heroId: Id<'heroes'>, run: Doc<'simulationRuns'>, accumulator: ScoreAccumulator): Promise<{ xp24h: number; xp7d: number }> {
  const tables = typedTables(runtime)
  const existing = await ctx.db.query(tables.scoreWindows).withIndex('by_heroId', (q) => q.eq('heroId', heroId)).unique()
  const projected = projectAtPublication(existing?.buckets ?? [], accumulator, run.scoreAt)
  const doc = { buckets: projected.buckets, xp24h: projected.xp24h, xp7d: projected.xp7d, lastFoldedRunId: run._id, scoreVersion: 1 }
  if (existing) await ctx.db.patch(existing._id, doc)
  else await ctx.db.insert(tables.scoreWindows, { heroId, ...doc })
  await ctx.db.patch(heroId, { scoreHourXp: 0, scoreHour: undefined })
  return { xp24h: projected.xp24h, xp7d: projected.xp7d }
}

/** Write one frozen projection for an eligible subject on a publication run. A dormant subject with no recent XP leaves the recent boards. */
export async function writeEngineRankInput(
  ctx: MutationCtx,
  runtime: EngineRuntime<unknown>,
  run: Doc<'simulationRuns'>,
  subject: RankSubject,
  owner: Doc<'users'>,
  scores: { xp24h: number; xp7d: number },
  dormant: boolean,
): Promise<void> {
  const table = typedTables(runtime).rankInputs
  const existing = await ctx.db.query(table).withIndex('by_runId_and_heroId', (q) => q.eq('runId', run._id).eq('heroId', subject._id)).unique()
  if (existing) return
  await ctx.db.insert(table, {
    runId: run._id,
    heroId: subject._id,
    userId: owner._id,
    heroKey: subject._id,
    cohortKey: levelGroup(subject.level).key,
    ranked24h: !(dormant && scores.xp24h === 0),
    ranked7d: !(dormant && scores.xp7d === 0),
    negativeScore24h: -scores.xp24h,
    negativeScore7d: -scores.xp7d,
    activatedAt: subject.activatedAt ?? subject.createdAt,
    negativeLevel: -subject.level,
    negativeXp: -subject.xp,
    lastLevelUpTick: subject.lastLevelUpTick,
    heroCreatedAt: subject.createdAt,
    heroName: subject.name,
    ownerAlias: owner.publicAlias,
    publicNameVersion: owner.publicNameVersion,
    level: subject.level,
    xp: subject.xp,
  })
}
