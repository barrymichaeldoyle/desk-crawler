import { defineTable } from 'convex/server'
import { v } from 'convex/values'

/**
 * Engine tables (slow-cast.md "Architecture", S0). Every game's world, runs,
 * score windows and leaderboard sets come from this one factory, so their
 * shapes and indexes are identical by construction and the engine code in this
 * folder can serve them all. Desk Crawler's instantiation produces exactly the
 * tables it had before S0.
 *
 * `heroId` is the engine's name for the game's player character: a hero in Desk
 * Crawler, an angler in Slow Cast. One field name keeps one code path.
 */
export interface EngineTableNames {
  readonly subject: string
  readonly world: string
  readonly runs: string
  readonly failures: string
  readonly scoreWindows: string
  readonly rankInputs: string
  readonly publications: string
  readonly generations: string
  readonly ranks: string
  readonly achievementStats: string
}

export const boardLiteral = v.union(v.literal('overall'), v.literal('recent_24h'), v.literal('recent_7d'))

/**
 * `runCounters` are the game's own per-run tallies beside the engine's (processed, eligible, skipped, quarantined).
 * `retiredCounters` are tallies a game stopped keeping: optional, so older runs still validate.
 */
export function engineTables<const N extends EngineTableNames, const C extends string, const R extends string = never>(names: N, runCounters: readonly C[], retiredCounters: readonly R[] = []) {
  const counters = {
    ...(Object.fromEntries(runCounters.map((name) => [name, v.number()])) as Record<C, ReturnType<typeof v.number>>),
    ...(Object.fromEntries(retiredCounters.map((name) => [name, v.optional(v.number())])) as Record<R, ReturnType<typeof v.optional<ReturnType<typeof v.number>>>>),
  }
  return {
    world: defineTable({
      key: v.literal('world'),
      currentTick: v.number(),
      lastStartedWallSlot: v.optional(v.number()),
      activeRunId: v.optional(v.id<N['runs']>(names.runs)),
      publishedPublicationId: v.optional(v.id<N['publications']>(names.publications)),
      lastCompletedTick: v.optional(v.number()),
      lastCompletedAt: v.optional(v.number()),
      lastPublishedAt: v.optional(v.number()),
      activeContentVersion: v.string(),
      activeSimulationVersion: v.number(),
      worldSeed: v.string(),
      ticksPaused: v.boolean(),
      maintenanceMode: v.boolean(),
      createdAt: v.number(),
      schemaVersion: v.number(),
    }).index('by_key', ['key']),

    /**
     * Run fields only: TypeScript cannot check index fields against a document that spreads the
     * generic counters, so each schema adds the two run indexes itself (see `simulationRuns` in schema.ts).
     */
    runFields: {
      tick: v.number(),
      wallSlot: v.number(),
      scoreAt: v.number(),
      publishes: v.boolean(),
      startedAt: v.number(),
      cohortCutoff: v.number(),
      contentVersion: v.string(),
      simulationVersion: v.number(),
      seedVersion: v.number(),
      state: v.union(v.literal('simulating'), v.literal('ranking'), v.literal('completed'), v.literal('blocked')),
      cursor: v.optional(v.string()),
      paginationVersion: v.literal(1),
      batchSequence: v.number(),
      nextScheduledFunctionId: v.optional(v.id('_scheduled_functions')),
      lastProgressAt: v.number(),
      finishedAt: v.optional(v.number()),
      processed: v.number(),
      eligible: v.number(),
      skippedDormant: v.number(),
      quarantined: v.number(),
      ...counters,
      recoveryAttempts: v.number(),
      failureCode: v.optional(v.string()),
      /** Publication runs only: unlock counts per achievement id and the subjects tallied (D65). */
      achievementCounts: v.optional(v.record(v.string(), v.number())),
      achievementPopulation: v.optional(v.number()),
    },

    failures: defineTable({
      runId: v.id<N['runs']>(names.runs),
      heroId: v.id<N['subject']>(names.subject),
      reasonCode: v.string(),
      simulationVersion: v.number(),
      contentVersion: v.string(),
      tick: v.number(),
      message: v.string(),
      createdAt: v.number(),
      resolvedAt: v.optional(v.number()),
    })
      .index('by_runId', ['runId'])
      .index('by_heroId', ['heroId'])
      .index('by_createdAt', ['createdAt']),

    scoreWindows: defineTable({
      heroId: v.id<N['subject']>(names.subject),
      buckets: v.array(v.object({ hourStart: v.number(), xp: v.number() })),
      xp24h: v.number(),
      xp7d: v.number(),
      lastFoldedRunId: v.optional(v.id<N['runs']>(names.runs)),
      scoreVersion: v.number(),
    }).index('by_heroId', ['heroId']),

    rankInputs: defineTable({
      runId: v.id<N['runs']>(names.runs),
      heroId: v.id<N['subject']>(names.subject),
      userId: v.id('users'),
      heroKey: v.string(),
      cohortKey: v.string(),
      ranked24h: v.boolean(),
      ranked7d: v.boolean(),
      negativeScore24h: v.number(),
      negativeScore7d: v.number(),
      activatedAt: v.number(),
      negativeLevel: v.number(),
      negativeXp: v.number(),
      lastLevelUpTick: v.number(),
      heroCreatedAt: v.number(),
      heroName: v.string(),
      ownerAlias: v.string(),
      publicNameVersion: v.number(),
      level: v.number(),
      xp: v.number(),
    })
      .index('by_runId_and_heroId', ['runId', 'heroId'])
      .index('by_run_order', ['runId', 'negativeLevel', 'negativeXp', 'lastLevelUpTick', 'heroCreatedAt', 'heroKey'])
      .index('by_run_recent24', ['runId', 'ranked24h', 'cohortKey', 'negativeScore24h', 'activatedAt', 'heroKey'])
      .index('by_run_recent7', ['runId', 'ranked7d', 'cohortKey', 'negativeScore7d', 'activatedAt', 'heroKey']),

    publications: defineTable({
      runId: v.id<N['runs']>(names.runs),
      state: v.union(v.literal('building'), v.literal('published'), v.literal('obsolete')),
      previousPublicationId: v.optional(v.id<N['publications']>(names.publications)),
      scoreAt: v.number(),
      asOfTick: v.number(),
      globalTotalPlayers: v.number(),
      currentBoard: boardLiteral,
      currentGenerationId: v.optional(v.id<N['generations']>(names.generations)),
      cursor: v.optional(v.string()),
      paginationVersion: v.literal(1),
      batchSequence: v.number(),
      nextScheduledFunctionId: v.optional(v.id('_scheduled_functions')),
      lastProgressAt: v.number(),
      builtAt: v.optional(v.number()),
      publishedAt: v.optional(v.number()),
    })
      .index('by_runId', ['runId'])
      .index('by_state', ['state']),

    generations: defineTable({
      publicationId: v.id<N['publications']>(names.publications),
      board: boardLiteral,
      cohortKey: v.string(),
      totalPlayers: v.number(),
      nextRank: v.number(),
      entries: v.array(
        v.object({
          rank: v.number(),
          heroId: v.id<N['subject']>(names.subject),
          userId: v.id('users'),
          ownerAlias: v.string(),
          heroName: v.string(),
          publicNameVersion: v.number(),
          level: v.number(),
          xp: v.number(),
          score: v.optional(v.number()),
        }),
      ),
      scoreAt: v.number(),
      state: v.union(v.literal('building'), v.literal('ready')),
    })
      .index('by_publicationId_and_board_and_cohortKey', ['publicationId', 'board', 'cohortKey'])
      .index('by_publicationId', ['publicationId']),

    ranks: defineTable({
      publicationId: v.id<N['publications']>(names.publications),
      generationId: v.id<N['generations']>(names.generations),
      board: boardLiteral,
      cohortKey: v.string(),
      heroId: v.id<N['subject']>(names.subject),
      rank: v.number(),
      rankDelta: v.optional(v.number()),
      score: v.optional(v.number()),
      level: v.number(),
    })
      .index('by_publicationId_and_board_and_heroId', ['publicationId', 'board', 'heroId'])
      .index('by_publicationId', ['publicationId']),

    /** Per-publication unlock tally for rarity; written once at promotion from the run's batch tally (D65). */
    achievementStats: defineTable({
      publicationId: v.id<N['publications']>(names.publications),
      runId: v.id<N['runs']>(names.runs),
      counts: v.record(v.string(), v.number()),
      totalPlayers: v.number(),
      scoreAt: v.number(),
    }).index('by_publicationId', ['publicationId']),
  }
}

/** Desk Crawler's engine tables keep their original names. */
export const DESK_CRAWLER_TABLES = {
  subject: 'heroes',
  world: 'worldState',
  runs: 'simulationRuns',
  failures: 'simulationFailures',
  scoreWindows: 'heroScoreWindows',
  rankInputs: 'rankInputs',
  publications: 'leaderboardPublications',
  generations: 'leaderboardGenerations',
  ranks: 'heroRanks',
  achievementStats: 'achievementStats',
} as const

/** Slow Cast's engine tables, prefixed so retention and deletion stay per game. */
export const SLOW_CAST_TABLES = {
  subject: 'anglers',
  world: 'swWorldState',
  runs: 'swSimulationRuns',
  failures: 'swSimulationFailures',
  scoreWindows: 'swScoreWindows',
  rankInputs: 'swRankInputs',
  publications: 'swLeaderboardPublications',
  generations: 'swLeaderboardGenerations',
  ranks: 'swRanks',
  achievementStats: 'swAchievementStats',
} as const
