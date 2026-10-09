import type { GameSlug } from '@trmnl-games/platform'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { activateAngler, prepareAngler } from '../slowCast/lifecycle'
import { currentAngler, slowCastProfile } from '../slowCast/profile'
import { currentHero, gameProfile } from './gameProfile'

/**
 * Per-game hooks for the shared TRMNL lifecycle (trmnl.ts): which profile can be deleting, the player
 * character an installation activates, and how one is prepared and activated. D115 generalized the
 * lifecycle from Desk Crawler's.
 */
export interface GameHooks {
  readonly slug: GameSlug
  readonly label: string
  deleting(ctx: QueryCtx, userId: Id<'users'>): Promise<boolean>
  current(ctx: QueryCtx, user: Doc<'users'> | null): Promise<{ _id: string; activationState: 'pending_trmnl' | 'active' } | null>
  /** Whether preparing needs a character name (Desk Crawler's hero name). */
  readonly needsName: boolean
  activate(ctx: MutationCtx, userId: Id<'users'>, now: number): Promise<void>
}

/** Only omitted pre-migration credentials inherit the original game's scope. */
export function isGame(row: { gameSlug?: string }, slug: GameSlug): boolean {
  return row.gameSlug === slug || (row.gameSlug === undefined && slug === 'desk-crawler')
}

export const SLOW_CAST_HOOKS: GameHooks & { prepare: (ctx: MutationCtx, user: Doc<'users'>, now: number) => Promise<unknown> } = {
  slug: 'slow-cast',
  label: 'Slow Cast',
  deleting: async (ctx, userId) => (await slowCastProfile(ctx, userId))?.state === 'deleting',
  current: currentAngler,
  needsName: false,
  activate: activateAngler,
  prepare: prepareAngler,
}

export const deskCrawlerDeleting = async (ctx: QueryCtx, userId: Id<'users'>) => (await gameProfile(ctx, userId))?.state === 'deleting'
export { currentHero }
