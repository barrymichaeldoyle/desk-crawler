import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { ACTIVE_CONTENT, catalogs } from './content'
import { appError } from './lib/errors'
import { commandLog, currentUser, requirePlayableHero, runIntent } from './lib/intent'
import { deriveStats } from './sim/core/stats'
import { readWorld } from './world'

const intentResult = v.object({
  operationId: v.string(),
  changed: v.boolean(),
  gold: v.optional(v.number()),
  hp: v.optional(v.number()),
  count: v.optional(v.number()),
  tick: v.optional(v.number()),
})

/** The owner's hero with derived stats, biome unlocks and world health. Null when signed out or without a hero. */
export const mine = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const user = await currentUser(ctx)
    const hero = user?.activeHeroId ? await ctx.db.get(user.activeHeroId) : null
    if (user === null || hero === null) return null
    const content = catalogs[ACTIVE_CONTENT]
    const items = await ctx.db
      .query('items')
      .withIndex('by_heroId', (q) => q.eq('heroId', hero._id))
      .take(40)
    const stats = deriveStats(hero, items.map((item) => ({ ...item, id: item._id })))
    const world = await readWorld(ctx)
    return {
      id: hero._id,
      name: hero.name,
      alias: user.publicAlias,
      activationState: hero.activationState,
      simulationState: hero.simulationState,
      level: hero.level,
      xp: hero.xp,
      xpToNext: stats.xpToNext,
      lifetimeXp: hero.lifetimeXp,
      hp: hero.hp,
      maxHp: stats.maxHp,
      attack: stats.attack,
      defense: stats.defense,
      gold: hero.gold,
      status: hero.status,
      biomeId: hero.biomeId,
      targetBiomeId: hero.targetBiomeId ?? null,
      arriveAtTick: hero.arriveAtTick ?? null,
      reviveAtTick: hero.reviveAtTick ?? null,
      wakeAtTick: hero.wakeAtTick ?? null,
      lastTick: hero.lastTick,
      counters: hero.counters,
      biomes: content.biomes.map((biome) => ({ id: biome.id, name: biome.name, unlockLevel: biome.unlockLevel, unlocked: biome.unlockLevel <= hero.level })),
      world: world ? { currentTick: world.currentTick, lastCompletedAt: world.lastCompletedAt ?? null, lastCompletedTick: world.lastCompletedTick ?? null } : null,
    }
  },
})

/** Own log page, newest first. */
export const recentLog = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.any(),
  handler: async (ctx, { paginationOpts }) => {
    const user = await currentUser(ctx)
    if (user?.activeHeroId === undefined || user === null) return { page: [], isDone: true, continueCursor: '' }
    const result = await ctx.db
      .query('tickLogs')
      .withIndex('by_heroId_and_at_and_sequence', (q) => q.eq('heroId', user.activeHeroId!))
      .order('desc')
      .paginate({ ...paginationOpts, numItems: Math.min(50, paginationOpts.numItems) })
    return { ...result, page: result.page.map((log) => ({ id: log._id, at: log.at, kind: log.kind, summary: log.summary, source: log.source, deltas: log.deltas })) }
  },
})

/** One-tick travel to an unlocked biome (gameplay.md "Travel"). */
export const changeBiome = mutation({
  args: { operationId: v.string(), biomeId: v.string() },
  returns: intentResult,
  handler: async (ctx, args) =>
    await runIntent(ctx, args.operationId, 'heroes.changeBiome', { biomeId: args.biomeId }, async (user) => {
      const hero = await requirePlayableHero(ctx, user)
      const biome = catalogs[ACTIVE_CONTENT].biomes.find((b) => b.id === args.biomeId)
      if (!biome) throw appError('INVALID_INPUT', 'Unknown destination.')
      if (hero.status !== 'exploring' && hero.status !== 'resting') throw appError('INVALID_STATE', 'Your hero cannot travel right now.')
      if (biome.unlockLevel > hero.level) throw appError('BIOME_LOCKED', `${biome.name} unlocks at level ${biome.unlockLevel}.`)
      if (biome.id === hero.biomeId) return { changed: false }
      const world = await readWorld(ctx)
      const arriveAtTick = (world?.currentTick ?? 0) + 1
      await ctx.db.patch(hero._id, { status: 'travelling', targetBiomeId: biome.id, arriveAtTick })
      await commandLog(ctx, hero, 'change_biome', `Set off for the ${biome.name}.`)
      return { changed: true, tick: arriveAtTick }
    }),
})

/** Voluntary pause: no rewards or catch-up while paused (D13). */
export const pause = mutation({
  args: { operationId: v.string() },
  returns: intentResult,
  handler: async (ctx, args) =>
    await runIntent(ctx, args.operationId, 'heroes.pause', {}, async (user) => {
      const hero = await requirePlayableHero(ctx, user)
      if (hero.status === 'paused') return { changed: false }
      if (hero.status !== 'exploring' && hero.status !== 'resting') throw appError('INVALID_STATE', 'Your hero cannot pause right now.')
      await ctx.db.patch(hero._id, { status: 'paused', pausedFromStatus: hero.status })
      await commandLog(ctx, hero, 'pause', 'Paused adventures.')
      return { changed: true }
    }),
})

export const resume = mutation({
  args: { operationId: v.string() },
  returns: intentResult,
  handler: async (ctx, args) =>
    await runIntent(ctx, args.operationId, 'heroes.resume', {}, async (user) => {
      const hero = await requirePlayableHero(ctx, user)
      if (hero.status === 'exploring' || hero.status === 'resting') return { changed: false }
      if (hero.status !== 'paused') throw appError('INVALID_STATE', hero.status === 'sleeping' ? 'Use Resume adventures after managing your bag.' : 'Your hero cannot resume right now.')
      await ctx.db.patch(hero._id, { status: hero.pausedFromStatus ?? 'exploring', pausedFromStatus: undefined })
      await commandLog(ctx, hero, 'resume', 'Resumed adventures.')
      return { changed: true }
    }),
})
