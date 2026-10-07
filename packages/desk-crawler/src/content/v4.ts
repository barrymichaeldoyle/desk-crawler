import type { ContentCatalog } from '../sim/core/types'
import { contentV3 } from './v3'

/*
 * Content catalog v4 (D77/D78): the potion pouch ladder and the wandering
 * merchant. The pouch is the potion counterpart of the bag ladder: a hero
 * starts with the same 20-potion cap as before and can grow it by milestone,
 * a rare find or a purchase. The merchant is a loot outcome (6 of 100 loot
 * draws, taken from the gold share) that opens a few priced offers in the
 * companion for four adventures. Monsters, gear, stances and narrative are v3.
 */
export const contentV4: ContentCatalog = {
  ...contentV3,
  contentVersion: 'v4',
  constants: {
    ...contentV3.constants,
    lootWeights: { gear: 15, potion: 20, gold: 59, merchant: 6 },
  },
  potionPouch: {
    tiers: [
      { id: 'thermos', name: 'Thermos', cap: 20 },
      { id: 'lunchbox', name: 'Lunchbox', cap: 30, milestone: { level: 6 }, price: 120 },
      { id: 'cooler_bag', name: 'Cooler Bag', cap: 40, milestone: { level: 10 }, price: 450 },
      { id: 'vending_cart', name: 'Vending Cart', cap: 60, milestone: { level: 14 }, price: 1500 },
    ],
    findPermille: 8,
  },
  merchant: { potionPrice: 12, maxPotionsOffered: 3, staysForTicks: 4 },
}
