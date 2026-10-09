import { currentHero, gameProfile } from './lib/gameProfile'
import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { ACTIVE_CONTENT, catalogs } from '@trmnl-games/desk-crawler/content'
import { appError } from './lib/errors'
import { commandLog, currentUser, requirePlayableHero, runIntent } from './lib/intent'
import { deriveStats } from '@trmnl-games/desk-crawler/sim/core/stats'
import { withCounterDefaults } from '@trmnl-games/desk-crawler/sim/core/starter'
import { eventById, optionOf, resolveEffect } from '@trmnl-games/desk-crawler/sim/core/choice'
import { effectById, effectiveStats, liveEffects, withEffect } from '@trmnl-games/desk-crawler/sim/core/modifiers'
import type { ContentCatalog } from '@trmnl-games/desk-crawler/sim/core/types'
import { starterKit } from '@trmnl-games/desk-crawler/sim/core/starter'
import { awardAfterIntent } from './lib/achievements'
import { readWorld } from './world'
import { FULL_SCALE } from '@trmnl-games/desk-crawler/art/scene'
import { sceneFor, scenePath } from '@trmnl-games/desk-crawler/art/sceneKey'
import { displayLogDeltas } from '@trmnl-games/desk-crawler/log'
import { raidWinChance } from '@trmnl-games/desk-crawler/sim/core/raid'
import { maskRaidSummaries } from './lib/raids'
import { hereBiomeId, isLocal, nextStandupAfter, swapTask as swapTodoTask, swapUsed, taskLabel } from '@trmnl-games/desk-crawler/sim/core/todo'
import { deriveStreamSeed } from '@trmnl-games/desk-crawler/sim/seed'
import { worldContent } from './world'
import { toHeroState } from './sim/runs/adapter'

const intentResult = v.object({
  operationId: v.string(),
  changed: v.boolean(),
  gold: v.optional(v.number()),
  hp: v.optional(v.number()),
  count: v.optional(v.number()),
  tick: v.optional(v.number()),
})

