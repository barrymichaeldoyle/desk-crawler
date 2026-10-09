import { paginator } from 'convex-helpers/server/pagination'
import schema from '../../schema'
import type { Doc, Id } from '../../_generated/dataModel'
import type { MutationCtx } from '../../_generated/server'
import { recoverIncidents } from '../../incidents'
import { typedTables, type EngineRuntime } from './runtime'

/**
 * Immutable hourly leaderboard publications, shared by every game
 * (leaderboards.md, ranking.md, D31/D32). Frozen rank inputs are written by
 * publication runs; the builder pages through three boards with a sequence
 * guard, then one mutation publishes the whole set. Readers only ever see
 * `published` sets.
 */

export type Board = 'overall' | 'recent_24h' | 'recent_7d'
export const BOARDS: readonly Board[] = ['overall', 'recent_24h', 'recent_7d']
const PAGE_SIZE = 100
export const TOP_ENTRIES = 100

/** Called when a publication run's cohort is exhausted: start the guarded builder. */
export async function beginEngineBuild(ctx: MutationCtx, runtime: EngineRuntime<unknown>, run: Doc<'simulationRuns'>, world: Doc<'worldState'>, now: number): Promise<void> {
  const publicationId = await ctx.db.insert(typedTables(runtime).publications, {
    runId: run._id,
    state: 'building',
    ...(world.publishedPublicationId === undefined ? {} : { previousPublicationId: world.publishedPublicationId }),
    scoreAt: run.scoreAt,
    asOfTick: run.tick,
    globalTotalPlayers: 0,
    currentBoard: 'overall',
    batchSequence: 0,
    paginationVersion: 1,
    lastProgressAt: now,
  })
  const scheduled = await ctx.scheduler.runAfter(0, runtime.refs.buildBatch, { publicationId, expectedSequence: 0 })
  await ctx.db.patch(publicationId, { nextScheduledFunctionId: scheduled })
  await ctx.db.patch(run._id, { state: 'ranking', lastProgressAt: now, nextScheduledFunctionId: undefined })
}

function pageQuery(ctx: MutationCtx, runtime: EngineRuntime<unknown>, publication: Doc<'leaderboardPublications'>, board: Board) {
  const db = paginator(ctx.db, schema)
  const table = typedTables(runtime).rankInputs
  if (board === 'overall') return db.query(table).withIndex('by_run_order', (q) => q.eq('runId', publication.runId))
  if (board === 'recent_24h') return db.query(table).withIndex('by_run_recent24', (q) => q.eq('runId', publication.runId).eq('ranked24h', true))
  return db.query(table).withIndex('by_run_recent7', (q) => q.eq('runId', publication.runId).eq('ranked7d', true))
}

export async function buildStep(ctx: MutationCtx, runtime: EngineRuntime<unknown>, publicationId: Id<'leaderboardPublications'>, expectedSequence: number): Promise<null> {
  const tables = typedTables(runtime)
  const publication = await ctx.db.get(publicationId)
  if (publication === null || publication.state !== 'building' || publication.batchSequence !== expectedSequence) return null
  const run = await ctx.db.get(publication.runId)
  if (run === null || run.state !== 'ranking') return null
  const now = Date.now()
  const board = publication.currentBoard
  const page = await pageQuery(ctx, runtime, publication, board).paginate({ numItems: PAGE_SIZE, cursor: publication.cursor ?? null })

  let generation = publication.currentGenerationId ? await ctx.db.get(publication.currentGenerationId) : null
  let pendingEntries: Doc<'leaderboardGenerations'>['entries'] = []
  let globalRanked = publication.globalTotalPlayers
  const flush = async () => {
    if (generation) {
      const entries = [...generation.entries, ...pendingEntries]
      // Persist a cohort once per page, rather than rereading its Top 100
      // document for every subject's rank increment.
      await ctx.db.patch(generation._id, { nextRank: generation.nextRank, entries })
      generation = { ...generation, entries }
    }
    pendingEntries = []
  }

  for (const input of page.page) {
    const cohortKey = board === 'overall' ? 'all' : input.cohortKey
    if (generation === null || generation.cohortKey !== cohortKey) {
      await flush()
      if (generation) await ctx.db.patch(generation._id, { state: 'ready', totalPlayers: generation.nextRank - 1 })
      const id = await ctx.db.insert(tables.generations, { publicationId, board, cohortKey, totalPlayers: 0, nextRank: 1, entries: [], scoreAt: publication.scoreAt, state: 'building' })
      generation = (await ctx.db.get(id))!
    }
    const rank = generation.nextRank
    const score = board === 'overall' ? undefined : board === 'recent_24h' ? -input.negativeScore24h : -input.negativeScore7d
    let rankDelta: number | undefined
    if (publication.previousPublicationId) {
      const previous = await ctx.db
        .query(tables.ranks)
        .withIndex('by_publicationId_and_board_and_heroId', (q) => q.eq('publicationId', publication.previousPublicationId!).eq('board', board).eq('heroId', input.heroId))
        .unique()
      if (previous && previous.cohortKey === cohortKey) rankDelta = previous.rank - rank
    }
    await ctx.db.insert(tables.ranks, {
      publicationId,
      generationId: generation._id,
      board,
      cohortKey,
      heroId: input.heroId,
      rank,
      ...(rankDelta === undefined ? {} : { rankDelta }),
      ...(score === undefined ? {} : { score }),
      level: input.level,
    })
    if (rank <= TOP_ENTRIES) {
      pendingEntries.push({
        rank,
        heroId: input.heroId,
        userId: input.userId,
        ownerAlias: input.ownerAlias,
        heroName: input.heroName,
        publicNameVersion: input.publicNameVersion,
        level: input.level,
        xp: input.xp,
        ...(score === undefined ? {} : { score }),
      })
    }
    generation = { ...generation, nextRank: rank + 1 }
    if (board === 'recent_7d') globalRanked += 1
  }
  await flush()

  const sequence = publication.batchSequence + 1
  if (!page.isDone) {
    const scheduled = await ctx.scheduler.runAfter(0, runtime.refs.buildBatch, { publicationId, expectedSequence: sequence })
    await ctx.db.patch(publicationId, {
      cursor: page.continueCursor,
      batchSequence: sequence,
      globalTotalPlayers: globalRanked,
      lastProgressAt: now,
      nextScheduledFunctionId: scheduled,
      ...(generation ? { currentGenerationId: generation._id } : {}),
    })
    return null
  }
  // Board finished: seal its last generation.
  if (generation) await ctx.db.patch(generation._id, { state: 'ready', totalPlayers: generation.nextRank - 1 })
  const nextBoard = BOARDS[BOARDS.indexOf(board) + 1]
  if (nextBoard !== undefined) {
    const scheduled = await ctx.scheduler.runAfter(0, runtime.refs.buildBatch, { publicationId, expectedSequence: sequence })
    await ctx.db.patch(publicationId, {
      currentBoard: nextBoard,
      cursor: undefined,
      currentGenerationId: undefined,
      batchSequence: sequence,
      globalTotalPlayers: globalRanked,
      lastProgressAt: now,
      nextScheduledFunctionId: scheduled,
    })
    return null
  }
  await publish(ctx, runtime, publication, run, globalRanked, now)
  return null
}

