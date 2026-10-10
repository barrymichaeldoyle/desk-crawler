import type { Id } from '@trmnl-games/backend/data-model'
import { contentV1 } from '@trmnl-games/slow-cast/content'
import { starterAngler } from '@trmnl-games/slow-cast/sim'
import { vi } from 'vitest'
import { internal } from '@trmnl-games/backend/api'
import type { T } from './helpers'

let counter = 0

/** An activated angler with a profile and an owner, ready for the next Slow Cast tick. */
export async function seedAngler(t: T, overrides: Record<string, unknown> = {}, alias = `Angler${++counter}`): Promise<Id<'anglers'>> {
  return await t.run(async (ctx) => {
    const now = Date.now() - 60_000
    const existing = await ctx.db.query('users').withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', `issuer|${alias}`)).unique()
    const userId = existing?._id ?? (await ctx.db.insert('users', { tokenIdentifier: `issuer|${alias}`, publicAlias: alias, normalizedAlias: alias.toLowerCase(), timezone: 'UTC', state: 'active', createdAt: now, publicNameVersion: 1 }))
    const base = starterAngler(contentV1, 0)
    const anglerId = await ctx.db.insert('anglers', {
      userId,
      createdAt: now - counter,
      isActive: true,
      activationState: 'active',
      activatedAt: now - counter,
      gold: base.gold,
      status: base.status,
      waterId: base.waterId,
      rodTier: base.rodTier,
      coolerTier: base.coolerTier,
      baitOnHook: 'worms',
      bait: { worms: 12 },
      access: [],
      logbook: {},
      counters: base.counters,
      quietTicks: 0,
      eligibleFromTick: 1,
      lastTick: 0,
      lastProgressTick: 0,
      logSequence: 1,
      simulationState: 'healthy',
      ...overrides,
    })
    await ctx.db.insert('slowCastProfiles', { userId, state: 'active', anglerId, createdAt: now })
    return anglerId
  })
}

export async function runSlowCastTick(t: T) {
  const runId = await t.mutation(internal.slowCast.tick.startTick, {})
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  return runId
}

/** Advance the clock one Slow Cast slot (15 minutes) and run its tick. */
export async function nextSlowCastTick(t: T) {
  vi.advanceTimersByTime(15 * 60_000)
  return await runSlowCastTick(t)
}
