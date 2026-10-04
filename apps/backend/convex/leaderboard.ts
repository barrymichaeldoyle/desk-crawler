import { currentHero, gameProfile } from './lib/gameProfile'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import { internalMutation, query, type MutationCtx } from './_generated/server'
import { currentUser } from './lib/intent'
import { maskedEntries } from './lib/rankingRead'
import { readWorld } from './world'
import { levelGroup } from '@trmnl-games/desk-crawler/sim/core/stats'
import { recoverIncidents } from './incidents'

/**
 * Immutable hourly leaderboard publications (leaderboards.md, ranking.md, D31/D32).
 * Frozen rank inputs are written by publication runs; the builder pages through
 * three boards with a sequence guard, then one mutation publishes the whole set.
 * Readers only ever see `published` sets.
 */

export type Board = 'overall' | 'recent_24h' | 'recent_7d'
const BOARDS: readonly Board[] = ['overall', 'recent_24h', 'recent_7d']
const PAGE_SIZE = 100
export const TOP_ENTRIES = 100

/** Write one frozen projection for an eligible hero on a publication run. */
export async function writeRankInput(
  ctx: MutationCtx,
  run: Doc<'simulationRuns'>,
  hero: Doc<'heroes'>,
  owner: Doc<'users'>,
  scores: { xp24h: number; xp7d: number },
): Promise<void> {
  const existing = await ctx.db
    .query('rankInputs')
    .withIndex('by_runId_and_heroId', (q) => q.eq('runId', run._id).eq('heroId', hero._id))
    .unique()
  if (existing) return
  const dormant = hero.status === 'paused' || (hero.status === 'sleeping' && hero.wakeAtTick === undefined)
  await ctx.db.insert('rankInputs', {
    runId: run._id,
    heroId: hero._id,
    userId: owner._id,
    heroKey: hero._id,
    cohortKey: levelGroup(hero.level).key,
    ranked24h: !(dormant && scores.xp24h === 0),
    ranked7d: !(dormant && scores.xp7d === 0),
    negativeScore24h: -scores.xp24h,
    negativeScore7d: -scores.xp7d,
    activatedAt: hero.activatedAt ?? hero.createdAt,
    negativeLevel: -hero.level,
    negativeXp: -hero.xp,
    lastLevelUpTick: hero.lastLevelUpTick,
    heroCreatedAt: hero.createdAt,
    heroName: hero.name,
    ownerAlias: owner.publicAlias,
    publicNameVersion: owner.publicNameVersion,
    level: hero.level,
    xp: hero.xp,
  })
}

/** Called when a publication run's cohort is exhausted: start the guarded builder. */
export async function beginBuild(ctx: MutationCtx, run: Doc<'simulationRuns'>, world: Doc<'worldState'>, now: number): Promise<void> {
  const publicationId = await ctx.db.insert('leaderboardPublications', {
    runId: run._id,
    state: 'building',
    ...(world.publishedPublicationId === undefined ? {} : { previousPublicationId: world.publishedPublicationId }),
    scoreAt: run.scoreAt,
    asOfTick: run.tick,
    globalTotalPlayers: 0,
    currentBoard: 'overall',
    batchSequence: 0,
    lastProgressAt: now,
  })
  const scheduled = await ctx.scheduler.runAfter(0, internal.leaderboard.buildBatch, { publicationId, expectedSequence: 0 })
  await ctx.db.patch(publicationId, { nextScheduledFunctionId: scheduled })
  await ctx.db.patch(run._id, { state: 'ranking', lastProgressAt: now, nextScheduledFunctionId: undefined })
}

function pageQuery(ctx: MutationCtx, runId: Id<'simulationRuns'>, board: Board) {
  if (board === 'overall') return ctx.db.query('rankInputs').withIndex('by_run_order', (q) => q.eq('runId', runId))
  if (board === 'recent_24h') return ctx.db.query('rankInputs').withIndex('by_run_recent24', (q) => q.eq('runId', runId).eq('ranked24h', true))
  return ctx.db.query('rankInputs').withIndex('by_run_recent7', (q) => q.eq('runId', runId).eq('ranked7d', true))
}

