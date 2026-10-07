import { currentHero, gameProfile, isDeskCrawler } from './lib/gameProfile'
import { v } from 'convex/values'
import { internalQuery, query, type QueryCtx } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { currentUser } from './lib/intent'

import { bagUsed as countBag } from '@trmnl-games/desk-crawler/sim/core/bag'
import { buildPayload, MAX_LOGS, MAX_RECAP_EVENTS, recapPeriod, type PayloadInput } from '@trmnl-games/desk-crawler/payload'
import { readWorld, worldContent } from './world'
import { readDeviceRanking } from './lib/rankingRead'
import { keepsakeCode, keepsakeGrant } from './lib/keepsakes'
import { keepsakeWeek } from '@trmnl-games/desk-crawler/content/keepsakes'
import { displayLogDeltas } from '@trmnl-games/desk-crawler/log'

/**
 * Fixed-cost canonical payload for one authorized instance (trmnl.md "Query
 * read budget"). Returns null for any authorization failure; the HTTP layer
 * answers a generic 404. Read-only: confirmation/activation happen before this.
 */
export const forInstance = internalQuery({
  args: { gameSlug: v.optional(v.literal('desk-crawler')), tokenHash: v.string(), uuid: v.string(), now: v.number(), instanceName: v.union(v.string(), v.null()), utcOffset: v.optional(v.union(v.number(), v.null())) },
  returns: v.union(
    v.null(),
    v.object({ outcome: v.literal('recoverable') }),
    v.object({ outcome: v.literal('payload'), payload: v.any(), keepsakeCode: v.union(v.string(), v.null()) }),
  ),
  handler: async (ctx, args) => {
    const instance = await ctx.db
      .query('trmnlInstances')
      .withIndex('by_uuid', (q) => q.eq('uuid', args.uuid))
      .unique()
    if (!instance) {
      if (await ctx.db.query('revokedTrmnlCredentials').withIndex('by_tokenHash', q => q.eq('tokenHash', args.tokenHash)).first()) return null
      const grant = await ctx.db.query('trmnlGrants').withIndex('by_tokenHash', q => q.eq('tokenHash', args.tokenHash)).unique()
      return grant && isDeskCrawler(grant) && grant.state === 'active' && !grant.authorizedUuid ? { outcome: 'recoverable' as const } : null
    }
    const grant = await ctx.db.get(instance.grantId)
    if (!grant || !isDeskCrawler(grant) || grant.state !== 'active' || grant.tokenHash !== args.tokenHash || (grant.authorizedUuid && grant.authorizedUuid !== args.uuid)) return null
    if (!isDeskCrawler(instance) || instance.userId !== grant.userId || instance.state !== 'active') return null
    const user = await ctx.db.get(instance.userId)
    if (user === null || user.state !== 'active' || (await gameProfile(ctx, user._id))?.state === 'deleting') return null

    const payload = await payloadFor(ctx, user, args.now, args.instanceName, args.utcOffset ?? null)
    // Device envelope only: canonical/owner-preview payload never contains a claim code.
    const week = keepsakeWeek(args.now)
    const collection = await ctx.db.query('deskKeepsakes').withIndex('by_userId', (q) => q.eq('userId', user._id)).unique()
    const codeGrant = payload.status !== 'unlinked' && (!collection || collection.lastClaimWeek < week) ? await keepsakeGrant(ctx, user._id) : null
    return { outcome: 'payload' as const, payload, keepsakeCode: codeGrant ? keepsakeCode(codeGrant.tokenHash, user._id, week) : null }
  },
})

