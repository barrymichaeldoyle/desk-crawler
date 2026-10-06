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
export type LogKind =
  | 'combat'
  | 'loot'
  | 'trap'
  | 'rest'
  | 'travel'
  | 'death'
  | 'revive'
  | 'levelup'
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

/** Placeholders: {monster} {xp} {gold} {damage} {heal} {item} {destination} {ticks} */
export interface BiomeNarrative {
  readonly victory: readonly string[]
  readonly lootGold: readonly string[]
  readonly trapHit: readonly string[]
  /** v4+: a deliberate callback when this mishap occurs twice consecutively. */
  readonly trapHitCallbacks?: Readonly<Record<string, string>>
  readonly rest: readonly string[]
  readonly eliteVictory: readonly string[]
  readonly jackpot: readonly string[]
  /** v3+: where gear turns up in this biome ({item}), pooled with the shared lines. */
  readonly lootGear?: readonly string[]
  /** v3+: arriving in this biome ({destination}), pooled with the shared lines. */
  readonly arrive?: readonly string[]
}

/** v3+: signature lines for one monster ({monster}, {xp}, {gold}), pooled with its biome's victories. */
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
  /** v3+: a level-up that opens a new area ({destination}). */
  readonly unlock?: readonly string[]
}

export interface SimulationConstants {
  readonly bagCapacity: number
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
  readonly narrative: Readonly<{ biomes: Readonly<Record<string, BiomeNarrative>>; shared: SharedNarrative; monsters?: Readonly<Record<string, MonsterNarrative>>; avoidConsecutiveRepeats?: boolean }>
}

// ---------------------------------------------------------------- hero and items

export interface HeroCounters {
  readonly combatWins: number
  readonly retreats: number
  readonly deaths: number
  readonly rescues: number
  readonly goldEarned: number
  readonly itemsFound: number
  readonly ticksExplored: number
}

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
  readonly lastLevelUpTick: number
  readonly counters: HeroCounters
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
      /** Optional adapter annotation from the awarded item; older combat logs omit it. */
      readonly gearRarity?: Rarity
    }
  | {
      readonly variant: 'loot'
      readonly found: 'gear' | 'potion' | 'gold'
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
  readonly levelsGained: number
  readonly goldPenalty: number
  readonly heldFind: boolean
  readonly outcome: OutcomeDetail
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
