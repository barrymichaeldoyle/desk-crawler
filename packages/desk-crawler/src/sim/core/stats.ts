import type { HeroState, ItemSnapshot } from './types'

/** Shared stat formulas (gameplay.md). Used by the simulator, intents and UI comparisons. */
export const maxHp = (level: number): number => 100 + 12 * (level - 1)
export const baseAttack = (level: number): number => 10 + 2 * (level - 1)
export const baseDefense = (level: number): number => 4 + Math.floor(0.75 * (level - 1))
export { xpToLeave, cumulativeXpToReach, levelGroup } from '@trmnl-games/engine/levels'
import { xpToLeave } from '@trmnl-games/engine/levels'

export const pctOf = (value: number, pct: number): number => Math.ceil((value * pct) / 100)

export interface DerivedStats {
  readonly maxHp: number
  readonly attack: number
  readonly defense: number
  readonly xpToNext: number
}

export function deriveStats(hero: Pick<HeroState, 'level' | 'weaponId' | 'armorId'>, inventory: readonly ItemSnapshot[]): DerivedStats {
  const weapon = hero.weaponId === undefined ? undefined : inventory.find((item) => item.id === hero.weaponId)
  const armor = hero.armorId === undefined ? undefined : inventory.find((item) => item.id === hero.armorId)
  return {
    maxHp: maxHp(hero.level),
    attack: baseAttack(hero.level) + (weapon?.attack ?? 0),
    defense: baseDefense(hero.level) + (armor?.defense ?? 0),
    xpToNext: xpToLeave(hero.level),
  }
}

export interface LevelResult {
  readonly level: number
  readonly xp: number
  readonly levelsGained: number
  /** Total increase in maximum HP across all levels gained. */
  readonly maxHpGain: number
}

/** Apply granted XP: subtract each threshold, repeat for multiple levels. */
export function applyXp(level: number, xp: number, granted: number): LevelResult {
  let nextLevel = level
  let nextXp = xp + granted
  while (nextXp >= xpToLeave(nextLevel)) {
    nextXp -= xpToLeave(nextLevel)
    nextLevel += 1
  }
  return {
    level: nextLevel,
    xp: nextXp,
    levelsGained: nextLevel - level,
    maxHpGain: maxHp(nextLevel) - maxHp(level),
  }
}


