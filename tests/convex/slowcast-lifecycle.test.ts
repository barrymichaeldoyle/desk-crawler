// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import { sha256Hex } from '../../apps/backend/convex/lib/hash'
import { seedWorld, type T } from './helpers'
import { nextSlowCastTick, runSlowCastTick } from './slowCastHelpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
const UUID_A = 'aaaaaaaa-1111-4aed-8464-bad68368e97c'
const UUID_B = 'bbbbbbbb-2222-4aed-8464-bad68368e97c'

const link = (t: T, alias: string, token: string, gameSlug: 'slow-cast' | 'desk-crawler' = 'slow-cast', heroName?: string) =>
  t.mutation(internal.trmnl.linkInstall, { gameSlug, tokenIdentifier: `issuer|${alias}`, tokenHash: sha256Hex(token), publicAlias: alias, timezone: 'UTC', ...(heroName ? { heroName } : {}) })
const confirm = (t: T, token: string, uuid: string, gameSlug: 'slow-cast' | 'desk-crawler' = 'slow-cast') =>
  t.mutation(internal.trmnl.confirmInstance, { gameSlug, tokenHash: sha256Hex(token), uuid, confirmedBy: 'success_callback' })
const screen = (t: T, token: string, uuid: string, path = '/trmnl/slow-cast/v1/screen') =>
  t.fetch(path, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ user_uuid: uuid, 'trmnl[user][utc_offset]': '3600' }).toString() })