/** The canonical device payload for a user's current hero. Shared by the device endpoint and the owner preview. */
async function payloadFor(ctx: QueryCtx, user: Doc<'users'>, now: number, instanceName: string | null, utcOffset: number | null) {
  const world = await readWorld(ctx)
  const content = worldContent(world)
  const heroDoc = await currentHero(ctx, user)
  const hero = heroDoc && heroDoc.activationState === 'active' ? heroDoc : null

  let weaponName: string | null = null
  let armorName: string | null = null
  let weaponAttack = 0
  let armorDefense = 0
  let heldItemName: string | null = null
  let potions = 0
  let bagUsed = 0
  let logs: PayloadInput['logs'] = []
  let activity: PayloadInput['activity']
  let latestEvent: { kind: string; outcome?: { variant: string; [key: string]: unknown } } | null = null
  let newestEvent: { kind: string; outcome?: { variant: string; [key: string]: unknown }; title?: string } | null = null
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
    weaponAttack = named(hero.weaponId)?.attack ?? 0
    armorDefense = named(hero.armorId)?.defense ?? 0
    heldItemName = label(named(hero.heldItemId))
    potions = items.find((item) => item.kind === 'potion')?.quantity ?? 0
    bagUsed = countBag({
      ...(hero.heldItemId === undefined ? {} : { heldItemId: hero.heldItemId }),
      ...(hero.weaponId === undefined ? {} : { weaponId: hero.weaponId }),
      ...(hero.armorId === undefined ? {} : { armorId: hero.armorId }),
    }, items.map((item) => ({ id: item._id as string, kind: item.kind })))
    const recent = await ctx.db
      .query('tickLogs')
      .withIndex('by_heroId_and_at_and_sequence', (q) => q.eq('heroId', hero._id))
      .order('desc')
      .take(MAX_LOGS)
    logs = recent.map((log) => ({ at: log.at, kind: log.kind, summary: log.summary, deltas: displayLogDeltas(log) }))
    // The most recently completed stand-up or retro period in the owner's local time (D75), the same one buildPayload labels.
    const period = recapPeriod(now, utcOffset)
    const window = await ctx.db
      .query('tickLogs')
      .withIndex('by_heroId_and_at_and_sequence', (q) => q.eq('heroId', hero._id).gt('at', period.from).lte('at', period.to))
      .order('desc')
      .take(MAX_RECAP_EVENTS + 1)
    activity = { entries: window.slice(0, MAX_RECAP_EVENTS), truncated: window.length > MAX_RECAP_EVENTS }
    // The scene follows the newest gameplay event; the celebration follows the newest log, which may be an achievement (D65).
    const gameplay = recent.find((log) => log.kind !== 'achievement')
    if (gameplay) latestEvent = { kind: gameplay.kind, ...('outcome' in gameplay.detail ? { outcome: gameplay.detail.outcome } : {}) }
    const newest = recent[0]
    if (newest) newestEvent = { kind: newest.kind, ...('outcome' in newest.detail ? { outcome: newest.detail.outcome } : {}), ...('achievementId' in newest.detail ? { title: newest.detail.name } : {}) }
  }

  const payload = buildPayload({
    now,
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
          ...(hero.merchant === undefined ? {} : { merchantExpiresAtTick: hero.merchant.expiresAtTick }),
        }
      : null,
    weaponName,
    armorName,
    weaponAttack,
    armorDefense,
    potions,
    bagUsed,
    bagCapacity: hero?.bagCapacity ?? 0,
    heldItemName,
    logs,
    ...(activity ? { activity } : {}),
    utcOffset,
    instanceName,
    content,
    spriteBaseUrl: process.env.SPRITE_BASE_URL ?? null,
    artBaseUrl: process.env.CONVEX_SITE_URL ?? null,
    latestEvent,
    newestEvent,
    ranking: hero ? await readDeviceRanking(ctx, world, hero) : null,
  })
  return payload
}

/**
 * Owner preview: exactly what the user's TRMNL renders now. `now` comes from
 * the client (rounded to the minute) so the query stays cacheable.
 */
export const mine = query({
  args: { now: v.number(), utcOffset: v.optional(v.union(v.number(), v.null())) },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, { now, utcOffset }) => {
    const user = await currentUser(ctx)
    if (user === null || user.state !== 'active' || (await gameProfile(ctx, user._id))?.state === 'deleting') return null
    const hero = await currentHero(ctx, user)
    if (hero === null || hero.activationState !== 'active') return null
    return await payloadFor(ctx, user, now, null, utcOffset ?? null)
  },
})
