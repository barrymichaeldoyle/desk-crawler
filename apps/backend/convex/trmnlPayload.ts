import { currentHero, gameProfile, isDeskCrawler } from './lib/gameProfile'
import { v } from 'convex/values'
import { internalQuery } from './_generated/server'
import { ACTIVE_CONTENT, catalogs } from '@trmnl-games/desk-crawler/content'
import { bagGearCount } from '@trmnl-games/desk-crawler/sim/core/invariants'
import { buildPayload } from '@trmnl-games/desk-crawler/payload'
import { readWorld } from './world'
import { readDeviceRanking } from './lib/rankingRead'

/**
 * Fixed-cost canonical payload for one authorized instance (trmnl.md "Query
 * read budget"). Returns null for any authorization failure; the HTTP layer
 * answers a generic 404. Read-only: confirmation/activation happen before this.
 */
export const forInstance = internalQuery({
  args: { gameSlug: v.optional(v.literal('desk-crawler')), tokenHash: v.string(), uuid: v.string(), now: v.number(), instanceName: v.union(v.string(), v.null()) },
  returns: v.union(
    v.null(),
    v.object({ outcome: v.literal('recoverable') }),
    v.object({ outcome: v.literal('payload'), payload: v.any() }),
  ),
  handler: async (ctx, args) => {
    const grant = await ctx.db
      .query('trmnlGrants')
      .withIndex('by_tokenHash', (q) => q.eq('tokenHash', args.tokenHash))
      .unique()
    if (grant === null || !isDeskCrawler(grant) || grant.state !== 'active') return null
    const instance = await ctx.db
      .query('trmnlInstances')
      .withIndex('by_uuid', (q) => q.eq('uuid', args.uuid))
      .unique()
    if (instance === null) return { outcome: 'recoverable' as const }
    if (!isDeskCrawler(instance) || instance.grantId !== grant._id || instance.state !== 'active') return null
    const user = await ctx.db.get(instance.userId)
    if (user === null || user.state !== 'active' || (await gameProfile(ctx, user._id))?.state === 'deleting') return null

    const content = catalogs[ACTIVE_CONTENT]
    const world = await readWorld(ctx)
    const heroDoc = await currentHero(ctx, user)
    const hero = heroDoc && heroDoc.activationState === 'active' ? heroDoc : null

    let weaponName: string | null = null
    let armorName: string | null = null
    let heldItemName: string | null = null
    let potions = 0
    let bagUsed = 0
    let logs: Array<{ at: number; kind: string; summary: string }> = []
    let latestEvent: { kind: string; outcome?: { variant: string; [key: string]: unknown } } | null = null
    if (hero) {
      const items = await ctx.db
        .query('items')
        .withIndex('by_heroId', (q) => q.eq('heroId', hero._id))
        .take(40)
      const named = (id: string | undefined) => items.find((item) => item._id === id)
      const label = (item: (typeof items)[number] | undefined) =>
        item ? `${item.rarity === 'common' ? '' : item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1) + ' '}${item.name}` : null
      weaponName = label(named(hero.weaponId))
      armorName = label(named(hero.armorId))
      heldItemName = label(named(hero.heldItemId))
      potions = items.find((item) => item.kind === 'potion')?.quantity ?? 0
      bagUsed = bagGearCount(hero.heldItemId === undefined ? {} : { heldItemId: hero.heldItemId }, items.map((item) => ({ ...item, id: item._id })))
      const recent = await ctx.db
        .query('tickLogs')
        .withIndex('by_heroId_and_at_and_sequence', (q) => q.eq('heroId', hero._id))
        .order('desc')
        .take(6)
      logs = recent.map((log) => ({ at: log.at, kind: log.kind, summary: log.summary }))
      const newest = recent[0]
      if (newest) latestEvent = { kind: newest.kind, ...('outcome' in newest.detail ? { outcome: newest.detail.outcome } : {}) }
    }

    const payload = buildPayload({
      now: args.now,
      world: world
        ? {
            currentTick: world.currentTick,
            ...(world.lastCompletedTick === undefined ? {} : { lastCompletedTick: world.lastCompletedTick }),
            ...(world.lastCompletedAt === undefined ? {} : { lastCompletedAt: world.lastCompletedAt }),
            createdAt: world.createdAt,
            ticksPaused: world.ticksPaused,
            maintenanceMode: world.maintenanceMode,
          }
        : null,
      ownerAlias: user.publicAlias,
      timezone: user.timezone,
      hero: hero
        ? {
            name: hero.name,
            level: hero.level,
            xp: hero.xp,
            hp: hero.hp,
            gold: hero.gold,
            status: hero.status,
            biomeId: hero.biomeId,
            ...(hero.targetBiomeId === undefined ? {} : { targetBiomeId: hero.targetBiomeId }),
            ...(hero.arriveAtTick === undefined ? {} : { arriveAtTick: hero.arriveAtTick }),
            ...(hero.reviveAtTick === undefined ? {} : { reviveAtTick: hero.reviveAtTick }),
            ...(hero.wakeAtTick === undefined ? {} : { wakeAtTick: hero.wakeAtTick }),
            lastTick: hero.lastTick,
            ...(hero.lastAdvancedAt === undefined ? {} : { lastAdvancedAt: hero.lastAdvancedAt }),
            quarantined: hero.simulationState === 'quarantined',
          }
        : null,
      weaponName,
      armorName,
      potions,
      bagUsed,
      bagCapacity: content.constants.bagCapacity,
      heldItemName,
      logs,
      instanceName: args.instanceName,
      content,
      spriteBaseUrl: process.env.SPRITE_BASE_URL ?? null,
      artBaseUrl: process.env.CONVEX_SITE_URL ?? null,
      latestEvent,
      ranking: hero ? await readDeviceRanking(ctx, world, hero) : null,
    })
    return { outcome: 'payload' as const, payload }
  },
})