describe('Slow Cast TRMNL lifecycle (D115, S2)', () => {
  let t: T
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.UTC(2026, 10, 2, 6, 5, 3))
    t = convexTest(schema, modules)
    await seedWorld(t)
    await runSlowCastTick(t)
    // These tests play Slow Cast as an ordinary player, so the game is live.
    await t.mutation(internal.platform.setGameStatusInternal, { slug: 'slow-cast', status: 'live' })
  })
  afterEach(() => vi.useRealTimers())

  it('prepares a pending angler without a name and activates it once on Save', async () => {
    expect(await link(t, 'Ana', 'sc-tok-ana')).toEqual({ activationState: 'pending_trmnl', heroCreated: true })
    const pending = await t.run(async (ctx) => ({ anglers: await ctx.db.query('anglers').collect(), profile: await ctx.db.query('slowCastProfiles').first(), heroes: await ctx.db.query('heroes').collect() }))
    expect(pending.anglers).toHaveLength(1)
    expect(pending.anglers[0]).toMatchObject({ activationState: 'pending_trmnl', eligibleFromTick: 2, waterId: 'millpond', baitOnHook: 'worms', bait: { worms: 12 } })
    expect(pending.profile?.anglerId).toBe(pending.anglers[0]!._id)
    expect(pending.heroes).toHaveLength(0)
    // The pending angler does not fish.
    await nextSlowCastTick(t)
    expect(await t.run(async (ctx) => (await ctx.db.query('anglers').first())!.counters.casts)).toBe(0)

    expect(await confirm(t, 'sc-tok-ana', UUID_A)).toEqual({ ok: true, reason: 'confirmed' })
    expect(await confirm(t, 'sc-tok-ana', UUID_A)).toEqual({ ok: true, reason: 'already_confirmed' })
    const active = await t.run(async (ctx) => await ctx.db.query('anglers').first())
    expect(active).toMatchObject({ activationState: 'active', eligibleFromTick: 3 })
    await nextSlowCastTick(t)
    expect(await t.run(async (ctx) => (await ctx.db.query('anglers').first())!.counters.casts)).toBe(1)
  })

  it('serves the screen for an active installation and 404s for anything else', async () => {
    await link(t, 'Ana', 'sc-tok-ana')
    await confirm(t, 'sc-tok-ana', UUID_A)
    const response = await screen(t, 'sc-tok-ana', UUID_A)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.markup).toContain('Slow Cast')
    expect(body.merge_variables).toMatchObject({ game: 'slow-cast', alias: 'Ana', status: 'fishing', water_name: 'Millpond', cooler_label: '0/6', bait_label: 'Worms 12', utc_offset: 3600 })
    expect(body.merge_variables.stories[0].summary).toBe('You set up on the bank of the Millpond.')
    // The offset is stored for the time bands.
    expect(await t.run(async (ctx) => (await ctx.db.query('users').first())!.trmnlUtcOffset)).toBe(3600)
    expect((await screen(t, 'sc-tok-ana', UUID_B)).status).toBe(404)
    expect((await screen(t, 'wrong-token', UUID_A)).status).toBe(404)
    // A Slow Cast token never reads Desk Crawler's screen.
    expect((await screen(t, 'sc-tok-ana', UUID_A, '/trmnl/v1/screen')).status).toBe(404)
  })

  it('confirms a lost callback from the first screen request', async () => {
    await link(t, 'Ana', 'sc-tok-ana')
    expect((await screen(t, 'sc-tok-ana', UUID_A)).status).toBe(200)
    expect(await t.run(async (ctx) => (await ctx.db.query('anglers').first())!.activationState)).toBe('active')
  })

  it('keeps one account playing both games with separate characters and installations', async () => {
    await link(t, 'Ana', 'dc-tok-ana', 'desk-crawler', 'Baz')
    await confirm(t, 'dc-tok-ana', UUID_B, 'desk-crawler')
    await link(t, 'Ana', 'sc-tok-ana')
    await confirm(t, 'sc-tok-ana', UUID_A)
    const rows = await t.run(async (ctx) => ({
      users: (await ctx.db.query('users').collect()).length,
      heroes: await ctx.db.query('heroes').collect(),
      anglers: await ctx.db.query('anglers').collect(),
      instances: await ctx.db.query('trmnlInstances').collect(),
    }))
    expect(rows.users).toBe(1)
    expect(rows.heroes[0]).toMatchObject({ name: 'Baz', activationState: 'active' })
    expect(rows.anglers[0]).toMatchObject({ activationState: 'active' })
    expect(rows.instances.map((i) => [i.uuid, i.gameSlug]).sort()).toEqual([[UUID_A, 'slow-cast'], [UUID_B, 'desk-crawler']])
    // A token is tied to its game: the Slow Cast token cannot confirm or uninstall a Desk Crawler instance.
    expect(await confirm(t, 'sc-tok-ana', UUID_B, 'desk-crawler')).toMatchObject({ ok: false })
    expect(await t.mutation(internal.trmnl.uninstallInstance, { gameSlug: 'desk-crawler', tokenHash: sha256Hex('sc-tok-ana'), uuid: UUID_A })).toBe(false)
  })

  it('tombstones only the uninstalled Slow Cast instance and keeps the angler', async () => {
    await link(t, 'Ana', 'sc-tok-ana')
    await confirm(t, 'sc-tok-ana', UUID_A)
    const ok = await t.fetch('/trmnl/slow-cast/uninstall', { method: 'POST', headers: { Authorization: 'Bearer sc-tok-ana', 'Content-Type': 'application/json' }, body: JSON.stringify({ user_uuid: UUID_A }) })
    expect(ok.status).toBe(200)
    const state = await t.run(async (ctx) => ({ instance: await ctx.db.query('trmnlInstances').first(), angler: await ctx.db.query('anglers').first() }))
    expect(state.instance?.state).toBe('uninstalled')
    expect(state.angler?.activationState).toBe('active')
    expect((await screen(t, 'sc-tok-ana', UUID_A)).status).toBe(404)
  })

  it('installs a game that is not live for admins only', async () => {
    await t.mutation(internal.platform.setGameStatusInternal, { slug: 'slow-cast', status: 'hidden' })
    await expect(link(t, 'Ana', 'sc-tok-ana')).rejects.toThrow(/not open yet/)
    vi.stubEnv('ADMIN_TOKEN_IDENTIFIERS', 'issuer|Boss')
    expect(await link(t, 'Boss', 'sc-tok-boss')).toEqual({ activationState: 'pending_trmnl', heroCreated: true })
    vi.unstubAllEnvs()
  })

  it('manages and disconnects a Slow Cast installation only through its own game', async () => {
    await link(t, 'Ana', 'sc-tok-ana')
    await confirm(t, 'sc-tok-ana', UUID_A)
    const ana = t.withIdentity({ issuer: 'issuer', subject: 'Ana' })
    expect(await ana.query(api.connections.forManagement, { gameSlug: 'slow-cast', uuid: UUID_A })).toMatchObject({ owned: true, heroName: 'Ana' })
    expect(await ana.query(api.connections.forManagement, { uuid: UUID_A })).toEqual({ owned: false })
    const id = (await t.run(async (ctx) => await ctx.db.query('trmnlInstances').first()))!._id
    await expect(ana.mutation(api.connections.disconnect, { operationId: 'disc-00001', instanceId: id })).rejects.toThrow()
    expect(await ana.mutation(api.connections.disconnect, { gameSlug: 'slow-cast', operationId: 'disc-00002', instanceId: id })).toMatchObject({ changed: true })
    expect((await screen(t, 'sc-tok-ana', UUID_A)).status).toBe(404)
  })
})
