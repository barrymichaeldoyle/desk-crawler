// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '@trmnl-games/backend/api'
import type { Id } from '@trmnl-games/backend/data-model'
import schema from '../../apps/backend/convex/schema'
import { sha256Hex } from '../../apps/backend/convex/lib/hash'
import { keepsakeCode } from '../../apps/backend/convex/lib/keepsakes'
import { DESK_KEEPSAKES, KEEPSAKE_WEEK_MS, keepsakeShelf, keepsakeWeek, keepsakeWeekStartsAt } from '@trmnl-games/desk-crawler/content/keepsakes'
import { seedHero, seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
const NOW = Date.UTC(2026, 9, 5, 12)
const UUID = 'aaaaaaaa-1111-4aed-8464-bad68368e97c'
const TOKEN = 'trmnl-ana-token'

async function installation(t: T, heroId: Id<'heroes'>, uuid = UUID, token = TOKEN) {
  return await t.run(async (ctx) => {
    const hero = (await ctx.db.get(heroId))!
    const grantId = await ctx.db.insert('trmnlGrants', { userId: hero.userId, tokenHash: sha256Hex(token), state: 'active', createdAt: Date.now() })
    const instanceId = await ctx.db.insert('trmnlInstances', { userId: hero.userId, grantId, uuid, state: 'active', confirmedBy: 'success_callback', createdAt: Date.now() })
    return { userId: hero.userId, grantId, instanceId }
  })
}
async function envelope(t: T, uuid = UUID, token = TOKEN) {
  const response = await t.fetch('/trmnl/v1/screen', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ user_uuid: uuid }).toString() })
  expect(response.status).toBe(200)
  return await response.json() as { merge_variables: { desk_keepsake_code: string | null }; markup: string }
}

