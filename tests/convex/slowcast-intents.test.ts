// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import type { T } from './helpers'
import { nextSlowCastTick, runSlowCastTick, seedAngler } from './slowCastHelpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')

describe('Slow Cast intents (D115, S2)', () => {
  let t: T
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.UTC(2026, 10, 2, 6, 5, 3))
    t = convexTest(schema, modules)
    await runSlowCastTick(t)
  })
  afterEach(() => vi.useRealTimers())

  const as = (alias: string) => t.withIdentity({ issuer: 'issuer', subject: alias })

  async function fillCooler(anglerId: Awaited<ReturnType<typeof seedAngler>>, fish: Array<[string, number, number]>) {
    return await t.run(async (ctx) => {
      const ids = []
      for (const [speciesId, grams, value] of fish) ids.push(await ctx.db.insert('catches', { anglerId, speciesId, grams, value, caughtTick: 1, contentVersion: 'v1', createdAt: Date.now() }))
      return ids
    })
  }

  it('sells chosen fish once, with the receipt answering a retry', async () => {
    const anglerId = await seedAngler(t, {}, 'Pat')
    const [a, b, c] = await fillCooler(anglerId, [['roach', 300, 15], ['perch', 800, 20], ['minnow', 30, 8]])
    const first = await as('Pat').mutation(api.slowCast.anglers.sellCatches, { operationId: 'sell-00001', catchIds: [a!, b!] })
    expect(first).toMatchObject({ changed: true, gold: 35, count: 2 })
    expect(await as('Pat').mutation(api.slowCast.anglers.sellCatches, { operationId: 'sell-00001', catchIds: [a!, b!] })).toEqual(first)
    const after = await t.run(async (ctx) => ({ angler: await ctx.db.get(anglerId), left: await ctx.db.query('catches').collect() }))
    expect(after.angler).toMatchObject({ gold: 35, counters: { goldEarned: 35, fishSold: 2 } })
    expect(after.left.map((r) => r._id)).toEqual([c])
  })

  it("refuses another player's fish and empty or oversized sales", async () => {
    const mine = await seedAngler(t, {}, 'Pat')
    await seedAngler(t, {}, 'Sam')
    const [fish] = await fillCooler(mine, [['roach', 300, 15]])
    await expect(as('Sam').mutation(api.slowCast.anglers.sellCatches, { operationId: 'sell-00002', catchIds: [fish!] })).rejects.toThrow(/no longer in your cooler/)
    await expect(as('Pat').mutation(api.slowCast.anglers.sellCatches, { operationId: 'sell-00003', catchIds: [] })).rejects.toThrow()
  })

  it('buys up the ladders only with enough gold, and spends exactly the price', async () => {
    const anglerId = await seedAngler(t, { gold: 310 }, 'Pat')
    await expect(as('Pat').mutation(api.slowCast.anglers.buyAccessItem, { operationId: 'buy-000001', access: 'pier_permit' })).rejects.toThrow(/Not enough gold/)
    expect(await as('Pat').mutation(api.slowCast.anglers.buyNextRod, { operationId: 'buy-000002' })).toMatchObject({ gold: 60 })
    expect(await as('Pat').mutation(api.slowCast.anglers.buyNextCooler, { operationId: 'buy-000003' })).toMatchObject({ gold: 0 })
    expect(await t.run(async (ctx) => await ctx.db.get(anglerId))).toMatchObject({ rodTier: 2, coolerTier: 2, gold: 0 })
  })

  it('buys bait in whole tubs up to the cap', async () => {
    const anglerId = await seedAngler(t, { gold: 1000 }, 'Pat')
    await expect(as('Pat').mutation(api.slowCast.anglers.buyBaitTubs, { operationId: 'bait-00001', bait: 'worms', tubs: 6 })).rejects.toThrow(/more bait/)
    await as('Pat').mutation(api.slowCast.anglers.buyBaitTubs, { operationId: 'bait-00002', bait: 'bread', tubs: 2 })
    expect(await t.run(async (ctx) => await ctx.db.get(anglerId))).toMatchObject({ gold: 960, bait: { worms: 12, bread: 24 } })
  })

  it('travels only to an open water, arriving after one tick', async () => {
    const anglerId = await seedAngler(t, {}, 'Pat')
    await expect(as('Pat').mutation(api.slowCast.anglers.travelTo, { operationId: 'trip-00001', waterId: 'river_bend' })).rejects.toThrow(/not open/)
    await t.run(async (ctx) => await ctx.db.patch(anglerId, { level: 4, access: ['waders'] }))
    await as('Pat').mutation(api.slowCast.anglers.travelTo, { operationId: 'trip-00002', waterId: 'river_bend' })
    await nextSlowCastTick(t)
    expect(await t.run(async (ctx) => await ctx.db.get(anglerId))).toMatchObject({ waterId: 'river_bend', counters: { trips: 1, casts: 0 } })
  })

  it('pauses and resumes without catch-up', async () => {
    const anglerId = await seedAngler(t, {}, 'Pat')
    await as('Pat').mutation(api.slowCast.anglers.pause, { operationId: 'pause-0001' })
    for (let i = 0; i < 3; i += 1) await nextSlowCastTick(t)
    await as('Pat').mutation(api.slowCast.anglers.resume, { operationId: 'resume-001' })
    await nextSlowCastTick(t)
    expect(await t.run(async (ctx) => await ctx.db.get(anglerId))).toMatchObject({ status: 'fishing', counters: { casts: 1 } })
  })

  it('reads the dock: cooler, bait, shop, forecast and stories', async () => {
    await seedAngler(t, { gold: 42 }, 'Pat')
    const dock = await as('Pat').query(api.slowCast.anglers.dock, {})
    expect(dock.angler).toMatchObject({ alias: 'Pat', level: 1, gold: 42, waterId: 'millpond', cooler: { name: 'Bucket', capacity: 6 }, rod: { name: 'Cane Rod' } })
    expect(dock.waters.map((w: { id: string; open: boolean }) => [w.id, w.open])).toEqual([['millpond', true], ['river_bend', false], ['harbour_pier', false]])
    expect(dock.shop.rod).toMatchObject({ name: 'Fibreglass Rod', price: 250 })
    expect(dock.angler.bait.find((b: { class: string }) => b.class === 'worms')).toMatchObject({ units: 12, tubsThatFit: 5 })
    expect(Array.isArray(dock.logs)).toBe(true)
    expect(await as('Nobody').query(api.slowCast.anglers.dock, {})).toEqual({ gameState: null, angler: null })
  })

  it('recaps the last twelve hours on the dock and marks personal bests in the cooler', async () => {
    const anglerId = await seedAngler(t, { logbook: { roach: { count: 2, bestGrams: 410, firstTick: 1 } } }, 'Pat')
    await fillCooler(anglerId, [['roach', 410, 12], ['roach', 200, 8]])
    const now = Date.now()
    const log = (sequence: number, at: number, kind: 'catch' | 'release' | 'got_away', detail: Record<string, unknown>, xp: number) =>
      ({ anglerId, source: 'tick' as const, sequence, at, kind, summary: kind, detail: { v: 1 as const, ...detail }, deltas: { xpEarned: xp, gold: 0 } })
    await t.run(async (ctx) => {
      await ctx.db.insert('swTickLogs', log(1, now - 3_600_000, 'catch', { speciesId: 'roach', grams: 410, record: true }, 12))
      await ctx.db.insert('swTickLogs', log(2, now - 7_200_000, 'release', { speciesId: 'perch', grams: 900, firstOfSpecies: true }, 16))
      await ctx.db.insert('swTickLogs', log(3, now - 1_800_000, 'got_away', { speciesId: 'common_carp', grams: 6000 }, 0))
      // Older than twelve hours: left out.
      await ctx.db.insert('swTickLogs', log(4, now - 13 * 3_600_000, 'catch', { speciesId: 'roach', grams: 300 }, 12))
    })
    const dock = await as('Pat').query(api.slowCast.anglers.dock, {})
    expect(dock.recap).toEqual({ landed: 2, released: 1, records: 1, firsts: 1, xp: 28, best: { speciesId: 'perch', grams: 900 }, gotAway: 1, awayGrams: [6000] })
    expect(dock.catches.map((c: { grams: number; record: boolean }) => [c.grams, c.record])).toEqual(expect.arrayContaining([[410, true], [200, false]]))
  })

  it('shows unseen species with only their bait, and epics with nothing, in the logbook', async () => {
    await seedAngler(t, { logbook: { roach: { count: 3, bestGrams: 410, firstTick: 2 } } }, 'Pat')
    const book = await as('Pat').query(api.slowCast.anglers.logbook, {})
    const pond = book[0].species
    expect(pond.find((s: { id: string }) => s.id === 'roach')).toMatchObject({ seen: true, name: 'Roach', count: 3, bestGrams: 410 })
    expect(pond.find((s: { id: string }) => s.id === 'golden_carp')).toEqual({ id: 'golden_carp', seen: false, rarity: 'epic', baits: null })
    expect(pond.find((s: { id: string }) => s.id === 'eel')).toEqual({ id: 'eel', seen: false, rarity: 'rare', baits: ['worms'] })
  })
})
