import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { appError } from '../lib/errors'

/** The user's Slow Cast profile, or null before they start. */
export async function slowCastProfile(ctx: QueryCtx, userId: Id<'users'>): Promise<Doc<'slowCastProfiles'> | null> {
  return await ctx.db.query('slowCastProfiles').withIndex('by_userId', (q) => q.eq('userId', userId)).unique()
}

/** The user's current angler, or null when signed out, inactive, deleting or not started. */
export async function currentAngler(ctx: QueryCtx, user: Doc<'users'> | null): Promise<Doc<'anglers'> | null> {
  if (!user || user.state !== 'active') return null
  const profile = await slowCastProfile(ctx, user._id)
  if (!profile || profile.state === 'deleting' || !profile.anglerId) return null
  const angler = await ctx.db.get(profile.anglerId)
  return angler?.userId === user._id && angler.isActive ? angler : null
}

export async function setCurrentAngler(ctx: MutationCtx, user: Doc<'users'>, anglerId: Id<'anglers'>): Promise<void> {
  const profile = await slowCastProfile(ctx, user._id)
  if (profile?.state === 'deleting') throw appError('GAME_UNAVAILABLE', 'Slow Cast progress is being deleted. Try again shortly.')
  if (profile) await ctx.db.patch(profile._id, { anglerId })
  else await ctx.db.insert('slowCastProfiles', { userId: user._id, state: 'active', anglerId, createdAt: Date.now() })
}
