// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { SignJWT, exportJWK, generateKeyPair } from 'jose'
import { api, internal } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import { sha256Hex } from '../../apps/backend/convex/lib/hash'
import { seedDeletionConfirmation, seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
const NOW = Date.UTC(2026, 9, 6, 12)
const TOKEN = 'reused-trmnl-plugin-token'
const HASH = sha256Hex(TOKEN)
const OLD_UUID = 'aaaaaaaa-1111-4aed-8464-bad68368e97c'
const NEW_UUID = 'bbbbbbbb-2222-4aed-8464-bad68368e97c'
const OTHER_UUID = 'cccccccc-3333-4aed-8464-bad68368e97c'
let keys: Awaited<ReturnType<typeof generateKeyPair>>
let jwks: object

beforeAll(async () => {
  keys = await generateKeyPair('RS256', { extractable: true })
  jwks = { keys: [{ ...await exportJWK(keys.publicKey), kid: 'return-flow', alg: 'RS256', use: 'sig' }] }
})

describe('delete → fresh TRMNL installation with a reused credential', () => {
  let t: T
  let fetchMock: ReturnType<typeof vi.fn>
  const user = (subject = 'New') => t.withIdentity({ issuer: 'issuer', subject })
  const screen = (uuid: string, tokenHash = HASH) => t.query(internal.trmnlPayload.forInstance, { uuid, tokenHash, now: Date.now(), instanceName: null })
  const begin = (subject = 'New') => user(subject).action(api.trmnl.completeInstall, { code: 'new-provider-install-code', publicAlias: subject, heroName: 'Newbie', timezone: 'UTC' })
  const status = (subject = 'New') => user(subject).query(api.trmnl.reconnectionStatus, {})
  const proof = async (uuid = NEW_UUID, options: { iat?: number; exp?: number; aud?: string } = {}) => {
    const iat = options.iat ?? Math.floor(Date.now() / 1000)
    return new SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 'return-flow' }).setSubject(uuid).setAudience(options.aud ?? 'client_test').setIssuedAt(iat).setExpirationTime(options.exp ?? iat + 120).sign(keys.privateKey)
  }
  async function verify(subject = 'New', uuid = NEW_UUID, jwt?: string) {
    const pending = (await status(subject))!
    await user(subject).action(api.trmnl.verifyReconnection, { attemptId: pending.id, uuid, jwt: jwt ?? await proof(uuid) })
    return pending.id
  }
  async function deleted(kind: 'account' | 'game' = 'account') {
    await t.mutation(internal.trmnl.linkInstall, { tokenIdentifier: 'issuer|Old', tokenHash: HASH, publicAlias: 'Old', heroName: 'Oldie', timezone: 'UTC' })
    await t.mutation(internal.trmnl.confirmInstance, { tokenHash: HASH, uuid: OLD_UUID, confirmedBy: 'success_callback' })
    await t.run(async ctx => { const hero = (await ctx.db.query('heroes').first())!; await ctx.db.patch(hero._id, { gold: 999, lifetimeXp: 9000 }) })
    if (kind === 'account') await user('Old').mutation(api.deletion.requestDeletion, { operationId: 'delete-old-account', confirm: 'DELETE', token: await seedDeletionConfirmation(t, 'Old') })
    else await user('Old').mutation(api.deletion.requestGameDeletion, { operationId: 'delete-old-game', confirm: 'DELETE' })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
  }
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_test')
    vi.stubEnv('TRMNL_CLIENT_ID', 'client_test')
    vi.stubEnv('POSTHOG_PROJECT_ID', '')
    vi.stubEnv('POSTHOG_PROJECT_TOKEN', '')
    fetchMock = vi.fn(async (url: string) => {
      if (url === 'https://trmnl.com/.well-known/jwks.json') return new Response(JSON.stringify(jwks), { headers: { 'Content-Type': 'application/json' } })
      if (url === 'https://trmnl.com/oauth/token') return new Response(JSON.stringify({ access_token: TOKEN }))
      return new Response(null, { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    t = convexTest(schema, modules)
    await seedWorld(t)
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  it.each(['account', 'game'] as const)('starts fresh after %s deletion, activates only the signed installation and stays idempotent', async kind => {
    await deleted(kind)
    const subject = kind === 'game' ? 'Old' : 'New'
    expect(await begin(subject)).toEqual({ activationState: 'pending_trmnl', heroCreated: false, reconnectionRequired: true })
    expect(await t.run(ctx => ctx.db.query('heroes').collect())).toEqual([])
    expect(await t.run(ctx => ctx.db.query('trmnlGrants').collect())).toEqual([])
    expect(await t.run(ctx => ctx.db.query('users').collect())).toHaveLength(kind === 'game' ? 1 : 0)
    expect(await screen(OLD_UUID)).toBeNull()
    expect(await screen(NEW_UUID)).toBeNull()
    expect(await t.mutation(internal.trmnl.confirmInstance, { tokenHash: HASH, uuid: NEW_UUID, confirmedBy: 'success_callback' })).toEqual({ ok: false, reason: 'reauthorization_required' })
    vi.advanceTimersByTime(2_000)
    const attemptId = await verify(subject)
    expect(await t.run(ctx => ctx.db.query('heroes').collect())).toEqual([]) // opening Configure alone earns/creates nothing
    const args = { attemptId, operationId: 'confirm-fresh-start', confirm: 'CONNECT' as const }
    const first = await user(subject).mutation(api.trmnl.completeReconnection, args)
    expect(first.changed).toBe(true)
    expect(await user(subject).mutation(api.trmnl.completeReconnection, args)).toEqual(first)
    const state = await t.run(async ctx => ({ heroes: await ctx.db.query('heroes').collect(), items: await ctx.db.query('items').collect(), grants: await ctx.db.query('trmnlGrants').collect(), revoked: await ctx.db.query('revokedTrmnlCredentials').collect(), pending: await ctx.db.query('trmnlReconnectAttempts').collect() }))
    expect(state.heroes).toHaveLength(1)
    expect(state.heroes[0]).toMatchObject({ name: 'Newbie', activationState: 'active', lifetimeXp: 0, gold: 0 })
    expect(state.items).toHaveLength(3)
    expect(state.grants).toHaveLength(1)
    expect(state.grants[0]).toMatchObject({ tokenHash: HASH, authorizedUuid: NEW_UUID })
    expect(state.revoked).toHaveLength(1)
    expect(state.pending).toEqual([])
    expect(await screen(NEW_UUID)).toMatchObject({ outcome: 'payload' })
    expect(await screen(OLD_UUID)).toBeNull()
    expect(await screen(OTHER_UUID)).toBeNull()
    expect(await t.mutation(internal.trmnl.confirmInstance, { tokenHash: HASH, uuid: OLD_UUID, confirmedBy: 'screen_request' })).toEqual({ ok: false, reason: 'unknown_grant' })
    if (kind === 'account') await expect(user('Old').action(api.trmnl.completeInstall, { code: 'old-code', publicAlias: 'Old', heroName: 'Oldie', timezone: 'UTC' })).rejects.toThrow(/deleted/)
  })

  it('requires a fresh signed JWT, refusing forged, stale, expired, wrong-audience and wrong-subject links', async () => {
    await deleted()
    await begin()
    const attemptId = (await status())!.id
    const stale = await proof()
    vi.advanceTimersByTime(2_000)
    const valid = await proof()
    for (const jwt of [await new SignJWT({}).setProtectedHeader({ alg: 'RS256' }).setSubject(NEW_UUID).setAudience('client_test').setIssuedAt().setExpirationTime('2m').sign(keys.privateKey), await new SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 'return-flow' }).setSubject(NEW_UUID).setAudience('client_test').setIssuedAt().sign(keys.privateKey), 'not-a-jwt', valid.slice(0, -10) + 'invalidsig', stale, await proof(NEW_UUID, { aud: 'other_client' }), await proof(OTHER_UUID), await proof(NEW_UUID, { iat: Math.floor(Date.now() / 1000) - 300, exp: Math.floor(Date.now() / 1000) - 60 })]) {
      await expect(user().action(api.trmnl.verifyReconnection, { attemptId, uuid: NEW_UUID, jwt })).rejects.toThrow()
      expect((await status())?.verified).toBe(false)
    }
    await verify()
    expect((await status())?.verified).toBe(true)
  })

  it('keeps a valid proof scoped to the requesting Clerk account, with no mutation from a naked UUID or replayed code', async () => {
    await deleted()
    await begin()
    const attemptId = (await status())!.id
    await expect(user().mutation(api.trmnl.completeReconnection, { attemptId, operationId: 'no-management-proof', confirm: 'CONNECT' })).rejects.toThrow(/Verify/)
    expect(await user('Other').query(api.trmnl.reconnectionStatus, {})).toBeNull()
    vi.advanceTimersByTime(2_000)
    await expect(user('Other').action(api.trmnl.verifyReconnection, { attemptId, uuid: NEW_UUID, jwt: await proof() })).rejects.toThrow()
    await verify()
    await expect(user('Other').mutation(api.trmnl.completeReconnection, { attemptId, operationId: 'foreign-confirmation', confirm: 'CONNECT' })).rejects.toThrow()
    await expect(user('Old').mutation(api.trmnl.completeReconnection, { attemptId, operationId: 'revoked-confirmation', confirm: 'CONNECT' })).rejects.toThrow(/deleted/)
    expect(await t.run(ctx => ctx.db.query('users').collect())).toEqual([])
  })

  it('expires proof independently of the draft, then allows a fresh Configure link; expires drafts too', async () => {
    await deleted()
    await begin()
    vi.advanceTimersByTime(2_000)
    const attemptId = await verify()
    vi.advanceTimersByTime(10 * 60_000 + 1)
    await expect(user().mutation(api.trmnl.completeReconnection, { attemptId, operationId: 'expired-proof-connect', confirm: 'CONNECT' })).rejects.toThrow()
    await verify()
    vi.advanceTimersByTime(10 * 60_000)
    await expect(verify()).rejects.toThrow(/expired/)
    await t.mutation(internal.maintenance.cleanup, { job: 'reconnectAttempts' })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await status()).toBeNull()
    await begin()
    expect((await status())!.id).not.toBe(attemptId)
  })

  it('reuses one draft for repeated and concurrent install requests without extending its lifetime', async () => {
    await deleted()
    await Promise.all([begin(), begin()])
    const first = await status()
    vi.advanceTimersByTime(60_000)
    await begin()
    expect(await status()).toEqual(first)
    expect(await t.run(ctx => ctx.db.query('trmnlReconnectAttempts').collect())).toHaveLength(1)
    expect(await t.run(ctx => ctx.db.query('heroes').collect())).toEqual([])
  })

  it('isolates distinct signed installations even when the provider reuses a token across accounts', async () => {
    await deleted()
    await begin('New')
    await begin('Other')
    vi.advanceTimersByTime(2_000)
    const a = await verify('New', NEW_UUID)
    const b = await verify('Other', OTHER_UUID)
    await user('New').mutation(api.trmnl.completeReconnection, { attemptId: a, operationId: 'connect-first-scope', confirm: 'CONNECT' })
    await user('Other').mutation(api.trmnl.completeReconnection, { attemptId: b, operationId: 'connect-second-scope', confirm: 'CONNECT' })
    expect(await screen(NEW_UUID)).toMatchObject({ outcome: 'payload' })
    expect(await screen(OTHER_UUID)).toMatchObject({ outcome: 'payload' })
    expect(await screen(OLD_UUID)).toBeNull()
    const instances = await t.run(ctx => ctx.db.query('trmnlInstances').collect())
    expect(instances).toHaveLength(2)
    expect(new Set(instances.map(row => row.userId)).size).toBe(2)
    await user('New').mutation(api.deletion.requestDeletion, { operationId: 'delete-first-return', confirm: 'DELETE', token: await seedDeletionConfirmation(t, 'New') })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await screen(NEW_UUID)).toBeNull()
    expect(await screen(OTHER_UUID)).toMatchObject({ outcome: 'payload' })
    await expect(t.mutation(internal.trmnl.linkInstall, { tokenIdentifier: 'issuer|Attacker', tokenHash: HASH, publicAlias: 'Attacker', heroName: 'Sneak', timezone: 'UTC' })).rejects.toThrow()
  })

  it('never steals an installation from a live account, even with a valid signed Configure link', async () => {
    await deleted()
    await begin('New')
    vi.advanceTimersByTime(2_000)
    const id = await verify('New')
    await user('New').mutation(api.trmnl.completeReconnection, { attemptId: id, operationId: 'connect-first-owner', confirm: 'CONNECT' })
    await begin('Other')
    vi.advanceTimersByTime(2_000)
    await expect(verify('Other', NEW_UUID)).rejects.toThrow(/another/)
    expect(await screen(NEW_UUID)).toMatchObject({ outcome: 'payload' })
    expect(await t.run(ctx => ctx.db.query('heroes').collect())).toHaveLength(1)
  })

  it('clears pending reconnections during both account and game deletion', async () => {
    await deleted('game')
    await begin('Old')
    await user('Old').mutation(api.deletion.requestGameDeletion, { operationId: 'delete-pending-game', confirm: 'DELETE' })
    expect(await status('Old')).toBeNull()
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    await begin('Old')
    await user('Old').mutation(api.deletion.requestDeletion, { operationId: 'delete-pending-account', confirm: 'DELETE', token: await seedDeletionConfirmation(t, 'Old') })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await t.run(ctx => ctx.db.query('trmnlReconnectAttempts').collect())).toEqual([])
  })

  it('survives another full account deletion and reinstall without restoring old UUIDs or progress', async () => {
    await deleted()
    await begin('New')
    vi.advanceTimersByTime(2_000)
    const first = await verify('New', NEW_UUID)
    await user('New').mutation(api.trmnl.completeReconnection, { attemptId: first, operationId: 'first-return-cycle', confirm: 'CONNECT' })
    await user('New').mutation(api.deletion.requestDeletion, { operationId: 'delete-returned-account', confirm: 'DELETE', token: await seedDeletionConfirmation(t, 'New') })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    await begin('Newest')
    vi.advanceTimersByTime(2_000)
    const second = await verify('Newest', OTHER_UUID)
    await user('Newest').mutation(api.trmnl.completeReconnection, { attemptId: second, operationId: 'second-return-cycle', confirm: 'CONNECT' })
    expect(await screen(OTHER_UUID)).toMatchObject({ outcome: 'payload' })
    expect(await screen(OLD_UUID)).toBeNull()
    expect(await screen(NEW_UUID)).toBeNull()
    expect(await t.run(ctx => ctx.db.query('users').collect())).toHaveLength(1)
    expect(await t.run(ctx => ctx.db.query('heroes').collect())).toHaveLength(1)
    expect(await t.run(ctx => ctx.db.query('items').collect())).toHaveLength(3)
    expect(await t.run(ctx => ctx.db.query('revokedAuthIdentities').collect())).toHaveLength(2)
  })

  it('keeps disconnect/uninstall scoped and never reactivates them through old polling', async () => {
    await deleted()
    await begin()
    vi.advanceTimersByTime(2_000)
    const id = await verify()
    await user().mutation(api.trmnl.completeReconnection, { attemptId: id, operationId: 'return-before-uninstall', confirm: 'CONNECT' })
    expect(await t.mutation(internal.trmnl.uninstallInstance, { tokenHash: sha256Hex('wrong-token'), uuid: NEW_UUID })).toBe(false)
    expect(await t.mutation(internal.trmnl.uninstallInstance, { tokenHash: HASH, uuid: NEW_UUID })).toBe(true)
    expect(await screen(NEW_UUID)).toBeNull()
    expect(await t.mutation(internal.trmnl.confirmInstance, { tokenHash: HASH, uuid: NEW_UUID, confirmedBy: 'screen_request' })).toEqual({ ok: false, reason: 'tombstoned' })
    expect(await t.run(ctx => ctx.db.query('heroes').first())).toMatchObject({ activationState: 'active' })
  })
  it('enforces the reconnect gate through the real success, screen and uninstall HTTP routes', async () => {
    const callback = (uuid: string) => t.fetch('/trmnl/install/success', { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ user: { uuid } }) })
    const poll = (uuid: string) => t.fetch('/trmnl/v1/screen', { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ user_uuid: uuid }).toString() })
    await deleted()
    await begin()
    expect((await callback(NEW_UUID)).status).toBe(200) // acknowledge Save while waiting for separate signed proof
    expect((await poll(NEW_UUID)).status).toBe(404)
    expect((await poll(OLD_UUID)).status).toBe(404)
    vi.advanceTimersByTime(2_000)
    const id = await verify()
    expect((await poll(NEW_UUID)).status).toBe(404)
    await user().mutation(api.trmnl.completeReconnection, { attemptId: id, operationId: 'http-return-connect', confirm: 'CONNECT' })
    const response = await poll(NEW_UUID)
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(await response.json()).toMatchObject({ markup: expect.any(String), markup_half_horizontal: expect.any(String), markup_half_vertical: expect.any(String), markup_quadrant: expect.any(String), merge_variables: expect.any(Object) })
    expect((await poll(OLD_UUID)).status).toBe(404)
    expect((await poll(OTHER_UUID)).status).toBe(404)
    expect((await callback(OLD_UUID)).status).toBe(404)
    expect((await t.fetch('/trmnl/uninstall', { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ user_uuid: NEW_UUID }) })).status).toBe(200)
    expect((await callback(NEW_UUID)).status).toBe(200)
    expect((await poll(NEW_UUID)).status).toBe(404)
  })

  it('repairs its own explicitly selected disconnected scope without resetting an existing hero', async () => {
    await deleted()
    await begin()
    vi.advanceTimersByTime(2_000)
    const first = await verify()
    await user().mutation(api.trmnl.completeReconnection, { attemptId: first, operationId: 'connect-before-repair', confirm: 'CONNECT' })
    const heroId = await t.run(async ctx => {
      const grant = (await ctx.db.query('trmnlGrants').first())!
      const instance = (await ctx.db.query('trmnlInstances').first())!
      const hero = (await ctx.db.query('heroes').first())!
      await ctx.db.patch(grant._id, { state: 'revoked' })
      await ctx.db.patch(instance._id, { state: 'disconnected' })
      await ctx.db.patch(hero._id, { gold: 123, lifetimeXp: 456 })
      return hero._id
    })
    expect(await screen(NEW_UUID)).toBeNull()
    await begin()
    vi.advanceTimersByTime(2_000)
    const next = await verify()
    await user().mutation(api.trmnl.completeReconnection, { attemptId: next, operationId: 'repair-confirmed-scope', confirm: 'CONNECT' })
    expect(await screen(NEW_UUID)).toMatchObject({ outcome: 'payload' })
    expect(await screen(OLD_UUID)).toBeNull()
    expect(await t.run(ctx => ctx.db.query('heroes').collect())).toEqual([expect.objectContaining({ _id: heroId, gold: 123, lifetimeXp: 456 })])
    expect(await t.run(ctx => ctx.db.query('items').collect())).toHaveLength(3)
    expect(await t.run(ctx => ctx.db.query('trmnlGrants').collect())).toHaveLength(1)
  })

  it('rechecks UUID ownership at confirmation when two accounts verified it before either committed', async () => {
    await deleted()
    await begin('New')
    await begin('Other')
    vi.advanceTimersByTime(2_000)
    const first = await verify('New', NEW_UUID)
    const second = await verify('Other', NEW_UUID)
    await user('New').mutation(api.trmnl.completeReconnection, { attemptId: first, operationId: 'win-same-uuid-race', confirm: 'CONNECT' })
    await expect(user('Other').mutation(api.trmnl.completeReconnection, { attemptId: second, operationId: 'lose-same-uuid-race', confirm: 'CONNECT' })).rejects.toThrow(/another/)
    expect(await t.run(ctx => ctx.db.query('users').collect())).toHaveLength(1) // losing confirmation rolled back its new profile too
    expect(await t.run(ctx => ctx.db.query('heroes').collect())).toHaveLength(1)
    expect(await t.run(ctx => ctx.db.query('trmnlGrants').collect())).toHaveLength(1)
    expect(await screen(NEW_UUID)).toMatchObject({ outcome: 'payload' })
  })

  it('acknowledges a live Save even with many earlier expired drafts for the reused token', async () => {
    await deleted()
    await t.run(async ctx => {
      for (let n = 0; n < 12; n++) await ctx.db.insert('trmnlReconnectAttempts', { tokenIdentifier: `issuer|Expired${n}`, tokenHash: HASH, publicAlias: `Expired${n}`, heroName: 'Hero', timezone: 'UTC', createdAt: NOW - 30 * 60_000, expiresAt: NOW - 1 })
    })
    await begin()
    expect(await t.mutation(internal.trmnl.confirmInstance, { tokenHash: HASH, uuid: NEW_UUID, confirmedBy: 'success_callback' })).toEqual({ ok: false, reason: 'reauthorization_required' })
    expect(await t.run(ctx => ctx.db.query('users').collect())).toEqual([])
    expect(await screen(NEW_UUID)).toBeNull()
  })

})
