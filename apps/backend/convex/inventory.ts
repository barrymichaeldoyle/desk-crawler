import { currentHero, gameProfile } from './lib/gameProfile'
import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { appError } from './lib/errors'
import { commandLog, currentUser, requirePlayableHero, runIntent } from './lib/intent'
import { maxHp, pctOf } from '@trmnl-games/desk-crawler/sim/core/stats'
import { bagUsed, currentTier, guaranteedTierIndex, isBagFull, nextEarlyTier, nextTier } from '@trmnl-games/desk-crawler/sim/core/bag'
import type { ContentCatalog, HeroState } from '@trmnl-games/desk-crawler/sim/core/types'
import { readWorld, worldContent } from './world'

const intentResult = v.object({
  operationId: v.string(),
  changed: v.boolean(),
  gold: v.optional(v.number()),
  hp: v.optional(v.number()),
  count: v.optional(v.number()),
  tick: v.optional(v.number()),
})

const MANAGEABLE = new Set(['exploring', 'resting', 'sleeping'])

async function heroItems(ctx: QueryCtx, heroId: Id<'heroes'>): Promise<Doc<'items'>[]> {
  return await ctx.db
    .query('items')
    .withIndex('by_heroId', (q) => q.eq('heroId', heroId))
    .take(40)
}

const contentOf = async (ctx: QueryCtx): Promise<ContentCatalog> => worldContent(await readWorld(ctx))
const asBagHero = (hero: Doc<'heroes'>): Pick<HeroState, 'heldItemId' | 'weaponId' | 'armorId' | 'bagCapacity' | 'level' | 'counters'> => ({
  level: hero.level,
  counters: hero.counters,
  bagCapacity: hero.bagCapacity,
  ...(hero.heldItemId === undefined ? {} : { heldItemId: hero.heldItemId }),
  ...(hero.weaponId === undefined ? {} : { weaponId: hero.weaponId }),
  ...(hero.armorId === undefined ? {} : { armorId: hero.armorId }),
})
const asSnapshots = (items: Doc<'items'>[]) => items.map((item) => ({ id: item._id as string, kind: item.kind }))
const bagFull = (hero: Doc<'heroes'>, items: Doc<'items'>[]) => isBagFull(asBagHero(hero), asSnapshots(items))

/** The bag ladder as the companion shows it (D61): current bag, next bag and how to get it. */
function bagLadderView(content: ContentCatalog, hero: Doc<'heroes'>) {
  const ladder = content.bagLadder
  const state = asBagHero(hero)
  const current = currentTier(content, state)
  const next = nextTier(content, state)
  const early = nextEarlyTier(content, state)
  const guaranteed = ladder.tiers[guaranteedTierIndex(ladder, state)]!
  return {
    name: current?.name ?? 'Bag',
    next: next
      ? {
          id: next.id,
          name: next.name,
          capacity: next.capacity,
          price: next.price ?? null,
          milestoneLevel: next.milestone?.level ?? null,
          milestoneAdventures: next.milestone?.ticksExplored ?? null,
          // Purchases may run one bag ahead of the guaranteed one, never more.
          buyable: early?.id === next.id,
          lockedUntilLevel: early?.id === next.id ? null : (ladder.tiers.find((tier) => tier.capacity > guaranteed.capacity)?.milestone?.level ?? null),
        }
      : null,
  }
}
const itemLabel = (item: Doc<'items'>) => `${item.rarity === 'common' ? '' : item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1) + ' '}${item.name}`

