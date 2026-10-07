import type { ContentCatalog, HeroState, PouchTier } from './types'

/**
 * Potion pouch rules (D77), the potion counterpart of the bag ladder: each
 * hero stores a cap from the content's ladder; a catalog without a ladder, or
 * a hero without a cap, uses `constants.potionStackCap`.
 */

type PouchHero = Pick<HeroState, 'level' | 'potionCap'>

/** The potion cap this hero plays with. */
export function potionCap(content: ContentCatalog, hero: Pick<HeroState, 'potionCap'>): number {
  return hero.potionCap ?? content.potionPouch?.tiers[0]?.cap ?? content.constants.potionStackCap
}

function tierIndex(content: ContentCatalog, hero: PouchHero): number {
  const tiers = content.potionPouch?.tiers ?? []
  const cap = potionCap(content, hero)
  return tiers.findIndex((tier) => tier.cap === cap)
}

/** Highest pouch tier the hero's level guarantees. */
export function guaranteedPouchIndex(content: ContentCatalog, hero: PouchHero): number {
  let index = 0
  ;(content.potionPouch?.tiers ?? []).forEach((tier, i) => {
    if (tier.milestone === undefined || hero.level >= tier.milestone.level) index = i
  })
  return index
}

/** A milestone upgrade due now, if the pouch is below the guaranteed tier. */
export function pouchMilestoneUpgrade(content: ContentCatalog, hero: PouchHero): PouchTier | undefined {
  const tiers = content.potionPouch?.tiers
  if (tiers === undefined) return undefined
  const guaranteed = tiers[guaranteedPouchIndex(content, hero)]!
  return guaranteed.cap > potionCap(content, hero) ? guaranteed : undefined
}

/** The next tier a find or purchase may grant: one rung up, never more than one rung ahead of the guaranteed tier. */
export function nextEarlyPouchTier(content: ContentCatalog, hero: PouchHero): PouchTier | undefined {
  const tiers = content.potionPouch?.tiers
  if (tiers === undefined) return undefined
  const current = tierIndex(content, hero)
  const next = tiers[current + 1]
  if (current < 0 || next === undefined || current + 1 > guaranteedPouchIndex(content, hero) + 1) return undefined
  return next
}

export function currentPouchTier(content: ContentCatalog, hero: PouchHero): PouchTier | undefined {
  return content.potionPouch?.tiers[tierIndex(content, hero)]
}

/** The tier after the current one, for display, regardless of eligibility. */
export function nextPouchTier(content: ContentCatalog, hero: PouchHero): PouchTier | undefined {
  const current = tierIndex(content, hero)
  return current < 0 ? undefined : content.potionPouch?.tiers[current + 1]
}
