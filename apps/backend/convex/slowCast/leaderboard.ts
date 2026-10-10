import { v } from 'convex/values'
import type { Doc, Id } from '../_generated/dataModel'
import { internalMutation, query, type QueryCtx } from '../_generated/server'
import { buildStep, cleanupStep } from '../lib/engine/publication'
import { currentUser } from '../lib/intent'
import { currentAngler } from './profile'
import { SLOW_CAST_RUNTIME } from './runtime'
import { BOARD_DEPTH, periodKey, readBoard, weekEndsAt, weekKey, type BoardRow } from './records'
import { waterId } from './validators'

/** Rows on the device's board. */
export const DEVICE_TOP = 5

/**
 * The shared engine's hourly publication, kept for achievement rarity (D65). Slow Cast writes no rank inputs, so its
 * XP boards stay empty; the boards players see are the catch records (records.ts).
 */
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

/** Companion board: one water's heaviest fish this week or of all time, and the viewer's own row and rank. */
export const view = query({
  args: { waterId: v.optional(waterId), period: v.optional(v.union(v.literal('week'), v.literal('all'))) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const angler = await currentAngler(ctx, await currentUser(ctx))
    const water = args.waterId ?? angler?.waterId ?? 'millpond'
    const period = args.period ?? 'week'
    const now = Date.now()
    const board = await readBoard(ctx, water, periodKey(period, now), angler?._id ?? null, BOARD_DEPTH)
    return { waterId: water, period, weekEndsAt: weekEndsAt(now), ...board }
  },
})

/** Device board: this week's heaviest fish at the angler's water, its first rows and the angler's own rank. */
export async function readDeviceBoard(ctx: QueryCtx, angler: Doc<'anglers'>, now: number): Promise<{ rank: number | null; ownGrams: number | null; top: Array<Pick<BoardRow, 'rank' | 'name' | 'grams' | 'own'>> }> {
  const board = await readBoard(ctx, angler.waterId, weekKey(now), angler._id, DEVICE_TOP)
  return { rank: board.own?.rank ?? null, ownGrams: board.own?.grams ?? null, top: board.entries.map(({ rank, name, grams, own }) => ({ rank, name, grams, own })) }
}
