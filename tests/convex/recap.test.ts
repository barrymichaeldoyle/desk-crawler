// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../convex/_generated/api'
import schema from '../../convex/schema'
import { seedHero, seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../convex/**/*.ts')

describe('return recap (D25)', () => {
  let t: T
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.UTC(2026, 9, 3, 10, 0))
    t = convexTest(schema, modules)
    await seedWorld(t)
  })
  afterEach(() => vi.useRealTimers())

  it('welcomes a first visit, then reports gains since the acknowledged checkpoint', async () => {
    const heroId = await seedHero(t, {}, 'Ana')
    const user = t.withIdentity({ issuer: 'issuer', subject: 'Ana' })
    const first = await user.query(api.heroes.returnSummary, {})
    expect(first).toMatchObject({ baseline: null, xpGained: null })
    await user.mutation(api.heroes.recordCompanionVisit, { operationId: 'visit-0001', expectedLogSequence: first.observed.logSequence })

    // Progress happens while away.
    await t.run(async (ctx) => await ctx.db.patch(heroId, { lifetimeXp: 180, level: 2, xp: 130, logSequence: 9 }))
    const later = await user.query(api.heroes.returnSummary, {})
    expect(later).toMatchObject({ xpGained: 180, levelsGained: 1, newEvents: 8 })
  })

  it('refuses a stale acknowledgement so unseen progress is never hidden', async () => {
    const heroId = await seedHero(t, {}, 'Bo')
    const user = t.withIdentity({ issuer: 'issuer', subject: 'Bo' })
    const seen = await user.query(api.heroes.returnSummary, {})
    await t.run(async (ctx) => await ctx.db.patch(heroId, { logSequence: seen.observed.logSequence + 1 }))
    await expect(user.mutation(api.heroes.recordCompanionVisit, { operationId: 'visit-0002', expectedLogSequence: seen.observed.logSequence })).rejects.toThrow()
    expect((await t.run(async (ctx) => await ctx.db.get(heroId)))?.companionVisitBaseline).toBeUndefined()
  })
})
