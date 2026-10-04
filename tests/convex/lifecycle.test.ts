// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { internal } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import { sha256Hex } from '../../apps/backend/convex/lib/hash'
import { seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
const NOW = Date.UTC(2026, 9, 3, 10, 0)
const UUID_A = 'aaaaaaaa-1111-4aed-8464-bad68368e97c'
const UUID_B = 'bbbbbbbb-2222-4aed-8464-bad68368e97c'

const link = (t: T, alias: string, token: string, heroName?: string) =>
  t.mutation(internal.trmnl.linkInstall, {
    tokenIdentifier: `issuer|${alias}`,
    tokenHash: sha256Hex(token),
    publicAlias: alias,
    ...(heroName ? { heroName } : {}),
    timezone: 'UTC',
  })

const confirm = (t: T, token: string, uuid: string, by: 'success_callback' | 'screen_request' = 'success_callback') =>
  t.mutation(internal.trmnl.confirmInstance, { tokenHash: sha256Hex(token), uuid, pluginSettingId: '1', confirmedBy: by })

describe('TRMNL lifecycle (V06 protocol rules)', () => {
  let t: T
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    t = convexTest(schema, modules)
    await seedWorld(t)
  })
  afterEach(() => vi.useRealTimers())

  it('prepares one pending hero, activates it once on Save, and keeps it active across repeats', async () => {
    expect(await link(t, 'Ana', 'tok-ana', 'Baz')).toEqual({ activationState: 'pending_trmnl', heroCreated: true })
    expect(await confirm(t, 'tok-ana', UUID_A)).toEqual({ ok: true, reason: 'confirmed' })
    expect(await confirm(t, 'tok-ana', UUID_A)).toEqual({ ok: true, reason: 'already_confirmed' })
    const heroes = await t.run(async (ctx) => await ctx.db.query('heroes').collect())
    expect(heroes).toHaveLength(1)
    expect(heroes[0]).toMatchObject({ activationState: 'active', eligibleFromTick: 1 })
    // A second link (reinstall flow) reuses the hero; no second starter kit.
    expect(await link(t, 'Ana', 'tok-ana')).toEqual({ activationState: 'active', heroCreated: false })
    expect(await t.run(async (ctx) => (await ctx.db.query('items').collect()).length)).toBe(3)
  })

  it('requires a current pending attempt and never revives a tombstone', async () => {
    await link(t, 'Ana', 'tok-ana', 'Baz')
    await confirm(t, 'tok-ana', UUID_A)
    await t.mutation(internal.trmnl.uninstallInstance, { tokenHash: sha256Hex('tok-ana'), uuid: UUID_A })
    // Late success callback or old screen request for the uninstalled UUID stays tombstoned.
    expect(await confirm(t, 'tok-ana', UUID_A)).toEqual({ ok: false, reason: 'tombstoned' })
    expect(await confirm(t, 'tok-ana', UUID_A, 'screen_request')).toEqual({ ok: false, reason: 'tombstoned' })
    // A new UUID without a pending attempt is refused...
    expect(await confirm(t, 'tok-ana', UUID_B)).toEqual({ ok: false, reason: 'no_pending_attempt' })
    // ...and an expired attempt does not count.
    await link(t, 'Ana', 'tok-ana')
    vi.setSystemTime(NOW + 21 * 60_000)
    expect(await confirm(t, 'tok-ana', UUID_B)).toEqual({ ok: false, reason: 'no_pending_attempt' })
    // The hero survives uninstall and stays active.
    expect((await t.run(async (ctx) => await ctx.db.query('heroes').first()))?.activationState).toBe('active')
  })

  it('supports a second instance and lost-callback recovery via the first screen request', async () => {
    await link(t, 'Ana', 'tok-ana', 'Baz')
    // Callback lost: the first authenticated screen request confirms the new instance.
    expect(await confirm(t, 'tok-ana', UUID_A, 'screen_request')).toEqual({ ok: true, reason: 'confirmed' })
    await link(t, 'Ana', 'tok-ana')
    expect(await confirm(t, 'tok-ana', UUID_B)).toEqual({ ok: true, reason: 'confirmed' })
    const instances = await t.run(async (ctx) => await ctx.db.query('trmnlInstances').collect())
    expect(instances.map((i) => [i.uuid, i.confirmedBy, i.state]).sort()).toEqual([
      [UUID_A, 'screen_request', 'active'],
      [UUID_B, 'success_callback', 'active'],
    ])
    // Uninstalling one leaves the other.
    await t.mutation(internal.trmnl.uninstallInstance, { tokenHash: sha256Hex('tok-ana'), uuid: UUID_A })
    const after = await t.run(async (ctx) => await ctx.db.query('trmnlInstances').collect())
    expect(after.find((i) => i.uuid === UUID_B)?.state).toBe('active')
  })

  it("never lets another owner's token claim or relink an instance", async () => {
    await link(t, 'Ana', 'tok-ana', 'Baz')
    await confirm(t, 'tok-ana', UUID_A)
    await link(t, 'Bo', 'tok-bo', 'Pip')
    expect(await confirm(t, 'tok-bo', UUID_A)).toEqual({ ok: false, reason: 'foreign_instance' })
    // A known token cannot be reassigned to a different account.
    await expect(link(t, 'Bo', 'tok-ana')).rejects.toThrow()
    expect(await confirm(t, 'unknown-token', UUID_B)).toEqual({ ok: false, reason: 'unknown_grant' })
  })
})
