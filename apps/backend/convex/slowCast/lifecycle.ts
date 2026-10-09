import { starterAngler, FIRST_LOG } from '@trmnl-games/slow-cast/sim'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { internal } from '../_generated/api'
import { getOrCreateEngineWorld } from '../lib/engine/world'
import { currentAngler, setCurrentAngler } from './profile'
import { SLOW_CAST_RUNTIME } from './runtime'

/**
 * Slow Cast's half of the TRMNL lifecycle (slow-cast.md "Angler and starting state"). An angler is prepared
 * pending at install and activated once by a confirmed saved installation of the Slow Cast plugin. It has no
 * name of its own: the public alias is its name.
 */
export async function prepareAngler(ctx: MutationCtx, user: Doc<'users'>, now: number): Promise<Id<'anglers'>> {
  const world = await getOrCreateEngineWorld(ctx, SLOW_CAST_RUNTIME)
  const content = SLOW_CAST_RUNTIME.content(world.activeContentVersion)!
  const base = starterAngler(content, world.currentTick)
  const anglerId = await ctx.db.insert('anglers', {
    userId: user._id,
    createdAt: now,
    isActive: true,
    activationState: 'pending_trmnl',
    level: base.level,
    xp: base.xp,
    lifetimeXp: base.lifetimeXp,
    gold: base.gold,
    lastLevelUpTick: world.currentTick,
    status: base.status,
    waterId: base.waterId,
    rodTier: base.rodTier,
    coolerTier: base.coolerTier,
    ...(base.baitOnHook === undefined ? {} : { baitOnHook: base.baitOnHook }),
    bait: base.bait as Record<string, number>,
    access: [],
    logbook: {},
    counters: base.counters,
    quietTicks: 0,
    eligibleFromTick: world.currentTick + 1,
    lastTick: world.currentTick,
    lastProgressTick: world.currentTick,
    logSequence: 1,
    simulationState: 'healthy',
    scoreHourXp: 0,
  })
  await setCurrentAngler(ctx, user, anglerId)
  await ctx.db.insert('swTickLogs', { anglerId, source: 'lifecycle', sequence: 1, at: now, kind: 'system', summary: FIRST_LOG, detail: { v: 1, operation: 'angler_created' }, deltas: { xpEarned: 0, gold: 0 } })
  return anglerId
}

/** First activation baseline: the next Slow Cast tick, no catch-up. Never resets an active angler. */
export async function activateAngler(ctx: MutationCtx, userId: Id<'users'>, now: number): Promise<void> {
  const user = await ctx.db.get(userId)
  const angler = await currentAngler(ctx, user)
  if (angler === null || angler.activationState === 'active') return
  const world = await getOrCreateEngineWorld(ctx, SLOW_CAST_RUNTIME)
  await ctx.db.patch(angler._id, { activationState: 'active', activatedAt: now, eligibleFromTick: world.currentTick + 1, lastTick: world.currentTick, lastProgressTick: world.currentTick, lastLevelUpTick: world.currentTick })
  if (user?.analyticsConsent === true) await ctx.scheduler.runAfter(0, internal.analytics.captureActivation, { userId, event: 'slow cast started', game: 'slow-cast' })
}
