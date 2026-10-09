/**
 * Pure domain types for the simulator (domain-contracts.md).
 * No Convex, auth, connection or wall-clock types belong here.
 */

export type StreamName = 'encounter' | 'combat' | 'reward' | 'narrative' | 'raid' | 'quest'
/**
 * The `raid` stream (D110) is drawn only under a catalog with raid rules; without its seed no raid can launch.
 * The `quest` stream (P31) is drawn only under a catalog with to-do rules, which require it.
 */
export type StreamSeeds = Readonly<Record<Exclude<StreamName, 'raid' | 'quest'>, number> & { raid?: number; quest?: number }>

export type HeroStatus = 'exploring' | 'resting' | 'travelling' | 'dead' | 'paused' | 'sleeping'
export type EncounterKind = 'combat' | 'loot' | 'trap' | 'rest'
export type GearKind = 'weapon' | 'armor'
export type ItemKind = GearKind | 'potion'
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic'
/** How carefully the hero looks after itself between fights (D76). */
export type StanceId = 'cautious' | 'balanced' | 'bold'
export type LogKind =
  | 'combat'
  | 'loot'
  | 'trap'
  | 'rest'
  | 'travel'
  | 'death'
  | 'revive'
  | 'levelup'
  | 'achievement'
  | 'merchant'
  | 'choice'
  | 'raid'
  | 'todo'
  | 'system'

// ---------------------------------------------------------------- content

export interface Range {
  readonly min: number
  readonly max: number
}

export interface MonsterTemplate {
  readonly id: string
  readonly name: string
  readonly tier: number
  readonly hp: number
  readonly attack: number
  readonly defense: number
  readonly xp: Range
  readonly gold: Range
}

export interface GearTemplate {
  readonly id: string
  readonly kind: GearKind
  readonly tier: number
  readonly name: string
  /** Added to the tier's slot stat (weapon ATK or armor DEF) so same-tier items differ; absent means 0. */
  readonly statOffset?: number
}

export interface GearTierStats {
  readonly weaponAttack: number
  readonly armorDefense: number
  readonly requiredLevel: number
  readonly saleValue: number
}

export interface RarityRule {
  readonly rarity: Rarity
  readonly weight: number
  readonly statBonus: number
  readonly saleMultiplier: number
}

export interface BiomeTemplate {
  readonly id: string
  readonly name: string
  readonly unlockLevel: number
  /** Office Cubicles: lethal damage becomes a rescue instead of death. */
  readonly safe: boolean
  readonly tier: number
  readonly weights: Readonly<Record<EncounterKind, number>>
  /** Ordered list; uniform selection. */
  readonly monsterIds: readonly string[]
  readonly lootGold: Range
  readonly trapDamage: Range
}

/** Placeholders: {monster} {xp} {gold} {damage} {heal} {item} {destination} {ticks} {capacity} */
export interface BiomeNarrative {
  readonly victory: readonly string[]
  readonly lootGold: readonly string[]
  readonly trapHit: readonly string[]
  /** A deliberate callback when this mishap occurs twice consecutively. */
  readonly trapHitCallbacks?: Readonly<Record<string, string>>
  readonly rest: readonly string[]
  readonly eliteVictory: readonly string[]
  readonly jackpot: readonly string[]
  /** Where gear turns up in this biome ({item}), pooled with the shared lines. */
  readonly lootGear: readonly string[]
  /** Arriving in this biome ({destination}), pooled with the shared lines. */
  readonly arrive: readonly string[]
}

/** Signature lines for one monster ({monster}, {xp}, {gold}), pooled with its biome's victories. */
export interface MonsterNarrative {
  readonly victory: readonly string[]
}

export interface SharedNarrative {
  readonly retreat: readonly string[]
  readonly death: readonly string[]
  readonly rescue: readonly string[]
  readonly trapDeath: readonly string[]
  readonly trapRescue: readonly string[]
  readonly restFull: readonly string[]
  readonly trapAvoided: readonly string[]
  readonly lootGear: readonly string[]
  readonly lootPotion: readonly string[]
  readonly potionFullGold: readonly string[]
  readonly restingHeal: readonly string[]
  readonly revive: readonly string[]
  readonly arrive: readonly string[]
  readonly depart: readonly string[]
  /** A level-up that opens a new area ({destination}). */
  readonly unlock: readonly string[]
  /** Finding a bigger bag ({item}, {capacity}). */
  readonly bagFind: readonly string[]
  /** Finding a bigger potion pouch ({item}, {capacity}). */
  readonly pouchFind: readonly string[]
  /** The merchant setting up shop ({ticks} until it leaves). */
  readonly merchant: readonly string[]
}

