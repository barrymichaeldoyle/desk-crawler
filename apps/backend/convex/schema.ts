import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { logDetail, todoKind } from './lib/logDetail'

/**
 * Current-release schema only (data-model.md). Tables arrive with the work
 * package that uses them; future systems use additive migrations.
 */

/** Where a launch-list signup came from: the share link, the signed-out QR pitch, the game page, the home page or a signed-in account. */
export const waitlistSource = v.union(v.literal('notify'), v.literal('pitch'), v.literal('landing'), v.literal('home'), v.literal('account'))

export const heroStatus = v.union(
  v.literal('exploring'),
  v.literal('resting'),
  v.literal('travelling'),
  v.literal('dead'),
  v.literal('paused'),
  v.literal('sleeping'),
)

export const rarity = v.union(v.literal('common'), v.literal('uncommon'), v.literal('rare'), v.literal('epic'))
export const itemKind = v.union(v.literal('weapon'), v.literal('armor'), v.literal('potion'))

/**
 * Lifetime counters (D65): grow-only safe integers; `monsterWins` is keyed by catalog monster id.
 * The nine D65 counters are optional in storage until `achievements.backfillCounters` has visited
 * every hero; every read path normalizes a missing counter to zero (`withCounterDefaults`).
 */
export const heroCounters = v.object({
  combatWins: v.number(),
  retreats: v.number(),
  deaths: v.number(),
  rescues: v.number(),
  goldEarned: v.number(),
  itemsFound: v.number(),
  ticksExplored: v.number(),
  monsterWins: v.optional(v.record(v.string(), v.number())),
  eliteWins: v.optional(v.number()),
  jackpots: v.optional(v.number()),
  rareFinds: v.optional(v.number()),
  potionsUsed: v.optional(v.number()),
  trapsAvoided: v.optional(v.number()),
  restTicks: v.optional(v.number()),
  trips: v.optional(v.number()),
  itemsSold: v.optional(v.number()),
  /** D76: stance switches made in the companion. */
  stanceChanges: v.optional(v.number()),
  /** D78: merchant offers bought, and merchant visits met. */
  purchases: v.optional(v.number()),
  merchantVisits: v.optional(v.number()),
  /** D79: choices answered in the companion, and choices that defaulted at expiry. */
  choicesMade: v.optional(v.number()),
  choicesDefaulted: v.optional(v.number()),
  /** D81: epic gear found. */
  epicFinds: v.optional(v.number()),
  /** D110: raids launched, won as the raider, repelled and lost as the target. */
  raidsLaunched: v.optional(v.number()),
  raidsWon: v.optional(v.number()),
  raidsRepelled: v.optional(v.number()),
  raidsLost: v.optional(v.number()),
  /** P32: gear finds the desk drawer caught. */
  drawerFinds: v.optional(v.number()),
  /** P31: to-do tasks ticked off. */
  tasksCompleted: v.optional(v.number()),
})

/** P31: the office to-do list, three tasks written by the simulator and swapped by `heroes.swapTask`. */
export const todoList = v.object({
  tasks: v.array(
    v.object({
      templateId: todoKind,
      biomeId: v.optional(v.string()),
      monsterId: v.optional(v.string()),
      target: v.number(),
      progress: v.number(),
      reward: v.number(),
      addedTick: v.number(),
      refillsSeen: v.number(),
      doneTick: v.optional(v.number()),
    }),
  ),
  lastRefillTick: v.number(),
  lastStandupAt: v.number(),
  swapUsedTick: v.optional(v.number()),
})

/** D78 merchant offers: at most three, each bought at most once. */
export const merchantOffer = v.object({
  id: v.union(v.literal('potions'), v.literal('pouch'), v.literal('bag')),
  name: v.string(),
  quantity: v.number(),
  price: v.number(),
  tierId: v.optional(v.string()),
})
export const merchantVisit = v.object({ offers: v.array(merchantOffer), expiresAtTick: v.number(), biomeId: v.string() })

export const logKind = v.union(
  v.literal('combat'),
  v.literal('loot'),
  v.literal('trap'),
  v.literal('rest'),
  v.literal('travel'),
  v.literal('death'),
  v.literal('revive'),
  v.literal('levelup'),
  v.literal('achievement'),
  v.literal('merchant'),
  v.literal('choice'),
  v.literal('raid'),
  v.literal('todo'),
  v.literal('system'),
)

