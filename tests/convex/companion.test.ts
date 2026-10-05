// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import { sha256Hex } from '../../apps/backend/convex/lib/hash'
import { nextSlotAfter, slotEta, wallSlotFor } from '@trmnl-games/desk-crawler/sim/schedule'
import { seedHero, seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
const UUID = 'ae48d6ac-48f4-4aed-8464-bad68368e97c'

describe('companion hero page data', () => {
  let t: T
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.UTC(2026, 9, 4, 10, 0))
    t = convexTest(schema, modules)
    await seedWorld(t)
  })
  afterEach(() => vi.useRealTimers())

  it('previews exactly the payload the owner\'s TRMNL receives, and nothing for anyone else', async () => {
    await seedHero(t, {}, 'Ana')
    const tokenHash = sha256Hex('installation-token-ana')
    await t.run(async (ctx) => {
      const user = await ctx.db.query('users').first()
      const grantId = await ctx.db.insert('trmnlGrants', { userId: user!._id, tokenHash, state: 'active', createdAt: Date.now() })
      await ctx.db.insert('trmnlInstances', { grantId, userId: user!._id, uuid: UUID, state: 'active', confirmedBy: 'success_callback', createdAt: Date.now() })
    })
    const now = Date.now()
    const device = await t.query(internal.trmnlPayload.forInstance, { tokenHash, uuid: UUID, now, instanceName: null })
    const preview = await t.withIdentity({ issuer: 'issuer', subject: 'Ana' }).query(api.trmnlPayload.mine, { now })
    expect(device).toMatchObject({ outcome: 'payload' })
    expect(preview).toEqual((device as { payload: unknown }).payload)

    expect(await t.query(api.trmnlPayload.mine, { now })).toBeNull()
    expect(await t.withIdentity({ issuer: 'issuer', subject: 'Stranger' }).query(api.trmnlPayload.mine, { now })).toBeNull()
  })

  it('reports fights, gold and finds since the last visit, from the counters snapshot', async () => {
    const heroId = await seedHero(t, {}, 'Bo')
    const bo = t.withIdentity({ issuer: 'issuer', subject: 'Bo' })
    const first = await bo.query(api.heroes.returnSummary, {})
    await bo.mutation(api.heroes.recordCompanionVisit, { operationId: 'visit-0101', expectedLogSequence: first.observed.logSequence })
    await t.run(async (ctx) => {
      const hero = await ctx.db.get(heroId)
      await ctx.db.patch(heroId, { logSequence: hero!.logSequence + 5, counters: { ...hero!.counters, combatWins: hero!.counters.combatWins + 4, goldEarned: hero!.counters.goldEarned + 31, itemsFound: hero!.counters.itemsFound + 2 } })
    })
    expect(await bo.query(api.heroes.returnSummary, {})).toMatchObject({ counters: { combatWins: 4, goldEarned: 31, itemsFound: 2, deaths: 0 }, newEvents: 5 })
  })

  it('derives potion finds from stored outcomes for the companion and device payload without rewriting logs', async () => {
    const heroId = await seedHero(t, {}, 'PotionFinder')
    await t.run(async (ctx) => {
      const detail = { v: 1 as const, simulationVersion: 1, contentVersion: 'v4', disposition: 'advanced' as const, encounterKind: 'loot' as const, potionsUsed: 1, levelsGained: 0, goldPenalty: 0, heldFind: false }
      await ctx.db.insert('tickLogs', { heroId, source: 'tick', tick: 2, sequence: 2, at: Date.now(), kind: 'loot', summary: 'Found a healing potion. Drank a potion.', detail: { ...detail, outcome: { variant: 'loot', found: 'potion', goldGranted: 0, jackpot: false, potionFullFallback: false } }, deltas: { xpEarned: 0, gold: 0, hp: 20 } })
      await ctx.db.insert('tickLogs', { heroId, source: 'tick', tick: 3, sequence: 3, at: Date.now() + 1, kind: 'loot', summary: 'Potion pouch full; sold a spare for 5 gold.', detail: { ...detail, potionsUsed: 0, outcome: { variant: 'loot', found: 'gold', goldGranted: 5, jackpot: false, potionFullFallback: true } }, deltas: { xpEarned: 0, gold: 5, hp: 0 } })
    })
    const owner = t.withIdentity({ issuer: 'issuer', subject: 'PotionFinder' })
    const page = await owner.query(api.heroes.recentLog, { paginationOpts: { numItems: 10, cursor: null } })
    expect(page.page.map((entry: { deltas: { potionsFound?: number } }) => entry.deltas.potionsFound)).toEqual([0, 1])
    expect(page.page[1]).not.toHaveProperty('detail')
    const preview = await owner.query(api.trmnlPayload.mine, { now: Date.now() })
    expect(preview!.log[0]!.d).toBe('+5 gold')
    expect(preview!.log[1]!.d).toBe('+1 healing potion · +20 HP')
    expect(await t.run(async ctx => (await ctx.db.query('tickLogs').withIndex('by_heroId_and_at_and_sequence', q => q.eq('heroId', heroId)).collect()).map(entry => entry.deltas))).toEqual([{ xpEarned: 0, gold: 0, hp: 20 }, { xpEarned: 0, gold: 5, hp: 0 }])
  })

  it('keeps baselines recorded before counters were captured working', async () => {
    const heroId = await seedHero(t, {}, 'Cy')
    await t.run(async (ctx) => await ctx.db.patch(heroId, { companionVisitBaseline: { at: Date.now() - 60_000, level: 1, lifetimeXp: 0, logSequence: 1 } }))
    expect(await t.withIdentity({ issuer: 'issuer', subject: 'Cy' }).query(api.heroes.returnSummary, {})).toMatchObject({ counters: null, xpGained: 0 })
  })
})

describe('tick schedule', () => {
  it('lands on the hour and at minutes 15, 30 and 45 UTC', () => {
    const at = (h: number, m: number, s = 0) => Date.UTC(2026, 9, 4, h, m, s)
    expect(wallSlotFor(at(10, 15, 4))).toBe(at(10, 15))
    expect(wallSlotFor(at(10, 14, 59))).toBe(at(10, 0))
    expect(nextSlotAfter(at(10, 20))).toBe(at(10, 30))
    expect(nextSlotAfter(at(10, 45))).toBe(at(11, 0))
    expect(slotEta(at(10, 20), 3)).toBe(at(11, 0))
  })
})
