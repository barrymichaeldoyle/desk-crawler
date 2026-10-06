import type { ContentCatalog } from '../sim/core/types'
import { contentV1 } from './v1'
import { contentV2 } from './v2'

/**
 * Every supported catalog version. Runs pin one; a balance change after launch
 * adds a new version beside the live one rather than editing it.
 */
export const catalogs = {
  v1: contentV1,
  v2: contentV2,
} as const satisfies Record<string, ContentCatalog>

export type CatalogId = keyof typeof catalogs

/** New worlds start here; a live world switches with `world.setActiveContentVersion` between runs. */
export const ACTIVE_CONTENT: CatalogId = 'v2'