/** One stance: the sustain thresholds it replaces (D76). The balanced stance mirrors the catalog constants. */
export interface StanceRule {
  readonly id: StanceId
  readonly name: string
  readonly blurb: string
  readonly autoPotionBelowPct: number
  readonly restBelowPct: number
  readonly resumeExploringAtPct: number
  /** Victory XP scale: the pace a stance buys with its risk (100 leaves rewards untouched). */
  readonly victoryXpPct: number
}

export interface SimulationConstants {
  readonly potionStackCap: number
  readonly potionHealPct: number
  readonly autoPotionBelowPct: number
  readonly restBelowPct: number
  readonly restingHealPct: number
  readonly resumeExploringAtPct: number
  readonly restEncounterHealPct: number
  readonly maxCombatRounds: number
  readonly damageVariance: Range
  readonly combatGearDropPct: number
  /** `merchant` is the D78 visit; absent before v4. */
  readonly lootWeights: Readonly<{ gear: number; potion: number; gold: number; merchant?: number; event?: number }>
  readonly trapAvoidPct: number
  readonly retreatGoldLossPct: number
  readonly deathGoldLossPct: number
  readonly reviveAfterTicks: number
  readonly reviveHpPct: number
  readonly elite: Readonly<{ chancePct: number; hpMultiplierPct: number; xpMultiplier: number; goldMultiplier: number }>
  readonly jackpot: Readonly<{ chancePct: number; goldMultiplier: number }>
  readonly summaryMaxCodePoints: number
}

/** One rung of the bag ladder (D61). Capacity counts unequipped bag gear only. */
export interface BagTier {
  readonly id: string
  readonly name: string
  readonly capacity: number
  /** Guaranteed once either condition is met; the first tier has none. */
  readonly milestone?: Readonly<{ ticksExplored?: number; level?: number }>
  /** Gold to buy this tier in the companion; absent for the starting tier. */
  readonly price?: number
}

/** One rung of the potion pouch ladder (D77): the potion stack's cap. */
export interface PouchTier {
  readonly id: string
  readonly name: string
  readonly cap: number
  /** Guaranteed at this level; the first tier has none. */
  readonly milestone?: Readonly<{ level: number }>
  /** Gold to buy this tier; absent for the starting tier. */
  readonly price?: number
}

/** Per-hero potion cap that grows (D77); absent in catalogs before v4, where `constants.potionStackCap` applies. */
export interface PotionPouch {
  /** Ordered by strictly increasing cap; tiers[0] is a new hero's pouch. */
  readonly tiers: readonly PouchTier[]
  /** Chance per loot encounter, in permille, that an eligible hero finds the next pouch. */
  readonly findPermille: number
}

/** The wandering merchant (D78): a loot encounter that opens bounded offers in the companion for a few ticks. */
export interface MerchantRule {
  /** Gold per potion, scaled by the biome tier. */
  readonly potionPrice: number
  readonly maxPotionsOffered: number
  /** Offers stay open for this many ticks after the visit. */
  readonly staysForTicks: number
}

export interface MerchantOffer {
  readonly id: 'potions' | 'pouch' | 'bag'
  readonly name: string
  readonly quantity: number
  readonly price: number
  /** The pouch or bag tier this offer grants. */
  readonly tierId?: string
}

export interface MerchantVisit {
  readonly offers: readonly MerchantOffer[]
  readonly expiresAtTick: number
  readonly biomeId: string
}

/**
 * A narrative event choice (D79): a short office situation with two or three options, one of which happens by
 * itself when the player does not answer within the expiry. Effects are authored and deterministic; the hero never
 * earns XP from a choice, so the intent path and the simulator path apply exactly the same thing.
 */
export interface ChoiceEffect {
  /** Gold added (negative spends; a spend the hero cannot afford is clamped to zero). */
  readonly gold?: number
  /** Gold per biome tier, added on top of `gold`. */
  readonly goldPerTier?: number
  /** Percent of maximum HP healed (positive) or lost (negative, never below 1 HP). */
  readonly hpPct?: number
  /** Potions added, within the pouch cap (overflow is lost, never sold). */
  readonly potions?: number
  /** A temporary effect granted (D80). */
  readonly effectId?: string
}