/** The owner's hero with derived stats, biome unlocks and world health. Null when signed out or without a hero. */
export const mine = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const user = await currentUser(ctx)
    const hero = await currentHero(ctx, user)
    if (user === null || hero === null) return null
    const content = catalogs[ACTIVE_CONTENT]
    const items = await ctx.db
      .query('items')
      .withIndex('by_heroId', (q) => q.eq('heroId', hero._id))
      .take(40)
    const world = await readWorld(ctx)
    // D80/D81: the stats the hero fights with, affixes and live effects included.
    const stats = effectiveStats(content, { ...hero, ...(hero.effects === undefined ? {} : { effects: hero.effects }) }, items.map((item) => ({ ...item, id: item._id })), world?.currentTick ?? 0)
    // Achievement logs follow their gameplay event (D65); the scene keeps showing that event.
    const newest = (await ctx.db
      .query('tickLogs')
      .withIndex('by_heroId_and_at_and_sequence', (q) => q.eq('heroId', hero._id))
      .order('desc')
      .take(5)).find((log) => log.kind !== 'achievement')
    const scene = sceneFor(hero.status, hero.wakeAtTick !== undefined, newest ? { kind: newest.kind, ...('outcome' in newest.detail ? { outcome: newest.detail.outcome } : {}) } : null)
    return {
      id: hero._id,
      scenePath: scenePath(hero.biomeId, scene.pose, scene.subject, FULL_SCALE),
      name: hero.name,
      alias: user.publicAlias,
      activationState: hero.activationState,
      simulationState: hero.simulationState,
      level: hero.level,
      xp: hero.xp,
      xpToNext: stats.xpToNext,
      lifetimeXp: hero.lifetimeXp,
      hp: hero.hp,
      maxHp: stats.maxHp,
      attack: stats.attack,
      defense: stats.defense,
      baseAttack: deriveStats(hero, items.map((item) => ({ ...item, id: item._id }))).attack,
      baseDefense: deriveStats(hero, items.map((item) => ({ ...item, id: item._id }))).defense,
      effects: liveEffects(hero.effects, world?.currentTick ?? 0).map((active) => ({ id: active.id, name: effectById(content, active.id)?.name ?? active.id, blurb: effectById(content, active.id)?.blurb ?? '', kind: effectById(content, active.id)?.kind ?? 'boon', ticksLeft: active.untilTick - (world?.currentTick ?? 0) })),
      gold: hero.gold,
      status: hero.status,
      biomeId: hero.biomeId,
      targetBiomeId: hero.targetBiomeId ?? null,
      arriveAtTick: hero.arriveAtTick ?? null,
      reviveAtTick: hero.reviveAtTick ?? null,
      wakeAtTick: hero.wakeAtTick ?? null,
      lastTick: hero.lastTick,
      counters: withCounterDefaults(hero.counters),
      // D76: the chosen stance and every stance's thresholds, so the companion can show what each one does.
      merchantTicksLeft: hero.merchant && world && hero.merchant.expiresAtTick > world.currentTick ? hero.merchant.expiresAtTick - world.currentTick : null,
      // D79: the pending choice with its options and what each one would do to this hero right now.
      choice: choiceView(content, hero, items.find((item) => item.kind === 'potion')?.quantity ?? 0, world?.currentTick ?? 0),
      stance: hero.stance ?? 'balanced',
      publicProfile: hero.publicProfile ?? false,
      // D110: under a catalog with raids, each stance also says how often it raids and how often it wins against a balanced hero.
      stances: Object.values(content.stances ?? {}).map((rule) => ({ id: rule.id, name: rule.name, blurb: rule.blurb, potionBelowPct: rule.autoPotionBelowPct, restBelowPct: rule.restBelowPct, resumeAtPct: rule.resumeExploringAtPct, victoryXpPct: rule.victoryXpPct, ...(content.raids ? { raidsPerDay: Math.round(content.raids.launchPermille[rule.id] * 96) / 1000, raidWinPct: raidWinChance(content, rule.id, 'balanced') } : {}) })),
      raidsEnabled: content.raids !== undefined,
      // P31: the to-do list once the world runs a catalog with to-do rules and the hero has one.
      todo: todoView(worldContent(world), hero, user.trmnlUtcOffset),
      biomes: content.biomes.map((biome) => ({ id: biome.id, name: biome.name, unlockLevel: biome.unlockLevel, unlocked: biome.unlockLevel <= hero.level })),
      world: world
        ? {
            currentTick: world.currentTick,
            lastCompletedAt: world.lastCompletedAt ?? null,
            lastCompletedTick: world.lastCompletedTick ?? null,
            lastStartedWallSlot: world.lastStartedWallSlot ?? null,
            paused: world.ticksPaused || world.maintenanceMode,
          }
        : null,
    }
  },
})

/** Own log page, newest first. */
export const recentLog = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.any(),
  handler: async (ctx, { paginationOpts }) => {
    const user = await currentUser(ctx)
    const hero = await currentHero(ctx, user)
    if (hero === null) return { page: [], isDone: true, continueCursor: '' }
    const result = await ctx.db
      .query('tickLogs')
      .withIndex('by_heroId_and_at_and_sequence', (q) => q.eq('heroId', hero._id))
      .order('desc')
      .paginate(paginationOpts)
    const summaries = await maskRaidSummaries(ctx, result.page)
    return { ...result, page: result.page.map((log, index) => ({ id: log._id, at: log.at, tick: log.tick ?? null, kind: log.kind, summary: summaries[index]!, source: log.source, deltas: displayLogDeltas(log) })) }
  },
})