describe('weekly TRMNL keepsakes', () => {
  let t: T
  let heroId: Id<'heroes'>
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    t = convexTest(schema, modules)
    await seedWorld(t)
    heroId = await seedHero(t, {}, 'Ana')
    await installation(t, heroId)
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals() })
  const owner = () => t.withIdentity({ issuer: 'issuer', subject: 'Ana' })

  it('puts the code only in the authenticated device envelope; reads earn nothing', async () => {
    const first = await envelope(t)
    expect(first.merge_variables.desk_keepsake_code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/)
    expect(await envelope(t)).toEqual(first)
    const preview = await owner().query(api.trmnlPayload.mine, { now: NOW })
    expect(preview).not.toHaveProperty('desk_keepsake_code')
    expect(JSON.stringify(preview)).not.toContain(first.merge_variables.desk_keepsake_code)
    expect(await owner().query(api.keepsakes.mine, {})).toMatchObject({ totalCollected: 0, lastClaimWeek: null, connected: true })
    expect(await t.run(async (ctx) => await ctx.db.query('deskKeepsakes').collect())).toEqual([])
    expect((await t.fetch('/trmnl/v1/screen', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `user_uuid=${UUID}` })).status).toBe(404)
    expect(await t.query(api.keepsakes.mine, {})).toBeNull()
    expect(await t.withIdentity({ issuer: 'issuer', subject: 'Nobody' }).query(api.keepsakes.mine, {})).toBeNull()
  })

  it('claims once, replays the same receipt, and never alters game rewards or ranking state', async () => {
    const before = await t.run(async (ctx) => ({ hero: await ctx.db.get(heroId), items: await ctx.db.query('items').collect(), world: await ctx.db.query('worldState').first(), ranks: await ctx.db.query('heroRanks').collect(), logs: await ctx.db.query('tickLogs').collect() }))
    const code = (await envelope(t)).merge_variables.desk_keepsake_code!
    const claim = { operationId: 'keepsake-0001', code: code.toLowerCase().replace('-', ' ') }
    const result = await owner().mutation(api.keepsakes.claim, claim)
    expect(result).toMatchObject({ changed: true, outcome: 'claimed', totalCollected: 1 })
    expect(await owner().mutation(api.keepsakes.claim, claim)).toEqual(result)
    expect(await owner().mutation(api.keepsakes.claim, { operationId: 'keepsake-0002', code })).toMatchObject({ changed: false, outcome: 'already_claimed', totalCollected: 1 })
    expect((await envelope(t)).merge_variables.desk_keepsake_code).toBeNull()
    const after = await t.run(async (ctx) => ({ hero: await ctx.db.get(heroId), items: await ctx.db.query('items').collect(), world: await ctx.db.query('worldState').first(), ranks: await ctx.db.query('heroRanks').collect(), logs: await ctx.db.query('tickLogs').collect() }))
    expect(after).toEqual(before)
    expect(await owner().query(api.keepsakes.mine, {})).toMatchObject({ totalCollected: 1, nextAvailableAt: keepsakeWeekStartsAt(keepsakeWeek(NOW) + 1) })
  })

  it('has one account-wide award across distinct grants, additional devices and concurrent submissions', async () => {
    const secondUuid = 'bbbbbbbb-2222-4aed-8464-bad68368e97c'
    await installation(t, heroId, secondUuid, 'another-installation-token')
    const code = (await envelope(t)).merge_variables.desk_keepsake_code!
    expect((await envelope(t, secondUuid, 'another-installation-token')).merge_variables.desk_keepsake_code).toBe(code)
    const results = await Promise.all([1, 2].map((n) => owner().mutation(api.keepsakes.claim, { operationId: `concurrent-${n}`, code })))
    expect(results.map((result) => result.outcome).sort()).toEqual(['already_claimed', 'claimed'])
    expect(await owner().query(api.keepsakes.mine, {})).toMatchObject({ totalCollected: 1 })
  })

  it('gives cached screens a week of grace while rejecting older/future codes and keeping Monday boundaries exact', async () => {
    const { userId } = await t.run(async (ctx) => (await ctx.db.get(heroId))!)
    const week = keepsakeWeek(NOW)
    const code = (offset: number) => keepsakeCode(sha256Hex(TOKEN), userId, week + offset)
    for (const offset of [-2, 1]) expect(await owner().mutation(api.keepsakes.claim, { operationId: `wrong-week-${offset}`, code: code(offset) })).toMatchObject({ outcome: 'invalid_code', totalCollected: 0 })
    expect(await owner().mutation(api.keepsakes.claim, { operationId: 'grace-week-1', code: code(-1) })).toMatchObject({ outcome: 'claimed', totalCollected: 1 })
    vi.setSystemTime(keepsakeWeekStartsAt(week + 1) - 1)
    expect(await owner().mutation(api.keepsakes.claim, { operationId: 'sunday-0001', code: code(0) })).toMatchObject({ outcome: 'already_claimed' })
    vi.setSystemTime(keepsakeWeekStartsAt(week + 1))
    expect(await owner().mutation(api.keepsakes.claim, { operationId: 'monday-0001', code: code(0) })).toMatchObject({ outcome: 'claimed', totalCollected: 2 })
    expect(await owner().mutation(api.keepsakes.claim, { operationId: 'monday-0002', code: code(1) })).toMatchObject({ outcome: 'already_claimed', totalCollected: 2 })
  })

  it('rejects anonymous, pending, foreign, disconnected and revoked credentials', async () => {
    const code = (await envelope(t)).merge_variables.desk_keepsake_code!
    await expect(t.mutation(api.keepsakes.claim, { operationId: 'anon-0001', code })).rejects.toThrow()
    const boId = await seedHero(t, {}, 'Bo')
    await installation(t, boId, 'bbbbbbbb-2222-4aed-8464-bad68368e97c', 'bo-installation-token')
    expect(await t.withIdentity({ issuer: 'issuer', subject: 'Bo' }).mutation(api.keepsakes.claim, { operationId: 'foreign-0001', code })).toMatchObject({ outcome: 'invalid_code' })
    await t.run(async (ctx) => { await ctx.db.patch(boId, { activationState: 'pending_trmnl' }) })
    await expect(t.withIdentity({ issuer: 'issuer', subject: 'Bo' }).mutation(api.keepsakes.claim, { operationId: 'pending-0001', code })).rejects.toThrow()
    const instance = await t.run(async (ctx) => await ctx.db.query('trmnlInstances').withIndex('by_uuid', (q) => q.eq('uuid', UUID)).unique())
    await owner().mutation(api.connections.disconnect, { instanceId: instance!._id, operationId: 'disconnect-1' })
    expect(await owner().mutation(api.keepsakes.claim, { operationId: 'offline-0001', code })).toMatchObject({ outcome: 'invalid_code' })
    expect(await owner().query(api.keepsakes.mine, {})).toMatchObject({ connected: false, totalCollected: 0 })
    await t.run(async (ctx) => { await ctx.db.patch(instance!._id, { state: 'active' }); await ctx.db.patch(instance!.grantId, { state: 'revoked' }) })
    expect(await owner().mutation(api.keepsakes.claim, { operationId: 'revoked-0001', code })).toMatchObject({ outcome: 'invalid_code' })
  })

  it('commits invalid attempts so the rate limit cannot be bypassed by failed guesses', async () => {
    for (let i = 0; i < 60; i++) expect(await owner().mutation(api.keepsakes.claim, { operationId: `bad-code-${i}`, code: 'INVALID' })).toMatchObject({ outcome: 'invalid_code' })
    await expect(owner().mutation(api.keepsakes.claim, { operationId: 'bad-code-61', code: 'INVALID' })).rejects.toThrow(/Too many actions/)
    vi.setSystemTime(NOW + 10 * 60_000)
    expect(await owner().mutation(api.keepsakes.claim, { operationId: 'valid-after-limit', code: (await envelope(t)).merge_variables.desk_keepsake_code! })).toMatchObject({ outcome: 'claimed' })
  })

  it('preserves the next design across missed weeks and keeps repeat collections bounded', async () => {
    for (let i = 0; i < DESK_KEEPSAKES.length + 3; i++) {
      vi.setSystemTime(NOW + (i + (i > 0 ? 5 : 0)) * KEEPSAKE_WEEK_MS)
      expect(await owner().mutation(api.keepsakes.claim, { operationId: `collection-${i}`, code: (await envelope(t)).merge_variables.desk_keepsake_code! })).toMatchObject({ totalCollected: i + 1 })
    }
    const rows = await t.run(async (ctx) => await ctx.db.query('deskKeepsakes').collect())
    expect(rows).toHaveLength(1)
    const shelf = keepsakeShelf(rows[0]!.totalCollected)
    expect(shelf).toHaveLength(12)
    expect(shelf.slice(0, 3).map((item) => item.count)).toEqual([2, 2, 2])
    expect(shelf.slice(3).every((item) => item.count === 1)).toBe(true)
    expect(shelf.reduce((sum, item) => sum + item.count, 0)).toBe(rows[0]!.totalCollected)
    for (const item of shelf) { expect(item.pixels).toHaveLength(8); expect(item.pixels.every((row) => /^[.#]{8}$/.test(row))).toBe(true) }
  })

  it.each(['game', 'account'] as const)('denies access immediately and purges the collection on %s deletion', async (kind) => {
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_fake')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 200 })))
    const code = (await envelope(t)).merge_variables.desk_keepsake_code!
    await owner().mutation(api.keepsakes.claim, { operationId: 'before-delete', code })
    await owner().mutation(kind === 'game' ? api.deletion.requestGameDeletion : api.deletion.requestDeletion, { operationId: 'delete-0001', confirm: 'DELETE' })
    expect(await owner().query(api.keepsakes.mine, {})).toBeNull()
    await expect(owner().mutation(api.keepsakes.claim, { operationId: 'during-delete', code })).rejects.toThrow()
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await t.run(async (ctx) => await ctx.db.query('deskKeepsakes').collect())).toEqual([])
  })
})
