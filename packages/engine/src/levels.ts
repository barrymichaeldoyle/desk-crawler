/** Shared level curve and ranking bands (gameplay.md, ranking.md), used by every game so boards group the same way. */

/** XP required to leave level L. */
export const xpToLeave = (level: number): number => Math.floor(50 * level ** 1.6)

export function cumulativeXpToReach(level: number): number {
  let total = 0
  for (let l = 1; l < level; l += 1) total += xpToLeave(l)
  return total
}

export interface LevelGroup {
  readonly key: string
  readonly min: number
  readonly max: number
  readonly label: string
}

/** Recent-ranking level groups (ranking.md): 1–3, then four-level bands from 4. */
export function levelGroup(level: number): LevelGroup {
  if (level <= 3) return { key: '1-3', min: 1, max: 3, label: 'Levels 1-3' }
  const min = 4 + 4 * Math.floor((level - 4) / 4)
  const max = min + 3
  return { key: `${min}-${max}`, min, max, label: `Levels ${min}-${max}` }
}