/** Atomically promote the complete set, finish the run and release the active guard. */
async function publish(ctx: MutationCtx, runtime: EngineRuntime<unknown>, publication: Doc<'leaderboardPublications'>, run: Doc<'simulationRuns'>, globalRanked: number, now: number): Promise<void> {
  const tables = typedTables(runtime)
  const world = await ctx.db
    .query(tables.world)
    .withIndex('by_key', (q) => q.eq('key', 'world'))
    .unique()
  if (world === null) throw new Error('world missing during publication')
  await ctx.db.patch(publication._id, { state: 'published', globalTotalPlayers: globalRanked, builtAt: now, publishedAt: now, batchSequence: publication.batchSequence + 1, nextScheduledFunctionId: undefined, cursor: undefined })
  await ctx.db.patch(run._id, { state: 'completed', finishedAt: now })
  // D65: rarity is published from the same generation as the boards, from the run's batch tally.
  await ctx.db.insert(tables.achievementStats, { publicationId: publication._id, runId: run._id, counts: run.achievementCounts ?? {}, totalPlayers: run.achievementPopulation ?? 0, scoreAt: run.scoreAt })
  await recoverIncidents(ctx, run._id, now)
  await ctx.db.patch(world._id, {
    activeRunId: undefined,
    publishedPublicationId: publication._id,
    lastPublishedAt: run.scoreAt,
    lastCompletedTick: run.tick,
    lastCompletedAt: now,
  })
  // Keep current + previous; everything older becomes obsolete and is cleaned in bounded batches.
  const obsolete = await ctx.db
    .query(tables.publications)
    .withIndex('by_state', (q) => q.eq('state', 'published'))
    .take(10)
  for (const old of obsolete) {
    if (old._id !== publication._id && old._id !== publication.previousPublicationId) {
      await ctx.db.patch(old._id, { state: 'obsolete' })
      await ctx.scheduler.runAfter(0, runtime.refs.cleanupPublication, { publicationId: old._id })
    }
  }
}

/** Delete an obsolete publication's rows in bounded batches, then its rank inputs and the record itself. */
export async function cleanupStep(ctx: MutationCtx, runtime: EngineRuntime<unknown>, publicationId: Id<'leaderboardPublications'>): Promise<null> {
  const tables = typedTables(runtime)
  const publication = await ctx.db.get(publicationId)
  if (publication === null || publication.state !== 'obsolete') return null
  const ranks = await ctx.db
    .query(tables.ranks)
    .withIndex('by_publicationId', (q) => q.eq('publicationId', publicationId))
    .take(200)
  for (const row of ranks) await ctx.db.delete(row._id)
  if (ranks.length === 200) {
    await ctx.scheduler.runAfter(0, runtime.refs.cleanupPublication, { publicationId })
    return null
  }
  const generations = await ctx.db
    .query(tables.generations)
    .withIndex('by_publicationId', (q) => q.eq('publicationId', publicationId))
    .take(50)
  for (const row of generations) await ctx.db.delete(row._id)
  const stats = await ctx.db.query(tables.achievementStats).withIndex('by_publicationId', (q) => q.eq('publicationId', publicationId)).take(5)
  for (const row of stats) await ctx.db.delete(row._id)
  const inputs = await ctx.db
    .query(tables.rankInputs)
    .withIndex('by_runId_and_heroId', (q) => q.eq('runId', publication.runId))
    .take(200)
  for (const row of inputs) await ctx.db.delete(row._id)
  if (generations.length === 50 || inputs.length === 200) {
    await ctx.scheduler.runAfter(0, runtime.refs.cleanupPublication, { publicationId })
    return null
  }
  await ctx.db.delete(publicationId)
  return null
}
