import { v } from 'convex/values'
import { xpToLeave } from '@trmnl-games/engine/levels'
import { contentV1 } from '@trmnl-games/slow-cast/content'
import { activeBait, baitOf, bitePermille, canFish, coolerOf, forecastBlock, rodOf, waterOf, type AnglerState, type SlowCastCatalog, type WaterId } from '@trmnl-games/slow-cast/sim'
import { buyAccess, buyBait, buyCooler, buyRod, nextCooler, nextRod, sell, setBait, travel, tubsThatFit, type ShopResult } from '@trmnl-games/slow-cast/sim/shop'
import { conditionsAt } from '@trmnl-games/slow-cast/sim/simulate'
import { forecastFor } from '@trmnl-games/slow-cast/sim/seed'
import type { Doc } from '../_generated/dataModel'
import { mutation, query, type MutationCtx, type QueryCtx } from '../_generated/server'
import { appError } from '../lib/errors'
import { currentUser, runIntent, type IntentResult } from '../lib/intent'
import { readEngineWorld } from '../lib/engine/world'
import { fromAnglerState, toAnglerState } from './adapter'
import { currentAngler, slowCastProfile } from './profile'
import { SLOW_CAST_RUNTIME, SLOW_CAST_SCHEDULE } from './runtime'
import { awardAfterAnglerIntent } from './achievements'
import { accessId, baitClass, waterId } from './validators'

/**
 * Slow Cast companion API (slow-cast.md "Selling and the shop"). Every change is
 * a receipted, rate-limited intent on the owner's own angler; rules come from the
 * pure shop module so the companion, the harness and the tick agree.
 */

export const MAX_SELL = 24

async function worldContentOf(ctx: QueryCtx): Promise<{ world: Doc<'worldState'> | null; content: SlowCastCatalog }> {
  const world = await readEngineWorld(ctx, SLOW_CAST_RUNTIME)
  return { world, content: (world && SLOW_CAST_RUNTIME.content(world.activeContentVersion)) ?? contentV1 }
}

/** Intents need an activated, healthy angler. */
async function playableAngler(ctx: QueryCtx, user: Doc<'users'>): Promise<Doc<'anglers'>> {
  const angler = await currentAngler(ctx, user)
  if (angler === null) throw appError('HERO_NOT_FOUND', 'No angler yet.')
  if (angler.activationState !== 'active') throw appError('TRMNL_REQUIRED', 'Save Slow Cast in TRMNL to start fishing.')
  if (angler.simulationState === 'quarantined') throw appError('SERVICE_PAUSED', 'This angler is paused for a service check.')
  return angler
}

const REFUSAL: Record<string, string> = {
  NOT_ENOUGH_GOLD: 'Not enough gold yet.',
  MAX_TIER: 'You already have the best one.',
  ALREADY_OWNED: 'You already have that.',
  BAIT_FULL: 'That would hold more bait than the tub allows.',
  LOCKED: 'That water is not open to you yet.',
  UNKNOWN: 'That item is not in the shop.',
  SAME_WATER: 'You are already fishing there.',
  NOT_USED_HERE: 'That bait is not used here.',
}

async function commandLog(ctx: MutationCtx, angler: Doc<'anglers'>, operation: string, summary: string, gold = 0): Promise<number> {
  const sequence = angler.logSequence + 1
  await ctx.db.insert('swTickLogs', { anglerId: angler._id, source: 'command', sequence, at: Date.now(), kind: 'system', summary: summary.slice(0, 90), detail: { v: 1, operation }, deltas: { xpEarned: 0, gold } })
  return sequence
}

/** Apply a pure shop result to the angler, with a command log line. */
async function applyShop(ctx: MutationCtx, angler: Doc<'anglers'>, result: ShopResult, operation: string, summary: (next: AnglerState) => string): Promise<IntentResult> {
  if (!result.ok) throw appError('INVALID_STATE', REFUSAL[result.code] ?? 'That is not possible right now.')
  const sequence = await commandLog(ctx, angler, operation, summary(result.angler), -result.spent)
  await ctx.db.patch(angler._id, { ...fromAnglerState(result.angler), logSequence: sequence })
  // A better rod can earn a Rods tier.
  const { world, content } = await worldContentOf(ctx)
  await awardAfterAnglerIntent(ctx, angler, content, world?.currentTick ?? 0)
  return { changed: true, gold: result.angler.gold }
}