export const buildBatch = internalMutation({
  args: { publicationId: v.id('leaderboardPublications'), expectedSequence: v.number() },
  returns: v.null(),
  handler: async (ctx, { publicationId, expectedSequence }) => {
    const publication = await ctx.db.get(publicationId)
    if (publication === null || publication.state !== 'building' || publication.batchSequence !== expectedSequence) return null
    const run = await ctx.db.get(publication.runId)
    if (run === null || run.state !== 'ranking') return null
    const now = Date.now()
    const board = publication.currentBoard
    const page = await pageQuery(ctx, run._id, board).paginate({ numItems: PAGE_SIZE, cursor: publication.cursor ?? null })

    let generation = publication.currentGenerationId ? await ctx.db.get(publication.currentGenerationId) : null
    let pendingEntries: Doc<'leaderboardGenerations'>['entries'] = []
    let globalRanked = publication.globalTotalPlayers
    const flush = async () => {
      if (generation && pendingEntries.length > 0) {
        await ctx.db.patch(generation._id, { entries: [...generation.entries, ...pendingEntries] })
        generation = (await ctx.db.get(generation._id))!
      }
      pendingEntries = []
    }

    for (const input of page.page) {
      const cohortKey = board === 'overall' ? 'all' : input.cohortKey
      if (generation === null || generation.cohortKey !== cohortKey) {
        await flush()
        if (generation) await ctx.db.patch(generation._id, { state: 'ready', totalPlayers: generation.nextRank - 1 })
        const id = await ctx.db.insert('leaderboardGenerations', { publicationId, board, cohortKey, totalPlayers: 0, nextRank: 1, entries: [], scoreAt: publication.scoreAt, state: 'building' })
        generation = (await ctx.db.get(id))!
      }
      const rank = generation.nextRank
      const score = board === 'overall' ? undefined : board === 'recent_24h' ? -input.negativeScore24h : -input.negativeScore7d
      let rankDelta: number | undefined
      if (publication.previousPublicationId) {
        const previous = await ctx.db
          .query('heroRanks')
          .withIndex('by_publicationId_and_board_and_heroId', (q) => q.eq('publicationId', publication.previousPublicationId!).eq('board', board).eq('heroId', input.heroId))
          .unique()
        if (previous && previous.cohortKey === cohortKey) rankDelta = previous.rank - rank
      }
      await ctx.db.insert('heroRanks', {
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
      await ctx.db.patch(generation._id, { nextRank: rank + 1 })
      generation = { ...generation, nextRank: rank + 1 }
      if (board === 'recent_7d') globalRanked += 1
    }
    await flush()

    const sequence = publication.batchSequence + 1
    if (!page.isDone) {
      const scheduled = await ctx.scheduler.runAfter(0, internal.leaderboard.buildBatch, { publicationId, expectedSequence: sequence })
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
      const scheduled = await ctx.scheduler.runAfter(0, internal.leaderboard.buildBatch, { publicationId, expectedSequence: sequence })
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
    await publish(ctx, publication, run, globalRanked, now)
    return null
  },
})

/** Atomically promote the complete set, finish the run and release the active guard. */
async function publish(ctx: MutationCtx, publication: Doc<'leaderboardPublications'>, run: Doc<'simulationRuns'>, globalRanked: number, now: number): Promise<void> {
  const world = await ctx.db
    .query('worldState')
    .withIndex('by_key', (q) => q.eq('key', 'world'))
    .unique()
  if (world === null) throw new Error('world missing during publication')
  await ctx.db.patch(publication._id, { state: 'published', globalTotalPlayers: globalRanked, builtAt: now, publishedAt: now, batchSequence: publication.batchSequence + 1, nextScheduledFunctionId: undefined, cursor: undefined })
  await ctx.db.patch(run._id, { state: 'completed', finishedAt: now })
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
    .query('leaderboardPublications')
    .withIndex('by_state', (q) => q.eq('state', 'published'))
    .take(10)
  for (const old of obsolete) {
    if (old._id !== publication._id && old._id !== publication.previousPublicationId) {
      await ctx.db.patch(old._id, { state: 'obsolete' })
      await ctx.scheduler.runAfter(0, internal.leaderboard.cleanupPublication, { publicationId: old._id })
    }
  }
}

/** Delete an obsolete publication's rows in bounded batches, then its rank inputs and the record itself. */
export const cleanupPublication = internalMutation({
  args: { publicationId: v.id('leaderboardPublications') },
  returns: v.null(),
  handler: async (ctx, { publicationId }) => {
    const publication = await ctx.db.get(publicationId)
    if (publication === null || publication.state !== 'obsolete') return null
    const ranks = await ctx.db
      .query('heroRanks')
      .withIndex('by_publicationId', (q) => q.eq('publicationId', publicationId))
      .take(200)
    for (const row of ranks) await ctx.db.delete(row._id)
    if (ranks.length === 200) {
      await ctx.scheduler.runAfter(0, internal.leaderboard.cleanupPublication, { publicationId })
      return null
    }
    const generations = await ctx.db
      .query('leaderboardGenerations')
      .withIndex('by_publicationId', (q) => q.eq('publicationId', publicationId))
      .take(50)
    for (const row of generations) await ctx.db.delete(row._id)
    const inputs = await ctx.db
      .query('rankInputs')
      .withIndex('by_runId_and_heroId', (q) => q.eq('runId', publication.runId))
      .take(200)
    for (const row of inputs) await ctx.db.delete(row._id)
    if (generations.length === 50 || inputs.length === 200) {
      await ctx.scheduler.runAfter(0, internal.leaderboard.cleanupPublication, { publicationId })
      return null
    }
    await ctx.db.delete(publicationId)
    return null
  },
})

const boardValidator = v.union(v.literal('overall'), v.literal('recent_24h'), v.literal('recent_7d'))

/**
 * Companion leaderboard (leaderboards.md "Read contracts"): Top 100 of one
 * board/group from the published set, plus the viewer's own rank only when it
 * belongs to that group. Defaults to the viewer's captured seven-day group.
 */
export const view = query({
  args: { board: v.optional(boardValidator), cohortKey: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const board = args.board ?? 'recent_7d'
    const world = await readWorld(ctx)
    const publication = world?.publishedPublicationId ? await ctx.db.get(world.publishedPublicationId) : null
    if (publication === null || publication.state !== 'published') return { board, published: false as const }
    const user = await currentUser(ctx)
    const hero = await currentHero(ctx, user)
    const own = hero
      ? await ctx.db
          .query('heroRanks')
          .withIndex('by_publicationId_and_board_and_heroId', (q) => q.eq('publicationId', publication._id).eq('board', board).eq('heroId', hero._id))
          .unique()
      : null
    const cohortKey = board === 'overall' ? 'all' : (args.cohortKey ?? own?.cohortKey ?? (hero ? levelGroup(hero.level).key : '1-3'))
    const generation = await ctx.db
      .query('leaderboardGenerations')
      .withIndex('by_publicationId_and_board_and_cohortKey', (q) => q.eq('publicationId', publication._id).eq('board', board).eq('cohortKey', cohortKey))
      .unique()
    return {
      board,
      published: true as const,
      cohortKey,
      ownCohortKey: own?.cohortKey ?? null,
      scoreAt: publication.scoreAt,
      asOfTick: publication.asOfTick,
      globalTotalPlayers: publication.globalTotalPlayers,
      totalPlayers: generation?.totalPlayers ?? 0,
      entries: generation ? await maskedEntries(ctx, generation.entries, TOP_ENTRIES) : [],
      own: own && own.cohortKey === cohortKey ? { rank: own.rank, rankDelta: own.rankDelta ?? null, score: own.score ?? null } : null,
    }
  },
})