export interface ChoiceOption {
  readonly id: string
  readonly label: string
  /** The story line logged when this option resolves. */
  readonly story: string
  readonly effect: ChoiceEffect
}

export interface EventTemplate {
  readonly id: string
  readonly title: string
  /** The situation, logged when the choice is offered. */
  readonly prompt: string
  readonly options: readonly ChoiceOption[]
  /** The option that resolves by itself at expiry. */
  readonly defaultOptionId: string
}

export interface ChoiceRule {
  readonly events: readonly EventTemplate[]
  /** Ticks a choice stays open; 96 is a day. */
  readonly expiresAfterTicks: number
}

export interface PendingChoice {
  readonly eventId: string
  readonly offeredAtTick: number
  readonly expiresAtTick: number
  readonly biomeTier: number
}

/**
 * Desk raids (D110): heroes raid each other by chance on exploring ticks. Level, gear, affixes and effects play no
 * part in who wins; only the two stances move the 50/50 contest. Gold moves from loser to winner, never created.
 */
export interface RaidRule {
  /** Chance per exploring tick, in permille, that the hero launches a raid. */
  readonly launchPermille: Readonly<Record<StanceId, number>>
  /** Percentage points a stance adds to its own side of the contest, raiding or defending. */
  readonly edgePct: Readonly<Record<StanceId, number>>
  /** The loser's gold loss, a share of its current gold (thrifty takes its points off, D81). */
  readonly goldLossPct: number
  /** HP each side loses, as shares of its maximum HP. */
  readonly loserHpPct: number
  readonly winnerHpPct: number
  /** A target picked in the last this-many ticks cannot be picked again (enforced by the adapter's pool). */
  readonly targetCooldownTicks: number
  /** Placeholder: {rival}; amounts travel as change chips. A knockout adds a fixed "Knocked out for N ticks." */
  readonly narrative: RaidNarrative
}

/** P32: the desk drawer catches gear finds once the bag is full; the hero sleeps only when it is full too. */
export interface DeskDrawerRule {
  /** Slots, one size for every hero. */
  readonly capacity: number
  /** The hero's first drawer find, from loot. Placeholder: {item}. */
  readonly firstUse: readonly string[]
  /** The same moment for a combat drop, after the victory line; short and without a placeholder so the summary keeps it. */
  readonly firstDrop: readonly string[]
}

/** P31: what a to-do task counts, always something the pure core already resolves in a tick. */
export type TodoKind = 'defeat_monster' | 'defeat_any' | 'explore_biome' | 'find_gear' | 'earn_gold' | 'avoid_traps' | 'elite'

/** One task template; the template id is its kind, so no two tasks on a list share one. */
export interface TodoTemplate {
  readonly kind: TodoKind
  /** Placeholders: {target} {monster} {monsters} {biome}. */
  readonly label: string
  /** The label when the target is 1. */
  readonly labelOne: string
  /** Target range by biome tier: the named biome's, or for a biome-free kind the hero's. */
  readonly target: Readonly<Record<number, Range>>
  /** Offered only from this level. */
  readonly minLevel?: number
}

/**
 * P31: the office to-do list. Every hero carries three tasks that progress while it explores and pay gold when
 * done; the 07:00 stand-up refills finished slots only, at least `minRefillGapTicks` after the last refill.
 */
export interface TodoRule {
  /** Ordered; index order is part of the content version. */
  readonly templates: readonly TodoTemplate[]
  /** Gold per finished task by the task's biome tier. */
  readonly rewardByTier: Readonly<Record<number, number>>
  /** Local hour of the morning stand-up (D84's Night recap boundary). */
  readonly refillHour: number
  /** The floor between two refills: 80 ticks is 20 hours. */
  readonly minRefillGapTicks: number
  /** An unfinished task is swapped at the refill that makes this many it has seen. */
  readonly staleAfterRefills: number
  /** Chance in percent that a generated biome task names another unlocked biome, when the list allows one. */
  readonly awayPct: number
  /** Plural monster names for {monsters}. */
  readonly monsterPlurals: Readonly<Record<string, string>>
}

export interface RaidNarrative {
  /** The raider won. */
  readonly raidWon: readonly string[]
  /** The raider was caught. */
  readonly raidLost: readonly string[]
  /** The target was raided. */
  readonly raided: readonly string[]
  /** The target caught the raider. */
  readonly repelled: readonly string[]
  /** Either side rescued by Office Cubicles. */
  readonly rescue: readonly string[]
}

