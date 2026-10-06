import { v } from 'convex/values'

/** Validator for the simulator's LogDetail v1 (domain-contracts.md) plus command/lifecycle details. */
const disposition = v.union(
  v.literal('advanced'),
  v.literal('rested'),
  v.literal('arrived'),
  v.literal('departed'),
  v.literal('revived'),
  v.literal('waiting_dead'),
  v.literal('waiting_travel'),
  v.literal('paused'),
  v.literal('sleeping'),
  v.literal('inventory_sleep_started'),
)
const encounterKind = v.union(v.literal('combat'), v.literal('loot'), v.literal('trap'), v.literal('rest'))
const rarity = v.union(v.literal('common'), v.literal('uncommon'), v.literal('rare'))
const status = v.union(
  v.literal('exploring'),
  v.literal('resting'),
  v.literal('travelling'),
  v.literal('dead'),
  v.literal('paused'),
  v.literal('sleeping'),
)

const outcome = v.union(
  v.object({
    variant: v.literal('combat'),
    monsterId: v.string(),
    elite: v.boolean(),
    monsterHpStart: v.number(),
    monsterHpEnd: v.number(),
    rounds: v.array(v.object({ heroDamage: v.number(), monsterDamage: v.number() })),
    outcome: v.union(v.literal('victory'), v.literal('retreat'), v.literal('death'), v.literal('rescue')),
    xpGranted: v.number(),
    goldGranted: v.number(),
    gearDropped: v.boolean(),
    gearRarity: v.optional(rarity),
  }),
  v.object({
    variant: v.literal('loot'),
    found: v.union(v.literal('gear'), v.literal('potion'), v.literal('gold'), v.literal('bag')),
    templateId: v.optional(v.string()),
    rarity: v.optional(rarity),
    destination: v.optional(v.union(v.literal('bag'), v.literal('held'))),
    goldGranted: v.number(),
    jackpot: v.boolean(),
    potionFullFallback: v.boolean(),
  }),
  v.object({
    variant: v.literal('trap'),
    avoided: v.boolean(),
    damage: v.number(),
    outcome: v.union(v.literal('survived'), v.literal('death'), v.literal('rescue')),
  }),
  v.object({ variant: v.literal('rest'), healing: v.number(), automatic: v.boolean(), resultingStatus: status }),
  v.object({
    variant: v.literal('travel'),
    phase: v.union(v.literal('depart'), v.literal('arrive')),
    fromBiomeId: v.string(),
    toBiomeId: v.string(),
    arrivalTick: v.number(),
  }),
  v.object({
    variant: v.literal('revival'),
    previousBiomeId: v.string(),
    safeBiomeId: v.string(),
    hpGranted: v.number(),
    reviveAtTick: v.number(),
  }),
)

export const simulationDetail = v.object({
  v: v.literal(1),
  simulationVersion: v.number(),
  contentVersion: v.string(),
  disposition,
  encounterKind: v.optional(encounterKind),
  potionsUsed: v.number(),
  /** HP restored by the automatic potion (added 2026-10-07; older logs omit it). */
  potionHealing: v.optional(v.number()),
  levelsGained: v.number(),
  goldPenalty: v.number(),
  heldFind: v.boolean(),
  bagUpgrade: v.optional(v.object({ from: v.number(), to: v.number(), tierId: v.string(), source: v.union(v.literal('milestone'), v.literal('find')) })),
  outcome,
})

export const commandDetail = v.object({
  v: v.literal(1),
  operation: v.string(),
  result: v.optional(v.string()),
  /** Bag slots a purchase added (D61). */
  bagSlots: v.optional(v.number()),
})

/** One earned achievement (D65); the name is copied so reads never need the catalog. */
export const achievementDetail = v.object({
  v: v.literal(1),
  achievementId: v.string(),
  name: v.string(),
  family: v.string(),
  tier: v.number(),
})

export const logDetail = v.union(simulationDetail, commandDetail, achievementDetail)