function shopIntent(operation: string, apply: (content: SlowCastCatalog, angler: AnglerState, input: Record<string, unknown>) => ShopResult, summary: (next: AnglerState, content: SlowCastCatalog, input: Record<string, unknown>) => string) {
  return async (ctx: MutationCtx, operationId: string, input: Record<string, unknown>) =>
    await runIntent(ctx, operationId, operation, input, async (user) => {
      const angler = await playableAngler(ctx, user)
      const { content } = await worldContentOf(ctx)
      return await applyShop(ctx, angler, apply(content, toAnglerState(angler), input), operation, (next) => summary(next, content, input))
    })
}

const intentResult = v.object({ operationId: v.string(), changed: v.boolean(), gold: v.optional(v.number()), count: v.optional(v.number()) })
const strip = (r: IntentResult & { operationId: string }) => ({ operationId: r.operationId, changed: r.changed, ...(r.gold === undefined ? {} : { gold: r.gold }), ...(r.count === undefined ? {} : { count: r.count }) })

export const buyNextRod = mutation({
  args: { operationId: v.string() },
  returns: intentResult,
  handler: async (ctx, { operationId }) => strip(await shopIntent('slowCast.buyRod', (c, a) => buyRod(c, a), (n, c) => `Bought the ${rodOf(c, n.rodTier).name}.`)(ctx, operationId, {})),
})

export const buyNextCooler = mutation({
  args: { operationId: v.string() },
  returns: intentResult,
  handler: async (ctx, { operationId }) => strip(await shopIntent('slowCast.buyCooler', (c, a) => buyCooler(c, a), (n, c) => `Bought the ${coolerOf(c, n.coolerTier).name}.`)(ctx, operationId, {})),
})

export const buyAccessItem = mutation({
  args: { operationId: v.string(), access: accessId },
  returns: intentResult,
  handler: async (ctx, { operationId, access }) =>
    strip(await shopIntent('slowCast.buyAccess', (c, a, i) => buyAccess(c, a, i.access as typeof access), (_n, c, i) => `Bought the ${c.access.find((x) => x.id === i.access)?.name ?? 'pass'}.`)(ctx, operationId, { access })),
})

export const buyBaitTubs = mutation({
  args: { operationId: v.string(), bait: baitClass, tubs: v.number() },
  returns: intentResult,
  handler: async (ctx, { operationId, bait, tubs }) =>
    strip(await shopIntent('slowCast.buyBait', (c, a, i) => buyBait(c, a, i.bait as typeof bait, i.tubs as number), (_n, c, i) => `Bought ${i.tubs} ${(i.tubs as number) === 1 ? 'tub' : 'tubs'} of ${baitOf(c, i.bait as typeof bait).name.toLowerCase()}.`)(ctx, operationId, { bait, tubs })),
})

export const chooseBait = mutation({
  args: { operationId: v.string(), bait: baitClass },
  returns: intentResult,
  handler: async (ctx, { operationId, bait }) =>
    strip(await shopIntent('slowCast.setBait', (c, a, i) => setBait(c, a, i.bait as typeof bait), (_n, c, i) => `Put ${baitOf(c, i.bait as typeof bait).name.toLowerCase()} on the hook.`)(ctx, operationId, { bait })),
})

export const travelTo = mutation({
  args: { operationId: v.string(), waterId },
  returns: intentResult,
  handler: async (ctx, { operationId, waterId: to }) =>
    strip(await shopIntent('slowCast.travel', (c, a, i) => travel(c, a, i.waterId as WaterId), (_n, c, i) => `Packing up for ${waterOf(c, i.waterId as string).the}.`)(ctx, operationId, { waterId: to })),
})

