import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { logDetail } from './lib/logDetail'

/**
 * Current-release schema only (data-model.md). Tables arrive with the work
 * package that uses them; future systems use additive migrations.
 */

export const heroStatus = v.union(
  v.literal('exploring'),
  v.literal('resting'),
  v.literal('travelling'),
  v.literal('dead'),
  v.literal('paused'),
  v.literal('sleeping'),
)

export const rarity = v.union(v.literal('common'), v.literal('uncommon'), v.literal('rare'))
export const itemKind = v.union(v.literal('weapon'), v.literal('armor'), v.literal('potion'))

export const heroCounters = v.object({
  combatWins: v.number(),
  retreats: v.number(),
  deaths: v.number(),
  rescues: v.number(),
  goldEarned: v.number(),
  itemsFound: v.number(),
  ticksExplored: v.number(),
})

export const logKind = v.union(
  v.literal('combat'),
  v.literal('loot'),
  v.literal('trap'),
  v.literal('rest'),
  v.literal('travel'),
  v.literal('death'),
  v.literal('revive'),
  v.literal('levelup'),
  v.literal('system'),
)

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    publicAlias: v.string(),
    normalizedAlias: v.string(),
    timezone: v.string(),
    state: v.union(v.literal('active'), v.literal('suspended'), v.literal('deleting')),
    createdAt: v.number(),
    publicNameVersion: v.number(),
    activeHeroId: v.optional(v.id('heroes')),
    deletionRequestedAt: v.optional(v.number()),
    nameRepairRequired: v.optional(v.boolean()),
  })
    .index('by_tokenIdentifier', ['tokenIdentifier'])
    .index('by_normalizedAlias', ['normalizedAlias'])
    .index('by_state', ['state']),

  deskCrawlerProfiles: defineTable({
    userId: v.id('users'),
    state: v.union(v.literal('active'), v.literal('deleting')),
    activeHeroId: v.optional(v.id('heroes')),
    createdAt: v.number(),
  }).index('by_userId', ['userId']),

  deskKeepsakes: defineTable({
    userId: v.id('users'),
    totalCollected: v.number(),
    lastClaimWeek: v.number(),
    lastClaimedAt: v.number(),
  }).index('by_userId', ['userId']),

  gameDeletionJobs: defineTable({
    userId: v.id('users'),
    gameSlug: v.literal('desk-crawler'),
    state: v.union(v.literal('running'), v.literal('completed')),
    phase: v.union(v.literal('connections'), v.literal('gameplay'), v.literal('done')),
    createdAt: v.number(),
    lastProgressAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index('by_userId_and_state', ['userId', 'state']),

  heroes: defineTable({
    userId: v.id('users'),
    name: v.string(),
    class: v.literal('warrior'),
    createdAt: v.number(),
    isActive: v.boolean(),
    schemaVersion: v.number(),
    activationState: v.union(v.literal('pending_trmnl'), v.literal('active')),
    activatedAt: v.optional(v.number()),
    level: v.number(),
    xp: v.number(),
    lifetimeXp: v.number(),
    hp: v.number(),
    gold: v.number(),
    lastLevelUpTick: v.number(),
    status: heroStatus,
    biomeId: v.string(),
    targetBiomeId: v.optional(v.string()),
    arriveAtTick: v.optional(v.number()),
    reviveAtTick: v.optional(v.number()),
    pausedFromStatus: v.optional(v.union(v.literal('exploring'), v.literal('resting'))),
    wakeAtTick: v.optional(v.number()),
    weaponId: v.optional(v.id('items')),
    armorId: v.optional(v.id('items')),
    heldItemId: v.optional(v.id('items')),
    eligibleFromTick: v.number(),
    lastTick: v.number(),
    lastProgressTick: v.number(),
    lastAdvancedAt: v.optional(v.number()),
    logSequence: v.number(),
    simulationState: v.union(v.literal('healthy'), v.literal('quarantined')),
    quarantineReasonCode: v.optional(v.string()),
    counters: heroCounters,
    scoreHour: v.optional(v.number()),
    scoreHourXp: v.number(),
    companionVisitBaseline: v.optional(v.object({ at: v.number(), level: v.number(), lifetimeXp: v.number(), logSequence: v.number(), counters: v.optional(heroCounters) })),
  })
    .index('by_userId_and_isActive', ['userId', 'isActive'])
    .index('by_createdAt', ['createdAt'])
    .index('by_simulationState', ['simulationState']),

  items: defineTable({
    heroId: v.id('heroes'),
    templateId: v.string(),
    contentVersion: v.string(),
    kind: itemKind,
    name: v.string(),
    rarity,
    requiredLevel: v.number(),
    attack: v.number(),
    defense: v.number(),
    saleValue: v.number(),
    quantity: v.number(),
    createdAt: v.number(),
  })
    .index('by_heroId', ['heroId'])
    .index('by_heroId_and_kind', ['heroId', 'kind']),

  worldState: defineTable({
    key: v.literal('world'),
    currentTick: v.number(),
    lastStartedWallSlot: v.optional(v.number()),
    activeRunId: v.optional(v.id('simulationRuns')),
    publishedPublicationId: v.optional(v.id('leaderboardPublications')),
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

  simulationRuns: defineTable({
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
    batchSequence: v.number(),
    nextScheduledFunctionId: v.optional(v.id('_scheduled_functions')),
    lastProgressAt: v.number(),
    finishedAt: v.optional(v.number()),
    processed: v.number(),
    eligible: v.number(),
    skippedDormant: v.number(),
    quarantined: v.number(),
    deaths: v.number(),
    levelUps: v.number(),
    heldFinds: v.number(),
    recoveryAttempts: v.number(),
    failureCode: v.optional(v.string()),
  })
    .index('by_tick', ['tick'])
    .index('by_state_and_startedAt', ['state', 'startedAt']),

  simulationFailures: defineTable({
    runId: v.id('simulationRuns'),
    heroId: v.id('heroes'),
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

  heroScoreWindows: defineTable({
    heroId: v.id('heroes'),
    buckets: v.array(v.object({ hourStart: v.number(), xp: v.number() })),
    xp24h: v.number(),
    xp7d: v.number(),
    lastFoldedRunId: v.optional(v.id('simulationRuns')),
    scoreVersion: v.number(),
  }).index('by_heroId', ['heroId']),

  rankInputs: defineTable({
    runId: v.id('simulationRuns'),
    heroId: v.id('heroes'),
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

  leaderboardPublications: defineTable({
    runId: v.id('simulationRuns'),
    state: v.union(v.literal('building'), v.literal('published'), v.literal('obsolete')),
    previousPublicationId: v.optional(v.id('leaderboardPublications')),
    scoreAt: v.number(),
    asOfTick: v.number(),
    globalTotalPlayers: v.number(),
    currentBoard: v.union(v.literal('overall'), v.literal('recent_24h'), v.literal('recent_7d')),
    currentGenerationId: v.optional(v.id('leaderboardGenerations')),
    cursor: v.optional(v.string()),
    batchSequence: v.number(),
    nextScheduledFunctionId: v.optional(v.id('_scheduled_functions')),
    lastProgressAt: v.number(),
    builtAt: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
  })
    .index('by_runId', ['runId'])
    .index('by_state', ['state']),

  leaderboardGenerations: defineTable({
    publicationId: v.id('leaderboardPublications'),
    board: v.union(v.literal('overall'), v.literal('recent_24h'), v.literal('recent_7d')),
    cohortKey: v.string(),
    totalPlayers: v.number(),
    nextRank: v.number(),
    entries: v.array(
      v.object({
        rank: v.number(),
        heroId: v.id('heroes'),
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

  heroRanks: defineTable({
    publicationId: v.id('leaderboardPublications'),
    generationId: v.id('leaderboardGenerations'),
    board: v.union(v.literal('overall'), v.literal('recent_24h'), v.literal('recent_7d')),
    cohortKey: v.string(),
    heroId: v.id('heroes'),
    rank: v.number(),
    rankDelta: v.optional(v.number()),
    score: v.optional(v.number()),
    level: v.number(),
  })
    .index('by_publicationId_and_board_and_heroId', ['publicationId', 'board', 'heroId'])
    .index('by_publicationId', ['publicationId']),

  operationReceipts: defineTable({
    scope: v.optional(v.union(v.literal('platform'), v.literal('desk-crawler'))),
    userId: v.id('users'),
    operationId: v.string(),
    operation: v.string(),
    argumentHash: v.string(),
    result: v.object({
      changed: v.boolean(),
      gold: v.optional(v.number()),
      hp: v.optional(v.number()),
      count: v.optional(v.number()),
      tick: v.optional(v.number()),
      keepsakeOutcome: v.optional(v.union(v.literal('claimed'), v.literal('already_claimed'), v.literal('invalid_code'))),
    }),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index('by_userId_and_operationId', ['userId', 'operationId'])
    .index('by_userId_and_scope', ['userId', 'scope'])
    .index('by_expiresAt', ['expiresAt']),

  rateLimitBuckets: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
    expiresAt: v.number(),
  })
    .index('by_key_and_windowStart', ['key', 'windowStart'])
    .index('by_expiresAt', ['expiresAt']),

  accountDeletionJobs: defineTable({
    userId: v.optional(v.id('users')),
    clerkUserId: v.optional(v.string()),
    state: v.union(v.literal('running'), v.literal('blocked'), v.literal('completed')),
    phase: v.union(v.literal('connections'), v.literal('gameplay'), v.literal('provider'), v.literal('finalize'), v.literal('done')),
    providerAttempts: v.number(),
    createdAt: v.number(),
    lastProgressAt: v.number(),
    completedAt: v.optional(v.number()),
    reasonCode: v.optional(v.string()),
  })
    .index('by_userId', ['userId'])
    .index('by_state_and_lastProgressAt', ['state', 'lastProgressAt']),

  revokedTrmnlCredentials: defineTable({
    tokenHash: v.string(),
    revokedAt: v.number(),
    reasonCode: v.string(),
  }).index('by_tokenHash', ['tokenHash']),

  revokedAuthIdentities: defineTable({
    identityHash: v.string(),
    revokedAt: v.number(),
    reasonCode: v.string(),
  }).index('by_identityHash', ['identityHash']),

  operationalIncidents: defineTable({
    incidentKey: v.string(),
    runId: v.id('simulationRuns'),
    state: v.union(v.literal('open'), v.literal('recovered')),
    openedAt: v.number(),
    recoveredAt: v.optional(v.number()),
    alert: v.object({ state: v.union(v.literal('pending'), v.literal('sent'), v.literal('failed'), v.literal('disabled')), attempts: v.number(), lastAttemptAt: v.optional(v.number()) }),
    recovery: v.optional(v.object({ state: v.union(v.literal('pending'), v.literal('sent'), v.literal('failed'), v.literal('disabled')), attempts: v.number(), lastAttemptAt: v.optional(v.number()) })),
  })
    .index('by_incidentKey', ['incidentKey'])
    .index('by_runId_and_state', ['runId', 'state'])
    .index('by_state_and_openedAt', ['state', 'openedAt']),

  adminAuditEvents: defineTable({
    actorRef: v.string(),
    action: v.string(),
    targetRef: v.string(),
    reasonCode: v.string(),
    outcome: v.string(),
    at: v.number(),
  })
    .index('by_at', ['at'])
    .index('by_targetRef', ['targetRef']),

  tickLogs: defineTable({
    heroId: v.id('heroes'),
    source: v.union(v.literal('tick'), v.literal('command'), v.literal('lifecycle')),
    tick: v.optional(v.number()),
    runId: v.optional(v.id('simulationRuns')),
    sequence: v.number(),
    at: v.number(),
    kind: logKind,
    summary: v.string(),
    detail: logDetail,
    deltas: v.object({ xpEarned: v.number(), gold: v.number(), hp: v.number() }),
  })
    .index('by_heroId_and_at_and_sequence', ['heroId', 'at', 'sequence'])
    .index('by_at', ['at']),

  trmnlGrants: defineTable({
    gameSlug: v.optional(v.literal('desk-crawler')),
    userId: v.id('users'),
    tokenHash: v.string(),
    state: v.union(v.literal('active'), v.literal('revoked')),
    createdAt: v.number(),
    lastVerifiedAt: v.optional(v.number()),
  })
    .index('by_tokenHash', ['tokenHash'])
    .index('by_userId', ['userId']),

  trmnlInstallAttempts: defineTable({
    gameSlug: v.optional(v.literal('desk-crawler')),
    userId: v.id('users'),
    grantId: v.id('trmnlGrants'),
    state: v.union(v.literal('pending'), v.literal('completed'), v.literal('expired')),
    createdAt: v.number(),
    expiresAt: v.number(),
    completedUuid: v.optional(v.string()),
  })
    .index('by_grantId_and_state', ['grantId', 'state'])
    .index('by_userId_and_state', ['userId', 'state'])
    .index('by_expiresAt', ['expiresAt']),

  trmnlInstances: defineTable({
    gameSlug: v.optional(v.literal('desk-crawler')),
    grantId: v.id('trmnlGrants'),
    userId: v.id('users'),
    uuid: v.string(),
    pluginSettingId: v.optional(v.string()),
    state: v.union(v.literal('active'), v.literal('uninstalled'), v.literal('disconnected')),
    confirmedBy: v.union(v.literal('success_callback'), v.literal('screen_request')),
    createdAt: v.number(),
    lastScreenServedAt: v.optional(v.number()),
  })
    .index('by_uuid', ['uuid'])
    .index('by_grantId', ['grantId'])
    .index('by_userId_and_state', ['userId', 'state'])
    .index('by_userId', ['userId']),
})
