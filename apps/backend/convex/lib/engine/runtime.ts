import type { FunctionReference } from 'convex/server'
import type { TickSchedule } from '@trmnl-games/engine/schedule'
import type { Id } from '../../_generated/dataModel'
import type { DESK_CRAWLER_TABLES, EngineTableNames } from './tables'

/**
 * One game's binding to the engine (slow-cast.md "Architecture", S0). The engine
 * code is typed against Desk Crawler's instantiation of the engine tables; the
 * table factory guarantees every game's tables have the same fields and
 * indexes, so `typedTables` only renames, it never changes a shape.
 */
export interface EngineRuntime<Content> {
  readonly slug: string
  readonly tables: EngineTableNames
  readonly schedule: TickSchedule
  readonly simulationVersion: number
  readonly seedVersion: number
  /** The game's own run tallies beside processed, eligible, skippedDormant and quarantined. */
  readonly runCounters: readonly string[]
  /** The catalog a brand-new world pins. */
  readonly initialContentVersion: string
  content(version: string): Content | undefined
  readonly refs: {
    readonly simulateBatch: FunctionReference<'mutation', 'internal', { runId: Id<'simulationRuns'>; expectedSequence: number }, null>
    readonly buildBatch: FunctionReference<'mutation', 'internal', { publicationId: Id<'leaderboardPublications'>; expectedSequence: number }, null>
    readonly cleanupPublication: FunctionReference<'mutation', 'internal', { publicationId: Id<'leaderboardPublications'> }, null>
  }
}

export type TypedTables = typeof DESK_CRAWLER_TABLES

/** The runtime's table names, typed as Desk Crawler's (see the interface comment). */
export function typedTables(runtime: EngineRuntime<unknown>): TypedTables {
  return runtime.tables as unknown as TypedTables
}
