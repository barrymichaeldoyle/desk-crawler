// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@trmnl-games/backend/api'
import type { Id } from '@trmnl-games/backend/data-model'
import schema from '../../apps/backend/convex/schema'
import { seedHero, seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
const SLOT = Date.UTC(2026, 9, 3, 10, 0, 2)
let op = 0
const opId = () => `op-${String(++op).padStart(6, '0')}`
const as = (t: T, alias: string) => t.withIdentity({ issuer: 'issuer', subject: alias })
const heroDoc = (t: T, heroId: Id<'heroes'>) => t.run(async (ctx) => await ctx.db.get(heroId))
const potions = (t: T, heroId: Id<'heroes'>) => t.run(async (ctx) => (await ctx.db.query('items').withIndex('by_heroId_and_kind', (q) => q.eq('heroId', heroId).eq('kind', 'potion')).first())?.quantity ?? 0)

async function errorCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise
    return undefined
  } catch (error) {
    return (error as { data?: { code?: string } }).data?.code
  }
}

describe('narrative choice intent (D79)', () => {
  let t: T
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(SLOT)
    t = convexTest(schema, modules)
    await seedWorld(t, { activeContentVersion: 'v6', currentTick: 10, lastPublishedAt: SLOT - 30 * 60_000 })
  })
  afterEach(() => vi.useRealTimers())

  it('shows the pending choice with concrete changes, applies the chosen option once, and refuses after that', async () => {
    const heroId = await seedHero(t, { level: 5, gold: 50, hp: 40, choice: { eventId: 'overtime_request', offeredAtTick: 8, expiresAtTick: 104, biomeTier: 2 } }, 'Ana')
    const user = as(t, 'Ana')
    const view = (await user.query(api.heroes.mine, {})).choice
    expect(view).toMatchObject({ eventId: 'overtime_request', ticksLeft: 94, defaultOptionId: 'clock_out' })
    expect(view.options.map((o: { id: string; change: unknown }) => [o.id, o.change])).toEqual([['stay', { gold: 50, hp: -15, potions: 0 }], ['clock_out', { gold: 0, hp: 0, potions: 0 }]])
    expect(await errorCode(user.mutation(api.heroes.choose, { operationId: opId(), optionId: 'nope' }))).toBe('INVALID_INPUT')
    expect(await user.mutation(api.heroes.choose, { operationId: opId(), optionId: 'stay' })).toMatchObject({ changed: true, gold: 50, hp: 25 })
    const hero = await heroDoc(t, heroId)
    expect(hero).toMatchObject({ gold: 100, hp: 25 })
    expect(hero?.choice).toBeUndefined()
    expect(hero?.counters.choicesMade).toBe(1)
    expect(hero?.counters.goldEarned).toBe(50)
    // The level-5 fixture also earns its first achievement on this intent; the command story is the one to check.
    const log = (await t.run(async (ctx) => await ctx.db.query('tickLogs').withIndex('by_heroId_and_at_and_sequence', (q) => q.eq('heroId', heroId)).order('desc').take(5))).find((entry) => entry.source === 'command')
    expect(log).toMatchObject({ source: 'command', summary: 'Worked late, cleared the corridor and got paid overtime.', detail: { operation: 'choose', eventId: 'overtime_request', optionId: 'stay' }, deltas: { xpEarned: 0, gold: 50, hp: -15 } })
    expect(await errorCode(user.mutation(api.heroes.choose, { operationId: opId(), optionId: 'stay' }))).toBe('NO_CHOICE')
    expect((await user.query(api.heroes.mine, {})).choice).toBeNull()
  })

  it('grants a temporary effect when the option carries one, shown on the hero page with its adventures left (D80)', async () => {
    const heroId = await seedHero(t, { level: 5, gold: 100, hp: 60, choice: { eventId: 'break_room_cake', offeredAtTick: 8, expiresAtTick: 104, biomeTier: 1 } }, 'Ana')
    const user = as(t, 'Ana')
    expect(await user.mutation(api.heroes.choose, { operationId: opId(), optionId: 'chip_in' })).toMatchObject({ changed: true, gold: -15 })
    const hero = await heroDoc(t, heroId)
    expect(hero?.effects).toEqual([{ id: 'well_fed', untilTick: 18 }])
    const view = await user.query(api.heroes.mine, {})
    expect(view.effects).toEqual([{ id: 'well_fed', name: 'Well fed', blurb: 'Cake. Learns a little more from each win.', kind: 'boon', ticksLeft: 8 }])
    const log = (await t.run(async (ctx) => await ctx.db.query('tickLogs').withIndex('by_heroId_and_at_and_sequence', (q) => q.eq('heroId', heroId)).order('desc').take(5))).find((entry) => entry.source === 'command')
    expect(log?.detail).toMatchObject({ operation: 'choose', effectGained: 'well_fed' })
  })

  it('grants potions within the pouch and refuses an expired choice, which the simulator then defaults', async () => {
    const heroId = await seedHero(t, { choice: { eventId: 'lost_wallet', offeredAtTick: 8, expiresAtTick: 104, biomeTier: 1 } }, 'Ana')
    const user = as(t, 'Ana')
    expect(await user.mutation(api.heroes.choose, { operationId: opId(), optionId: 'hand_in' })).toMatchObject({ changed: true, gold: 0 })
    expect(await potions(t, heroId)).toBe(4)
    await t.run(async (ctx) => {
      await ctx.db.patch(heroId, { choice: { eventId: 'lost_wallet', offeredAtTick: 8, expiresAtTick: 104, biomeTier: 1 } })
      const world = (await ctx.db.query('worldState').first())!
      await ctx.db.patch(world._id, { currentTick: 104 })
    })
    expect(await errorCode(user.mutation(api.heroes.choose, { operationId: opId(), optionId: 'keep' }))).toBe('NO_CHOICE')
    expect((await user.query(api.heroes.mine, {})).choice).toBeNull()
  })
})