/** Bag, held find, potions and capacity for the owner's hero. */
export const mine = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const user = await currentUser(ctx)
    const hero = await currentHero(ctx, user)
    if (hero === null || user === null) return null
    const items = await heroItems(ctx, hero._id)
    const content = await contentOf(ctx)
    const capacity = hero.bagCapacity
    const used = bagUsed(asBagHero(hero), asSnapshots(items))
    return {
      capacity,
      used,
      ladder: bagLadderView(content, hero),
      weaponId: hero.weaponId ?? null,
      armorId: hero.armorId ?? null,
      heldItemId: hero.heldItemId ?? null,
      potions: items.find((item) => item.kind === 'potion')?.quantity ?? 0,
      canResume: hero.status === 'sleeping' && hero.heldItemId === undefined && used < capacity && hero.wakeAtTick === undefined,
      gear: items
        .filter((item) => item.kind !== 'potion')
        .map((item) => ({
          id: item._id,
          kind: item.kind,
          name: item.name,
          label: itemLabel(item),
          rarity: item.rarity,
          requiredLevel: item.requiredLevel,
          attack: item.attack,
          defense: item.defense,
          saleValue: item.saleValue,
          equipped: item._id === hero.weaponId || item._id === hero.armorId,
          held: item._id === hero.heldItemId,
        }))
        .sort((a, b) => Number(b.held) - Number(a.held) || Number(b.equipped) - Number(a.equipped) || b.attack + b.defense - (a.attack + a.defense)),
    }
  },
})

export const usePotion = mutation({
  args: { operationId: v.string() },
  returns: intentResult,
  handler: async (ctx, args) =>
    await runIntent(ctx, args.operationId, 'inventory.usePotion', {}, async (user) => {
      const hero = await requirePlayableHero(ctx, user)
      if (hero.status !== 'exploring' && hero.status !== 'resting') throw appError('INVALID_STATE', 'Potions can be used while exploring or resting.')
      const max = maxHp(hero.level)
      if (hero.hp >= max) throw appError('FULL_HP', 'Your hero is already at full health.')
      const potion = (await heroItems(ctx, hero._id)).find((item) => item.kind === 'potion')
      if (!potion) throw appError('NO_POTION', 'No potions left.')
      const constants = (await contentOf(ctx)).constants
      const hp = Math.min(max, hero.hp + pctOf(max, constants.potionHealPct))
      if (potion.quantity <= 1) await ctx.db.delete(potion._id)
      else await ctx.db.patch(potion._id, { quantity: potion.quantity - 1 })
      const status = hero.status === 'resting' && hp * 100 >= max * constants.resumeExploringAtPct ? 'exploring' : hero.status
      await ctx.db.patch(hero._id, { hp, status })
      await commandLog(ctx, hero, 'use_potion', 'Drank a potion.', { xpEarned: 0, gold: 0, hp: hp - hero.hp })
      return { changed: true, hp }
    }),
})

export const equip = mutation({
  args: { operationId: v.string(), itemId: v.id('items') },
  returns: intentResult,
  handler: async (ctx, args) =>
    await runIntent(ctx, args.operationId, 'inventory.equip', { itemId: args.itemId }, async (user) => {
      const hero = await requirePlayableHero(ctx, user)
      if (!MANAGEABLE.has(hero.status)) throw appError('INVALID_STATE', 'Gear can be changed while exploring, resting or taking a break.')
      const item = await ctx.db.get(args.itemId)
      if (item === null || item.heroId !== hero._id || item.kind === 'potion') throw appError('ITEM_NOT_AVAILABLE', 'That item is not available.')
      if (item._id === hero.heldItemId) throw appError('ITEM_HELD', 'Claim the held find first.')
      if (item.requiredLevel > hero.level) throw appError('LEVEL_REQUIREMENT', `Requires level ${item.requiredLevel}.`)
      const slot = item.kind === 'weapon' ? 'weaponId' : 'armorId'
      if (hero[slot] === item._id) return { changed: false }
      // Swapping is always possible: the old item takes the new one's bag slot. Filling an empty slot frees one.
      await ctx.db.patch(hero._id, { [slot]: item._id })
      await commandLog(ctx, hero, 'equip', `Equipped the ${itemLabel(item)}.`)
      return { changed: true }
    }),
})

