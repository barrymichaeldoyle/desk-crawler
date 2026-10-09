// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import type { T } from './helpers'
import { runSlowCastTick, seedAngler } from './slowCastHelpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')

describe('Slow Cast alerts (D115, S6)', () => {
  let t: T
  beforeEach(async () => {
    vi.useFakeTimers()
    // 10:05 UTC, outside the default quiet hours.
    vi.setSystemTime(Date.UTC(2026, 10, 2, 10, 5, 3))
    t = convexTest(schema, modules)
    await runSlowCastTick(t)
  })
  afterEach(() => vi.useRealTimers())

  async function setup(prefs: { coolerFull: boolean; baitOut: boolean }) {
    const anglerId = await seedAngler(t, { achievementsVersion: 1 }, 'Kit')
    const kit = t.withIdentity({ issuer: 'issuer', subject: 'Kit' })
    await kit.mutation(api.alerts.subscribe, { operationId: 'sub-kit-001', endpoint: 'https://push.example/kit', p256dh: 'BKey', auth: 'Auth', label: 'Phone' })
    await kit.mutation(api.alerts.setPreferences, { operationId: 'pref-kit-01', ...prefs, quietStart: 21, quietEnd: 8, timezone: 'UTC' })
    // Five fish already in the six-fish bucket.
    await t.run(async (ctx) => { for (let i = 0; i < 5; i += 1) await ctx.db.insert('catches', { anglerId, speciesId: 'roach', grams: 200, value: 12, caughtTick: 1, contentVersion: 'v1', createdAt: Date.now() }) })
    return { anglerId, kit }
  }

  /** One Slow Cast tick that runs only the work due now, so the alert sender (thirty minutes out) waits. */
  const tickNow = async () => {
    vi.advanceTimersByTime(15 * 60_000)
    await t.mutation(internal.slowCast.tick.startTick, {})
    for (let i = 0; i < 8; i += 1) {
      vi.advanceTimersByTime(1)
      await t.finishInProgressScheduledFunctions()
    }
  }
  const tickUntil = async (done: () => Promise<boolean>) => { for (let i = 0; i < 60 && !(await done()); i += 1) await tickNow() }
  const outbox = () => t.run(async (ctx) => await ctx.db.query('alertOutbox').collect())

  it('queues a cooler-full alert on the cast that fills it, held thirty minutes, and sends it if nothing changed', async () => {
    await setup({ coolerFull: true, baitOut: false })
    await tickUntil(async () => (await outbox()).length > 0)
    const [row] = await outbox()
    expect(row).toMatchObject({ kind: 'cooler_full', state: 'pending' })
    expect(row!.notBefore - row!.createdAt).toBe(30 * 60_000)
    vi.setSystemTime(row!.notBefore + 1)
    const sends = await t.mutation(internal.alerts.claimDue, {})
    expect(sends).toHaveLength(1)
    expect(JSON.parse(sends[0]!.payload)).toMatchObject({ title: 'Your cooler is full', url: '/app/slow-cast/cooler?alert=cooler_full' })
  })

  it('skips the alert when the cooler was sold before it was due', async () => {
    const { anglerId, kit } = await setup({ coolerFull: true, baitOut: false })
    await tickUntil(async () => (await outbox()).length > 0)
    const ids = await t.run(async (ctx) => (await ctx.db.query('catches').withIndex('by_anglerId', (q) => q.eq('anglerId', anglerId)).collect()).map((c) => c._id))
    await kit.mutation(api.slowCast.anglers.sellCatches, { operationId: 'sell-kit-01', catchIds: ids })
    const [row] = await outbox()
    vi.setSystemTime(row!.notBefore + 1)
    expect(await t.mutation(internal.alerts.claimDue, {})).toEqual([])
    expect((await outbox())[0]).toMatchObject({ state: 'skipped', reason: 'sold' })
  })

  it('stays quiet when the kind is off', async () => {
    await setup({ coolerFull: false, baitOut: false })
    for (let i = 0; i < 20; i += 1) await tickNow()
    expect(await outbox()).toEqual([])
  })
})
