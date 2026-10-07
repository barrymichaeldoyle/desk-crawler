/**
 * Pure domain types for the simulator (domain-contracts.md).
 * No Convex, auth, connection or wall-clock types belong here.
 */

export type StreamName = 'encounter' | 'combat' | 'reward' | 'narrative'
export type StreamSeeds = Readonly<Record<StreamName, number>>

export type HeroStatus = 'exploring' | 'resting' | 'travelling' | 'dead' | 'paused' | 'sleeping'
export type EncounterKind = 'combat' | 'loot' | 'trap' | 'rest'
export type GearKind = 'weapon' | 'armor'
export type ItemKind = GearKind | 'potion'
export type Rarity = 'common' | 'uncommon' | 'rare'
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
  readonly lootWeights: Readonly<{ gear: number; potion: number; gold: number }>
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
  /** Unequipped gear the bag holds; always a ladder tier's capacity (D61). */
  readonly bagCapacity: number
  readonly lastLevelUpTick: number
  readonly counters: HeroCounters
  /** Chosen in the companion; absent means balanced (D76). */
  readonly stance?: StanceId
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
}

/** A new item before the adapter allocates its database ID. */
export type NewItem = Omit<ItemSnapshot, 'id'>

export type ItemChange =
  | { readonly type: 'potion_decrement'; readonly itemId: string; readonly deleteRow: boolean }
  | { readonly type: 'potion_increment'; readonly itemId: string }
  | { readonly type: 'create'; readonly destination: 'bag' | 'held' | 'potion_stack'; readonly item: NewItem }

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
      readonly found: 'gear' | 'potion' | 'gold' | 'bag'
      readonly templateId?: string
      readonly rarity?: Rarity
      readonly destination?: 'bag' | 'held'
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
  /** The bag grew this tick (D61). */
  readonly bagUpgrade?: BagUpgrade
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
}

export interface SimulationResult {
  readonly nextHero: HeroState
  readonly itemChanges: readonly ItemChange[]
  readonly event?: TickEvent
  readonly metrics: TickMetrics
  readonly disposition: Disposition
}
