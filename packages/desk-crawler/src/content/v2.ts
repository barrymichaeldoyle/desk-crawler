import type { ContentCatalog } from '../sim/core/types'
import { contentV1 } from './v1'

/*
 * Content catalog v2 (D71): the hero takes better care of itself in the
 * dangerous zones. A tier-3 fight can take over half of a level-8 hero's
 * health, so drinking at 35% and resting at 25% left the hero walking into
 * the Cafeteria Depths one hit from a knockout. Everything else is v1:
 * monsters, gear, rewards, narrative and the bag ladder are untouched, so
 * owned items and pinned runs keep their meaning (docs/evidence/balance.md).
 */
export const contentV2: ContentCatalog = {
  ...contentV1,
  contentVersion: 'v2',
  constants: {
    ...contentV1.constants,
    autoPotionBelowPct: 50,
    restBelowPct: 35,
  },
}
