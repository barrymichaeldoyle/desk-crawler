import { v } from 'convex/values'
import { GAME_SLUGS, games, type GameSlug, type GameStatus } from '@trmnl-games/platform'
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { adminRef, requireAdmin } from './lib/adminAccess'
import { audit } from './admin'
import { gameSlug, gameStatus } from './schema'

/**
 * Game lifecycle (slow-cast.md "Architecture", D115). The status lives on the
 * server so it changes without a deploy. A hidden game is invisible to everyone
 * but admins: this query leaves it out, and its routes answer not-found.
 */

export async function gameStatusOf(ctx: QueryCtx, slug: GameSlug): Promise<GameStatus> {
  const row = await ctx.db.query('platformGames').withIndex('by_slug', (q) => q.eq('slug', slug)).unique()
  return row?.status ?? games[slug].defaultStatus
}

/** Whether this viewer may open the game's routes: everyone once live, admins at any status. */
export async function canOpenGame(ctx: QueryCtx, slug: GameSlug): Promise<boolean> {
  return (await gameStatusOf(ctx, slug)) === 'live' || (await adminRef(ctx)) !== null
}

const listedGame = v.object({ slug: gameSlug, status: gameStatus, canOpen: v.boolean() })

/** The games this viewer can see: live and preview for everyone, hidden ones too for admins (marked so). */
export const list = query({
  args: {},
  returns: v.object({ admin: v.boolean(), games: v.array(listedGame) }),
  handler: async (ctx) => {
    const admin = (await adminRef(ctx)) !== null
    const listed = []
    for (const slug of GAME_SLUGS) {
      const status = await gameStatusOf(ctx, slug)
      if (status === 'hidden' && !admin) continue
      listed.push({ slug, status, canOpen: status === 'live' || admin })
    }
    return { admin, games: listed }
  },
})

async function setStatus(ctx: MutationCtx, slug: GameSlug, status: GameStatus): Promise<{ from: GameStatus; to: GameStatus }> {
  const from = await gameStatusOf(ctx, slug)
  const row = await ctx.db.query('platformGames').withIndex('by_slug', (q) => q.eq('slug', slug)).unique()
  if (row) await ctx.db.patch(row._id, { status, updatedAt: Date.now() })
  else await ctx.db.insert('platformGames', { slug, status, updatedAt: Date.now() })
  return { from, to: status }
}

/** Admin console switch; audited with a reason. */
export const setGameStatus = mutation({
  args: { slug: gameSlug, status: gameStatus, reasonCode: v.string() },
  returns: v.object({ from: gameStatus, to: gameStatus }),
  handler: async (ctx, { slug, status, reasonCode }) => {
    const actor = await requireAdmin(ctx)
    const result = await setStatus(ctx, slug, status)
    await audit(ctx, actor, 'platform.setGameStatus', slug, reasonCode, `${result.from} -> ${result.to}`)
    return result
  },
})

/** Operator switch: `npx convex run --prod platform:setGameStatusInternal '{"slug":"slow-cast","status":"live"}'`. */
export const setGameStatusInternal = internalMutation({
  args: { slug: gameSlug, status: gameStatus },
  returns: v.object({ from: gameStatus, to: gameStatus }),
  handler: async (ctx, { slug, status }) => {
    const result = await setStatus(ctx, slug, status)
    await audit(ctx, 'operator', 'platform.setGameStatus', slug, 'cli', `${result.from} -> ${result.to}`)
    return result
  },
})