/** The hero a raid lands on, as the adapter found it live at pick time. */
export interface RaidTarget {
  readonly heroId: string
  /** Public name shown in the raider's log. */
  readonly name: string
  readonly stance?: StanceId
  readonly gold: number
  /** The target's own thrifty points (D81), so its gold loss is the one it would take at home. */
  readonly goldLossPct?: number
}

/** A raid this hero launched, for the adapter's ledger; the target applies it at its next evaluation. */
export interface RaidLaunch {
  readonly targetHeroId: string
  readonly tick: number
  readonly raiderWon: boolean
  /** Gold the loser loses and the winner gains. */
  readonly gold: number
  /** The target's HP loss as a share of its maximum HP. */
  readonly targetHpPct: number
}

/** A ledger raid landing on this hero (the target side), oldest pending first. */
export interface IncomingRaid {
  readonly raiderHeroId: string
  readonly raiderName: string
  readonly tick: number
  readonly raiderWon: boolean
  readonly gold: number
  readonly targetHpPct: number
}

/**
 * Typed modifiers (D80/D81) that affixes and effects contribute; every field is additive percentage points and
 * absent means zero. The resolver sums them and applies each at one fixed place.
 */
export interface Modifiers {
  readonly attackPct?: number
  readonly defensePct?: number
  readonly xpPct?: number
  readonly goldPct?: number
  /** Trap damage reduced by this share. */
  readonly trapDamagePct?: number
  /** Maximum HP healed after each victory. */
  readonly healOnVictoryPct?: number
  /** Percentage points taken off retreat and knockout gold losses. */
  readonly goldLossPct?: number
}

/** An affix: a named modifier rolled onto rare and epic gear at generation (D81). */
export interface AffixRule {
  readonly id: string
  /** Adjective shown before the rarity: "Vampiric Rare Keyboard Mace". */
  readonly name: string
  readonly blurb: string
  readonly modifiers: Modifiers
}

/** A temporary effect on the hero (D80): a boon or a bane with a duration in ticks. */
export interface EffectRule {
  readonly id: string
  readonly name: string
  readonly blurb: string
  readonly kind: 'boon' | 'bane'
  readonly durationTicks: number
  readonly modifiers: Modifiers
}

export interface ActiveEffect {
  readonly id: string
  /** The effect is gone from this tick on. */
  readonly untilTick: number
}

/** Per-hero bag capacity that grows (D61). */
export interface BagLadder {
  /** Ordered by strictly increasing capacity; tiers[0] is a new hero's bag. */
  readonly tiers: readonly BagTier[]
  /** Chance per loot encounter, in permille, that an eligible hero finds the next bag. */
  readonly findPermille: number
}

export interface ContentCatalog {
  readonly contentVersion: string
  readonly constants: SimulationConstants
  /** Ordered; index order is part of the content version. */
  readonly biomes: readonly BiomeTemplate[]
  readonly safeBiomeId: string
  readonly monsters: readonly MonsterTemplate[]
  readonly gearTemplates: readonly GearTemplate[]
  readonly gearTiers: Readonly<Record<number, GearTierStats>>
  readonly rarities: readonly RarityRule[]
  readonly potion: Readonly<{ templateId: string; name: string }>
  readonly bagLadder: BagLadder
  /** Absent in catalogs before v3: every hero then behaves as balanced. */
  readonly stances?: Readonly<Record<StanceId, StanceRule>>
  /** Absent before v4 (D77/D78). */
  readonly potionPouch?: PotionPouch
  readonly merchant?: MerchantRule
  /** Absent before v5 (D79). */
  readonly choices?: ChoiceRule
  /** Absent before v6 (D80/D81). */
  readonly affixes?: readonly AffixRule[]
  /** Rarities that roll an affix at generation. */
  readonly affixRarities?: readonly Rarity[]
  readonly effects?: readonly EffectRule[]
  /** Which effect each source grants; a source may be absent. */
  readonly effectSources?: Readonly<{ trapHit?: string; eliteVictory?: string }>
  /** Absent before v7 (D110). */
  readonly raids?: RaidRule
  /** Absent before v8 (P32): without it a find that overflows the bag is held at once, as before. */
  readonly deskDrawer?: DeskDrawerRule
  /** Absent before v9 (P31): without it a hero has no to-do list and draws nothing from the `quest` stream. */
  readonly todo?: TodoRule
  readonly narrative: Readonly<{ biomes: Readonly<Record<string, BiomeNarrative>>; shared: SharedNarrative; monsters: Readonly<Record<string, MonsterNarrative>> }>
}