export default defineSchema({
  users: defineTable({
    analyticsConsent: v.optional(v.boolean()),
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
    /** P31: the last UTC offset in seconds a TRMNL screen request sent, written only when it changes; the stand-up and the tick read it. */
    trmnlUtcOffset: v.optional(v.number()),
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

  /** One row per earned achievement, keyed by owner so unlocks outlive a hero's lifecycle (D65). Bounded by the catalog. */
  heroAchievements: defineTable({
    userId: v.id('users'),
    heroId: v.id('heroes'),
    achievementId: v.string(),
    unlockedAt: v.number(),
    tick: v.number(),
    catalogVersion: v.number(),
  })
    .index('by_userId_and_achievementId', ['userId', 'achievementId'])
    .index('by_userId_and_unlockedAt', ['userId', 'unlockedAt']),

  /** Per-publication unlock tally for rarity; written once at promotion from the run's batch tally (D65). */
  achievementStats: defineTable({
    publicationId: v.id('leaderboardPublications'),
    runId: v.id('simulationRuns'),
    counts: v.record(v.string(), v.number()),
    totalPlayers: v.number(),
    scoreAt: v.number(),
  }).index('by_publicationId', ['publicationId']),

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
    /** P32: gear in the desk drawer, newest last, at most the catalog's drawer size; absent means empty. */
    drawer: v.optional(v.array(v.id('items'))),
    /** D61: unequipped gear the bag holds, always a ladder tier's capacity. */
    bagCapacity: v.number(),
    /** D76: how carefully the hero sustains itself; absent means balanced. */
    stance: v.optional(v.union(v.literal('cautious'), v.literal('balanced'), v.literal('bold'))),
    /** D77: potion cap from the pouch ladder; absent means the catalog's potionStackCap. */
    potionCap: v.optional(v.number()),
    /** D78: an open merchant visit, cleared by the simulator when it expires or by the last purchase. */
    merchant: v.optional(merchantVisit),
    /** D79: a pending narrative choice, answered by `heroes.choose` or defaulted by the simulator at expiry. */
    choice: v.optional(v.object({ eventId: v.string(), offeredAtTick: v.number(), expiresAtTick: v.number(), biomeTier: v.number() })),
    /** D80: active temporary effects, at most three. */
    effects: v.optional(v.array(v.object({ id: v.string(), untilTick: v.number() }))),
    /** v1.2: the owner chose to show this hero on a public profile page; absent means private. */
    publicProfile: v.optional(v.boolean()),
    /** D110: this hero's row in the raid pool, created at its first evaluation under a catalog with raids. */
    raidPoolId: v.optional(v.id('raidPool')),
    /** P31: the office to-do list, written at the hero's first evaluation under a catalog with to-do rules. */
    todo: v.optional(todoList),
    eligibleFromTick: v.number(),
    lastTick: v.number(),
    lastProgressTick: v.number(),
    lastAdvancedAt: v.optional(v.number()),
    logSequence: v.number(),
    simulationState: v.union(v.literal('healthy'), v.literal('quarantined')),
    quarantineReasonCode: v.optional(v.string()),
    counters: heroCounters,
    /** Last achievement catalog version evaluated for this hero; absent means never (D65). */
    achievementsVersion: v.optional(v.number()),
    scoreHour: v.optional(v.number()),
    scoreHourXp: v.number(),
    companionVisitBaseline: v.optional(v.object({ at: v.number(), level: v.number(), lifetimeXp: v.number(), logSequence: v.number(), counters: heroCounters })),
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
    /** D81: affix rolled at generation; absent on common, uncommon and older gear. */
    affixId: v.optional(v.string()),
  })
    .index('by_heroId', ['heroId'])
    .index('by_heroId_and_kind', ['heroId', 'kind']),

  /**
   * D110: one row per hero that can be raided, at a random shard. A raider takes the first row at or after its
   * shard; a picked row moves to a new shard and records when it was picked, so nobody is everyone's target.
   */
  raidPool: defineTable({
    heroId: v.id('heroes'),
    shard: v.number(),
    raidedAtTick: v.optional(v.number()),
  })
    .index('by_shard', ['shard'])
    .index('by_heroId', ['heroId']),

  /**
   * D110 raid ledger: the raider writes one row in its own tick; the target applies it once at its next exploring
   * or resting evaluation. Names are copied with their public-name versions so reads can mask a repaired name.
   */
  raids: defineTable({
    raiderHeroId: v.id('heroes'),
    raiderUserId: v.id('users'),
    raiderName: v.string(),
    raiderNameVersion: v.number(),
    targetHeroId: v.id('heroes'),
    targetUserId: v.id('users'),
    targetName: v.string(),
    targetNameVersion: v.number(),
    tick: v.number(),
    raiderWon: v.boolean(),
    /** Gold the loser loses and the winner gains, as the raider resolved it. */
    gold: v.number(),
    raiderHpLost: v.number(),
    /** The target's HP loss as a share of its maximum HP. */
    targetHpPct: v.number(),
    state: v.union(v.literal('pending'), v.literal('applied')),
    appliedTick: v.optional(v.number()),
    /** What the target actually lost or gained once applied (a loss is clamped to the gold it held). */
    targetGold: v.optional(v.number()),
    targetHpLost: v.optional(v.number()),
  })
    .index('by_raiderHeroId_and_tick', ['raiderHeroId', 'tick'])
    .index('by_targetHeroId_and_state_and_tick', ['targetHeroId', 'state', 'tick'])
    .index('by_targetHeroId_and_tick', ['targetHeroId', 'tick'])
    .index('by_state_and_tick', ['state', 'tick']),

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
    paginationVersion: v.literal(1),
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
    /** Publication runs only: unlock counts per achievement id and the heroes tallied (D65). */
    achievementCounts: v.optional(v.record(v.string(), v.number())),
    achievementPopulation: v.optional(v.number()),
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
    paginationVersion: v.literal(1),
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
    .index('by_key', ['key'])
    .index('by_key_and_windowStart', ['key', 'windowStart'])
    .index('by_expiresAt', ['expiresAt']),

  accountDeletionConfirmations: defineTable({
    tokenIdentifier: v.string(),
    tokenHash: v.string(),
    email: v.string(),
    emailId: v.string(),
    from: v.string(),
    origin: v.string(),
    state: v.union(v.literal('pending'), v.literal('sent'), v.literal('failed'), v.literal('confirmed')),
    attempts: v.number(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index('by_tokenIdentifier', ['tokenIdentifier'])
    .index('by_tokenHash', ['tokenHash'])
    .index('by_expiresAt', ['expiresAt']),

  /** Desk Crawler launch list (D105): one email at marketplace approval, then the row is deleted. */
  waitlist: defineTable({
    email: v.string(),
    source: waitlistSource,
    state: v.union(v.literal('waiting'), v.literal('sending'), v.literal('failed')),
    attempts: v.number(),
    tokenIdentifier: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_email', ['email'])
    .index('by_state', ['state'])
    .index('by_tokenIdentifier', ['tokenIdentifier']),

  /** Player feedback (D107): signed-in only, emailed to Barry, deleted with the account. */
  feedback: defineTable({
    tokenIdentifier: v.string(),
    clerkUserId: v.string(),
    publicAlias: v.optional(v.string()),
    message: v.string(),
    page: v.optional(v.string()),
    state: v.union(v.literal('pending'), v.literal('sent'), v.literal('failed')),
    attempts: v.number(),
    createdAt: v.number(),
  })
    .index('by_tokenIdentifier', ['tokenIdentifier'])
    .index('by_createdAt', ['createdAt']),

  accountDeletionJobs: defineTable({
    heroRef: v.optional(v.string()),
    analyticsDeletionRequired: v.optional(v.boolean()),
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
    .index('by_actorRef', ['actorRef'])
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
    // Reused revoked credentials authorize only the freshly verified UUID.
    authorizedUuid: v.optional(v.string()),
    state: v.union(v.literal('active'), v.literal('revoked')),
    createdAt: v.number(),
    lastVerifiedAt: v.optional(v.number()),
  })
    .index('by_tokenHash', ['tokenHash'])
    .index('by_userId', ['userId']),

  trmnlReconnectAttempts: defineTable({
    tokenIdentifier: v.string(),
    tokenHash: v.string(),
    publicAlias: v.string(),
    heroName: v.string(),
    timezone: v.string(),
    analyticsConsent: v.optional(v.boolean()),
    createdAt: v.number(),
    expiresAt: v.number(),
    verifiedUuid: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    proofExpiresAt: v.optional(v.number()),
  })
    .index('by_tokenIdentifier', ['tokenIdentifier'])
    .index('by_tokenHash_and_expiresAt', ['tokenHash', 'expiresAt'])
    .index('by_expiresAt', ['expiresAt']),

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
    confirmedBy: v.union(v.literal('success_callback'), v.literal('screen_request'), v.literal('management_confirmation')),
    createdAt: v.number(),
    lastScreenServedAt: v.optional(v.number()),
  })
    .index('by_uuid', ['uuid'])
    .index('by_grantId', ['grantId'])
    .index('by_userId_and_state', ['userId', 'state'])
    .index('by_userId', ['userId']),
})
