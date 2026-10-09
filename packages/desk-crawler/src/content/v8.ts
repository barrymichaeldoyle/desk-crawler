import type { ContentCatalog } from '../sim/core/types'
import { contentV7 } from './v7'

/*
 * Content catalog v8 (P32): the desk drawer. Once the bag is full, each new
 * gear find goes in a six-slot drawer and the hero keeps adventuring; only a
 * find that arrives with the drawer full too is held, and the hero sleeps as
 * before. Nothing in the drawer is ever sold or discarded automatically. The
 * drawer draws no randomness, so everything else is v7.
 */
export const contentV8: ContentCatalog = {
  ...contentV7,
  contentVersion: 'v8',
  deskDrawer: {
    capacity: 6,
    firstUse: ['Bag full, so the {item} went in the desk drawer.'],
    firstDrop: ['Bag full, so the drop went in the desk drawer.'],
  },
}
