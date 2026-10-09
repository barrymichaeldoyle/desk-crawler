import { v } from 'convex/values'
import { paginator } from 'convex-helpers/server/pagination'
import { platformAchievements, PLATFORM_ACHIEVEMENTS } from '@trmnl-games/platform'
import schema from './schema'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import { internalMutation, query, type QueryCtx } from './_generated/server'
import { MAX_UNLOCK_ROWS } from './lib/achievements'
import { currentHero } from './lib/gameProfile'
import { readEngineWorld } from './lib/engine/world'
import { DESK_CRAWLER_RUNTIME } from './lib/engine/deskCrawler'
import { ALIAS_RULE, normalizeAlias } from './lib/names'
import { adminRef } from './lib/adminAccess'
import { gameStatusOf } from './platform'
import { MAX_SW_UNLOCKS } from './slowCast/achievements'
import { currentAngler } from './slowCast/profile'
import { SLOW_CAST_RUNTIME } from './slowCast/runtime'
import type { EngineRuntime } from './lib/engine/runtime'

/**
 * The shared public profile (slow-cast.md "Platform profile and achievements", D115): one page per public name
 * listing each game the player opted in, with its level, start date and all-time rank, plus platform achievements.
 * Missing, private, suspended and name-repair profiles all read as the same null, as D109. A game that is not live
 * appears only to admins.
 */

/** The player's achievements earned in each game and the games with an active character. */
async function crossGame(ctx: QueryCtx, user: Doc<'users'>) {
  const hero = await currentHero(ctx, user)
  const angler = await currentAngler(ctx, user)
  const dcUnlocks = (await ctx.db.query('heroAchievements').withIndex('by_userId_and_achievementId', (q) => q.eq('userId', user._id)).take(MAX_UNLOCK_ROWS)).length
  const scUnlocks = (await ctx.db.query('swAchievements').withIndex('by_userId_and_achievementId', (q) => q.eq('userId', user._id)).take(MAX_SW_UNLOCKS)).length
  const games = (hero?.activationState === 'active' ? 1 : 0) + (angler?.activationState === 'active' ? 1 : 0)
  return { hero, angler, dcUnlocks, scUnlocks, games, collected: dcUnlocks + scUnlocks }
}

/** All-time rank in a game's published set, or null. */
async function overallRank(ctx: QueryCtx, runtime: EngineRuntime<unknown>, subjectId: string): Promise<{ rank: number; totalPlayers: number } | null> {
  const world = await readEngineWorld(ctx, runtime)
  if (!world?.publishedPublicationId) return null
  const publication = await ctx.db.get(world.publishedPublicationId)
  if (publication === null || publication.state !== 'published') return null
  const table = (runtime.tables.ranks as 'heroRanks')
  const row = await ctx.db.query(table).withIndex('by_publicationId_and_board_and_heroId', (q) => q.eq('publicationId', publication._id).eq('board', 'overall').eq('heroId', subjectId as Id<'heroes'>)).unique()
  return row ? { rank: row.rank, totalPlayers: publication.globalTotalPlayers } : null
}

export const view = query({
  args: { alias: v.string() },
  returns: v.any(),
  handler: async (ctx, { alias }) => {
    const normalized = normalizeAlias(alias)
    if (normalized.length < ALIAS_RULE.min || normalized.length > ALIAS_RULE.max) return null
    const user = await ctx.db.query('users').withIndex('by_normalizedAlias', (q) => q.eq('normalizedAlias', normalized)).first()
    if (user === null || user.state !== 'active' || user.nameRepairRequired) return null
    const { hero, angler, dcUnlocks, scUnlocks, games, collected } = await crossGame(ctx, user)
    const admin = (await adminRef(ctx)) !== null
    const showSlowCast = angler !== null && angler.activationState === 'active' && angler.publicProfile === true && ((await gameStatusOf(ctx, 'slow-cast')) === 'live' || admin)
    const showDesk = hero !== null && hero.activationState === 'active' && hero.publicProfile === true
    if (!showDesk && !showSlowCast) return null
    const current = await ctx.db.query('platformStats').withIndex('by_key', (q) => q.eq('key', 'current')).unique()
    return {
      alias: user.publicAlias,
      games: [
        ...(showDesk ? [{ slug: 'desk-crawler' as const, name: hero.name, level: hero.level, since: hero.activatedAt ?? hero.createdAt, rank: await overallRank(ctx, DESK_CRAWLER_RUNTIME, hero._id), achievements: dcUnlocks, page: `/desk-crawler/heroes/${encodeURIComponent(user.publicAlias)}` }] : []),
        ...(showSlowCast ? [{ slug: 'slow-cast' as const, name: user.publicAlias, level: angler.level, since: angler.activatedAt ?? angler.createdAt, rank: await overallRank(ctx, SLOW_CAST_RUNTIME, angler._id), achievements: scUnlocks, species: Object.keys(angler.logbook).length, page: null }] : []),
      ],
      platform: platformAchievements({ games, collected }).map((a) => ({ id: a.id, name: a.name, blurb: a.blurb, family: a.family, tier: a.tier, share: current && current.totalPlayers > 0 ? Math.max(1, Math.round(((current.counts[a.id] ?? 0) * 100) / current.totalPlayers)) : null })),
    }
  },
})

const TALLY_PAGE = 100

/**
 * Daily platform rarity tally (cron at 03:20 UTC): pages active users, counting those with an active character in
 * any game and each platform achievement held. Bounded reads per user; the result replaces `current` when done.
 */
export const tally = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { cursor }) => {
    const now = Date.now()
    let building = await ctx.db.query('platformStats').withIndex('by_key', (q) => q.eq('key', 'building')).unique()
    if (cursor === undefined) {
      if (building) await ctx.db.delete(building._id)
      const id = await ctx.db.insert('platformStats', { key: 'building', counts: {}, totalPlayers: 0, at: now })
      building = (await ctx.db.get(id))!
    }
    if (building === null) return null
    const page = await paginator(ctx.db, schema).query('users').withIndex('by_state', (q) => q.eq('state', 'active')).paginate({ numItems: TALLY_PAGE, cursor: cursor ?? null })
    const counts = { ...building.counts }
    let players = building.totalPlayers
    for (const user of page.page) {
      const stats = await crossGame(ctx, user)
      if (stats.games === 0) continue
      players += 1
      for (const a of platformAchievements(stats)) counts[a.id] = (counts[a.id] ?? 0) + 1
    }
    if (!page.isDone) {
      await ctx.db.patch(building._id, { counts, totalPlayers: players, cursor: page.continueCursor })
      await ctx.scheduler.runAfter(0, internal.platformProfile.tally, { cursor: page.continueCursor })
      return null
    }
    const current = await ctx.db.query('platformStats').withIndex('by_key', (q) => q.eq('key', 'current')).unique()
    if (current) await ctx.db.delete(current._id)
    await ctx.db.insert('platformStats', { key: 'current', counts, totalPlayers: players, at: now })
    await ctx.db.delete(building._id)
    return null
  },
})

export { PLATFORM_ACHIEVEMENTS }
