import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { currentHero, gameProfile } from './lib/gameProfile'
import { currentUser, runIntent } from './lib/intent'
import { appError } from './lib/errors'
import { keepsakeCode, keepsakeGrant, letterKeepsakeCode, normalizedKeepsakeCode } from './lib/keepsakes'
import { keepsakeWeek, keepsakeWeekStartsAt, LETTER_CODES_UNTIL } from '@trmnl-games/desk-crawler/content/keepsakes'
import { achievementState, awardAchievements } from './lib/achievements'
import { readWorld, worldContent } from './world'

const MISS_WINDOW_MS = 24 * 60 * 60 * 1000
/** Wrong codes per UTC day. Six digits need their own limit: the intent limit alone allows thousands of guesses a day. */
export const KEEPSAKE_MISS_LIMIT = 10

export const mine = query({
  args: {},
  returns: v.union(v.null(), v.object({ totalCollected: v.number(), lastClaimWeek: v.union(v.number(), v.null()), nextAvailableAt: v.union(v.number(), v.null()), connected: v.boolean() })),
  handler: async (ctx) => {
    const user = await currentUser(ctx)
    if (!user || user.state !== 'active' || (await gameProfile(ctx, user._id))?.state === 'deleting') return null
    const hero = await currentHero(ctx, user)
    if (!hero || hero.activationState !== 'active') return null
    const collection = await ctx.db.query('deskKeepsakes').withIndex('by_userId', (q) => q.eq('userId', user._id)).unique()
    return {
      totalCollected: collection?.totalCollected ?? 0,
      lastClaimWeek: collection?.lastClaimWeek ?? null,
      nextAvailableAt: collection ? keepsakeWeekStartsAt(collection.lastClaimWeek + 1) : null,
      connected: (await keepsakeGrant(ctx, user._id)) !== null,
    }
  },
})

/** Optional cosmetic intent. Invalid guesses commit a receipt and count towards the normal intent limit. */
export const claim = mutation({
  args: { operationId: v.string(), code: v.string() },
  returns: v.object({ operationId: v.string(), changed: v.boolean(), outcome: v.union(v.literal('claimed'), v.literal('already_claimed'), v.literal('invalid_code')), totalCollected: v.number() }),
  handler: async (ctx, args) => {
    const code = normalizedKeepsakeCode(args.code.slice(0, 64))
    const result = await runIntent(ctx, args.operationId, 'keepsakes.claim', { code }, async (user) => {
      const hero = await currentHero(ctx, user)
      if (!hero || hero.activationState !== 'active') throw appError('TRMNL_REQUIRED', 'Save Desk Crawler in TRMNL to collect keepsakes.')
      const now = Date.now()
      const week = keepsakeWeek(now)
      const collection = await ctx.db.query('deskKeepsakes').withIndex('by_userId', (q) => q.eq('userId', user._id)).unique()
      const totalCollected = collection?.totalCollected ?? 0
      if (collection && collection.lastClaimWeek >= week) return { changed: false, count: totalCollected, keepsakeOutcome: 'already_claimed' as const }
      const windowStart = Math.floor(now / MISS_WINDOW_MS) * MISS_WINDOW_MS
      const missKey = `keepsake:${user._id}`
      const misses = await ctx.db.query('rateLimitBuckets').withIndex('by_key_and_windowStart', (q) => q.eq('key', missKey).eq('windowStart', windowStart)).unique()
      if (misses && misses.count >= KEEPSAKE_MISS_LIMIT) throw appError('RATE_LIMITED', 'Too many wrong keepsake codes today. Try again tomorrow.')
      const grant = await keepsakeGrant(ctx, user._id)
      // Accept last week's cached screen too, but award only once in the current week.
      const generate = /^\d{6}$/.test(code) ? keepsakeCode : /^[A-HJ-NP-Z2-9]{8}$/.test(code) && now < LETTER_CODES_UNTIL ? letterKeepsakeCode : null
      const valid = grant !== null && generate !== null && [week, week - 1]
        .some((period) => normalizedKeepsakeCode(generate(grant.tokenHash, user._id, period)) === code)
      if (!valid) {
        // Committed with the invalid outcome, so a failed guess cannot be rolled back.
        if (misses) await ctx.db.patch(misses._id, { count: misses.count + 1 })
        else await ctx.db.insert('rateLimitBuckets', { key: missKey, windowStart, count: 1, expiresAt: windowStart + 2 * MISS_WINDOW_MS })
        return { changed: false, count: totalCollected, keepsakeOutcome: 'invalid_code' as const }
      }
      if (!Number.isSafeInteger(totalCollected + 1)) throw appError('SERVICE_PAUSED', 'Your collection needs a service check.')
      const values = { totalCollected: totalCollected + 1, lastClaimWeek: week, lastClaimedAt: now }
      if (collection) await ctx.db.patch(collection._id, values)
      else await ctx.db.insert('deskKeepsakes', { userId: user._id, ...values })
      // Cosmetic state only: no hero stats, inventory, simulator or ranking writes. The keepsake
      // achievement family (D65) reads the new total and may add an unlock row and its log.
      const world = await readWorld(ctx)
      await awardAchievements(ctx, hero, achievementState(hero, totalCollected), achievementState(hero, values.totalCollected), worldContent(world), now, world?.currentTick ?? 0)
      return { changed: true, count: values.totalCollected, keepsakeOutcome: 'claimed' as const }
    })
    return { operationId: result.operationId, changed: result.changed, outcome: result.keepsakeOutcome!, totalCollected: result.count! }
  },
})
