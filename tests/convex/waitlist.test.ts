// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import { unsubscribeToken } from '../../apps/backend/convex/waitlist'
import { seedDeletionConfirmation, seedHero, seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
const KEY = 'test-waitlist-link-signing-secret-32-characters'
const INSTALL = 'https://trmnl.com/recipes/564'
const clerkUser = (address: string) => ({ primary_email_address_id: 'email_1', email_addresses: [{ id: 'email_1', email_address: address, verification: { status: 'verified' } }] })

describe('Desk Crawler launch list (D105)', () => {
  let t: T
  let fetchMock: ReturnType<typeof vi.fn>
  let clerkAddress = 'Ana@Example.com'
  let resendOk = true
  const rows = () => t.run((ctx) => ctx.db.query('waitlist').collect())
  const batches = () => fetchMock.mock.calls.filter(([url]) => url === 'https://api.resend.com/emails/batch')
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.UTC(2026, 9, 8, 12))
    vi.stubEnv('WAITLIST_LINK_KEY', KEY)
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_fake')
    vi.stubEnv('RESEND_API_KEY', 're_test_fake')
    clerkAddress = 'Ana@Example.com'
    resendOk = true
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith('https://api.clerk.com') && init?.method !== 'DELETE') return new Response(JSON.stringify(clerkUser(clerkAddress)), { status: 200 })
      if (url === 'https://api.resend.com/emails/batch') return new Response(null, { status: resendOk ? 200 : 500 })
      return new Response(null, { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    t = convexTest(schema, modules)
    await seedWorld(t)
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  it('stores one normalized row per address, rejects bad input and drops honeypot submissions', async () => {
    await t.mutation(api.waitlist.join, { email: '  Ana@Example.COM ', source: 'notify' })
    await t.mutation(api.waitlist.join, { email: 'ana@example.com', source: 'pitch' })
    await t.mutation(api.waitlist.join, { email: 'bot@example.com', source: 'notify', website: 'https://spam.example' })
    await expect(t.mutation(api.waitlist.join, { email: 'not-an-email', source: 'notify' })).rejects.toThrow(/valid email/)
    expect(await rows()).toMatchObject([{ email: 'ana@example.com', source: 'notify', state: 'waiting' }])
    expect(await rows()).toHaveLength(1)
  })

  it('rate limits joins across everyone', async () => {
    for (let i = 0; i < 300; i++) await t.mutation(api.waitlist.join, { email: `p${i}@example.com`, source: 'notify' })
    await expect(t.mutation(api.waitlist.join, { email: 'late@example.com', source: 'notify' })).rejects.toThrow(/Try again/)
  }, 30_000)

  it('unsubscribes only with the signed token, and a late click still succeeds', async () => {
    await t.mutation(api.waitlist.join, { email: 'ana@example.com', source: 'notify' })
    const id = (await rows())[0]!._id
    await expect(t.mutation(api.waitlist.leave, { id, token: 'f'.repeat(64) })).rejects.toThrow(/not valid/)
    await t.mutation(api.waitlist.leave, { id, token: unsubscribeToken(KEY, id) })
    expect(await rows()).toEqual([])
    await t.mutation(api.waitlist.leave, { id, token: unsubscribeToken(KEY, id) })
  })

  it('attaches a new account to the entry its verified email already has, and account deletion removes it', async () => {
    await seedHero(t, {}, 'Ana')
    const ana = t.withIdentity({ issuer: 'issuer', subject: 'Ana' })
    await t.mutation(api.waitlist.join, { email: 'ana@example.com', source: 'pitch' })
    expect(await ana.query(api.waitlist.mine, {})).toBeNull()
    expect(await ana.action(api.waitlist.joinWithAccount, {})).toEqual({ email: 'ana@example.com' })
    expect(await rows()).toMatchObject([{ email: 'ana@example.com', source: 'pitch', tokenIdentifier: 'issuer|Ana' }])
    expect(await ana.query(api.waitlist.mine, {})).toEqual({ email: 'ana@example.com' })

    await ana.mutation(api.deletion.requestDeletion, { operationId: 'delete-wait', confirm: 'DELETE', token: await seedDeletionConfirmation(t, 'Ana') })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await rows()).toEqual([])
  })

  it('joins a signed-in player with no entry and lets them leave', async () => {
    const bo = t.withIdentity({ issuer: 'issuer', subject: 'Bo' })
    clerkAddress = 'bo@example.com'
    await bo.action(api.waitlist.joinWithAccount, {})
    await bo.action(api.waitlist.joinWithAccount, {})
    expect(await rows()).toMatchObject([{ email: 'bo@example.com', source: 'account', tokenIdentifier: 'issuer|Bo' }])
    await bo.mutation(api.waitlist.leaveWithAccount, {})
    expect(await rows()).toEqual([])
    await expect(t.action(api.waitlist.joinWithAccount, {})).rejects.toThrow(/Sign in/)
  })

  it('sends the launch email in batches with a working unsubscribe link, deleting each accepted address', async () => {
    for (let i = 0; i < 60; i++) await t.mutation(api.waitlist.join, { email: `p${i}@example.com`, source: 'notify' })
    expect(await t.query(internal.waitlist.summary, {})).toEqual({ waiting: 60, sending: 0, failed: 0, withAccount: 0 })
    await t.action(internal.waitlist.sendLaunch, { installUrl: INSTALL })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(batches()).toHaveLength(2)
    const first = JSON.parse(batches()[0]![1]!.body as string)
    expect(first).toHaveLength(50)
    expect(first[0]).toMatchObject({ to: ['p0@example.com'], subject: 'Desk Crawler is live on TRMNL' })
    expect(first[0].text).toContain(INSTALL)
    const link = new URL(first[0].text.match(/Unsubscribe: (\S+)/)[1])
    expect(link.pathname).toBe('/desk-crawler/unsubscribe')
    expect(first[0].headers['List-Unsubscribe']).toBe(`<${link.toString()}>`)
    expect(unsubscribeToken(KEY, link.searchParams.get('id')!)).toBe(link.searchParams.get('token'))
    expect(await rows()).toEqual([])
  })

  it('retries a refused batch, then parks it as failed for requeue', async () => {
    await t.mutation(api.waitlist.join, { email: 'ana@example.com', source: 'notify' })
    resendOk = false
    await t.action(internal.waitlist.sendLaunch, { installUrl: INSTALL })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(batches()).toHaveLength(3)
    expect(await rows()).toMatchObject([{ state: 'failed', attempts: 3 }])
    expect(await t.mutation(internal.waitlist.requeue, {})).toEqual({ requeued: 1 })
    resendOk = true
    await t.action(internal.waitlist.sendLaunch, { installUrl: INSTALL })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await rows()).toEqual([])
  })

  it('sends nothing without a key or an https install link', async () => {
    await t.mutation(api.waitlist.join, { email: 'ana@example.com', source: 'notify' })
    expect(await t.action(internal.waitlist.sendLaunch, { installUrl: 'trmnl.com' })).toMatchObject({ status: 'disabled' })
    vi.stubEnv('RESEND_API_KEY', '')
    expect(await t.action(internal.waitlist.sendLaunch, { installUrl: INSTALL })).toMatchObject({ status: 'disabled' })
    expect(batches()).toHaveLength(0)
    expect(await rows()).toMatchObject([{ state: 'waiting' }])
  })
})
