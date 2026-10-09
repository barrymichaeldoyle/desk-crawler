import type { Doc } from '../../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../../_generated/server'
import { typedTables, type EngineRuntime } from './runtime'

/** The game's world singleton, or null before its first tick. */
export async function readEngineWorld(ctx: QueryCtx, runtime: EngineRuntime<unknown>): Promise<Doc<'worldState'> | null> {
  return await ctx.db
    .query(typedTables(runtime).world)
    .withIndex('by_key', (q) => q.eq('key', 'world'))
    .unique()
}

/** Idempotently create the world singleton. The seed is server-only and never returned by public functions. */
export async function getOrCreateEngineWorld(ctx: MutationCtx, runtime: EngineRuntime<unknown>): Promise<Doc<'worldState'>> {
  const existing = await readEngineWorld(ctx, runtime)
  if (existing) return existing
  const seed = Array.from({ length: 4 }, () => Math.floor(Math.random() * 2 ** 32).toString(16).padStart(8, '0')).join('')
  const id = await ctx.db.insert(typedTables(runtime).world, {
    key: 'world',
    currentTick: 0,
    activeContentVersion: runtime.initialContentVersion,
    activeSimulationVersion: runtime.simulationVersion,
    worldSeed: seed,
    ticksPaused: false,
    maintenanceMode: false,
    createdAt: Date.now(),
    schemaVersion: 1,
  })
  return (await ctx.db.get(id))!
}

/** Switch the catalog the next run pins; refused while a run is active, so no run mixes catalogs. */
export async function setEngineContentVersion(ctx: MutationCtx, runtime: EngineRuntime<unknown>, contentVersion: string): Promise<{ from: string; to: string }> {
  if (runtime.content(contentVersion) === undefined) throw new Error(`content version ${contentVersion} is not available`)
  const world = await getOrCreateEngineWorld(ctx, runtime)
  if (world.activeRunId !== undefined) throw new Error('a run is active; retry after it completes')
  await ctx.db.patch(world._id, { activeContentVersion: contentVersion })
  return { from: world.activeContentVersion, to: contentVersion }
}
