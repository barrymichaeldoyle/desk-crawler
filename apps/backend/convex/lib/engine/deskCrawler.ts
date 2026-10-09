import { ACTIVE_CONTENT, catalogs, type CatalogId } from '@trmnl-games/desk-crawler/content'
import { SIMULATION_VERSION } from '@trmnl-games/desk-crawler/sim/core/simulate'
import type { ContentCatalog } from '@trmnl-games/desk-crawler/sim/core/types'
import { SEED_VERSION } from '@trmnl-games/engine/seed'
import { makeSchedule } from '@trmnl-games/engine/schedule'
import { internal } from '../../_generated/api'
import type { EngineRuntime } from './runtime'
import { DESK_CRAWLER_TABLES } from './tables'

/** Desk Crawler's binding to the shared engine: its tables, quarter-hour schedule (D42), versions and catalogs. */
export const DESK_CRAWLER_RUNTIME: EngineRuntime<ContentCatalog> = {
  slug: 'desk-crawler',
  tables: DESK_CRAWLER_TABLES,
  schedule: makeSchedule(0),
  simulationVersion: SIMULATION_VERSION,
  seedVersion: SEED_VERSION,
  runCounters: ['deaths', 'levelUps', 'heldFinds'],
  initialContentVersion: catalogs[ACTIVE_CONTENT].contentVersion,
  content: (version) => catalogs[version as CatalogId],
  refs: {
    simulateBatch: internal.sim.runs.tick.simulateBatch,
    buildBatch: internal.leaderboard.buildBatch,
    cleanupPublication: internal.leaderboard.cleanupPublication,
  },
}