/** One-tick travel to an unlocked biome (gameplay.md "Travel"). */
export const changeBiome = mutation({
  args: { operationId: v.string(), biomeId: v.string() },
  returns: intentResult,
  handler: async (ctx, args) =>
    await runIntent(ctx, args.operationId, 'heroes.changeBiome', { biomeId: args.biomeId }, async (user) => {
      const hero = await requirePlayableHero(ctx, user)
      const biome = catalogs[ACTIVE_CONTENT].biomes.find((b) => b.id === args.biomeId)
      if (!biome) throw appError('INVALID_INPUT', 'Unknown destination.')
      if (hero.status !== 'exploring' && hero.status !== 'resting') throw appError('INVALID_STATE', 'Your hero cannot travel right now.')
      if (biome.unlockLevel > hero.level) throw appError('BIOME_LOCKED', `${biome.name} unlocks at level ${biome.unlockLevel}.`)
      if (biome.id === hero.biomeId) return { changed: false }
      const world = await readWorld(ctx)
      const arriveAtTick = (world?.currentTick ?? 0) + 1
      await ctx.db.patch(hero._id, { status: 'travelling', targetBiomeId: biome.id, arriveAtTick })
      await commandLog(ctx, hero, 'change_biome', `Set off for the ${biome.name}.`)
      return { changed: true, tick: arriveAtTick }
    }),
})

/** The pending choice as the hero page shows it: the situation, each option's label and concrete change, and the adventures left. */
function choiceView(content: ContentCatalog, hero: Doc<'heroes'>, potionsHeld: number, tick: number) {
  const pending = hero.choice
  if (!pending || tick >= pending.expiresAtTick) return null
  const event = eventById(content, pending.eventId)
  if (!event) return null
  const state = { level: hero.level, hp: hero.hp, gold: hero.gold, ...(hero.potionCap === undefined ? {} : { potionCap: hero.potionCap }) }
  return {
    eventId: event.id,
    title: event.title,
    prompt: event.prompt,
    expiresAtTick: pending.expiresAtTick,
    ticksLeft: pending.expiresAtTick - tick,
    defaultOptionId: event.defaultOptionId,
    options: event.options.map((option) => ({ id: option.id, label: option.label, change: resolveEffect(content, state, potionsHeld, option.effect, pending.biomeTier) })),
  }
}

/**
 * Answer the pending narrative choice (D79). The authored effect is applied here exactly as the simulator would
 * apply the default at expiry, and the pending choice is cleared in the same transaction, so the two paths can
 * never both award. The client only names an option; it never supplies the change.
 */
export const choose = mutation({
  args: { operationId: v.string(), optionId: v.string() },
  returns: intentResult,
  handler: async (ctx, args) =>
    await runIntent(ctx, args.operationId, 'heroes.choose', { optionId: args.optionId }, async (user) => {
      const hero = await requirePlayableHero(ctx, user)
      const world = await readWorld(ctx)
      const tick = world?.currentTick ?? 0
      const pending = hero.choice
      if (!pending || tick >= pending.expiresAtTick) throw appError('NO_CHOICE', 'There is nothing to decide right now.')
      const content = catalogs[ACTIVE_CONTENT]
      const event = eventById(content, pending.eventId)
      const option = event === undefined ? undefined : optionOf(event, args.optionId)
      if (!event || !option) throw appError('INVALID_INPUT', 'That is not one of the options.')
      const potion = (await ctx.db.query('items').withIndex('by_heroId_and_kind', (q) => q.eq('heroId', hero._id).eq('kind', 'potion')).first()) ?? null
      const state = { level: hero.level, hp: hero.hp, gold: hero.gold, ...(hero.potionCap === undefined ? {} : { potionCap: hero.potionCap }) }
      const change = resolveEffect(content, state, potion?.quantity ?? 0, option.effect, pending.biomeTier)
      const counters = withCounterDefaults(hero.counters)
      const granted = change.effectId === undefined ? undefined : effectById(content, change.effectId)
      await ctx.db.patch(hero._id, { choice: undefined, gold: hero.gold + change.gold, hp: hero.hp + change.hp, counters: { ...counters, choicesMade: counters.choicesMade + 1, goldEarned: counters.goldEarned + Math.max(0, change.gold) }, ...(granted ? { effects: withEffect(hero.effects, granted, tick).map((effect) => ({ ...effect })) } : {}) })
      if (change.potions > 0) {
        if (potion) await ctx.db.patch(potion._id, { quantity: potion.quantity + change.potions })
        else await ctx.db.insert('items', { ...starterKit(content).potions, quantity: change.potions, heroId: hero._id, createdAt: Date.now() })
      }
      await commandLog(ctx, (await ctx.db.get(hero._id))!, 'choose', option.story, { xpEarned: 0, gold: change.gold, hp: change.hp }, { eventId: event.id, optionId: option.id, ...(change.potions ? { potionsBought: change.potions } : {}), ...(granted ? { effectGained: granted.id } : {}) })
      await awardAfterIntent(ctx, hero, content, tick)
      return { changed: true, gold: change.gold, hp: hero.hp + change.hp }
    }),
})

