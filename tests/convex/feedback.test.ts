// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import { seedDeletionConfirmation, seedHero, seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
const clerkUser = (address: string) => ({ primary_email_address_id: 'email_1', email_addresses: [{ id: 'email_1', email_address: address, verification: { status: 'verified' } }] })

describe('player feedback (D107)', () => {
  let t: T
  let fetchMock: ReturnType<typeof vi.fn>
  let resendOk = true
  const rows = () => t.run((ctx) => ctx.db.query('feedback').collect())
  const emails = () => fetchMock.mock.calls.filter(([url]) => url === 'https://api.resend.com/emails').map(([, init]) => JSON.parse((init as RequestInit).body as string))
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.UTC(2026, 9, 8, 12))
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_fake')
    vi.stubEnv('RESEND_API_KEY', 're_test_fake')
    resendOk = true
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith('https://api.clerk.com') && init?.method !== 'DELETE') return new Response(JSON.stringify(clerkUser('ana@example.com')), { status: 200 })
      if (url === 'https://api.resend.com/emails') return new Response(null, { status: resendOk ? 200 : 500 })
      return new Response(null, { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    t = convexTest(schema, modules)
    await seedWorld(t)
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  it('needs a sign-in and a non-empty message', async () => {
    await expect(t.mutation(api.feedback.send, { message: 'hi' })).rejects.toThrow(/Sign in/)
    const ana = t.withIdentity({ issuer: 'issuer', subject: 'Ana' })
    await expect(ana.mutation(api.feedback.send, { message: '   ' })).rejects.toThrow(/Write a message/)
    await expect(ana.mutation(api.feedback.send, { message: 'x'.repeat(2001) })).rejects.toThrow(/under 2000/)
    expect(await rows()).toEqual([])
  })

  it('stores the message and emails it to Barry with the verified address as Reply-To', async () => {
    await seedHero(t, {}, 'Ana')
    const ana = t.withIdentity({ issuer: 'issuer', subject: 'Ana' })
    await ana.mutation(api.feedback.send, { message: '  More biomes please!  ', page: '/app/desk-crawler/settings' })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await rows()).toMatchObject([{ message: 'More biomes please!', page: '/app/desk-crawler/settings', publicAlias: 'Ana', state: 'sent', attempts: 1 }])
    const [email] = emails()
    expect(email).toMatchObject({ to: ['barry@barrymichaeldoyle.com'], reply_to: 'ana@example.com', subject: 'TRMNL Games feedback from Ana' })
    expect(email.text).toContain('More biomes please!')
    expect(email.text).toContain('Page: /app/desk-crawler/settings')
  })

  it('accepts accounts without a game and drops unsafe page values', async () => {
    const bo = t.withIdentity({ issuer: 'issuer', subject: 'Bo' })
    await bo.mutation(api.feedback.send, { message: 'Looks fun', page: 'https://evil.example' })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const [row] = await rows()
    expect(row).toMatchObject({ message: 'Looks fun', state: 'sent' })
    expect(row!.page).toBeUndefined()
    expect(row!.publicAlias).toBeUndefined()
    expect(emails()[0].subject).toBe('TRMNL Games feedback from a player without a game yet')
  })

  it('retries a failed email, then keeps the row for the operator view', async () => {
    resendOk = false
    const ana = t.withIdentity({ issuer: 'issuer', subject: 'Ana' })
    await ana.mutation(api.feedback.send, { message: 'Bug: bag sheet stuck' })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(emails()).toHaveLength(3)
    expect(await rows()).toMatchObject([{ state: 'failed', attempts: 3 }])
    expect(await t.query(internal.feedback.recent, {})).toMatchObject([{ message: 'Bug: bag sheet stuck', state: 'failed' }])
  })

  it('limits each player to five messages an hour', async () => {
    const ana = t.withIdentity({ issuer: 'issuer', subject: 'Ana' })
    for (let i = 0; i < 5; i++) await ana.mutation(api.feedback.send, { message: `note ${i}` })
    await expect(ana.mutation(api.feedback.send, { message: 'one more' })).rejects.toThrow(/Try again in an hour/)
    await t.withIdentity({ issuer: 'issuer', subject: 'Bo' }).mutation(api.feedback.send, { message: 'different player' })
    expect(await rows()).toHaveLength(6)
  })

  it('removes feedback with the account', async () => {
    await seedHero(t, {}, 'Ana')
    const ana = t.withIdentity({ issuer: 'issuer', subject: 'Ana' })
    await ana.mutation(api.feedback.send, { message: 'Bye for now' })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    await ana.mutation(api.deletion.requestDeletion, { operationId: 'delete-feedback', confirm: 'DELETE', token: await seedDeletionConfirmation(t, 'Ana') })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await rows()).toEqual([])
    await expect(ana.mutation(api.feedback.send, { message: 'back again' })).rejects.toThrow(/not available/)
  })
})
