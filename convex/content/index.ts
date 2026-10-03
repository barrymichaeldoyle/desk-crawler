import type { ContentCatalog } from '../sim/core/types'
import { contentV1 } from './v1'
import { contentV2 } from './v2'

/** Every supported catalog version. Runs pin one; retired versions stay readable for owned items. */
export const catalogs = {
  v1: contentV1,
  v2: contentV2,
} as const satisfies Record<string, ContentCatalog>

export type CatalogId = keyof typeof catalogs

export const ACTIVE_CONTENT: CatalogId = 'v2'
