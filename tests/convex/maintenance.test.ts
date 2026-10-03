// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { internal } from '../../convex/_generated/api'
import schema from '../../convex/schema'
import { seedHero, type T } from './helpers'

const modules = import.meta.glob('../../convex/**/*.ts')
const NOW = Date.UTC(2026, 9, 10, 3, 5)

describe('retention cleanup', () => {
  let t: T
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    t = convexTest(schema, modules)
  })
  afterEach(() => vi.useRealTimers())

  it('removes only rows past their retention, in bounded batches', async () => {
    const heroId = await seedHero(t)
    await t.run(async (ctx) => {
      for (let i = 0; i < 250; i += 1) {
        await ctx.db.insert('tickLogs', { heroId, source: 'tick', sequence: i, at: NOW - 80 * 3_600_000, kind: 'rest', summary: 'old', detail: { v: 1, operation: 'x' }, deltas: { xpEarned: 0, gold: 0, hp: 0 } })
      }
      await ctx.db.insert('tickLogs', { heroId, source: 'tick', sequence: 999, at: NOW - 3_600_000, kind: 'rest', summary: 'fresh', detail: { v: 1, operation: 'x' }, deltas: { xpEarned: 0, gold: 0, hp: 0 } })
    })
    await t.mutation(internal.maintenance.cleanup, {})
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const logs = await t.run(async (ctx) => await ctx.db.query('tickLogs').collect())
    expect(logs.map((l) => l.summary)).toEqual(['fresh'])
  })
})
