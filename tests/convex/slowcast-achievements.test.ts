// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import type { T } from './helpers'
import { nextSlowCastTick, runSlowCastTick, seedAngler } from './slowCastHelpers'
import { ACHIEVEMENTS, newlyUnlocked } from '@trmnl-games/slow-cast/content/achievements'
import { contentV1 } from '@trmnl-games/slow-cast/content'
import { zeroCounters } from '@trmnl-games/slow-cast/sim'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')

describe('Slow Cast achievements (D115, S5)', () => {
  let t: T
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.UTC(2026, 10, 2, 6, 5, 3))
    t = convexTest(schema, modules)
    await runSlowCastTick(t)
  })
  afterEach(() => vi.useRealTimers())

  it('has unique ids and appends species tiers for every species', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length)
    expect(ACHIEVEMENTS.filter((a) => a.category === 'Species')).toHaveLength(contentV1.species.length * 2)
  })

  it('unlocks on the step that crosses a threshold, and not again', () => {
    const base = { level: 1, rodTier: 1, counters: zeroCounters(), logbook: {} }
    const after = { ...base, counters: { ...zeroCounters(), fishCaught: 1 }, logbook: { roach: { count: 1, bestGrams: 500 } } }
    expect(newlyUnlocked(base, after, contentV1).map((a) => a.id).sort()).toEqual(['catches_1', 'first_roach', 'specimen_roach'])
    expect(newlyUnlocked(after, after, contentV1)).toEqual([])
  })

  it('awards in the tick once, with a story line, and counts toward rarity at publication', async () => {
    const anglerId = await seedAngler(t, {}, 'Fin')
    let earned: string[] = []
    // Which unlock comes first depends on the generated angler id, so wait for the first catch itself.
    for (let i = 0; i < 80 && !earned.includes('catches_1'); i += 1) {
      await nextSlowCastTick(t)
      earned = (await t.run(async (ctx) => await ctx.db.query('swAchievements').collect())).map((r) => r.achievementId)
    }
    expect(earned).toContain('catches_1')
    const logs = await t.run(async (ctx) => (await ctx.db.query('swTickLogs').collect()).filter((l) => l.kind === 'achievement'))
    expect(logs.map((l) => l.summary)).toContain('Achievement: First Bite')
    const rows = (await t.run(async (ctx) => await ctx.db.query('swAchievements').collect())).length
    for (let i = 0; i < 4; i += 1) await nextSlowCastTick(t)
    const after = await t.run(async (ctx) => ({ rows: await ctx.db.query('swAchievements').collect(), stats: await ctx.db.query('swAchievementStats').collect() }))
    expect(after.rows.filter((r) => r.achievementId === 'catches_1')).toHaveLength(1)
    expect(after.rows.length).toBeGreaterThanOrEqual(rows)
    expect(after.stats.at(-1)).toMatchObject({ totalPlayers: 1 })
    expect(after.stats.at(-1)!.counts['catches_1']).toBe(1)
    const mine = await t.withIdentity({ issuer: 'issuer', subject: 'Fin' }).query(api.slowCast.achievements.mine, {})
    expect(mine.families.find((f: { family: string }) => f.family === 'catches')).toMatchObject({ earned: { id: 'catches_1', name: 'First Bite' } })
    expect(anglerId).toBeDefined()
  })

  it('awards sales and gold after a sale', async () => {
    const anglerId = await seedAngler(t, {}, 'Fin')
    await t.run(async (ctx) => {
      await ctx.db.patch(anglerId, { achievementsVersion: 1 })
      await ctx.db.insert('catches', { anglerId, speciesId: 'carp', grams: 9000, value: 120, caughtTick: 1, contentVersion: 'v1', createdAt: Date.now() })
    })
    const id = (await t.run(async (ctx) => await ctx.db.query('catches').first()))!._id
    await t.withIdentity({ issuer: 'issuer', subject: 'Fin' }).mutation(api.slowCast.anglers.sellCatches, { operationId: 'sell-ach-01', catchIds: [id] })
    const earned = (await t.run(async (ctx) => await ctx.db.query('swAchievements').collect())).map((r) => r.achievementId).sort()
    expect(earned).toEqual(['gold_earned_1', 'sales_1'])
  })
})
