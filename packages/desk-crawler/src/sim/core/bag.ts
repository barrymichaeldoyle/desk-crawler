import type { BagLadder, BagTier, ContentCatalog, HeroState, ItemSnapshot } from './types'

/**
 * Bag capacity rules (D61). Each hero stores a capacity from the content's
 * ladder; it counts only unequipped gear that is neither held nor in the desk
 * drawer (P32), so equipped gear and potions take no space.
 */

type BagHero = Pick<HeroState, 'heldItemId' | 'weaponId' | 'armorId' | 'drawer'>
type ProgressHero = Pick<HeroState, 'level' | 'counters' | 'bagCapacity'>

/** Gear occupying bag slots. */
export function bagUsed(hero: BagHero, inventory: readonly Pick<ItemSnapshot, 'id' | 'kind'>[]): number {
  const outside = new Set([hero.heldItemId, hero.weaponId, hero.armorId, ...(hero.drawer ?? [])])
  return inventory.filter((item) => item.kind !== 'potion' && !outside.has(item.id)).length
}

export function isBagFull(hero: BagHero & Pick<HeroState, 'bagCapacity'>, inventory: readonly Pick<ItemSnapshot, 'id' | 'kind'>[]): boolean {
  return bagUsed(hero, inventory) >= hero.bagCapacity
}

/** P32: drawer slots under this catalog; 0 before the drawer exists. */
export function drawerCapacity(content: Pick<ContentCatalog, 'deskDrawer'>): number {
  return content.deskDrawer?.capacity ?? 0
}

/** P32: the desk drawer has a free slot for the next overflow find. */
export function drawerHasRoom(hero: Pick<HeroState, 'drawer'>, content: Pick<ContentCatalog, 'deskDrawer'>): boolean {
  return (hero.drawer?.length ?? 0) < drawerCapacity(content)
}

/** P32: the next gear find has somewhere to go, the bag or the drawer; what resuming from inventory sleep needs. */
export function hasRoomForFind(
  hero: BagHero & Pick<HeroState, 'bagCapacity'>,
  inventory: readonly Pick<ItemSnapshot, 'id' | 'kind'>[],
  content: Pick<ContentCatalog, 'deskDrawer'>,
): boolean {
  return !isBagFull(hero, inventory) || drawerHasRoom(hero, content)
}

/** Index of the tier the hero holds; -1 only for a capacity that is not a tier (an invariant failure). */
function tierIndex(ladder: BagLadder, capacity: number): number {
  return ladder.tiers.findIndex((tier) => tier.capacity === capacity)
}

function milestoneMet(tier: BagTier, hero: ProgressHero): boolean {
  const m = tier.milestone
  if (m === undefined) return true
  return (m.ticksExplored !== undefined && hero.counters.ticksExplored >= m.ticksExplored) || (m.level !== undefined && hero.level >= m.level)
}

/** Highest tier every hero is guaranteed by their progress. */
export function guaranteedTierIndex(ladder: BagLadder, hero: ProgressHero): number {
  let index = 0
  ladder.tiers.forEach((tier, i) => {
    if (milestoneMet(tier, hero)) index = i
  })
  return index
}

/** A milestone upgrade due now, if the hero's bag is below the guaranteed tier. */
export function milestoneUpgrade(content: ContentCatalog, hero: ProgressHero): BagTier | undefined {
  const guaranteed = content.bagLadder.tiers[guaranteedTierIndex(content.bagLadder, hero)]!
  return guaranteed.capacity > hero.bagCapacity ? guaranteed : undefined
}

/** The next tier a find or purchase may grant: one rung up, and never more than one rung ahead of the guaranteed tier. */
export function nextEarlyTier(content: ContentCatalog, hero: ProgressHero): BagTier | undefined {
  const ladder = content.bagLadder
  const current = tierIndex(ladder, hero.bagCapacity)
  const next = ladder.tiers[current + 1]
  if (current < 0 || next === undefined || current + 1 > guaranteedTierIndex(ladder, hero) + 1) return undefined
  return next
}

export function currentTier(content: ContentCatalog, hero: Pick<HeroState, 'bagCapacity'>): BagTier | undefined {
  return content.bagLadder.tiers[tierIndex(content.bagLadder, hero.bagCapacity)]
}

/** The tier after the hero's current one (for display), regardless of eligibility. */
export function nextTier(content: ContentCatalog, hero: Pick<HeroState, 'bagCapacity'>): BagTier | undefined {
  const current = tierIndex(content.bagLadder, hero.bagCapacity)
  return current < 0 ? undefined : content.bagLadder.tiers[current + 1]
}
