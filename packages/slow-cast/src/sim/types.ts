/**
 * Slow Cast pure-core types (slow-cast.md "Rules"). Weights are whole grams and
 * every multiplier is a whole percent, so the core never depends on float
 * rounding beyond the PRNG's own documented draws.
 */

export type WaterId = 'millpond' | 'river_bend' | 'harbour_pier'
export type BaitClass = 'worms' | 'bread' | 'maggots' | 'spinner' | 'ragworm' | 'strip'
export type TimeBand = 'dawn' | 'day' | 'dusk' | 'night'
export type Weather = 'clear' | 'overcast' | 'rain' | 'wind' | 'fog'
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic'
export type AccessId = 'waders' | 'pier_permit'
export type StreamName = 'bite' | 'species' | 'size' | 'narrative'
export type StreamSeeds = Readonly<Record<StreamName, number>>

export interface SpeciesDef {
  readonly id: string
  readonly name: string
  readonly water: WaterId
  readonly rarity: Rarity
  /** Draw weight overriding the rarity's, for a species whose window is unusually wide or narrow. */
  readonly weight?: number
  readonly minGrams: number
  readonly maxGrams: number
  /** Bait classes the species takes; `anyBait` also takes a bare hook. */
  readonly baits: readonly BaitClass[]
  readonly anyBait?: true
  /** Time bands the species feeds in; absent means always. */
  readonly times?: readonly TimeBand[]
  /** Weather the species needs; absent means any. */
  readonly weather?: readonly Weather[]
  /** Base sale price in gold; a fish sells for between this and double it by weight. */
  readonly price: number
  /** Base XP; a fish earns between this and double it by weight. */
  readonly xp: number
}

export interface WaterDef {
  readonly id: WaterId
  readonly name: string
  /** Short name for device lines ("the Millpond"). */
  readonly the: string
  readonly unlockLevel: number
  readonly access?: AccessId
  /** Chance a cast gets a bite before multipliers, in permille. */
  readonly biteBasePermille: number
  readonly baits: readonly BaitClass[]
  /** Six-hour forecast weights. */
  readonly weather: ReadonlyArray<readonly [Weather, number]>
  readonly timePercent: Readonly<Record<TimeBand, number>>
  readonly weatherPercent: Readonly<Record<Weather, number>>
}

export interface RodDef {
  readonly tier: number
  readonly id: string
  readonly name: string
  readonly limitGrams: number
  /** Added to the bite chance as a percent of itself. */
  readonly biteBonusPercent: number
  readonly price: number
}

export interface BaitDef {
  readonly class: BaitClass
  readonly name: string
  /** As it reads in a story: "took the bread". */
  readonly the: string
  /** Bites one tub lasts (a bite uses one unit). */
  readonly castsPerTub: number
  readonly price: number
}

export interface CoolerDef {
  readonly tier: number
  readonly id: string
  readonly name: string
  readonly capacity: number
  readonly price: number
}

export interface AccessDef {
  readonly id: AccessId
  readonly name: string
  readonly water: WaterId
  readonly price: number
}

export interface SlowCastCatalog {
  readonly contentVersion: string
  readonly waters: readonly WaterDef[]
  readonly species: readonly SpeciesDef[]
  readonly rods: readonly RodDef[]
  readonly baits: readonly BaitDef[]
  readonly coolers: readonly CoolerDef[]
  readonly access: readonly AccessDef[]
  /** Draw weight per rarity before filtering, per thousand. */
  readonly rarityWeights: Readonly<Record<Rarity, number>>
  /** A bare hook's bite chance as a percent of a baited one. */
  readonly bareHookPercent: number
  /** Most units of one bait an angler may hold (a few days of bites). */
  readonly baitCap: number
  /** A quiet tick writes an ambient line every this many quiet ticks. */
  readonly ambientEvery: number
  /** Ambient lines per water. */
  readonly ambient: Readonly<Record<WaterId, readonly string[]>>
  /** Local-hour boundaries: dawn starts, day starts, dusk starts, night starts. */
  readonly bands: { readonly dawn: number; readonly day: number; readonly dusk: number; readonly night: number }
}

export interface LogbookEntry {
  readonly count: number
  readonly bestGrams: number
  readonly firstTick: number
}

export interface AnglerCounters {
  readonly casts: number
  readonly bites: number
  readonly fishCaught: number
  readonly released: number
  readonly gotAway: number
  readonly rareCaught: number
  readonly epicCaught: number
  readonly nightCatches: number
  readonly heaviestGrams: number
  readonly goldEarned: number
  readonly fishSold: number
  readonly trips: number
  readonly baitRunOuts: number
}

export type AnglerStatus = 'fishing' | 'paused'

export interface AnglerState {
  readonly level: number
  readonly xp: number
  readonly lifetimeXp: number
  readonly gold: number
  readonly lastLevelUpTick: number
  readonly status: AnglerStatus
  readonly waterId: WaterId
  /** Set by the travel intent; the next evaluation moves there instead of casting. */
  readonly travelTo?: WaterId
  readonly rodTier: number
  readonly coolerTier: number
  readonly baitOnHook?: BaitClass
  readonly bait: Readonly<Partial<Record<BaitClass, number>>>
  readonly access: readonly AccessId[]
  readonly logbook: Readonly<Record<string, LogbookEntry>>
  readonly counters: AnglerCounters
  /** Quiet ticks since the last bite or ambient line. */
  readonly quietTicks: number
}

export interface CatchRecord {
  readonly speciesId: string
  readonly grams: number
  readonly value: number
  readonly caughtTick: number
}

export type EventKind = 'catch' | 'release' | 'got_away' | 'ambient' | 'travel' | 'bait_out' | 'levelup' | 'system'

export interface EventDetail {
  readonly speciesId?: string
  readonly grams?: number
  readonly value?: number
  readonly record?: boolean
  readonly firstOfSpecies?: boolean
  readonly waterId?: WaterId
  readonly bait?: BaitClass
  readonly level?: number
  readonly weather?: Weather
  readonly band?: TimeBand
}

export interface TickEvent {
  readonly kind: EventKind
  readonly summary: string
  readonly detail: EventDetail
  readonly deltas: { readonly xpEarned: number; readonly gold: number }
}

export interface Conditions {
  readonly band: TimeBand
  readonly weather: Weather
}

export interface CastInput {
  readonly angler: AnglerState
  /** Fish already in the cooler. */
  readonly coolerCount: number
  readonly tick: number
  /** The run's wall slot, epoch milliseconds (never the clock). */
  readonly tickAt: number
  /** The owner's last TRMNL UTC offset; UTC without one (D106). */
  readonly utcOffsetSeconds?: number
  /** This water's weather for the tick's six-hour block, from the shared forecast. */
  readonly weather: Weather
  readonly content: SlowCastCatalog
  readonly streams: StreamSeeds
}

export interface CastMetrics {
  readonly landed: number
  readonly released: number
  readonly gotAway: number
  readonly levelUps: number
}

export interface CastResult {
  readonly angler: AnglerState
  readonly catch?: CatchRecord
  readonly event?: TickEvent
  readonly extraEvents?: readonly TickEvent[]
  readonly conditions: Conditions
  readonly metrics: CastMetrics
  /** `cast` advanced the angler; `travelled` moved it; `paused` did nothing. */
  readonly disposition: 'cast' | 'travelled' | 'paused'
}