// ---------------------------------------------------------------- hero and items

/**
 * Lifetime counters. Every value only grows (D65): achievements are predicates
 * over these, so a counter that exists from launch makes its achievements
 * retroactive by construction. `itemsSold` is written by the sell intents,
 * `potionsUsed` by both the simulator and the drink intent; the rest by ticks.
 */
export interface HeroCounters {
  readonly combatWins: number
  readonly retreats: number
  readonly deaths: number
  readonly rescues: number
  readonly goldEarned: number
  readonly itemsFound: number
  readonly ticksExplored: number
  /** Victories per monster id; keys are limited to the pinned catalog's monsters. */
  readonly monsterWins: Readonly<Record<string, number>>
  readonly eliteWins: number
  readonly jackpots: number
  /** Rare gear found, from loot or combat drops. */
  readonly rareFinds: number
  readonly potionsUsed: number
  readonly trapsAvoided: number
  /** Ticks that healed by resting: resting ticks and rest encounters. */
  readonly restTicks: number
  /** Arrivals in another biome. */
  readonly trips: number
  readonly itemsSold: number
  /** Stance switches made in the companion (D76), written by the intent. */
  readonly stanceChanges: number
  /** Merchant offers bought in the companion (D78), written by the intent. */
  readonly purchases: number
  /** Merchant visits met while exploring (D78). */
  readonly merchantVisits: number
  /** Choices answered in the companion (D79), written by the intent. */
  readonly choicesMade: number
  /** Choices that resolved by their default at expiry (D79). */
  readonly choicesDefaulted: number
  /** Epic gear found (D81). */
  readonly epicFinds: number
  /** Raids launched, raids won as the raider, raids repelled and raids lost as the target (D110). */
  readonly raidsLaunched: number
  readonly raidsWon: number
  readonly raidsRepelled: number
  readonly raidsLost: number
  /** Gear finds that went in the desk drawer because the bag was full (P32). */
  readonly drawerFinds: number
  /** To-do tasks ticked off (P31). */
  readonly tasksCompleted: number
}

/** Counter names that hold one number (everything except `monsterWins`). */
export type NumericCounter = Exclude<keyof HeroCounters, 'monsterWins'>

export interface HeroState {
  readonly id: string
  readonly class: 'warrior'
  readonly level: number
  /** XP toward the next level. */
  readonly xp: number
  readonly lifetimeXp: number
  readonly hp: number
  readonly gold: number
  readonly status: HeroStatus
  readonly biomeId: string
  readonly targetBiomeId?: string
  readonly arriveAtTick?: number
  readonly reviveAtTick?: number
  readonly pausedFromStatus?: 'exploring' | 'resting'
  readonly wakeAtTick?: number
  readonly weaponId?: string
  readonly armorId?: string
  readonly heldItemId?: string
  /** P32: gear in the desk drawer, newest last, at most the catalog's drawer capacity; absent means empty. */
  readonly drawer?: readonly string[]
  /** Unequipped gear the bag holds; always a ladder tier's capacity (D61). */
  readonly bagCapacity: number
  readonly lastLevelUpTick: number
  readonly counters: HeroCounters
  /** Chosen in the companion; absent means balanced (D76). */
  readonly stance?: StanceId
  /** Potion cap from the pouch ladder (D77); absent means the catalog's `potionStackCap`. */
  readonly potionCap?: number
  /** An open merchant visit (D78); the simulator clears it once it expires. */
  readonly merchant?: MerchantVisit
  /** A pending narrative choice (D79); answered by the intent or resolved by the simulator at expiry. */
  readonly choice?: PendingChoice
  /** Active temporary effects (D80), at most three; expired ones are dropped on the next evaluation. */
  readonly effects?: readonly ActiveEffect[]
  /** P31: the office to-do list; absent until the hero's first evaluation under a catalog with to-do rules. */
  readonly todo?: TodoList
}

