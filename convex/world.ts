import { ACTIVE_CONTENT, catalogs } from './content'
import type { Doc } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { SIMULATION_VERSION } from './sim/core/simulate'

export async function readWorld(ctx: QueryCtx): Promise<Doc<'worldState'> | null> {
  return await ctx.db
    .query('worldState')
    .withIndex('by_key', (q) => q.eq('key', 'world'))
    .unique()
}

/** Idempotently create the world singleton. The seed is server-only and never returned by public functions. */
export async function getOrCreateWorld(ctx: MutationCtx): Promise<Doc<'worldState'>> {
  const existing = await readWorld(ctx)
  if (existing) return existing
  const seed = Array.from({ length: 4 }, () => Math.floor(Math.random() * 2 ** 32).toString(16).padStart(8, '0')).join('')
  const id = await ctx.db.insert('worldState', {
    key: 'world',
    currentTick: 0,
    activeContentVersion: catalogs[ACTIVE_CONTENT].contentVersion,
    activeSimulationVersion: SIMULATION_VERSION,
    worldSeed: seed,
    ticksPaused: false,
    maintenanceMode: false,
    createdAt: Date.now(),
    schemaVersion: 1,
  })
  return (await ctx.db.get(id))!
}
