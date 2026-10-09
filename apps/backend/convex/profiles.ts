import { v } from 'convex/values'
import { internalQuery, query, type QueryCtx } from './_generated/server'
import { ACHIEVEMENT_BY_ID, ACHIEVEMENT_FAMILIES } from '@trmnl-games/desk-crawler/content/achievements'
import { withCounterDefaults } from '@trmnl-games/desk-crawler/sim/core/starter'
import { FULL_SCALE } from '@trmnl-games/desk-crawler/art/scene'
import { sceneFor, scenePath } from '@trmnl-games/desk-crawler/art/sceneKey'
import { currentHero } from './lib/gameProfile'
import { MAX_UNLOCK_ROWS } from './lib/achievements'
import { ALIAS_RULE, normalizeAlias } from './lib/names'
import { readWorld, worldContent } from './world'

/**
 * Public hero profile (v1.2). Opt-in per hero: a private, missing, suspended,
 * renamed-for-repair or inactive hero all return the same null, so the page
 * cannot be used to test whether an alias exists. Returns a public-safe
 * projection only: no equipment, bag, gold, log text, timezone or account data.
 * Fixed indexed reads; nothing here scans other heroes.
 */
/** The opted-in hero behind a public name, or null for every way it can be missing or private (one shape for all). */
async function publicHero(ctx: QueryCtx, alias: string) {
  const normalized = normalizeAlias(alias)
  if (normalized.length < ALIAS_RULE.min || normalized.length > ALIAS_RULE.max) return null
  const user = await ctx.db.query('users').withIndex('by_normalizedAlias', (q) => q.eq('normalizedAlias', normalized)).first()
  if (user === null || user.state !== 'active' || user.nameRepairRequired) return null
  const hero = await currentHero(ctx, user)
  if (hero === null || hero.activationState !== 'active' || hero.publicProfile !== true) return null
  const world = await readWorld(ctx)
  const newest = (await ctx.db.query('tickLogs').withIndex('by_heroId_and_at_and_sequence', (q) => q.eq('heroId', hero._id)).order('desc').take(6)).find((log) => log.kind !== 'achievement' && log.kind !== 'todo')
  const scene = sceneFor(hero.status, hero.wakeAtTick !== undefined, newest ? { kind: newest.kind, ...('outcome' in newest.detail ? { outcome: newest.detail.outcome } : {}) } : null)
  const publication = world?.publishedPublicationId ? await ctx.db.get(world.publishedPublicationId) : null
  const published = publication !== null && publication.state === 'published' ? publication : null
  const rank = published
    ? await ctx.db.query('heroRanks').withIndex('by_publicationId_and_board_and_heroId', (q) => q.eq('publicationId', published._id).eq('board', 'overall').eq('heroId', hero._id)).unique()
    : null
  return { user, hero, world, scene, published, rank: rank && published ? { rank: rank.rank, totalPlayers: published.globalTotalPlayers } : null }
}

/** What the hero's social card draws (`/art/card/hero/<name>.png`): the same public-safe facts as the page, or null. */
export const card = internalQuery({
  args: { alias: v.string() },
  returns: v.union(v.null(), v.object({ heroName: v.string(), alias: v.string(), level: v.number(), rank: v.union(v.null(), v.object({ rank: v.number(), totalPlayers: v.number() })), scenePath: v.string() })),
  handler: async (ctx, { alias }) => {
    const found = await publicHero(ctx, alias)
    if (found === null) return null
    const { user, hero, scene, rank } = found
    return { heroName: hero.name, alias: user.publicAlias, level: hero.level, rank, scenePath: scenePath(hero.biomeId, scene.pose, scene.subject, FULL_SCALE) }
  },
})

export const view = query({
  args: { alias: v.string() },
  returns: v.any(),
  handler: async (ctx, { alias }) => {
    const found = await publicHero(ctx, alias)
    if (found === null) return null
    const { user, hero, world, scene, published } = found
    const content = worldContent(world)
    const stats = published ? await ctx.db.query('achievementStats').withIndex('by_publicationId', (q) => q.eq('publicationId', published._id)).unique() : null

    // Highest earned tier per family, in catalog order.
    const rows = await ctx.db.query('heroAchievements').withIndex('by_userId_and_achievementId', (q) => q.eq('userId', user._id)).take(MAX_UNLOCK_ROWS)
    const best = new Map<string, { id: string; tier: number; name: string; blurb: string }>()
    for (const row of rows) {
      const def = ACHIEVEMENT_BY_ID.get(row.achievementId)
      if (def && (best.get(def.family)?.tier ?? 0) < def.tier) best.set(def.family, { id: def.id, tier: def.tier, name: def.name, blurb: def.blurb })
    }
    const achievements = ACHIEVEMENT_FAMILIES.flatMap((family) => {
      const earned = best.get(family.id)
      return earned ? [{ ...earned, family: family.name }] : []
    })
    // The companion's rarity shape, limited to the ids shown here.
    const rarity = stats ? { counts: Object.fromEntries(achievements.map((a) => [a.id, stats.counts[a.id] ?? 0])), totalPlayers: stats.totalPlayers, scoreAt: stats.scoreAt } : null

    const counters = withCounterDefaults(hero.counters)
    return {
      alias: user.publicAlias,
      heroName: hero.name,
      heroClass: hero.class,
      level: hero.level,
      status: hero.status,
      biome: content.biomes.find((biome) => biome.id === hero.biomeId)?.name ?? null,
      scenePath: scenePath(hero.biomeId, scene.pose, scene.subject, FULL_SCALE),
      adventuringSince: hero.activatedAt ?? hero.createdAt,
      rank: found.rank,
      lifetime: { combatWins: counters.combatWins, itemsFound: counters.itemsFound, trips: counters.trips, rescues: counters.rescues, epicFinds: counters.epicFinds },
      // D110: the raid record only, never who was raided or the gold that moved.
      raids: { won: counters.raidsWon, failed: counters.raidsLaunched - counters.raidsWon, repelled: counters.raidsRepelled, lost: counters.raidsLost },
      achievements,
      rarity,
      achievementCount: rows.length,
    }
  },
})
