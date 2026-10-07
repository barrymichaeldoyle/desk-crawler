import { deriveStats, type DerivedStats } from './stats'
import type { ActiveEffect, AffixRule, ContentCatalog, EffectRule, HeroState, ItemSnapshot, Modifiers } from './types'

/**
 * Affix and effect resolution (D80/D81): one place sums every active modifier and derives the stats the hero fights
 * with. Unknown affix or effect ids (gear or heroes from another catalog) contribute nothing and never fail.
 */

export const MAX_ACTIVE_EFFECTS = 3

export function affixById(content: ContentCatalog, id: string | undefined): AffixRule | undefined {
  return id === undefined ? undefined : content.affixes?.find((affix) => affix.id === id)
}

export function effectById(content: ContentCatalog, id: string): EffectRule | undefined {
  return content.effects?.find((effect) => effect.id === id)
}

/** Effects still running at `tick`, in stored order. */
export function liveEffects(effects: readonly ActiveEffect[] | undefined, tick: number): ActiveEffect[] {
  return (effects ?? []).filter((effect) => effect.untilTick > tick)
}

/** Adds or refreshes an effect; a fourth one pushes out the one ending soonest. */
export function withEffect(effects: readonly ActiveEffect[] | undefined, rule: EffectRule, tick: number): ActiveEffect[] {
  const kept = liveEffects(effects, tick).filter((effect) => effect.id !== rule.id)
  while (kept.length >= MAX_ACTIVE_EFFECTS) kept.splice(kept.reduce((soonest, effect, index) => (effect.untilTick < kept[soonest]!.untilTick ? index : soonest), 0), 1)
  return [...kept, { id: rule.id, untilTick: tick + rule.durationTicks }]
}

const add = (total: Modifiers, more: Modifiers): Modifiers => ({
  attackPct: (total.attackPct ?? 0) + (more.attackPct ?? 0),
  defensePct: (total.defensePct ?? 0) + (more.defensePct ?? 0),
  xpPct: (total.xpPct ?? 0) + (more.xpPct ?? 0),
  goldPct: (total.goldPct ?? 0) + (more.goldPct ?? 0),
  trapDamagePct: (total.trapDamagePct ?? 0) + (more.trapDamagePct ?? 0),
  healOnVictoryPct: (total.healOnVictoryPct ?? 0) + (more.healOnVictoryPct ?? 0),
  goldLossPct: (total.goldLossPct ?? 0) + (more.goldLossPct ?? 0),
})

/** Every modifier in play: the equipped items' affixes plus the hero's live effects. */
export function activeModifiers(content: ContentCatalog, hero: Pick<HeroState, 'weaponId' | 'armorId' | 'effects'>, inventory: readonly ItemSnapshot[], tick: number): Required<Modifiers> {
  let total: Modifiers = {}
  for (const id of [hero.weaponId, hero.armorId]) {
    const item = id === undefined ? undefined : inventory.find((candidate) => candidate.id === id)
    const affix = affixById(content, item?.affixId)
    if (affix) total = add(total, affix.modifiers)
  }
  for (const active of liveEffects(hero.effects, tick)) {
    const rule = effectById(content, active.id)
    if (rule) total = add(total, rule.modifiers)
  }
  return add(total, {}) as Required<Modifiers>
}

/** Scales a positive amount by percentage points, floored, never below one when the base was positive. */
export const scaled = (amount: number, pct: number): number => (amount <= 0 ? amount : Math.max(1, Math.floor((amount * (100 + pct)) / 100)))

/** Derived stats with affixes and effects applied: what the hero actually fights with. */
export function effectiveStats(content: ContentCatalog, hero: Pick<HeroState, 'level' | 'weaponId' | 'armorId' | 'effects'>, inventory: readonly ItemSnapshot[], tick: number): DerivedStats & { readonly modifiers: Required<Modifiers> } {
  const base = deriveStats(hero, inventory)
  const modifiers = activeModifiers(content, hero, inventory, tick)
  return { ...base, attack: scaled(base.attack, modifiers.attackPct), defense: scaled(base.defense, modifiers.defensePct), modifiers }
}