const STANCE_IDS = ['cautious', 'balanced', 'bold'] as const

/**
 * Choose how the hero sustains itself (D76). A policy, not an action: allowed in every gameplay status, takes effect
 * at the hero's next evaluation under a catalog that knows stances, never advances or rewards anything.
 *
 * Only the stance the next tick plays by matters (D103), so switches with nothing logged between them share one line:
 * the newest switch rewrites it, and switching back to where it started removes it. The counter follows the line, so
 * flicking between stances never counts more than one change.
 */
export const setStance = mutation({
  args: { operationId: v.string(), stance: v.union(v.literal('cautious'), v.literal('balanced'), v.literal('bold')) },
  returns: intentResult,
  handler: async (ctx, args) =>
    await runIntent(ctx, args.operationId, 'heroes.setStance', { stance: args.stance }, async (user) => {
      const hero = await requirePlayableHero(ctx, user)
      const content = catalogs[ACTIVE_CONTENT]
      const rule = content.stances?.[args.stance]
      if (!rule || !STANCE_IDS.includes(args.stance)) throw appError('INVALID_INPUT', 'Unknown stance.')
      if ((hero.stance ?? 'balanced') === args.stance) return { changed: false }
      const counters = withCounterDefaults(hero.counters)
      // An achievement the switch itself earned may sit above its line; anything else closes the line.
      const recent = await ctx.db.query('tickLogs').withIndex('by_heroId_and_at_and_sequence', (q) => q.eq('heroId', hero._id)).order('desc').take(4)
      const latest = recent.find((log) => log.kind !== 'achievement') ?? null
      const open = latest !== null && latest.source === 'command' && 'operation' in latest.detail && latest.detail.operation === 'set_stance' ? latest.detail.stanceFrom : undefined
      if (latest === null || open === undefined) {
        await ctx.db.patch(hero._id, { stance: args.stance, counters: { ...counters, stanceChanges: counters.stanceChanges + 1 } })
        await commandLog(ctx, hero, 'set_stance', stanceSummary(content, hero.stance ?? 'balanced', args.stance), undefined, { stanceFrom: hero.stance ?? 'balanced' })
        await awardAfterIntent(ctx, hero, content, (await readWorld(ctx))?.currentTick ?? 0)
      } else if (open === args.stance) {
        await ctx.db.patch(hero._id, { stance: args.stance, counters: { ...counters, stanceChanges: Math.max(0, counters.stanceChanges - 1) } })
        await ctx.db.delete(latest._id)
      } else {
        await ctx.db.patch(hero._id, { stance: args.stance })
        await ctx.db.patch(latest._id, { at: Date.now(), summary: stanceSummary(content, open, args.stance) })
      }
      return { changed: true }
    }),
})

/**
 * P31: swap one unfinished to-do task for a new one of another kind, dropping its progress. One swap per refill
 * period; the new task comes from the hero's `quest` stream at the world's current tick, so a retry or a duplicate
 * receipt writes the same task and nothing is rerolled.
 */
