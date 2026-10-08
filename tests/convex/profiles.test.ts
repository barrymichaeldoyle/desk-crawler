// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import { zeroCounters } from '@trmnl-games/desk-crawler/sim/core/starter'
import { runTick, seedHero, seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
const PUBLISH_SLOT = Date.UTC(2026, 9, 3, 10, 45, 1)
const HOUR = 3_600_000

describe('public hero profiles (v1.2)', () => {
  let t: T
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(PUBLISH_SLOT)
    t = convexTest(schema, modules)
    await seedWorld(t, { lastPublishedAt: PUBLISH_SLOT - HOUR - 1000 })
  })
  afterEach(() => vi.useRealTimers())

  const owner = (alias: string) => t.withIdentity({ issuer: 'issuer', subject: alias })

  it('stays private until the owner opts in, and hides again when they opt out', async () => {
    await seedHero(t, {}, 'Wren')
    expect(await t.query(api.profiles.view, { alias: 'Wren' })).toBeNull()
    await owner('Wren').mutation(api.heroes.setPublicProfile, { operationId: 'profile-0001', visible: true })
    expect(await t.query(api.profiles.view, { alias: '  wren ' })).toMatchObject({ alias: 'Wren', heroName: 'Baz', level: 1 })
    expect((await owner('Wren').query(api.heroes.mine, {}))?.publicProfile).toBe(true)
    await owner('Wren').mutation(api.heroes.setPublicProfile, { operationId: 'profile-0002', visible: false })
    expect(await t.query(api.profiles.view, { alias: 'Wren' })).toBeNull()
  })

  it('shows rank, earned achievements with rarity and lifetime counts, never gear, gold or account data', async () => {
    const heroId = await seedHero(t, { level: 4, hp: 120, gold: 999, counters: { ...zeroCounters(), monsterWins: { paper_imp: 6 }, combatWins: 6 } }, 'Moss')
    await seedHero(t)
    await runTick(t)
    await owner('Moss').mutation(api.heroes.setPublicProfile, { operationId: 'profile-0003', visible: true })
    const profile = await t.query(api.profiles.view, { alias: 'Moss' })
    expect(profile.rank).toMatchObject({ rank: 1, totalPlayers: 2 })
    expect(profile.achievements.map((a: { id: string }) => a.id)).toContain('slay_paper_imp_2')
    expect(profile.rarity).toMatchObject({ totalPlayers: 2 })
    expect(profile.rarity.counts.slay_paper_imp_2).toBe(1)
    expect(profile.lifetime.combatWins).toBeGreaterThanOrEqual(6)
    const text = JSON.stringify(profile)
    for (const key of ['gold', 'weaponId', 'armorId', 'items', 'bagCapacity', 'timezone', 'userId', 'tokenIdentifier', 'email']) expect(text).not.toContain(`"${key}":`)
    expect(text).not.toContain(heroId)
    expect(text).not.toContain('999')
  })

  it('treats suspended, name-repair and unknown aliases exactly like a private profile', async () => {
    const heroId = await seedHero(t, { publicProfile: true }, 'Fern')
    expect(await t.query(api.profiles.view, { alias: 'Fern' })).not.toBeNull()
    const userId = await t.run(async (ctx) => (await ctx.db.get(heroId))!.userId)
    await t.run(async (ctx) => await ctx.db.patch(userId, { nameRepairRequired: true }))
    expect(await t.query(api.profiles.view, { alias: 'Fern' })).toBeNull()
    await t.run(async (ctx) => await ctx.db.patch(userId, { nameRepairRequired: false, state: 'suspended' }))
    expect(await t.query(api.profiles.view, { alias: 'Fern' })).toBeNull()
    expect(await t.query(api.profiles.view, { alias: 'Nobody' })).toBeNull()
    expect(await t.query(api.profiles.view, { alias: 'x'.repeat(200) })).toBeNull()
  })
})
