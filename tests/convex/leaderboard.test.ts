// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import schema from '../../apps/backend/convex/schema'
import { runTick, seedHero, seedWorld, world, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
const PUBLISH_SLOT = Date.UTC(2026, 9, 3, 10, 45, 1)
const HOUR = 3_600_000

describe('hourly leaderboard publication', () => {
  let t: T
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(PUBLISH_SLOT)
    t = convexTest(schema, modules)
  })
  afterEach(() => vi.useRealTimers())

  it('publishes all three boards coherently with level groups, ranks and populations', async () => {
    await seedWorld(t, { lastPublishedAt: PUBLISH_SLOT - HOUR - 1000 })
    const low = await seedHero(t)
    const mid = await seedHero(t, { level: 5, hp: 148 })
    const high = await seedHero(t, { level: 9, hp: 196 })
    await runTick(t)
    const w = await world(t)
    expect(w?.activeRunId).toBeUndefined()
    expect(w?.publishedPublicationId).toBeDefined()

    const { publication, generations, ranks } = await t.run(async (ctx) => {
      const publication = await ctx.db.get(w!.publishedPublicationId!)
      const generations = await ctx.db.query('leaderboardGenerations').collect()
      const ranks = await ctx.db.query('heroRanks').collect()
      return { publication, generations, ranks }
    })
    expect(publication).toMatchObject({ state: 'published', globalTotalPlayers: 3 })
    // One rank row per hero per board.
    expect(ranks).toHaveLength(9)
    for (const heroId of [low, mid, high]) {
      expect(ranks.filter((r) => r.heroId === heroId).map((r) => r.board).sort()).toEqual(['overall', 'recent_24h', 'recent_7d'])
    }
    // Lifetime board orders by level; recent boards split into level groups.
    const overall = generations.find((g) => g.board === 'overall')!
    expect(overall).toMatchObject({ cohortKey: 'all', totalPlayers: 3, state: 'ready' })
    expect(overall.entries.map((e) => e.level)).toEqual([9, 5, 1])
    expect(generations.filter((g) => g.board === 'recent_7d').map((g) => g.cohortKey).sort()).toEqual(['1-3', '4-7', '8-11'])
    expect(generations.every((g) => g.state === 'ready')).toBe(true)
  })

  it('leaves long-dormant heroes off recent boards but keeps them on lifetime', async () => {
    await seedWorld(t, { lastPublishedAt: PUBLISH_SLOT - HOUR - 1000 })
    const sleeper = await seedHero(t, { status: 'sleeping' })
    await seedHero(t)
    await runTick(t)
    const ranks = await t.run(async (ctx) => await ctx.db.query('heroRanks').collect())
    expect(ranks.filter((r) => r.heroId === sleeper).map((r) => r.board)).toEqual(['overall'])
    const publication = await t.run(async (ctx) => await ctx.db.query('leaderboardPublications').first())
    expect(publication?.globalTotalPlayers).toBe(1)
  })

  it('keeps Top 100, full populations and consecutive ranks across pages and cohort boundaries', { timeout: 30_000 }, async () => {
    await seedWorld(t)
    for (let i = 0; i < 205; i++) await seedHero(t, { status: 'paused', pausedFromStatus: 'exploring', level: i < 103 ? 1 : 5, hp: 100, scoreHour: Math.floor(PUBLISH_SLOT / HOUR) * HOUR, scoreHourXp: 1 })
    await runTick(t)
    const w = (await world(t))!
    const { generations, ranks } = await t.run(async ctx => ({
      generations: await ctx.db.query('leaderboardGenerations').withIndex('by_publicationId', q => q.eq('publicationId', w.publishedPublicationId!)).collect(),
      ranks: await ctx.db.query('heroRanks').withIndex('by_publicationId', q => q.eq('publicationId', w.publishedPublicationId!)).collect(),
    }))
    expect(ranks).toHaveLength(615)
    expect(generations).toHaveLength(5)
    for (const generation of generations) {
      const expected = generation.board === 'overall' ? 205 : generation.cohortKey === '1-3' ? 103 : 102
      expect(generation).toMatchObject({ state: 'ready', totalPlayers: expected, nextRank: expected + 1 })
      expect(generation.entries.map(e => e.rank)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1))
      expect(ranks.filter(r => r.generationId === generation._id).map(r => r.rank).sort((a,b) => a-b)).toEqual(Array.from({ length: expected }, (_, i) => i + 1))
    }
  })

  it('computes same-board deltas across publications and cleans sets older than the previous one', async () => {
    await seedWorld(t, { lastPublishedAt: PUBLISH_SLOT - HOUR - 1000 })
    await seedHero(t)
    await seedHero(t)
    await runTick(t)
    for (let hour = 1; hour <= 2; hour += 1) {
      vi.setSystemTime(PUBLISH_SLOT + hour * HOUR)
      await runTick(t)
    }
    const publications = await t.run(async (ctx) => await ctx.db.query('leaderboardPublications').collect())
    // First set cleaned up; current and previous kept.
    expect(publications.map((p) => p.state).sort()).toEqual(['published', 'published'])
    const w = await world(t)
    const current = await t.run(async (ctx) => await ctx.db.query('heroRanks').withIndex('by_publicationId', (q) => q.eq('publicationId', w!.publishedPublicationId!)).collect())
    expect(current.some((r) => r.rankDelta !== undefined)).toBe(true)
    const leftovers = await t.run(async (ctx) => (await ctx.db.query('rankInputs').collect()).length)
    expect(leftovers).toBe(4)
  })
})