/** One to-do task. The biome and monster it names, its target and its reward are fixed when it is written. */
export interface TodoTask {
  /** The template's kind. */
  readonly templateId: TodoKind
  /** The biome an `explore_biome` or `defeat_monster` task names. */
  readonly biomeId?: string
  /** The monster a `defeat_monster` task names. */
  readonly monsterId?: string
  readonly target: number
  /** Never above the target and never down. */
  readonly progress: number
  /** Gold paid when it is ticked off. */
  readonly reward: number
  readonly addedTick: number
  /** Refills this task has seen unfinished while the hero was awake. */
  readonly refillsSeen: number
  /** Set when ticked off; the next refill replaces it. */
  readonly doneTick?: number
}

export interface TodoList {
  /** Exactly three. */
  readonly tasks: readonly TodoTask[]
  readonly lastRefillTick: number
  /**
   * UTC milliseconds of the local 07:00 that began the last refill's stand-up day. The next refill waits for a
   * 07:00 at least 20 hours after it, so a late refill never pushes later mornings back.
   */
  readonly lastStandupAt: number
  /** Set by the swap intent; a swap is used while this is at or after the last refill. */
  readonly swapUsedTick?: number
}

export interface ItemSnapshot {
  readonly id: string
  readonly templateId: string
  readonly contentVersion: string
  readonly kind: ItemKind
  readonly name: string
  readonly rarity: Rarity
  readonly requiredLevel: number
  readonly attack: number
  readonly defense: number
  readonly saleValue: number
  readonly quantity: number
  /** Affix rolled at generation (D81); absent on common and uncommon gear and on gear from earlier catalogs. */
  readonly affixId?: string
}

/** A new item before the adapter allocates its database ID. */
export type NewItem = Omit<ItemSnapshot, 'id'>

export type ItemChange =
  | { readonly type: 'potion_decrement'; readonly itemId: string; readonly deleteRow: boolean }
  | { readonly type: 'potion_increment'; readonly itemId: string }
  | { readonly type: 'create'; readonly destination: 'bag' | 'drawer' | 'held' | 'potion_stack'; readonly item: NewItem }

// ---------------------------------------------------------------- input/output

export interface SimulationInput {
  readonly hero: HeroState
  /** At most 32 rows, sorted lexically by ID. */
  readonly inventory: readonly ItemSnapshot[]
  readonly tick: number
  readonly content: ContentCatalog
  readonly simulationVersion: number
  readonly streams: StreamSeeds
  /** Newest first, at most two. Cosmetic history only; never changes game outcomes. */
  readonly recentSummaries?: readonly string[]
  /** D110: the hero the adapter picked for a raid this tick, when `planRaid` asked for one and it was raidable. */
  readonly raidTarget?: RaidTarget
  /** D110: the oldest pending raid against this hero; applied as the tick's event when the hero is exploring or resting. */
  readonly incomingRaid?: IncomingRaid
  /** P31: the tick's wall slot in UTC milliseconds; absent means `tick` quarter-hours after the epoch. */
  readonly tickAt?: number
  /** P31: the owner's last TRMNL UTC offset in seconds; absent means UTC (D106). */
  readonly utcOffsetSeconds?: number
}

export type Disposition =
  | 'advanced'
  | 'rested'
  | 'arrived'
  | 'departed'
  | 'revived'
  | 'waiting_dead'
  | 'waiting_travel'
  | 'paused'
  | 'sleeping'
  | 'inventory_sleep_started'

export type CombatOutcome = 'victory' | 'retreat' | 'death' | 'rescue'

export interface CombatRound {
  readonly heroDamage: number
  readonly monsterDamage: number
}

