import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { appError } from './errors'

export { DESK_CRAWLER_GAME as DESK_CRAWLER } from '@trmnl-games/platform'
import { DESK_CRAWLER_GAME as DESK_CRAWLER } from '@trmnl-games/platform'

/** Only omitted pre-migration credentials inherit the original game's scope. */
export function isDeskCrawler(row: { gameSlug?: string }): boolean {
  return row.gameSlug === undefined || row.gameSlug === DESK_CRAWLER
}

export async function gameProfile(ctx: QueryCtx, userId: Id<'users'>) {
  return await ctx.db.query('deskCrawlerProfiles').withIndex('by_userId', (q) => q.eq('userId', userId)).unique()
}

/** Read legacy owner pointers only until the bounded migration creates a profile. */
export async function currentHero(ctx: QueryCtx, user: Doc<'users'> | null): Promise<Doc<'heroes'> | null> {
  if (!user || user.state !== 'active') return null
  const profile = await gameProfile(ctx, user._id)
  if (profile?.state === 'deleting') return null
  const heroId = profile ? profile.activeHeroId : user.activeHeroId
  const hero = heroId ? await ctx.db.get(heroId) : null
  return hero?.userId === user._id && hero.isActive ? hero : null
}

export async function setCurrentHero(ctx: MutationCtx, user: Doc<'users'>, heroId: Id<'heroes'>) {
  const profile = await gameProfile(ctx, user._id)
  if (profile?.state === 'deleting') throw appError('GAME_UNAVAILABLE', 'Desk Crawler progress is being deleted. Try again shortly.')
  if (profile) await ctx.db.patch(profile._id, { activeHeroId: heroId })
  else await ctx.db.insert('deskCrawlerProfiles', { userId: user._id, state: 'active', activeHeroId: heroId, createdAt: Date.now() })
  if (user.activeHeroId) await ctx.db.patch(user._id, { activeHeroId: undefined })
}
