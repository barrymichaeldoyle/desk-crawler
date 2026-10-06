import { ACHIEVEMENTS, ACHIEVEMENT_FAMILIES, ACHIEVEMENTS_VERSION, type AchievementDef, type AchievementPredicate } from '../../content/achievements'
import type { ContentCatalog, HeroCounters } from './types'

/**
 * Pure achievement evaluation (achievements.md, D65). No database, clock or
 * RNG: a predicate is a function of bounded hero state, so the adapter can
 * diff before/after states each tick and run one full pass when the catalog
 * version moves. Deterministic and covered by unit tests and the harness.
 */

/** The bounded state every predicate reads. */
export interface AchievementState {
  readonly level: number
  readonly bagCapacity: number
  readonly counters: HeroCounters
  readonly keepsakeTotal: number
}

/** Current value and target of one predicate, for progress figures and tests. */
export function measure(predicate: AchievementPredicate, state: AchievementState, content: ContentCatalog): { value: number; target: number } {
  const wins = state.counters.monsterWins
  const at = (id: string) => wins[id] ?? 0
  switch (predicate.kind) {
    case 'counter':
      return { value: state.counters[predicate.counter], target: predicate.atLeast }
    case 'monster':
      return { value: at(predicate.monsterId), target: predicate.atLeast }
    case 'level':
      return { value: state.level, target: predicate.atLeast }
    case 'bag':
      return { value: state.bagCapacity, target: predicate.atLeast }
    case 'keepsakes':
      return { value: state.keepsakeTotal, target: predicate.atLeast }
    case 'everyMonster':
      return { value: content.monsters.filter((m) => at(m.id) >= predicate.atLeast).length, target: content.monsters.length }
    case 'everyBiome':
      return { value: content.biomes.filter((b) => b.monsterIds.some((id) => at(id) >= predicate.atLeast)).length, target: content.biomes.length }
    case 'biomeMonsters': {
      const biome = content.biomes.find((b) => b.id === predicate.biomeId)
      const ids = biome?.monsterIds ?? []
      return { value: ids.filter((id) => at(id) >= predicate.atLeast).length, target: ids.length }
    }
  }
}

export function satisfied(predicate: AchievementPredicate, state: AchievementState, content: ContentCatalog): boolean {
  const { value, target } = measure(predicate, state, content)
  return target > 0 && value >= target
}

/** Every achievement the state satisfies, in catalog order. */
export function allSatisfied(state: AchievementState, content: ContentCatalog): AchievementDef[] {
  return ACHIEVEMENTS.filter((def) => satisfied(def.predicate, state, content))
}

/** Achievements `after` satisfies that `before` did not: the per-tick fast path, no storage read needed. */
export function newlyUnlocked(before: AchievementState, after: AchievementState, content: ContentCatalog): AchievementDef[] {
  return ACHIEVEMENTS.filter((def) => satisfied(def.predicate, after, content) && !satisfied(def.predicate, before, content))
}

/** A hero evaluated against an older (or no) catalog needs one full pass. */
export const needsFullPass = (achievementsVersion: number | undefined): boolean => (achievementsVersion ?? 0) < ACHIEVEMENTS_VERSION

export interface FamilyProgress {
  readonly family: string
  readonly name: string
  readonly category: string
  /** Highest earned tier (0 when none). */
  readonly tier: number
  readonly tiers: number
  readonly earned: AchievementDef | null
  readonly next: AchievementDef | null
  /** Progress toward `next`: current value and its target. */
  readonly value: number
  readonly target: number
}

/** One row per family for the companion: current rung, the next one and the figure toward it. */
export function familyProgress(state: AchievementState, content: ContentCatalog, unlocked: ReadonlySet<string>): FamilyProgress[] {
  return ACHIEVEMENT_FAMILIES.map((family) => {
    const tiers = ACHIEVEMENTS.filter((def) => def.family === family.id)
    const earned = [...tiers].reverse().find((def) => unlocked.has(def.id)) ?? null
    const next = tiers.find((def) => def.tier === (earned?.tier ?? 0) + 1) ?? null
    const { value, target } = measure((next ?? earned ?? tiers[0]!).predicate, state, content)
    return { family: family.id, name: family.name, category: family.category, tier: earned?.tier ?? 0, tiers: tiers.length, earned, next, value, target }
  })
}
