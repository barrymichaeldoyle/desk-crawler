// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '@trmnl-games/backend/api'
import type { Id } from '@trmnl-games/backend/data-model'
import schema from '../../apps/backend/convex/schema'
import { contentV7 } from '@trmnl-games/desk-crawler/content/v7'
import type { RaidRule } from '@trmnl-games/desk-crawler/sim/core/types'
import { SLOT_MS } from '../../apps/backend/convex/sim/runs/tick'
import { runTick, seedHero, seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
const SLOT = Date.UTC(2026, 9, 3, 10, 0, 2)
const raidRules = contentV7.raids!
/** Every exploring tick launches, so a test needs no seed search; the contest and amounts stay as authored. */
const alwaysRaid: RaidRule = { ...raidRules, launchPermille: { cautious: 1000, balanced: 1000, bold: 1000 } }
const setRules = (rules: RaidRule) => {
  ;(contentV7 as { raids?: RaidRule }).raids = rules
}

const all = (t: T) =>
  t.run(async (ctx) => ({
    raids: await ctx.db.query('raids').collect(),
    pool: await ctx.db.query('raidPool').collect(),
    heroes: await ctx.db.query('heroes').collect(),
  }))

async function tickAt(t: T, slot: number) {
  vi.setSystemTime(SLOT + slot * SLOT_MS)
  return await runTick(t)
}

describe('desk raids backend (D110 R2)', () => {
  let t: T
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(SLOT)
    t = convexTest(schema, modules)
    setRules(alwaysRaid)
  })
  afterEach(() => {
    setRules(raidRules)
    vi.useRealTimers()
  })

  it('stays out of raids entirely under v6: no pool rows, no ledger, no reads that change state', async () => {
    await seedWorld(t, { activeContentVersion: 'v6', currentTick: 10, lastPublishedAt: SLOT - 30 * 60_000 })
    await seedHero(t, { level: 5, gold: 100 }, 'Ana')
    await seedHero(t, { level: 5, gold: 100 }, 'Bo')
    await tickAt(t, 0)
    await tickAt(t, 1)
    const state = await all(t)
    expect(state.pool).toEqual([])
    expect(state.raids).toEqual([])
    expect(state.heroes.every((hero) => hero.raidPoolId === undefined)).toBe(true)
  })

  it('joins every evaluated hero to the pool, raids between them and applies each raid once on the target side', async () => {
    await seedWorld(t, { activeContentVersion: 'v7', currentTick: 10, lastPublishedAt: SLOT - 30 * 60_000 })
    const ids = [] as Id<'heroes'>[]
    for (const alias of ['Ana', 'Bo', 'Cy', 'Di']) ids.push(await seedHero(t, { level: 5, hp: 60, gold: 400 }, alias))
    await tickAt(t, 0)
    let state = await all(t)
    expect(state.pool).toHaveLength(4)
    expect(state.heroes.every((hero) => hero.raidPoolId !== undefined)).toBe(true)
    for (let slot = 1; slot <= 4; slot += 1) await tickAt(t, slot)
    state = await all(t)
    expect(state.raids.length).toBeGreaterThan(0)
    for (const raid of state.raids) {
      expect(raid.raiderHeroId).not.toBe(raid.targetHeroId)
      expect(raid.raiderName).toMatch(/^(Ana|Bo|Cy|Di)$/)
    }
    // The cooldown: no hero is picked twice within 24 ticks.
    const targets = state.raids.map((raid) => raid.targetHeroId)
    expect(new Set(targets).size).toBe(targets.length)
    // Counters agree with the ledger on both sides.
    const applied = state.raids.filter((raid) => raid.state === 'applied')
    expect(applied.length).toBeGreaterThan(0)
    for (const hero of state.heroes) {
      const launched = state.raids.filter((raid) => raid.raiderHeroId === hero._id)
      const received = applied.filter((raid) => raid.targetHeroId === hero._id)
      expect(hero.counters.raidsLaunched ?? 0).toBe(launched.length)
      expect(hero.counters.raidsWon ?? 0).toBe(launched.filter((raid) => raid.raiderWon).length)
      expect((hero.counters.raidsLost ?? 0) + (hero.counters.raidsRepelled ?? 0)).toBe(received.length)
    }
    // Every applied raid is logged on both sides with the rival's owner for masking.
    const logs = await t.run(async (ctx) => (await ctx.db.query('tickLogs').collect()).filter((log) => log.source === 'tick' && log.detail && 'outcome' in log.detail && log.detail.outcome.variant === 'raid'))
    expect(logs.length).toBe(state.raids.length + applied.length)
    for (const log of logs) expect(log.detail).toMatchObject({ outcome: { rivalUserId: expect.any(String), rivalNameVersion: 1 } })
    // Gold only moves: a raid's raider and target sides net to zero unless the target's loss was clamped.
    for (const raid of applied) {
      const raiderSide = raid.raiderWon ? raid.gold : -raid.gold
      const targetSide = raid.raiderWon ? -(raid.targetGold ?? 0) : (raid.targetGold ?? 0)
      expect(raiderSide + targetSide).toBeGreaterThanOrEqual(0)
      if (!raid.raiderWon) expect(raiderSide + targetSide).toBe(0)
    }
  })

  it('commits nothing twice when a stale or duplicate batch worker replays a run', async () => {
    await seedWorld(t, { activeContentVersion: 'v7', currentTick: 10, lastPublishedAt: SLOT - 30 * 60_000 })
    for (const alias of ['Ana', 'Bo', 'Cy']) await seedHero(t, { level: 5, hp: 60, gold: 400 }, alias)
    await tickAt(t, 0)
    const runId = await tickAt(t, 1)
    const before = await all(t)
    await t.mutation(internal.sim.runs.tick.simulateBatch, { runId: runId!, expectedSequence: 0 })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const after = await all(t)
    expect(after.raids).toEqual(before.raids)
    expect(after.heroes.map((hero) => hero.counters)).toEqual(before.heroes.map((hero) => hero.counters))
  })

  it('never picks a paused, suspended or retired hero, and drops a retired hero from the pool', async () => {
    await seedWorld(t, { activeContentVersion: 'v7', currentTick: 10, lastPublishedAt: SLOT - 30 * 60_000 })
    const ana = await seedHero(t, { level: 5, hp: 60, gold: 400 }, 'Ana')
    const bo = await seedHero(t, { level: 5, hp: 60, gold: 400 }, 'Bo')
    const cy = await seedHero(t, { level: 5, hp: 60, gold: 400 }, 'Cy')
    const di = await seedHero(t, { level: 5, hp: 60, gold: 400 }, 'Di')
    await tickAt(t, 0)
    const firstTick = (await all(t)).raids.length
    // Di is the only raider left; the other three desks each own a quarter of the shard range.
    await t.run(async (ctx) => {
      for (const [heroId, shard] of [[di, 0], [bo, 2 ** 30], [cy, 2 ** 31], [ana, 3 * 2 ** 30]] as const) {
        const row = await ctx.db.query('raidPool').withIndex('by_heroId', (q) => q.eq('heroId', heroId)).unique()
        await ctx.db.patch(row!._id, { shard, raidedAtTick: undefined })
      }
      await ctx.db.patch(bo, { status: 'paused', pausedFromStatus: 'exploring' })
      await ctx.db.patch((await ctx.db.get(cy))!.userId, { state: 'suspended' })
      await ctx.db.patch(ana, { isActive: false })
    })
    for (let slot = 1; slot <= 12; slot += 1) await tickAt(t, slot)
    const state = await all(t)
    expect(state.raids).toHaveLength(firstTick)
    expect(state.pool.some((row) => row.heroId === ana)).toBe(false)
    expect(state.heroes.find((hero) => hero._id === ana)?.raidPoolId).toBeUndefined()
    expect(state.pool.some((row) => row.heroId === bo)).toBe(true)
    expect(state.pool.some((row) => row.heroId === cy)).toBe(true)
  })

  it('shows the owner the last raids with a lifetime record, masking a renamed rival', async () => {
    await seedWorld(t, { activeContentVersion: 'v7', currentTick: 10, lastPublishedAt: SLOT - 30 * 60_000 })
    for (const alias of ['Ana', 'Bo', 'Cy', 'Di']) await seedHero(t, { level: 5, hp: 60, gold: 400 }, alias)
    for (let slot = 0; slot <= 3; slot += 1) await tickAt(t, slot)
    const ana = t.withIdentity({ issuer: 'issuer', subject: 'Ana' })
    const view = (await ana.query(api.raids.recent, {}))!
    const state = await all(t)
    const anaId = (await t.run(async (ctx) => (await ctx.db.query('users').withIndex('by_normalizedAlias', (q) => q.eq('normalizedAlias', 'ana')).unique())!.activeHeroId))!
    const anaRaids = state.raids.filter((raid) => raid.raiderHeroId === anaId || raid.targetHeroId === anaId)
    expect(view.record.launched).toBe(state.raids.filter((raid) => raid.raiderHeroId === anaId).length)
    expect(view.raids).toHaveLength(Math.min(5, anaRaids.length))
    expect(view.raids.length).toBeGreaterThan(0)
    for (const row of view.raids) expect(row.rivalName).toMatch(/^(Bo|Cy|Di)$/)
    // A rename bumps the public-name version; older rows stop showing the old name.
    {
      const rival = view.raids[0]!.rivalName
      await t.run(async (ctx) => {
        const user = await ctx.db.query('users').withIndex('by_normalizedAlias', (q) => q.eq('normalizedAlias', rival.toLowerCase())).unique()
        await ctx.db.patch(user!._id, { publicAlias: 'Renamed', normalizedAlias: 'renamed', publicNameVersion: 2 })
      })
      expect((await ana.query(api.raids.recent, {}))!.raids[0]!.rivalName).toBe('A coworker')
    }
    expect(await t.withIdentity({ issuer: 'issuer', subject: 'Nobody' }).query(api.raids.recent, {})).toBeNull()
  })

  it('removes the hero’s pool row and every ledger row it is party to with game deletion', async () => {
    await seedWorld(t, { activeContentVersion: 'v7', currentTick: 10, lastPublishedAt: SLOT - 30 * 60_000 })
    const ana = await seedHero(t, { level: 5, hp: 60, gold: 400 }, 'Ana')
    for (const alias of ['Bo', 'Cy']) await seedHero(t, { level: 5, hp: 60, gold: 400 }, alias)
    for (let slot = 0; slot <= 4; slot += 1) await tickAt(t, slot)
    const before = await all(t)
    const party = before.raids.filter((raid) => raid.raiderHeroId === ana || raid.targetHeroId === ana)
    await t.withIdentity({ issuer: 'issuer', subject: 'Ana' }).mutation(api.deletion.requestGameDeletion, { operationId: 'game-delete-raids', confirm: 'DELETE' })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const after = await all(t)
    expect(after.pool.some((row) => row.heroId === ana)).toBe(false)
    expect(after.raids.some((raid) => raid.raiderHeroId === ana || raid.targetHeroId === ana)).toBe(false)
    expect(after.raids.length).toBe(before.raids.length - party.length)
  })

  it('keeps pending raids and applied raids for 30 days, then retention removes the applied ones', async () => {
    await seedWorld(t, { activeContentVersion: 'v7', currentTick: 4000, lastPublishedAt: SLOT - 30 * 60_000 })
    const ana = await seedHero(t, {}, 'Ana')
    const bo = await seedHero(t, {}, 'Bo')
    await t.run(async (ctx) => {
      const [a, b] = [(await ctx.db.get(ana))!, (await ctx.db.get(bo))!]
      const row = { raiderHeroId: ana, raiderUserId: a.userId, raiderName: 'Ana', raiderNameVersion: 1, targetHeroId: bo, targetUserId: b.userId, targetName: 'Bo', targetNameVersion: 1, raiderWon: true, gold: 5, raiderHpLost: 3, targetHpPct: 30 }
      await ctx.db.insert('raids', { ...row, tick: 10, state: 'applied', appliedTick: 11, targetGold: 5, targetHpLost: 9 })
      await ctx.db.insert('raids', { ...row, tick: 20, state: 'pending' })
      await ctx.db.insert('raids', { ...row, tick: 3990, state: 'applied', appliedTick: 3991, targetGold: 5, targetHpLost: 9 })
    })
    await t.mutation(internal.maintenance.cleanup, { job: 'raids' })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const left = (await all(t)).raids.map((raid) => [raid.tick, raid.state])
    expect(left).toEqual([[20, 'pending'], [3990, 'applied']])
  })
})
