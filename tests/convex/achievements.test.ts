// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import { achievementState, awardAchievements } from '../../apps/backend/convex/lib/achievements'
import { ACHIEVEMENTS_VERSION } from '@trmnl-games/desk-crawler/content/achievements'
import { contentV1 } from '@trmnl-games/desk-crawler/content/v1'
import { zeroCounters } from '@trmnl-games/desk-crawler/sim/core/starter'
import { runTick, seedHero, seedWorld, world, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
/** A regular slot and a publication slot (last quarter of the hour). */
const SLOT = Date.UTC(2026, 9, 3, 10, 0, 0)
const PUBLISH_SLOT = Date.UTC(2026, 9, 3, 10, 45, 1)
const HOUR = 3_600_000

const rows = (t: T) => t.run(async (ctx) => await ctx.db.query('heroAchievements').collect())
const logs = (t: T, heroId: string) => t.run(async (ctx) => (await ctx.db.query('tickLogs').collect()).filter((log) => log.heroId === heroId).sort((a, b) => a.sequence - b.sequence))

describe('achievements (D65)', () => {
  let t: T
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(SLOT)
    t = convexTest(schema, modules)
  })
  afterEach(() => vi.useRealTimers())

  it('unlocks on the tick that crosses a threshold, logs it after the event and celebrates it on the device', async () => {
    await seedWorld(t, { lastPublishedAt: SLOT - 1000 })
    const heroId = await seedHero(t, { achievementsVersion: ACHIEVEMENTS_VERSION }, 'Ana')
    await runTick(t)
    const unlocked = await rows(t)
    expect(unlocked.map((r) => r.achievementId)).toContain('adventures_1')
    expect(unlocked.every((r) => r.heroId === heroId && r.tick === 1 && r.catalogVersion === ACHIEVEMENTS_VERSION)).toBe(true)
    const history = await logs(t, heroId)
    const achievement = history.find((log) => log.kind === 'achievement')!
    expect(achievement).toMatchObject({ source: 'lifecycle', summary: 'Achievement: [[First Day]]', detail: { achievementId: 'adventures_1', name: 'First Day', tier: 1 } })
    // The gameplay event comes first; the achievement log is newer so the device celebrates it.
    expect(achievement.sequence).toBeGreaterThan(history.find((log) => log.source === 'tick')!.sequence)
    const hero = await t.run(async (ctx) => await ctx.db.get(heroId))
    expect(hero?.logSequence).toBe(history.at(-1)!.sequence)
    const preview = await t.withIdentity({ issuer: 'issuer', subject: 'Ana' }).query(api.trmnlPayload.mine, { now: Date.now() })
    expect(preview.celebration).toBe('Achievement: First Day')
    expect(preview.log[0]).toMatchObject({ k: 'achievement' })
    // The scene still follows the gameplay event, not the achievement log.
    const mine = await t.withIdentity({ issuer: 'issuer', subject: 'Ana' }).query(api.heroes.mine, {})
    expect(mine.scenePath).not.toContain('/none/')
    // A second tick with no new threshold adds nothing.
    vi.setSystemTime(SLOT + 15 * 60_000)
    await runTick(t)
    expect((await rows(t)).filter((r) => r.achievementId === 'adventures_1')).toHaveLength(1)
  })

  it('gives a hero behind the catalog one retroactive full pass', async () => {
    await seedWorld(t, { lastPublishedAt: SLOT - 1000 })
    const heroId = await seedHero(t, { level: 4, hp: 120, counters: { ...zeroCounters(), combatWins: 30, monsterWins: { paper_imp: 30 }, ticksExplored: 120, deaths: 5 } })
    await runTick(t)
    const ids = (await rows(t)).map((r) => r.achievementId).sort()
    for (const id of ['slay_paper_imp_1', 'slay_paper_imp_2', 'slay_paper_imp_3', 'levels_1', 'knockouts_1', 'knockouts_2', 'adventures_1', 'adventures_2']) expect(ids).toContain(id)
    expect(ids).not.toContain('slay_paper_imp_4')
    const hero = await t.run(async (ctx) => await ctx.db.get(heroId))
    expect(hero?.achievementsVersion).toBe(ACHIEVEMENTS_VERSION)
    expect((await logs(t, heroId)).filter((log) => log.kind === 'achievement')).toHaveLength(ids.length)
  })

  it('writes each unlock at most once under repeated evaluation', async () => {
    await seedWorld(t)
    const heroId = await seedHero(t)
    const before = achievementState({ level: 1, bagCapacity: 6, counters: zeroCounters() }, 0)
    const after = achievementState({ level: 1, bagCapacity: 6, counters: { ...zeroCounters(), trips: 1 } }, 0)
    for (let i = 0; i < 3; i += 1) {
      await t.run(async (ctx) => {
        const hero = (await ctx.db.get(heroId))!
        await awardAchievements(ctx, hero, before, after, contentV1, Date.now(), 1)
      })
    }
    expect((await rows(t)).map((r) => r.achievementId)).toEqual(['trips_1'])
    expect((await logs(t, heroId)).filter((log) => log.kind === 'achievement')).toHaveLength(1)
  })

  it('publishes a rarity tally over ranked heroes from the same generation as the boards', async () => {
    vi.setSystemTime(PUBLISH_SLOT)
    await seedWorld(t, { lastPublishedAt: PUBLISH_SLOT - HOUR - 1000 })
    const veteran = await seedHero(t, { level: 4, hp: 120, counters: { ...zeroCounters(), monsterWins: { paper_imp: 6 }, combatWins: 6 } })
    await seedHero(t)
    await seedHero(t, { status: 'paused', pausedFromStatus: 'exploring' })
    await seedHero(t, { activationState: 'pending_trmnl', activatedAt: undefined })
    await runTick(t)
    const w = await world(t)
    const stats = await t.run(async (ctx) => await ctx.db.query('achievementStats').withIndex('by_publicationId', (q) => q.eq('publicationId', w!.publishedPublicationId!)).unique())
    expect(stats).not.toBeNull()
    // Three ranked heroes (the pending one is excluded; the paused one is dormant but counted).
    expect(stats!.totalPlayers).toBe(3)
    const direct = await rows(t)
    const expected: Record<string, number> = {}
    for (const row of direct) expected[row.achievementId] = (expected[row.achievementId] ?? 0) + 1
    expect(stats!.counts).toEqual(expected)
    expect(stats!.counts.slay_paper_imp_2).toBe(1)
    expect(direct.filter((r) => r.heroId === veteran).map((r) => r.achievementId)).toContain('levels_1')
    const view = await t.withIdentity({ issuer: 'issuer', subject: 'Hero1' }).query(api.achievements.mine, {})
    expect(view).toBeNull() // seedHero aliases are Hero<n>; this identity owns nothing
  })

  it('serves unlocks, family progress and rarity to the owner', async () => {
    vi.setSystemTime(PUBLISH_SLOT)
    await seedWorld(t, { lastPublishedAt: PUBLISH_SLOT - HOUR - 1000 })
    await seedHero(t, { counters: { ...zeroCounters(), monsterWins: { paper_imp: 23 }, combatWins: 23 } }, 'Ana')
    await runTick(t)
    const view = await t.withIdentity({ issuer: 'issuer', subject: 'Ana' }).query(api.achievements.mine, {})
    expect(view.catalogVersion).toBe(ACHIEVEMENTS_VERSION)
    expect(view.unlocked.map((u: { id: string }) => u.id)).toContain('slay_paper_imp_2')
    const imp = view.families.find((f: { family: string }) => f.family === 'slay_paper_imp')
    expect(imp).toMatchObject({ tier: 2, tiers: 5, next: { tier: 3 }, target: 25 })
    expect(imp.value).toBeGreaterThanOrEqual(23)
    expect(imp.earned).toMatchObject({ id: 'slay_paper_imp_2', name: 'Blue Bin Regular' })
    expect(view.rarity).toMatchObject({ totalPlayers: 1 })
    expect(view.rarity.counts.slay_paper_imp_2).toBe(1)
  })

  it('counts sales and potions from intents and awards their first tiers', async () => {
    await seedWorld(t)
    const heroId = await seedHero(t, { hp: 50, achievementsVersion: ACHIEVEMENTS_VERSION }, 'Ana')
    const owner = t.withIdentity({ issuer: 'issuer', subject: 'Ana' })
    const spare = await t.run(async (ctx) => {
      const weapon = (await ctx.db.query('items').collect()).find((item) => item.heroId === heroId && item.kind === 'weapon')!
      const { _id, _creationTime, ...copy } = weapon
      return await ctx.db.insert('items', { ...copy })
    })
    await owner.mutation(api.inventory.sellMany, { operationId: 'sell-0001', itemIds: [spare] })
    await owner.mutation(api.inventory.usePotion, { operationId: 'potion-0001' })
    const hero = await t.run(async (ctx) => await ctx.db.get(heroId))
    expect(hero?.counters).toMatchObject({ itemsSold: 1, potionsUsed: 1 })
    expect((await rows(t)).map((r) => r.achievementId).sort()).toEqual(['potions_1', 'sales_1'])
  })

  it('fills counters a stored hero predates, in ticks, intents and the one-off backfill', async () => {
    await seedWorld(t, { lastPublishedAt: SLOT - 1000 })
    const legacy = { combatWins: 2, retreats: 0, deaths: 0, rescues: 0, goldEarned: 9, itemsFound: 1, ticksExplored: 7 }
    const ticked = await seedHero(t, { counters: legacy }, 'Ana')
    const stored = await seedHero(t, { counters: legacy, activationState: 'pending_trmnl', activatedAt: undefined })
    const view = await t.withIdentity({ issuer: 'issuer', subject: 'Ana' }).query(api.heroes.mine, {})
    expect(view.counters).toMatchObject({ ...legacy, monsterWins: {}, eliteWins: 0, itemsSold: 0 })
    await runTick(t)
    const after = await t.run(async (ctx) => await ctx.db.get(ticked))
    expect(after?.counters.ticksExplored).toBe(8)
    expect(after?.counters.itemsSold).toBe(0)
    expect(after?.counters.monsterWins).toBeDefined()
    expect((await rows(t)).map((r) => r.achievementId)).toContain('adventures_1')
    // The pending hero is never ticked; the backfill writes its zeros, and a second run patches nothing.
    expect(await t.mutation(internal.achievements.backfillCounters, {})).toEqual({ patched: 1, done: true })
    expect((await t.run(async (ctx) => await ctx.db.get(stored)))?.counters).toEqual({ ...legacy, monsterWins: {}, eliteWins: 0, jackpots: 0, rareFinds: 0, potionsUsed: 0, trapsAvoided: 0, restTicks: 0, trips: 0, itemsSold: 0, stanceChanges: 0 })
    expect(await t.mutation(internal.achievements.backfillCounters, {})).toEqual({ patched: 0, done: true })
  })

  it('purges unlock rows with game deletion', async () => {
    await seedWorld(t, { lastPublishedAt: SLOT - 1000 })
    await seedHero(t, {}, 'Ana')
    await runTick(t)
    expect((await rows(t)).length).toBeGreaterThan(0)
    await t.withIdentity({ issuer: 'issuer', subject: 'Ana' }).mutation(api.deletion.requestGameDeletion, { operationId: 'game-delete-0001', confirm: 'DELETE' })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await rows(t)).toEqual([])
  })
})