export type OutcomeDetail =
  | {
      readonly variant: 'combat'
      readonly monsterId: string
      readonly elite: boolean
      readonly monsterHpStart: number
      readonly monsterHpEnd: number
      readonly rounds: readonly CombatRound[]
      readonly outcome: CombatOutcome
      readonly xpGranted: number
      readonly goldGranted: number
      readonly gearDropped: boolean
      /** Adapter annotation from the awarded item; present only when gear dropped. */
      readonly gearRarity?: Rarity
    }
  | {
      readonly variant: 'loot'
      readonly found: 'gear' | 'potion' | 'gold' | 'bag' | 'pouch'
      readonly templateId?: string
      readonly rarity?: Rarity
      readonly destination?: 'bag' | 'drawer' | 'held'
      readonly goldGranted: number
      readonly jackpot: boolean
      readonly potionFullFallback: boolean
    }
  | {
      readonly variant: 'trap'
      readonly avoided: boolean
      readonly damage: number
      readonly outcome: 'survived' | 'death' | 'rescue'
    }
  | { readonly variant: 'rest'; readonly healing: number; readonly automatic: boolean; readonly resultingStatus: HeroStatus }
  | { readonly variant: 'travel'; readonly phase: 'depart' | 'arrive'; readonly fromBiomeId: string; readonly toBiomeId: string; readonly arrivalTick: number }
  | { readonly variant: 'revival'; readonly previousBiomeId: string; readonly safeBiomeId: string; readonly hpGranted: number; readonly reviveAtTick: number }
  | { readonly variant: 'merchant'; readonly offers: readonly MerchantOffer[]; readonly expiresAtTick: number }
  | { readonly variant: 'choice'; readonly phase: 'offered' | 'defaulted'; readonly eventId: string; readonly optionId?: string; readonly expiresAtTick: number }
  | {
      readonly variant: 'raid'
      /** This hero's side of the raid. */
      readonly role: 'raider' | 'target'
      readonly rivalHeroId: string
      readonly rivalName: string
      /** Whether this hero came out on top. */
      readonly won: boolean
      /** Gold this hero gained (won) or lost (lost), after the target-side clamp. */
      readonly gold: number
      readonly hpLost: number
      /** The tick the raider launched it. */
      readonly raidTick: number
      readonly outcome: 'survived' | 'death' | 'rescue'
    }
  | {
      readonly variant: 'todo'
      /** `done`: tasks ticked off this tick; `standup`: the tasks the refill wrote. */
      readonly phase: 'done' | 'standup'
      readonly tasks: readonly { readonly templateId: TodoKind; readonly label: string; readonly reward: number }[]
    }

export interface LogDetail {
  readonly v: 1
  readonly simulationVersion: number
  readonly contentVersion: string
  readonly disposition: Disposition
  readonly encounterKind?: EncounterKind
  readonly potionsUsed: number
  /** HP the automatic potion restored this tick, so the log can show it apart from net HP. Absent on logs written before 2026-10-07. */
  readonly potionHealing?: number
  readonly levelsGained: number
  readonly goldPenalty: number
  readonly heldFind: boolean
  /** P32: the tick's gear find went in the desk drawer. Absent when it did not. */
  readonly drawerFind?: boolean
  /** The bag grew this tick (D61). */
  readonly bagUpgrade?: BagUpgrade
  /** The potion pouch grew this tick (D77). */
  readonly pouchUpgrade?: BagUpgrade
  /** An effect this tick granted (D80). */
  readonly effectGained?: string
  readonly outcome: OutcomeDetail
}

export interface BagUpgrade {
  readonly from: number
  readonly to: number
  readonly tierId: string
  readonly source: 'milestone' | 'find'
}

export interface TickEvent {
  readonly kind: LogKind
  readonly summary: string
  readonly detail: LogDetail
  readonly deltas: { readonly xpEarned: number; readonly gold: number; readonly hp: number }
}

export interface TickMetrics {
  readonly encounter: EncounterKind | 'none'
  readonly victories: number
  readonly retreats: number
  readonly deaths: number
  readonly rescues: number
  readonly levelUps: number
  readonly potionsUsed: number
  readonly heldFinds: number
  readonly bagUpgrades: number
  readonly sleepStarts: number
  readonly wakes: number
  readonly elites: number
  readonly jackpots: number
  readonly merchantVisits: number
  readonly pouchUpgrades: number
  readonly choicesOffered: number
  readonly choicesDefaulted: number
  readonly effectsGained: number
  readonly raidsLaunched: number
  readonly raidsApplied: number
  readonly tasksCompleted: number
  readonly todoRefills: number
}

export interface SimulationResult {
  readonly nextHero: HeroState
  readonly itemChanges: readonly ItemChange[]
  readonly event?: TickEvent
  readonly metrics: TickMetrics
  readonly disposition: Disposition
  /** D110: a raid this hero launched; the adapter inserts it in the ledger and marks the target picked. */
  readonly raidLaunch?: RaidLaunch
  /** D110: the incoming raid was applied this tick; the adapter marks the ledger row applied. */
  readonly raidApplied?: boolean
  /** P31: to-do log lines logged after `event`, in order: tasks ticked off, then the stand-up. Never the tick's only story unless nothing else happened. */
  readonly extraEvents?: readonly TickEvent[]
}
