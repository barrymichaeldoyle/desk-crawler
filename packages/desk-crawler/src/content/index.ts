import type { ContentCatalog } from '../sim/core/types'
import { contentV1 } from './v1'
import { contentV2 } from './v2'
import { contentV3 } from './v3'
import { contentV4 } from './v4'

/** Every supported catalog version. Runs pin one; retired versions stay readable for owned items. */
export const catalogs = {
  v1: contentV1,
  v2: contentV2,
  v3: contentV3,
  v4: contentV4,
} as const satisfies Record<string, ContentCatalog>

export type CatalogId = keyof typeof catalogs

/** New worlds start here; a live world switches with `world.setActiveContentVersion` between runs. */
export const ACTIVE_CONTENT: CatalogId = 'v4'
