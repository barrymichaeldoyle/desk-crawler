import { potionCap } from './pouch'
import { maxHp, pctOf } from './stats'
import type { ChoiceEffect, ChoiceOption, ContentCatalog, EventTemplate, HeroState } from './types'

/**
 * Narrative choices (D79). One pure resolver applies an option's authored effect, so the companion intent and the
 * simulator's expiry default produce exactly the same change for the same hero; neither path can award twice,
 * because the pending choice is cleared in the same transaction that applies the effect.
 */

export function eventById(content: ContentCatalog, eventId: string): EventTemplate | undefined {
  return content.choices?.events.find((event) => event.id === eventId)
}

export function optionOf(event: EventTemplate, optionId: string): ChoiceOption | undefined {
  return event.options.find((option) => option.id === optionId)
}

export interface ChoiceResolution {
  readonly gold: number
  readonly hp: number
  readonly potions: number
}

/** The concrete change an effect makes to this hero: gold clamped at zero, HP within 1..max, potions within the pouch. */
export function resolveEffect(content: ContentCatalog, hero: Pick<HeroState, 'level' | 'hp' | 'gold' | 'potionCap'>, potionsHeld: number, effect: ChoiceEffect, biomeTier: number): ChoiceResolution {
  const max = maxHp(hero.level)
  const goldChange = (effect.gold ?? 0) + (effect.goldPerTier ?? 0) * biomeTier
  const gold = Math.max(-hero.gold, goldChange)
  const hpChange = effect.hpPct === undefined ? 0 : effect.hpPct > 0 ? Math.min(max - hero.hp, pctOf(max, effect.hpPct)) : -Math.min(hero.hp - 1, pctOf(max, -effect.hpPct))
  const potions = Math.max(0, Math.min(effect.potions ?? 0, potionCap(content, hero) - potionsHeld))
  return { gold, hp: hpChange, potions }
}