export const unequip = mutation({
  args: { operationId: v.string(), slot: v.union(v.literal('weapon'), v.literal('armor')) },
  returns: intentResult,
  handler: async (ctx, args) =>
    await runIntent(ctx, args.operationId, 'inventory.unequip', { slot: args.slot }, async (user) => {
      const hero = await requirePlayableHero(ctx, user)
      if (!MANAGEABLE.has(hero.status)) throw appError('INVALID_STATE', 'Gear can be changed while exploring, resting or taking a break.')
      const field = args.slot === 'weapon' ? 'weaponId' : 'armorId'
      if (hero[field] === undefined) return { changed: false }
      // D61: unequipped gear needs a bag slot of its own.
      if (bagFull(hero, await heroItems(ctx, hero._id))) throw appError('BAG_FULL', 'Free a bag slot to unequip this.')
      await ctx.db.patch(hero._id, { [field]: undefined })
      return { changed: true }
    }),
})

/** Sell bag gear. Equipped and held items are refused; the sale value comes from the stored item, never the client. */
async function sellItems(ctx: MutationCtx, hero: Doc<'heroes'>, itemIds: Id<'items'>[]) {
  if (!MANAGEABLE.has(hero.status)) throw appError('INVALID_STATE', 'Gear can be sold while exploring, resting or taking a break.')
  if (new Set(itemIds).size !== itemIds.length) throw appError('INVALID_INPUT', 'Each item can only be sold once.')
  const items: Doc<'items'>[] = []
  for (const id of itemIds) {
    const item = await ctx.db.get(id)
    if (item === null || item.heroId !== hero._id || item.kind === 'potion') throw appError('ITEM_NOT_AVAILABLE', 'One of those items is not available.')
    if (item._id === hero.weaponId || item._id === hero.armorId) throw appError('ITEM_EQUIPPED', 'Unequip an item before selling it.')
    if (item._id === hero.heldItemId) throw appError('ITEM_HELD', 'Claim the held find first.')
    items.push(item)
  }
  const gold = items.reduce((sum, item) => sum + item.saleValue, 0)
  for (const item of items) await ctx.db.delete(item._id)
  await ctx.db.patch(hero._id, { gold: hero.gold + gold, counters: { ...hero.counters, goldEarned: hero.counters.goldEarned + gold } })
  return { gold, items }
}

export const sell = mutation({
  args: { operationId: v.string(), itemId: v.id('items') },
  returns: intentResult,
  handler: async (ctx, args) =>
    await runIntent(ctx, args.operationId, 'inventory.sell', { itemId: args.itemId }, async (user) => {
      const hero = await requirePlayableHero(ctx, user)
      const { gold, items } = await sellItems(ctx, hero, [args.itemId])
      await commandLog(ctx, (await ctx.db.get(hero._id))!, 'sell', `Sold the ${itemLabel(items[0]!)}.`, { xpEarned: 0, gold, hp: 0 })
      return { changed: true, gold, count: 1 }
    }),
})

/** D29: sell up to 30 player-selected bag items atomically under one receipt. */
export const sellMany = mutation({
  args: { operationId: v.string(), itemIds: v.array(v.id('items')) },
  returns: intentResult,
  handler: async (ctx, args) =>
    await runIntent(ctx, args.operationId, 'inventory.sellMany', { itemIds: args.itemIds }, async (user) => {
      if (args.itemIds.length < 1 || args.itemIds.length > 30) throw appError('INVALID_INPUT', 'Choose between 1 and 30 items.')
      const hero = await requirePlayableHero(ctx, user)
      const { gold } = await sellItems(ctx, hero, args.itemIds)
      await commandLog(ctx, (await ctx.db.get(hero._id))!, 'sell_many', `Sold ${args.itemIds.length} items.`, { xpEarned: 0, gold, hp: 0 })
      return { changed: true, gold, count: args.itemIds.length }
    }),
})

