import { ACTIVE_CONTENT, catalogs, type CatalogId } from '@trmnl-games/desk-crawler/content'
import type { ContentCatalog } from '@trmnl-games/desk-crawler/sim/core/types'
import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { internalMutation, type MutationCtx, type QueryCtx } from './_generated/server'
import { DESK_CRAWLER_RUNTIME } from './lib/engine/deskCrawler'
import { getOrCreateEngineWorld, readEngineWorld, setEngineContentVersion } from './lib/engine/world'

export async function readWorld(ctx: QueryCtx): Promise<Doc<'worldState'> | null> {
  return await readEngineWorld(ctx, DESK_CRAWLER_RUNTIME)
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
  return await getOrCreateEngineWorld(ctx, DESK_CRAWLER_RUNTIME)
}

/**
 * Switch the content catalog the next run pins (operations.md "Content releases"). Refused while a run is
 * active, so no run mixes catalogs; runs already started keep the version they recorded.
 */
export const setActiveContentVersion = internalMutation({
  args: { contentVersion: v.string() },
  returns: v.object({ from: v.string(), to: v.string() }),
  handler: async (ctx, { contentVersion }) => await setEngineContentVersion(ctx, DESK_CRAWLER_RUNTIME, contentVersion),
})
