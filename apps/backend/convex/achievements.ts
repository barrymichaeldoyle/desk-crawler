import { v } from 'convex/values'
import { paginator } from 'convex-helpers/server/pagination'
import schema from './schema'
import { internal } from './_generated/api'
import { internalMutation, query } from './_generated/server'
import { withCounterDefaults } from '@trmnl-games/desk-crawler/sim/core/starter'
import { currentHero } from './lib/gameProfile'
import { currentUser } from './lib/intent'
import { achievementState, keepsakeTotal, MAX_UNLOCK_ROWS } from './lib/achievements'
import { ACHIEVEMENTS_VERSION } from '@trmnl-games/desk-crawler/content/achievements'
import { familyProgress } from '@trmnl-games/desk-crawler/sim/core/achievements'
import { readWorld, worldContent } from './world'

/**
 * The owner's achievements (achievements.md, D65): unlock rows, per-family
 * progress from live counters, and rarity from the current publication's
 * tally. Three bounded reads; nothing is recomputed on a visit.
 */
export const mine = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const user = await currentUser(ctx)
    const hero = await currentHero(ctx, user)
    if (user === null || hero === null || hero.activationState !== 'active') return null
    const world = await readWorld(ctx)
    const content = worldContent(world)
    const rows = await ctx.db.query('heroAchievements').withIndex('by_userId_and_achievementId', (q) => q.eq('userId', user._id)).take(MAX_UNLOCK_ROWS)
    const unlocked = new Map(rows.map((row) => [row.achievementId, row.unlockedAt]))
    const state = achievementState(hero, await keepsakeTotal(ctx, user._id))
    const publication = world?.publishedPublicationId ? await ctx.db.get(world.publishedPublicationId) : null
    const stats = publication && publication.state === 'published'
      ? await ctx.db.query('achievementStats').withIndex('by_publicationId', (q) => q.eq('publicationId', publication._id)).unique()
      : null
    return {
      catalogVersion: ACHIEVEMENTS_VERSION,
      evaluatedVersion: hero.achievementsVersion ?? 0,
      unlocked: rows.map((row) => ({ id: row.achievementId, unlockedAt: row.unlockedAt })),
      families: familyProgress(state, content, new Set(unlocked.keys())).map((family) => ({
        family: family.family,
        name: family.name,
        category: family.category,
        tier: family.tier,
        tiers: family.tiers,
        earned: family.earned ? { id: family.earned.id, name: family.earned.name, blurb: family.earned.blurb, tier: family.earned.tier, unlockedAt: unlocked.get(family.earned.id) ?? null } : null,
        next: family.next ? { id: family.next.id, tier: family.next.tier } : null,
        value: family.value,
        target: family.target,
      })),
      rarity: stats ? { counts: stats.counts, totalPlayers: stats.totalPlayers, scoreAt: stats.scoreAt } : null,
    }
  },
})

/**
 * One-off, resumable backfill: write the nine D65 counters (at zero) into every
 * hero that predates them, 100 heroes per call, continuing by scheduler. Safe to
 * re-run; heroes that already have every counter are skipped. Run with
 * `npx convex run --prod achievements:backfillCounters '{}'`.
 */
export const backfillCounters = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.object({ patched: v.number(), done: v.boolean() }),
  handler: async (ctx, args) => {
    const page = await paginator(ctx.db, schema)
      .query('heroes')
      .withIndex('by_createdAt')
      .paginate({ numItems: 100, cursor: args.cursor ?? null })
    let patched = 0
    for (const hero of page.page) {
      if (hero.counters.itemsSold !== undefined && hero.counters.monsterWins !== undefined) continue
      await ctx.db.patch(hero._id, { counters: withCounterDefaults(hero.counters) })
      patched += 1
    }
    if (!page.isDone) await ctx.scheduler.runAfter(0, internal.achievements.backfillCounters, { cursor: page.continueCursor })
    return { patched, done: page.isDone }
  },
})