/** Move the held find into the bag; needs one free slot (D19). */
export const claimHeld = mutation({
  args: { operationId: v.string() },
  returns: intentResult,
  handler: async (ctx, args) =>
    await runIntent(ctx, args.operationId, 'inventory.claimHeld', {}, async (user) => {
      const hero = await requirePlayableHero(ctx, user)
      if (hero.status !== 'sleeping' || hero.heldItemId === undefined) throw appError('INVALID_STATE', 'There is no held find to claim.')
      const items = await heroItems(ctx, hero._id)
      if (bagFull(hero, items)) throw appError('BAG_FULL', 'Free a bag slot to claim the find.')
      const held = items.find((item) => item._id === hero.heldItemId)
      await ctx.db.patch(hero._id, { heldItemId: undefined })
      await commandLog(ctx, hero, 'claim_held', held ? `Claimed the ${itemLabel(held)}.` : 'Claimed the held find.')
      return { changed: true }
    }),
})

/** Wake on the next tick, optionally heading to an unlocked biome (D19/D29). No catch-up. */
export const resumeAdventures = mutation({
  args: { operationId: v.string(), biomeId: v.optional(v.string()) },
  returns: intentResult,
  handler: async (ctx, args) =>
    await runIntent(ctx, args.operationId, 'inventory.resumeAdventures', { biomeId: args.biomeId ?? null }, async (user) => {
      const hero = await requirePlayableHero(ctx, user)
      if (hero.status !== 'sleeping') throw appError('INVALID_STATE', 'Your hero is not taking a break.')
      if (hero.heldItemId !== undefined) throw appError('HELD_ITEM_PENDING', 'Claim the held find first.')
      const items = await heroItems(ctx, hero._id)
      const content = await contentOf(ctx)
      if (bagFull(hero, items)) throw appError('BAG_FULL', 'Free at least one bag slot first.')
      let targetBiomeId: string | undefined
      if (args.biomeId !== undefined && args.biomeId !== hero.biomeId) {
        const biome = content.biomes.find((b) => b.id === args.biomeId)
        if (!biome) throw appError('INVALID_INPUT', 'Unknown destination.')
        if (biome.unlockLevel > hero.level) throw appError('BIOME_LOCKED', `${biome.name} unlocks at level ${biome.unlockLevel}.`)
        targetBiomeId = biome.id
      }
      const world = await readWorld(ctx)
      const wakeAtTick = hero.wakeAtTick ?? (world?.currentTick ?? 0) + 1
      if (hero.wakeAtTick !== undefined && hero.targetBiomeId === targetBiomeId) return { changed: false, tick: wakeAtTick }
      await ctx.db.patch(hero._id, { wakeAtTick, targetBiomeId })
      await commandLog(ctx, hero, 'resume_adventures', 'Adventures resume next tick.')
      return { changed: true, tick: wakeAtTick }
    }),
})

/**
 * D61: buy the next bag with gold. The client names the bag it saw, so a
 * changed offer (a milestone or find already granted it) is refused rather
 * than buying a different bag. Never more than one bag ahead of the milestones.
 */
export const buyBag = mutation({
  args: { operationId: v.string(), tierId: v.string() },
  returns: intentResult,
  handler: async (ctx, args) =>
    await runIntent(ctx, args.operationId, 'inventory.buyBag', { tierId: args.tierId }, async (user) => {
      const hero = await requirePlayableHero(ctx, user)
      if (!MANAGEABLE.has(hero.status)) throw appError('INVALID_STATE', 'Bags can be bought while exploring, resting or taking a break.')
      const content = await contentOf(ctx)
      const tier = nextEarlyTier(content, asBagHero(hero))
      if (tier === undefined || tier.price === undefined || tier.id !== args.tierId) throw appError('BAG_UNAVAILABLE', 'That bag is not available right now.')
      if (hero.gold < tier.price) throw appError('NOT_ENOUGH_GOLD', `The ${tier.name} costs ${tier.price} gold.`)
      const from = hero.bagCapacity
      await ctx.db.patch(hero._id, { gold: hero.gold - tier.price, bagCapacity: tier.capacity })
      await commandLog(ctx, (await ctx.db.get(hero._id))!, 'buy_bag', `Bought a [[${tier.name}]]. Bag holds ${tier.capacity}.`, { xpEarned: 0, gold: -tier.price, hp: 0 }, { bagSlots: tier.capacity - from })
      return { changed: true, gold: -tier.price, count: tier.capacity }
    }),
})
