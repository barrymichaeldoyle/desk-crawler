import { currentHero } from './lib/gameProfile'
import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { internalMutation, query, type MutationCtx } from './_generated/server'
import { currentUser } from './lib/intent'
import { maskedEntries } from './lib/rankingRead'
import { readWorld } from './world'
import { levelGroup } from '@trmnl-games/desk-crawler/sim/core/stats'
import { DESK_CRAWLER_RUNTIME } from './lib/engine/deskCrawler'
import { beginEngineBuild, buildStep, cleanupStep, TOP_ENTRIES } from './lib/engine/publication'
import { writeEngineRankInput } from './lib/engine/scores'

/**
 * Desk Crawler's leaderboards (leaderboards.md, ranking.md, D31/D32). Building and
 * publishing the immutable hourly sets is shared engine code (lib/engine/publication.ts);
 * this module registers Desk Crawler's builder functions and its companion read.
 */

export { TOP_ENTRIES, type Board } from './lib/engine/publication'

/** Write one frozen projection for an eligible hero on a publication run. */
export async function writeRankInput(
  ctx: MutationCtx,
  run: Doc<'simulationRuns'>,
  hero: Doc<'heroes'>,
  owner: Doc<'users'>,
  scores: { xp24h: number; xp7d: number },
): Promise<void> {
  const dormant = hero.status === 'paused' || (hero.status === 'sleeping' && hero.wakeAtTick === undefined)
  await writeEngineRankInput(ctx, DESK_CRAWLER_RUNTIME, run, hero, owner, scores, dormant)
}

/** Called when a publication run's cohort is exhausted: start the guarded builder. */
export async function beginBuild(ctx: MutationCtx, run: Doc<'simulationRuns'>, world: Doc<'worldState'>, now: number): Promise<void> {
  await beginEngineBuild(ctx, DESK_CRAWLER_RUNTIME, run, world, now)
}

export const buildBatch = internalMutation({
  args: { publicationId: v.id('leaderboardPublications'), expectedSequence: v.number() },
  returns: v.null(),
  handler: async (ctx, { publicationId, expectedSequence }) => await buildStep(ctx, DESK_CRAWLER_RUNTIME, publicationId, expectedSequence),
})

/** Delete an obsolete publication's rows in bounded batches, then its rank inputs and the record itself. */
export const cleanupPublication = internalMutation({
  args: { publicationId: v.id('leaderboardPublications') },
  returns: v.null(),
  handler: async (ctx, { publicationId }) => await cleanupStep(ctx, DESK_CRAWLER_RUNTIME, publicationId),
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
      entries: generation ? await maskedEntries(ctx, generation.entries, TOP_ENTRIES, { profiles: true }) : [],
      own: own && own.cohortKey === cohortKey ? { rank: own.rank, rankDelta: own.rankDelta ?? null, score: own.score ?? null } : null,
    }
  },
})
