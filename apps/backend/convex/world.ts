import { ACTIVE_CONTENT, catalogs, type CatalogId } from '@trmnl-games/desk-crawler/content'
import type { ContentCatalog } from '@trmnl-games/desk-crawler/sim/core/types'
import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { internalMutation, type MutationCtx, type QueryCtx } from './_generated/server'
import { SIMULATION_VERSION } from '@trmnl-games/desk-crawler/sim/core/simulate'

export async function readWorld(ctx: QueryCtx): Promise<Doc<'worldState'> | null> {
  return await ctx.db
    .query('worldState')
    .withIndex('by_key', (q) => q.eq('key', 'world'))
    .unique()
}

/**
 * The catalog the next run pins. Intents and displays follow it, so bag rules
 * never differ between a companion command and the tick that follows.
 */
export function worldContent(world: Pick<Doc<'worldState'>, 'activeContentVersion'> | null): ContentCatalog {
  return (world && catalogs[world.activeContentVersion as CatalogId]) ?? catalogs[ACTIVE_CONTENT]
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

/**
 * Switch the content catalog the next run pins (operations.md "Content releases"). Refused while a run is
 * active, so no run mixes catalogs; runs already started keep the version they recorded.
 */
export const setActiveContentVersion = internalMutation({
  args: { contentVersion: v.string() },
  returns: v.object({ from: v.string(), to: v.string() }),
  handler: async (ctx, { contentVersion }) => {
    if (!(contentVersion in catalogs)) throw new Error(`content version ${contentVersion} is not available`)
    const world = await getOrCreateWorld(ctx)
    if (world.activeRunId !== undefined) throw new Error('a run is active; retry after it completes')
    await ctx.db.patch(world._id, { activeContentVersion: contentVersion })
    return { from: world.activeContentVersion, to: contentVersion }
  },
})
