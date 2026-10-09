import { v } from 'convex/values'
import { contentV1 } from '@trmnl-games/slow-cast/content'
import { flyBox, flyForClaim, flyWeek, flyWeekStartsAt } from '@trmnl-games/slow-cast/content/flies'
import type { Id } from '../_generated/dataModel'
import { mutation, query, type QueryCtx } from '../_generated/server'
import { appError } from '../lib/errors'
import { isGame } from '../lib/gameHooks'
import { currentUser, runIntent } from '../lib/intent'
import { flyCode, normalizedKeepsakeCode } from '../lib/keepsakes'
import { readEngineWorld } from '../lib/engine/world'
import { awardAngler, stateOf } from './achievements'
import { currentAngler, slowCastProfile } from './profile'
import { SLOW_CAST_RUNTIME } from './runtime'

/**
 * The fly box (slow-cast.md "Staying on the TRMNL"), Desk Crawler's keepsake rules (D46/D73): the device shows a
 * six-digit weekly code the companion preview never does; entering it adds one fly. One a week, last week's code still
 * works for a slow screen, a missed week costs nothing, and wrong guesses are limited to ten a day.
 */
const MISS_WINDOW_MS = 24 * 60 * 60 * 1000
export const FLY_MISS_LIMIT = 10

/** The newest active Slow Cast installation's grant: the key for this account's code. */
export async function flyGrant(ctx: QueryCtx, userId: Id<'users'>) {
  const instances = await ctx.db.query('trmnlInstances').withIndex('by_userId_and_state', (q) => q.eq('userId', userId).eq('state', 'active')).order('desc').take(10)
  const instance = instances.find((row) => isGame(row, 'slow-cast'))
  if (!instance) return null
  const grant = await ctx.db.get(instance.grantId)
  return grant && isGame(grant, 'slow-cast') && grant.userId === userId && grant.state === 'active' ? grant : null
}

export async function flyTotal(ctx: QueryCtx, userId: Id<'users'>): Promise<number> {
  return (await ctx.db.query('flyBoxes').withIndex('by_userId', (q) => q.eq('userId', userId)).unique())?.totalCollected ?? 0
}

/** The code for this week, for the device route only; never for the companion. */
export async function deviceFlyCode(ctx: QueryCtx, userId: Id<'users'>, now: number): Promise<string | null> {
  const week = flyWeek(now)
  const box = await ctx.db.query('flyBoxes').withIndex('by_userId', (q) => q.eq('userId', userId)).unique()
  if (box && box.lastClaimWeek >= week) return null
  const grant = await flyGrant(ctx, userId)
  return grant ? flyCode(grant.tokenHash, userId, week) : null
}

export const mine = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const user = await currentUser(ctx)
    if (!user || user.state !== 'active' || (await slowCastProfile(ctx, user._id))?.state === 'deleting') return null
    const angler = await currentAngler(ctx, user)
    if (!angler || angler.activationState !== 'active') return null
    const box = await ctx.db.query('flyBoxes').withIndex('by_userId', (q) => q.eq('userId', user._id)).unique()
    const total = box?.totalCollected ?? 0
    return {
      totalCollected: total,
      claimedThisWeek: box !== null && box.lastClaimWeek >= flyWeek(Date.now()),
      nextAvailableAt: box ? flyWeekStartsAt(box.lastClaimWeek + 1) : null,
      connected: (await flyGrant(ctx, user._id)) !== null,
      newest: total > 0 ? flyForClaim(total).id : null,
      box: flyBox(total).map((f) => ({ id: f.id, name: f.name, count: f.count, rows: f.art.rows })),
    }
  },
})

export const claim = mutation({
  args: { operationId: v.string(), code: v.string() },
  returns: v.object({ operationId: v.string(), changed: v.boolean(), outcome: v.union(v.literal('claimed'), v.literal('already_claimed'), v.literal('invalid_code')), totalCollected: v.number() }),
  handler: async (ctx, args) => {
    const code = normalizedKeepsakeCode(args.code.slice(0, 64))
    const result = await runIntent(ctx, args.operationId, 'slowCast.flies.claim', { code }, async (user) => {
      const angler = await currentAngler(ctx, user)
      if (!angler || angler.activationState !== 'active') throw appError('TRMNL_REQUIRED', 'Save Slow Cast in TRMNL to collect flies.')
      const now = Date.now()
      const week = flyWeek(now)
      const box = await ctx.db.query('flyBoxes').withIndex('by_userId', (q) => q.eq('userId', user._id)).unique()
      const total = box?.totalCollected ?? 0
      if (box && box.lastClaimWeek >= week) return { changed: false, count: total, keepsakeOutcome: 'already_claimed' as const }
      const windowStart = Math.floor(now / MISS_WINDOW_MS) * MISS_WINDOW_MS
      const missKey = `fly:${user._id}`
      const misses = await ctx.db.query('rateLimitBuckets').withIndex('by_key_and_windowStart', (q) => q.eq('key', missKey).eq('windowStart', windowStart)).unique()
      if (misses && misses.count >= FLY_MISS_LIMIT) throw appError('RATE_LIMITED', 'Too many wrong fly codes today. Try again tomorrow.')
      const grant = await flyGrant(ctx, user._id)
      const valid = grant !== null && /^\d{6}$/.test(code) && [week, week - 1].some((period) => normalizedKeepsakeCode(flyCode(grant.tokenHash, user._id, period)) === code)
      if (!valid) {
        if (misses) await ctx.db.patch(misses._id, { count: misses.count + 1 })
        else await ctx.db.insert('rateLimitBuckets', { key: missKey, windowStart, count: 1, expiresAt: windowStart + 2 * MISS_WINDOW_MS })
        return { changed: false, count: total, keepsakeOutcome: 'invalid_code' as const }
      }
      const values = { totalCollected: total + 1, lastClaimWeek: week, lastClaimedAt: now }
      if (box) await ctx.db.patch(box._id, values)
      else await ctx.db.insert('flyBoxes', { userId: user._id, ...values })
      // Cosmetic only: the Flies achievement family reads the new total.
      const world = await readEngineWorld(ctx, SLOW_CAST_RUNTIME)
      const content = (world && SLOW_CAST_RUNTIME.content(world.activeContentVersion)) ?? contentV1
      await awardAngler(ctx, angler, stateOf(angler, total), stateOf(angler, total + 1), content, now, world?.currentTick ?? 0)
      return { changed: true, count: values.totalCollected, keepsakeOutcome: 'claimed' as const }
    })
    return { operationId: result.operationId, changed: result.changed, outcome: result.keepsakeOutcome!, totalCollected: result.count! }
  },
})
