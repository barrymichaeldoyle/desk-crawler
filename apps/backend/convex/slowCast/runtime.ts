import { ACTIVE_CONTENT, catalogs, type CatalogId } from '@trmnl-games/slow-cast/content'
import { SIMULATION_VERSION } from '@trmnl-games/slow-cast/sim'
import type { SlowCastCatalog } from '@trmnl-games/slow-cast/sim'
import { SEED_VERSION } from '@trmnl-games/engine/seed'
import { makeSchedule } from '@trmnl-games/engine/schedule'
import { internal } from '../_generated/api'
import type { EngineRuntime } from '../lib/engine/runtime'
import { SLOW_CAST_TABLES } from '../lib/engine/tables'

/** Slow Cast ticks five minutes into each quarter-hour, so it never shares a slot with Desk Crawler (slow-cast.md "Architecture"). */
export const SLOW_CAST_SCHEDULE = makeSchedule(5 * 60_000)

type Refs = EngineRuntime<SlowCastCatalog>['refs']

/** Slow Cast's binding to the shared engine. Its function references take `sw` ids; the engine types them as Desk Crawler's. */
export const SLOW_CAST_RUNTIME: EngineRuntime<SlowCastCatalog> = {
  slug: 'slow-cast',
  tables: SLOW_CAST_TABLES,
  schedule: SLOW_CAST_SCHEDULE,
  simulationVersion: SIMULATION_VERSION,
  seedVersion: SEED_VERSION,
  runCounters: ['landed', 'released', 'gotAway', 'levelUps'],
  initialContentVersion: catalogs[ACTIVE_CONTENT].contentVersion,
  content: (version) => catalogs[version as CatalogId],
  refs: {
    simulateBatch: internal.slowCast.tick.simulateBatch as unknown as Refs['simulateBatch'],
    buildBatch: internal.slowCast.leaderboard.buildBatch as unknown as Refs['buildBatch'],
    cleanupPublication: internal.slowCast.leaderboard.cleanupPublication as unknown as Refs['cleanupPublication'],
  },
}