/** Sell chosen fish from the cooler. Selection is explicit; there is no auto-sell. */
export const sellCatches = mutation({
  args: { operationId: v.string(), catchIds: v.array(v.id('catches')) },
  returns: intentResult,
  handler: async (ctx, { operationId, catchIds }) => {
    if (catchIds.length === 0 || catchIds.length > MAX_SELL || new Set(catchIds).size !== catchIds.length) throw appError('INVALID_INPUT', `Choose between 1 and ${MAX_SELL} fish.`)
    return strip(
      await runIntent(ctx, operationId, 'slowCast.sell', { catchIds }, async (user) => {
        const angler = await playableAngler(ctx, user)
        const rows = []
        for (const id of catchIds) {
          const row = await ctx.db.get(id)
          if (row === null || row.anglerId !== angler._id) throw appError('INVALID_STATE', 'One of those fish is no longer in your cooler.')
          rows.push(row)
        }
        const next = sell(toAnglerState(angler), rows.map((r) => r.value))
        for (const row of rows) await ctx.db.delete(row._id)
        const earned = next.gold - angler.gold
        const sequence = await commandLog(ctx, angler, 'slowCast.sell', `Sold ${rows.length} fish for ${earned} gold.`, earned)
        await ctx.db.patch(angler._id, { gold: next.gold, counters: next.counters, logSequence: sequence })
        // Sales and gold earned are achievement families.
        const { world, content } = await worldContentOf(ctx)
        await awardAfterAnglerIntent(ctx, angler, content, world?.currentTick ?? 0)
        return { changed: true, gold: next.gold, count: rows.length }
      }),
    )
  },
})

export const pause = mutation({
  args: { operationId: v.string() },
  returns: intentResult,
  handler: async (ctx, { operationId }) =>
    strip(
      await runIntent(ctx, operationId, 'slowCast.pause', {}, async (user) => {
        const angler = await playableAngler(ctx, user)
        if (angler.status === 'paused') return { changed: false }
        const sequence = await commandLog(ctx, angler, 'slowCast.pause', 'Rod on the rest. Fishing paused.')
        await ctx.db.patch(angler._id, { status: 'paused', logSequence: sequence })
        return { changed: true }
      }),
    ),
})

export const resume = mutation({
  args: { operationId: v.string() },
  returns: intentResult,
  handler: async (ctx, { operationId }) =>
    strip(
      await runIntent(ctx, operationId, 'slowCast.resume', {}, async (user) => {
        const angler = await playableAngler(ctx, user)
        if (angler.status === 'fishing') return { changed: false }
        const world = await readEngineWorld(ctx, SLOW_CAST_RUNTIME)
        const sequence = await commandLog(ctx, angler, 'slowCast.resume', 'Line back in the water.')
        // No catch-up: the next tick is the first that counts.
        await ctx.db.patch(angler._id, { status: 'fishing', logSequence: sequence, lastTick: Math.max(angler.lastTick, world?.currentTick ?? 0) })
        return { changed: true }
      }),
    ),
})

export const setPublicProfile = mutation({
  args: { operationId: v.string(), visible: v.boolean() },
  returns: intentResult,
  handler: async (ctx, { operationId, visible }) =>
    strip(
      await runIntent(ctx, operationId, 'slowCast.setPublicProfile', { visible }, async (user) => {
        const angler = await playableAngler(ctx, user)
        if ((angler.publicProfile ?? false) === visible) return { changed: false }
        await ctx.db.patch(angler._id, { publicProfile: visible })
        return { changed: true }
      }),
    ),
})

/**
 * The signed-in owner's dock: angler, cooler, bait, shop, forecast, recent stories. Fixed bounded reads
 * (the angler, at most 24 catches, 20 logs, the world). Null when signed out or before the angler exists.
 */
