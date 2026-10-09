import { v } from 'convex/values'
import { levelGroup } from '@trmnl-games/engine/levels'
import type { Doc, Id } from '../_generated/dataModel'
import { internalMutation, query, type QueryCtx } from '../_generated/server'
import { buildStep, cleanupStep, TOP_ENTRIES } from '../lib/engine/publication'
import { readEngineWorld } from '../lib/engine/world'
import { currentUser } from '../lib/intent'
import { labelFor, maskedEntries } from '../lib/rankingRead'
import { boardLiteral } from '../lib/engine/tables'
import { currentAngler } from './profile'
import { SLOW_CAST_RUNTIME } from './runtime'

/** Rows on the device's board. */
export const DEVICE_TOP = 5

/** Slow Cast's hourly leaderboard sets, built and published by the shared engine (lib/engine/publication.ts). */
export const buildBatch = internalMutation({
  args: { publicationId: v.id('swLeaderboardPublications'), expectedSequence: v.number() },
  returns: v.null(),
  handler: async (ctx, { publicationId, expectedSequence }) => await buildStep(ctx, SLOW_CAST_RUNTIME, publicationId as unknown as Id<'leaderboardPublications'>, expectedSequence),
})

export const cleanupPublication = internalMutation({
  args: { publicationId: v.id('swLeaderboardPublications') },
  returns: v.null(),
  handler: async (ctx, { publicationId }) => await cleanupStep(ctx, SLOW_CAST_RUNTIME, publicationId as unknown as Id<'leaderboardPublications'>),
})

/** The published Slow Cast set, or null before the first publication. */
async function publishedSet(ctx: QueryCtx): Promise<Doc<'swLeaderboardPublications'> | null> {
  const world = await readEngineWorld(ctx, SLOW_CAST_RUNTIME)
  const id = world?.publishedPublicationId as unknown as Id<'swLeaderboardPublications'> | undefined
  const publication = id ? await ctx.db.get(id) : null
  return publication && publication.state === 'published' ? publication : null
}

async function ownRank(ctx: QueryCtx, publication: Doc<'swLeaderboardPublications'>, board: 'overall' | 'recent_24h' | 'recent_7d', anglerId: Id<'anglers'>) {
  return await ctx.db.query('swRanks').withIndex('by_publicationId_and_board_and_heroId', (q) => q.eq('publicationId', publication._id).eq('board', board).eq('heroId', anglerId)).unique()
}

async function generationFor(ctx: QueryCtx, publication: Doc<'swLeaderboardPublications'>, board: 'overall' | 'recent_24h' | 'recent_7d', cohortKey: string) {
  return await ctx.db.query('swLeaderboardGenerations').withIndex('by_publicationId_and_board_and_cohortKey', (q) => q.eq('publicationId', publication._id).eq('board', board).eq('cohortKey', cohortKey)).unique()
}

const masked = (ctx: QueryCtx, entries: Doc<'swLeaderboardGenerations'>['entries'], limit: number, profiles = false) =>
  maskedEntries(ctx, entries as unknown as Doc<'leaderboardGenerations'>['entries'], limit, { profiles, current: currentAngler })

/** Companion board: Top 100 of one board and level group, plus the viewer's own rank in that group (leaderboards.md "Read contracts"). */
export const view = query({
  args: { board: v.optional(boardLiteral), cohortKey: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const board = args.board ?? 'recent_7d'
    const publication = await publishedSet(ctx)
    if (publication === null) return { board, published: false as const }
    const angler = await currentAngler(ctx, await currentUser(ctx))
    const own = angler ? await ownRank(ctx, publication, board, angler._id) : null
    const cohortKey = board === 'overall' ? 'all' : (args.cohortKey ?? own?.cohortKey ?? (angler ? levelGroup(angler.level).key : '1-3'))
    const generation = await generationFor(ctx, publication, board, cohortKey)
    return {
      board,
      published: true as const,
      cohortKey,
      cohortLabel: labelFor(cohortKey).replace('All heroes', 'All anglers'),
      ownCohortKey: own?.cohortKey ?? null,
      scoreAt: publication.scoreAt,
      globalTotalPlayers: publication.globalTotalPlayers,
      totalPlayers: generation?.totalPlayers ?? 0,
      entries: generation ? await masked(ctx, generation.entries, TOP_ENTRIES, true) : [],
      own: own && own.cohortKey === cohortKey ? { rank: own.rank, rankDelta: own.rankDelta ?? null, score: own.score ?? null } : null,
    }
  },
})

/** Device board (D20/D31/D32 as Desk Crawler): the angler's seven-day group, its first rows and the angler's own rank. */
export async function readDeviceBoard(ctx: QueryCtx, angler: Doc<'anglers'>): Promise<{ rank: number | null; cohortLabel: string; totalPlayers: number; top: Array<{ rank: number; name: string; level: number; score: number; own: boolean }> } | null> {
  const publication = await publishedSet(ctx)
  if (publication === null) return null
  const own = await ownRank(ctx, publication, 'recent_7d', angler._id)
  const cohortKey = own?.cohortKey ?? levelGroup(angler.level).key
  const generation = own ? await ctx.db.get(own.generationId) : await generationFor(ctx, publication, 'recent_7d', cohortKey)
  const rows = generation ? await masked(ctx, generation.entries, DEVICE_TOP) : []
  return {
    rank: own?.rank ?? null,
    cohortLabel: labelFor(cohortKey).replace('All heroes', 'All anglers'),
    totalPlayers: generation?.totalPlayers ?? 0,
    top: rows.map((row) => ({ rank: row.rank, name: row.name, level: row.level, score: row.score, own: own !== null && row.rank === own.rank })),
  }
}