export const swapTask = mutation({
  args: { operationId: v.string(), slot: v.number() },
  returns: intentResult,
  handler: async (ctx, args) =>
    await runIntent(ctx, args.operationId, 'heroes.swapTask', { slot: args.slot }, async (user) => {
      const hero = await requirePlayableHero(ctx, user)
      const world = await readWorld(ctx)
      const content = worldContent(world)
      const tick = world?.currentTick ?? 0
      const seed = deriveStreamSeed(world?.worldSeed ?? '', hero._id, tick, world?.activeSimulationVersion ?? 1, 'quest')
      const swapped = swapTodoTask(toHeroState(hero), args.slot, content, seed, tick)
      if ('refusal' in swapped) {
        switch (swapped.refusal) {
          case 'NO_TODO':
            throw appError('TODO_UNAVAILABLE', 'The to-do list is not ready yet.')
          case 'BAD_SLOT':
            throw appError('INVALID_INPUT', 'Unknown task.')
          case 'TASK_DONE':
            throw appError('TASK_DONE', 'That task is already ticked off.')
          case 'SWAP_USED':
            throw appError('SWAP_USED', "Today's swap is used. You get a new one at the next stand-up.")
        }
      }
      const task = swapped.list.tasks[args.slot]!
      await ctx.db.patch(hero._id, { todo: { ...swapped.list, tasks: swapped.list.tasks.map((t) => ({ ...t })) } })
      await commandLog(ctx, hero, 'swap_task', `Swapped a task: ${taskLabel(task, content)}.`)
      return { changed: true }
    }),
})

/** P31: the companion's To-do card. */
function todoView(content: ContentCatalog, hero: Doc<'heroes'>, utcOffset: number | undefined) {
  const list = hero.todo
  if (content.todo === undefined || list === undefined) return null
  const here = hereBiomeId(hero)
  return {
    tasks: list.tasks.map((task, slot) => ({
      slot,
      templateId: task.templateId,
      label: taskLabel(task, content),
      progress: task.progress,
      target: task.target,
      reward: task.reward,
      done: task.doneTick !== undefined,
      biomeId: task.biomeId ?? null,
      local: isLocal(task, here),
    })),
    swapAvailable: !swapUsed(list),
    nextStandupAt: nextStandupAfter(list, utcOffset, content),
    refillHour: content.todo.refillHour,
  }
}

/** v1.2: show or hide the hero's public profile page. Off until the owner turns it on. */
export const setPublicProfile = mutation({
  args: { operationId: v.string(), visible: v.boolean() },
  returns: intentResult,
  handler: async (ctx, args) =>
    await runIntent(ctx, args.operationId, 'heroes.setPublicProfile', { visible: args.visible }, async (user) => {
      const hero = await currentHero(ctx, user)
      if (hero === null) throw appError('HERO_NOT_FOUND', 'No hero yet.')
      if (hero.activationState !== 'active') throw appError('TRMNL_REQUIRED', 'Save Desk Crawler in TRMNL to start adventures.')
      if ((hero.publicProfile ?? false) === args.visible) return { changed: false }
      await ctx.db.patch(hero._id, { publicProfile: args.visible })
      return { changed: true }
    }),
})

const stanceSummary = (content: ContentCatalog, from: (typeof STANCE_IDS)[number], to: (typeof STANCE_IDS)[number]) =>
  `Stance set to [[${content.stances?.[to]?.name ?? to}]] from ${(content.stances?.[from]?.name ?? from).toLowerCase()}.`

/** Voluntary pause: no rewards or catch-up while paused (D13). */
export const pause = mutation({
  args: { operationId: v.string() },
  returns: intentResult,
  handler: async (ctx, args) =>
    await runIntent(ctx, args.operationId, 'heroes.pause', {}, async (user) => {
      const hero = await requirePlayableHero(ctx, user)
      if (hero.status === 'paused') return { changed: false }
      if (hero.status !== 'exploring' && hero.status !== 'resting') throw appError('INVALID_STATE', 'Your hero cannot pause right now.')
      await ctx.db.patch(hero._id, { status: 'paused', pausedFromStatus: hero.status })
      await commandLog(ctx, hero, 'pause', 'Paused adventures.')
      return { changed: true }
    }),
})