export const dock = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const user = await currentUser(ctx)
    const profile = user ? await slowCastProfile(ctx, user._id) : null
    const angler = await currentAngler(ctx, user)
    if (user === null || angler === null) return { gameState: profile?.state ?? null, angler: null }
    const { world, content } = await worldContentOf(ctx)
    const now = Date.now()
    const state = toAnglerState(angler)
    const catches = await ctx.db.query('catches').withIndex('by_anglerId', (q) => q.eq('anglerId', angler._id)).take(32)
    const logs = await ctx.db.query('swTickLogs').withIndex('by_anglerId_and_at_and_sequence', (q) => q.eq('anglerId', angler._id)).order('desc').take(20)
    const cooler = coolerOf(content, angler.coolerTier)
    const rod = rodOf(content, angler.rodTier)
    const slot = SLOW_CAST_SCHEDULE.wallSlotFor(now)
    const waters = content.waters.map((w) => {
      const weatherNow = world ? forecastFor(world.worldSeed, content, w.id, slot) : 'clear'
      const conditions = conditionsAt({ tickAt: slot, ...(user.trmnlUtcOffset === undefined ? {} : { utcOffsetSeconds: user.trmnlUtcOffset }), weather: weatherNow, content })
      return {
        id: w.id,
        name: w.name,
        unlockLevel: w.unlockLevel,
        access: w.access ?? null,
        open: canFish(content, state, w.id),
        weather: weatherNow,
        band: conditions.band,
        // The chance a cast here bites right now, with the bait on the hook (or a bare hook if this water does not use it).
        bitePercent: Math.round(bitePermille(content, w, angler.rodTier, activeBait(state, w), conditions) / 10),
        baits: w.baits,
        weatherUntil: (forecastBlock(slot) + 1) * 6 * 3_600_000,
      }
    })
    const next = { rod: nextRod(content, state) ?? null, cooler: nextCooler(content, state) ?? null }
    return {
      gameState: profile?.state ?? 'active',
      angler: {
        alias: user.publicAlias,
        activationState: angler.activationState,
        status: angler.status,
        level: angler.level,
        xp: angler.xp,
        xpToNext: xpToLeave(angler.level),
        gold: angler.gold,
        waterId: angler.waterId,
        travelTo: angler.travelTo ?? null,
        rod: { tier: rod.tier, name: rod.name, limitGrams: rod.limitGrams },
        cooler: { tier: cooler.tier, name: cooler.name, capacity: cooler.capacity, used: catches.length },
        baitOnHook: angler.baitOnHook ?? null,
        bait: content.baits.map((b) => ({ class: b.class, name: b.name, units: angler.bait[b.class] ?? 0, tubSize: b.castsPerTub, price: b.price, tubsThatFit: tubsThatFit(content, state, b.class) })),
        access: angler.access,
        counters: angler.counters,
        publicProfile: angler.publicProfile ?? false,
        speciesLogged: Object.keys(angler.logbook).length,
        speciesTotal: content.species.length,
      },
      catches: catches
        .map((c) => ({ id: c._id, speciesId: c.speciesId, name: content.species.find((s) => s.id === c.speciesId)?.name ?? c.speciesId, grams: c.grams, value: c.value, caughtTick: c.caughtTick }))
        .sort((a, b) => b.caughtTick - a.caughtTick),
      waters,
      shop: {
        rod: next.rod && { name: next.rod.name, price: next.rod.price, limitGrams: next.rod.limitGrams, biteBonusPercent: next.rod.biteBonusPercent },
        cooler: next.cooler && { name: next.cooler.name, price: next.cooler.price, capacity: next.cooler.capacity },
        access: content.access.map((a) => ({ id: a.id, name: a.name, price: a.price, water: a.water, owned: angler.access.includes(a.id) })),
      },
      logs: logs.map((l) => ({ id: l._id, at: l.at, kind: l.kind, summary: l.summary, xp: l.deltas.xpEarned, gold: l.deltas.gold })),
      nextTickAt: SLOW_CAST_SCHEDULE.nextSlotAfter(now),
      worldTick: world?.currentTick ?? 0,
    }
  },
})

/** The angler's logbook: every species, with counts and records for the ones caught; unseen species carry no details. */
export const logbook = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const user = await currentUser(ctx)
    const angler = await currentAngler(ctx, user)
    if (angler === null) return null
    const { content } = await worldContentOf(ctx)
    return content.waters.map((w) => ({
      water: { id: w.id, name: w.name },
      species: content.species
        .filter((s) => s.water === w.id)
        .map((s) => {
          const entry = angler.logbook[s.id]
          return entry
            ? { id: s.id, seen: true as const, name: s.name, rarity: s.rarity, count: entry.count, bestGrams: entry.bestGrams, maxGrams: s.maxGrams, baits: s.baits, times: s.times ?? null, weather: s.weather ?? null }
            : { id: s.id, seen: false as const, rarity: s.rarity }
        }),
    }))
  },
})
