import type { ContentCatalog } from '../sim/core/types'
import { contentV1 } from './v1'
import { contentV2 } from './v2'
import { contentV3 } from './v3'
import { contentV4 } from './v4'
import { contentV5 } from './v5'
import { contentV6 } from './v6'
import { contentV7 } from './v7'
import { contentV8 } from './v8'

/**
 * Every supported catalog version. Runs pin one; a balance change after launch
 * adds a new version beside the live one rather than editing it.
 */
export const catalogs = {
  v1: contentV1,
  v2: contentV2,
  v3: contentV3,
  v4: contentV4,
  v5: contentV5,
  v6: contentV6,
  v7: contentV7,
  v8: contentV8,
} as const satisfies Record<string, ContentCatalog>

export type CatalogId = keyof typeof catalogs

/** New worlds start here; a live world switches with `world.setActiveContentVersion` between runs. */
export const ACTIVE_CONTENT: CatalogId = 'v8'