export const resume = mutation({
  args: { operationId: v.string() },
  returns: intentResult,
  handler: async (ctx, args) =>
    await runIntent(ctx, args.operationId, 'heroes.resume', {}, async (user) => {
      const hero = await requirePlayableHero(ctx, user)
      if (hero.status === 'exploring' || hero.status === 'resting') return { changed: false }
      if (hero.status !== 'paused') throw appError('INVALID_STATE', hero.status === 'sleeping' ? 'Use Resume adventures after managing your bag.' : 'Your hero cannot resume right now.')
      await ctx.db.patch(hero._id, { status: hero.pausedFromStatus ?? 'exploring', pausedFromStatus: undefined })
      await commandLog(ctx, hero, 'resume', 'Resumed adventures.')
      return { changed: true }
    }),
})

/**
 * Bounded return recap (D25): progress since the last acknowledged companion
 * visit from one server checkpoint. No history scan; never changes rewards.
 */
export const returnSummary = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const user = await currentUser(ctx)
    const hero = await currentHero(ctx, user)
    if (user === null || hero === null || hero.activationState !== 'active') return null
    const items = await ctx.db
      .query('items')
      .withIndex('by_heroId', (q) => q.eq('heroId', hero._id))
      .take(40)
    // P32: drawer gear is counted apart from the bag, as the held find is.
    const drawer = new Set<string>(hero.drawer ?? [])
    const unequipped = items.filter((item) => item.kind !== 'potion' && item._id !== hero.weaponId && item._id !== hero.armorId && item._id !== hero.heldItemId && !drawer.has(item._id)).length
    const baseline = hero.companionVisitBaseline ?? null
    return {
      baseline,
      observed: { level: hero.level, lifetimeXp: hero.lifetimeXp, logSequence: hero.logSequence },
      xpGained: baseline ? Math.max(0, hero.lifetimeXp - baseline.lifetimeXp) : null,
      levelsGained: baseline ? Math.max(0, hero.level - baseline.level) : null,
      newEvents: baseline ? Math.max(0, hero.logSequence - baseline.logSequence) : null,
      counters: baseline
        ? {
            combatWins: Math.max(0, hero.counters.combatWins - baseline.counters.combatWins),
            goldEarned: Math.max(0, hero.counters.goldEarned - baseline.counters.goldEarned),
            itemsFound: Math.max(0, hero.counters.itemsFound - baseline.counters.itemsFound),
            deaths: Math.max(0, hero.counters.deaths - baseline.counters.deaths),
          }
        : null,
      unequipped,
      held: hero.heldItemId !== undefined,
      inDrawer: drawer.size,
      status: hero.status,
    }
  },
})

/**
 * Acknowledge a visibly rendered recap. Captures current server values only if
 * the rendered log sequence is still current (RECAP_CHANGED otherwise), so
 * unseen progress is never hidden; baselines never move backwards.
 */
export const recordCompanionVisit = mutation({
  args: { operationId: v.string(), expectedLogSequence: v.number() },
  returns: intentResult,
  handler: async (ctx, args) =>
    await runIntent(ctx, args.operationId, 'heroes.recordCompanionVisit', { expectedLogSequence: args.expectedLogSequence }, async (user) => {
      const hero = await currentHero(ctx, user)
      if (hero === null || hero.activationState !== 'active') throw appError('TRMNL_REQUIRED', 'No active hero yet.')
      if (hero.logSequence !== args.expectedLogSequence) throw appError('RECAP_CHANGED', 'New adventures arrived. Refreshing.')
      const previous = hero.companionVisitBaseline
      if (previous && previous.logSequence > hero.logSequence) return { changed: false }
      await ctx.db.patch(hero._id, { companionVisitBaseline: { at: Date.now(), level: hero.level, lifetimeXp: hero.lifetimeXp, logSequence: hero.logSequence, counters: hero.counters } })
      return { changed: true }
    }),
})
