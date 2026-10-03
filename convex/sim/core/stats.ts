import type { HeroState, ItemSnapshot } from './types'

/** Shared stat formulas (gameplay.md). Used by the simulator, intents and UI comparisons. */
export const maxHp = (level: number): number => 100 + 12 * (level - 1)
export const baseAttack = (level: number): number => 10 + 2 * (level - 1)
export const baseDefense = (level: number): number => 4 + Math.floor(0.75 * (level - 1))
/** XP required to leave level L. */
export const xpToLeave = (level: number): number => Math.floor(50 * level ** 1.6)

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

/** Total XP needed from level 1 to reach `level` with zero current XP. */
export function cumulativeXpToReach(level: number): number {
  let total = 0
  for (let l = 1; l < level; l += 1) total += xpToLeave(l)
  return total
}

/** Recent-ranking level groups (ranking.md): 1–3, then four-level bands from 4. */
export function levelGroup(level: number): { readonly key: string; readonly min: number; readonly max: number; readonly label: string } {
  if (level <= 3) return { key: '1-3', min: 1, max: 3, label: 'Levels 1-3' }
  const min = 4 + 4 * Math.floor((level - 4) / 4)
  const max = min + 3
  return { key: `${min}-${max}`, min, max, label: `Levels ${min}-${max}` }
}
