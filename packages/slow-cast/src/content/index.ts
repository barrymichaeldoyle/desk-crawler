import type { SlowCastCatalog } from '../sim/types'
import { contentV1 } from './v1'

/** Every Slow Cast catalog a run may pin; replays of each stay identical. */
export const catalogs = { v1: contentV1 } as const satisfies Record<string, SlowCastCatalog>
export type CatalogId = keyof typeof catalogs
export const ACTIVE_CONTENT: CatalogId = 'v1'
export { contentV1 }
