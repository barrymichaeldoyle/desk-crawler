// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import type { Doc, Id } from '@trmnl-games/backend/data-model'
import { MAX_RECAP_EVENTS, RECAP_WINDOW_MS } from '@trmnl-games/desk-crawler/payload'
import { seedHero, seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
/** 08:00 UTC, asked for with no offset: the completed period is the 07:00 stand-up (19:00 to 07:00). Rows count back from its end. */
const NOW = Date.UTC(2026, 9, 6, 8)
const END = Date.UTC(2026, 9, 6, 7)
afterEach(() => vi.useRealTimers())

async function setup() {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  const t = convexTest(schema, modules)
  await seedWorld(t)
  const heroId = await seedHero(t, { lastTick: 48 }, 'RecapOwner')
  return { t, heroId, owner: t.withIdentity({ issuer: 'issuer', subject: 'RecapOwner' }) }
}

async function insert(t: T, heroId: Id<'heroes'>, count: number, source: 'tick' | 'command' = 'tick') {
  await t.run(async ctx => {
    for (let i = 0; i < count; i++) {
      const detail: Doc<'tickLogs'>['detail'] = source === 'command' ? { v: 1, operation: 'heroes.pause' } : { v: 1, simulationVersion: 1, contentVersion: 'v1', disposition: 'advanced', encounterKind: 'loot', potionsUsed: 1, levelsGained: 0, goldPenalty: 0, heldFind: false, outcome: { variant: 'loot', found: 'potion', goldGranted: 0, jackpot: false, potionFullFallback: false } }
      await ctx.db.insert('tickLogs', { heroId, source, sequence: i + 1, at: END - i * 900_000, kind: source === 'command' ? 'system' : 'loot', summary: source === 'command' ? 'Paused adventures.' : 'Found a healing potion. Drank a potion.', deltas: { xpEarned: 0, gold: 0, hp: source === 'command' ? 0 : 20 }, detail })
    }
  })
}

describe('device recap read path', () => {
  it('covers the whole stand-up period independently of the ten latest stories, excludes boundary rows, later rows and other heroes', async () => {
    const { t, heroId, owner } = await setup()
    await insert(t, heroId, 49) // The 49th row sits exactly on the period's start, 19:00 the evening before.
    const otherHero = await seedHero(t, {}, 'OtherOwner')
    await insert(t, otherHero, 5)
    await t.run(async ctx => {
      const newest = (await ctx.db.query('tickLogs').withIndex('by_heroId_and_at_and_sequence', q => q.eq('heroId', heroId)).order('desc').first())!
      const { _id, _creationTime, ...fields } = newest
      await ctx.db.insert('tickLogs', { ...fields, sequence: 99, at: END + 1 })
    })
    const preview = await owner.query(api.trmnlPayload.mine, { now: NOW })
    expect(preview!.log).toHaveLength(10)
    expect(preview!.recap).toMatchObject({ label: 'Morning stand-up', events: 48, partial: false, from: (END - RECAP_WINDOW_MS) / 1000, to: END / 1000, totals: { potions: 48 } })
    // The owner's offset moves the boundaries: at 10:00 Johannesburg the stand-up ended at 05:00 UTC, before the first eight rows.
    expect((await owner.query(api.trmnlPayload.mine, { now: NOW, utcOffset: 7200 }))!.recap).toMatchObject({ label: 'Morning stand-up', events: 41, to: Date.UTC(2026, 9, 6, 5) / 1000 })
    expect(JSON.stringify(preview!.recap)).not.toMatch(/heroId|userId|monsterId|simulationVersion|operation/)
    expect(await t.query(api.trmnlPayload.mine, { now: NOW })).toBeNull()
    expect(await t.withIdentity({ issuer: 'issuer', subject: 'Stranger' }).query(api.trmnlPayload.mine, { now: NOW })).toBeNull()
  })

  it('never acknowledges a visit or changes progress, history or rewards when refreshed', async () => {
    const { t, heroId, owner } = await setup()
    await insert(t, heroId, 20)
    const snapshot = () => t.run(async ctx => ({ hero: await ctx.db.get(heroId), logs: await ctx.db.query('tickLogs').withIndex('by_heroId_and_at_and_sequence', q => q.eq('heroId', heroId)).take(50), items: await ctx.db.query('items').withIndex('by_heroId', q => q.eq('heroId', heroId)).take(40) }))
    const before = await snapshot()
    const first = await owner.query(api.trmnlPayload.mine, { now: NOW })
    const refresh = await owner.query(api.trmnlPayload.mine, { now: NOW + 60_000 })
    expect(refresh!.recap.totals).toEqual(first!.recap.totals)
    expect(await snapshot()).toEqual(before)
  })

  it('marks an unusually busy command window as partial without counting commands as adventure rewards', async () => {
    const { t, heroId, owner } = await setup()
    await insert(t, heroId, MAX_RECAP_EVENTS + 1, 'command')
    await t.run(async ctx => {
      const commands = await ctx.db.query('tickLogs').withIndex('by_heroId_and_at_and_sequence', q => q.eq('heroId', heroId)).take(MAX_RECAP_EVENTS + 1)
      for (const [index, command] of commands.entries()) await ctx.db.patch(command._id, { at: END - index * 1000 })
    })
    const preview = await owner.query(api.trmnlPayload.mine, { now: NOW })
    expect(preview!.recap).toMatchObject({ partial: true, events: 0, activity: 'No adventures in sample', totals: { xp: 0, gold: 0, potions: 0 } })
    expect(preview!.recap.label).toContain('partial')
  })

  it('shows an empty completed period without deleting older stories and hides the recap for pending heroes', async () => {
    const { t, heroId, owner } = await setup()
    await insert(t, heroId, 1)
    // 20:00 the same day: the retro covers 07:00 to 19:00, after the one row at 07:00.
    const preview = await owner.query(api.trmnlPayload.mine, { now: NOW + RECAP_WINDOW_MS })
    expect(preview!.log).toHaveLength(1)
    expect(preview!.recap).toMatchObject({ label: 'Sprint retro', events: 0, activity: 'No new adventures', partial: false })
    await t.run(ctx => ctx.db.patch(heroId, { activationState: 'pending_trmnl' }))
    expect(await owner.query(api.trmnlPayload.mine, { now: NOW })).toBeNull()
  })
})
