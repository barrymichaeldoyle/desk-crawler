import { v } from 'convex/values'
import { query } from './_generated/server'

/**
 * The signed-in owner's profile, or null when signed out. `signedIn` with a
 * null `user` means authenticated but not yet onboarded.
 */
export const me = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      signedIn: v.literal(true),
      user: v.union(
        v.null(),
        v.object({ publicAlias: v.string(), timezone: v.string(), state: v.string() }),
      ),
      hero: v.union(
        v.null(),
        v.object({ name: v.string(), activationState: v.union(v.literal('pending_trmnl'), v.literal('active')) }),
      ),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) return null
    const user = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()
    const hero = user?.activeHeroId ? await ctx.db.get(user.activeHeroId) : null
    return {
      signedIn: true as const,
      user: user === null ? null : { publicAlias: user.publicAlias, timezone: user.timezone, state: user.state },
      hero: hero === null ? null : { name: hero.name, activationState: hero.activationState },
    }
  },
})
