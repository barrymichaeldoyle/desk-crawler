import { v } from 'convex/values'
import { contentV1 } from '@trmnl-games/slow-cast/content'
import { buildPayload, MAX_RECAP_STORIES } from '@trmnl-games/slow-cast/payload'
import { conditionsAt } from '@trmnl-games/slow-cast/sim/simulate'
import { forecastFor } from '@trmnl-games/slow-cast/sim/seed'
import type { Doc } from '../_generated/dataModel'
import { internalQuery, query, type QueryCtx } from '../_generated/server'
import { isGame } from '../lib/gameHooks'
import { currentUser } from '../lib/intent'
import { readEngineWorld } from '../lib/engine/world'
import { currentAngler, slowCastProfile } from './profile'
import { SLOW_CAST_RUNTIME, SLOW_CAST_SCHEDULE } from './runtime'
import { readDeviceBoard } from './leaderboard'

/**
 * Slow Cast's device payload for one authorized installation (trmnl.md "Query read budget"): fixed reads,
 * null for any authorization failure so the HTTP layer answers a generic 404. Read-only.
 */
export const forInstance = internalQuery({
  args: { tokenHash: v.string(), uuid: v.string(), now: v.number(), utcOffset: v.optional(v.union(v.number(), v.null())) },
  returns: v.union(v.null(), v.object({ outcome: v.literal('recoverable') }), v.object({ outcome: v.literal('payload'), payload: v.any(), recordOffsetFor: v.optional(v.id('users')) })),
  handler: async (ctx, args) => {
    const instance = await ctx.db.query('trmnlInstances').withIndex('by_uuid', (q) => q.eq('uuid', args.uuid)).unique()
    if (!instance) {
      if (await ctx.db.query('revokedTrmnlCredentials').withIndex('by_tokenHash', (q) => q.eq('tokenHash', args.tokenHash)).first()) return null
      const grant = await ctx.db.query('trmnlGrants').withIndex('by_tokenHash', (q) => q.eq('tokenHash', args.tokenHash)).unique()
      return grant && isGame(grant, 'slow-cast') && grant.state === 'active' && !grant.authorizedUuid ? { outcome: 'recoverable' as const } : null
    }
    const grant = await ctx.db.get(instance.grantId)
    if (!grant || !isGame(grant, 'slow-cast') || grant.state !== 'active' || grant.tokenHash !== args.tokenHash || (grant.authorizedUuid && grant.authorizedUuid !== args.uuid)) return null
    if (!isGame(instance, 'slow-cast') || instance.userId !== grant.userId || instance.state !== 'active') return null
    const user = await ctx.db.get(instance.userId)
    if (user === null || user.state !== 'active' || (await slowCastProfile(ctx, user._id))?.state === 'deleting') return null
    const payload = await payloadFor(ctx, user, args.now, args.utcOffset ?? null)
    const offsetChanged = args.utcOffset !== undefined && args.utcOffset !== null && args.utcOffset !== user.trmnlUtcOffset
    return { outcome: 'payload' as const, payload, ...(offsetChanged ? { recordOffsetFor: user._id } : {}) }
  },
})

/** The canonical payload for a user's angler; shared by the device route and the owner's preview. */
export async function payloadFor(ctx: QueryCtx, user: Doc<'users'>, now: number, utcOffset: number | null) {
  const world = await readEngineWorld(ctx, SLOW_CAST_RUNTIME)
  const content = (world && SLOW_CAST_RUNTIME.content(world.activeContentVersion)) ?? contentV1
  const angler = await currentAngler(ctx, user)
  const slot = SLOW_CAST_SCHEDULE.wallSlotFor(now)
  const waterId = angler?.travelTo ?? angler?.waterId ?? 'millpond'
  const weather = world ? forecastFor(world.worldSeed, content, waterId, slot) : 'clear'
  const offset = utcOffset ?? user.trmnlUtcOffset
  const { band } = conditionsAt({ tickAt: slot, ...(offset === undefined ? {} : { utcOffsetSeconds: offset }), weather, content })
  const coolerUsed = angler ? (await ctx.db.query('catches').withIndex('by_anglerId', (q) => q.eq('anglerId', angler._id)).take(32)).length : 0
  const logs = angler
    ? (await ctx.db.query('swTickLogs').withIndex('by_anglerId_and_at_and_sequence', (q) => q.eq('anglerId', angler._id)).order('desc').take(MAX_RECAP_STORIES)).filter((log) => log.source !== 'command')
    : []
  return buildPayload({
    content,
    now,
    world: world ? { createdAt: world.createdAt, paused: world.ticksPaused || world.maintenanceMode, ...(world.lastCompletedAt === undefined ? {} : { lastCompletedAt: world.lastCompletedAt }) } : null,
    angler: angler && {
      alias: user.publicAlias,
      activationState: angler.activationState,
      status: angler.status,
      quarantined: angler.simulationState === 'quarantined',
      level: angler.level,
      xp: angler.xp,
      gold: angler.gold,
      waterId: angler.waterId,
      ...(angler.travelTo === undefined ? {} : { travelTo: angler.travelTo }),
      rodTier: angler.rodTier,
      coolerTier: angler.coolerTier,
      ...(angler.baitOnHook === undefined ? {} : { baitOnHook: angler.baitOnHook }),
      bait: angler.bait,
      speciesLogged: Object.keys(angler.logbook).length,
    },
    coolerUsed,
    weather,
    band,
    artBaseUrl: process.env.CONVEX_SITE_URL ?? null,
    board: angler && angler.activationState === 'active' ? await readDeviceBoard(ctx, angler) : null,
    stories: logs.map((log) => ({ kind: log.kind, summary: log.summary, at: log.at, ...(log.detail.speciesId === undefined ? {} : { speciesId: log.detail.speciesId }), ...(log.detail.grams === undefined ? {} : { grams: log.detail.grams }) })),
  })
}

/** The owner's own device preview in the companion (no installation needed). */
export const preview = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const user = await currentUser(ctx)
    if (user === null || user.state !== 'active') return null
    return await payloadFor(ctx, user, Date.now(), null)
  },
})
