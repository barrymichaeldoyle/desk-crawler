import { xpToLeave } from '@trmnl-games/engine/levels'

export interface LevelResult {
  readonly level: number
  readonly xp: number
  readonly levelsGained: number
}

/** Apply granted XP on the shared curve (the Desk Crawler curve, so ranking bands match). */
export function applyXp(level: number, xp: number, granted: number): LevelResult {
  let nextLevel = level
  let nextXp = xp + granted
  while (nextXp >= xpToLeave(nextLevel)) {
    nextXp -= xpToLeave(nextLevel)
    nextLevel += 1
  }
  return { level: nextLevel, xp: nextXp, levelsGained: nextLevel - level }
}

/** "1.4 kg" from 1 kg up, "640 g" below. */
export function formatWeight(grams: number): string {
  if (grams >= 1000) return `${(Math.round(grams / 100) / 10).toFixed(1)} kg`
  return `${grams} g`
}

/** Sale value by weight: between the base price and double it. */
export const fishValue = (price: number, grams: number, maxGrams: number): number => Math.round(price * (1 + Math.min(grams, maxGrams) / maxGrams))
/** XP by weight: between the base XP and double it. */
export const fishXp = (xp: number, grams: number, maxGrams: number): number => Math.round(xp * (1 + Math.min(grams, maxGrams) / maxGrams))

/** "A" or "An" before a weight as it is spoken: an 8.0 kg, an 11 kg, an 18 kg, an 800 g. */
export function articleFor(weight: string): 'A' | 'An' {
  const whole = parseInt(weight, 10)
  return String(whole).startsWith('8') || whole === 11 || whole === 18 ? 'An' : 'A'
}
