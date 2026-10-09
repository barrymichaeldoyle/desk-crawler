import { v } from 'convex/values'
import type { Id } from '../_generated/dataModel'
import { internalMutation } from '../_generated/server'
import { buildStep, cleanupStep } from '../lib/engine/publication'
import { SLOW_CAST_RUNTIME } from './runtime'

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
