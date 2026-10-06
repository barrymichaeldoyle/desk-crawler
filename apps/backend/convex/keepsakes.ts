import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { currentHero, gameProfile } from './lib/gameProfile'
import { currentUser, runIntent } from './lib/intent'
import { appError } from './lib/errors'
import { keepsakeCode, keepsakeGrant, normalizedKeepsakeCode } from './lib/keepsakes'
import { keepsakeWeek, keepsakeWeekStartsAt } from '@trmnl-games/desk-crawler/content/keepsakes'
import { achievementState, awardAchievements } from './lib/achievements'
import { readWorld, worldContent } from './world'

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
      const week = keepsakeWeek(Date.now())
      const collection = await ctx.db.query('deskKeepsakes').withIndex('by_userId', (q) => q.eq('userId', user._id)).unique()
      const totalCollected = collection?.totalCollected ?? 0
      if (collection && collection.lastClaimWeek >= week) return { changed: false, count: totalCollected, keepsakeOutcome: 'already_claimed' as const }
      const grant = await keepsakeGrant(ctx, user._id)
      // Accept last week's cached screen too, but award only once in the current week.
      const valid = grant !== null && /^[A-HJ-NP-Z2-9]{8}$/.test(code) && [week, week - 1]
        .some((period) => normalizedKeepsakeCode(keepsakeCode(grant.tokenHash, user._id, period)) === code)
      if (!valid) return { changed: false, count: totalCollected, keepsakeOutcome: 'invalid_code' as const }
      if (!Number.isSafeInteger(totalCollected + 1)) throw appError('SERVICE_PAUSED', 'Your collection needs a service check.')
      const values = { totalCollected: totalCollected + 1, lastClaimWeek: week, lastClaimedAt: Date.now() }
      if (collection) await ctx.db.patch(collection._id, values)
      else await ctx.db.insert('deskKeepsakes', { userId: user._id, ...values })
      // Cosmetic state only: no hero stats, inventory, simulator or ranking writes. The keepsake
      // achievement family (D65) reads the new total and may add an unlock row and its log.
      const world = await readWorld(ctx)
      await awardAchievements(ctx, hero, achievementState(hero, totalCollected), achievementState(hero, values.totalCollected), worldContent(world), Date.now(), world?.currentTick ?? 0)
      return { changed: true, count: values.totalCollected, keepsakeOutcome: 'claimed' as const }
    })
    return { operationId: result.operationId, changed: result.changed, outcome: result.keepsakeOutcome!, totalCollected: result.count! }
  },
})
