import { currentHero, gameProfile, setCurrentHero } from './lib/gameProfile'
import { v } from 'convex/values'
import { internalMutation } from './_generated/server'
import { ACTIVE_CONTENT, catalogs } from '@trmnl-games/desk-crawler/content'
import { starterHero, starterKit } from '@trmnl-games/desk-crawler/sim/core/starter'
import { getOrCreateWorld } from './world'

/**
 * Development-only: give a test identity an activated hero for browser checks
 * without a TRMNL install. Internal (never client-callable) and refused unless
 * DEV_SEED_ENABLED=true is set on the deployment.
 */
export const seedTestHero = internalMutation({
  args: { tokenIdentifier: v.string(), alias: v.string(), heroName: v.string(), extraGear: v.number() },
  returns: v.id('heroes'),
  handler: async (ctx, args) => {
    if (process.env.DEV_SEED_ENABLED !== 'true') throw new Error('dev seeding is disabled on this deployment')
    const now = Date.now()
    const world = await getOrCreateWorld(ctx)
    const content = catalogs[ACTIVE_CONTENT]
    const existing = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', args.tokenIdentifier))
      .unique()
    const existingHero = await currentHero(ctx, existing)
    if (existingHero) return existingHero._id
    const userId =
      existing?._id ??
      (await ctx.db.insert('users', { tokenIdentifier: args.tokenIdentifier, publicAlias: args.alias, normalizedAlias: args.alias.toLowerCase(), timezone: 'UTC', state: 'active', createdAt: now, publicNameVersion: 1 }))
    const base = starterHero('x', content, world.currentTick)
    const heroId = await ctx.db.insert('heroes', {
      userId,
      name: args.heroName,
      class: 'warrior',
      createdAt: now,
      isActive: true,
      schemaVersion: 1,
      activationState: 'active',
      activatedAt: now,
      level: 4,
      xp: 0,
      lifetimeXp: 491,
      hp: 120,
      gold: base.gold,
      lastLevelUpTick: world.currentTick,
      status: 'paused',
      pausedFromStatus: 'exploring',
      biomeId: base.biomeId,
      eligibleFromTick: world.currentTick + 1,
      lastTick: world.currentTick,
      lastProgressTick: world.currentTick,
      logSequence: 1,
      simulationState: 'healthy',
      counters: base.counters,
      scoreHourXp: 0,
    })
    const kit = starterKit(content)
    const weaponId = await ctx.db.insert('items', { ...kit.weapon, heroId, createdAt: now })
    const armorId = await ctx.db.insert('items', { ...kit.armor, heroId, createdAt: now })
    await ctx.db.insert('items', { ...kit.potions, heroId, createdAt: now })
    for (let i = 0; i < args.extraGear; i += 1) {
      await ctx.db.insert('items', { ...kit.weapon, templateId: 'ruler_blade', name: 'Ruler Blade', rarity: i % 4 === 0 ? 'uncommon' : 'common', attack: i % 4 === 0 ? 5 : 3, saleValue: i % 4 === 0 ? 10 : 5, heroId, createdAt: now })
    }
    await ctx.db.patch(heroId, { weaponId, armorId })
    await setCurrentHero(ctx, (await ctx.db.get(userId))!, heroId)
    await ctx.db.insert('tickLogs', { heroId, source: 'lifecycle', sequence: 1, at: now, kind: 'system', summary: 'Your shift begins in the Office Cubicles.', detail: { v: 1, operation: 'dev_seed' }, deltas: { xpEarned: 0, gold: 0, hp: 0 } })
    return heroId
  },
})
