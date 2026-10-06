// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import { seedDeletionConfirmation, seedHero, seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
describe('identified lifecycle analytics and erasure', () => {
  let t: T
  let fetchMock: ReturnType<typeof vi.fn>
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.stubEnv('POSTHOG_PROJECT_TOKEN', 'phc_test')
    vi.stubEnv('POSTHOG_PROJECT_ID', '123')
    vi.stubEnv('POSTHOG_PERSONAL_API_KEY', 'phx_test_secret')
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_test')
    vi.stubEnv('CLERK_JWT_ISSUER_DOMAIN', 'issuer')
    fetchMock = vi.fn(async () => new Response(null, { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)
    t = convexTest(schema, modules)
    await seedWorld(t)
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })
  async function owner(consent: boolean) {
    await seedHero(t, {}, 'user_Support123')
    const identity = t.withIdentity({ issuer: 'issuer', subject: 'user_Support123' })
    await identity.mutation(api.users.setAnalyticsConsent, { allowed: consent })
    const user = (await t.run(ctx => ctx.db.query('users').first()))!
    return { identity, user }
  }
  it('captures using the same Clerk ID as the browser, excludes credentials, and rechecks consent', async () => {
    const { identity, user } = await owner(true)
    await t.action(internal.analytics.captureActivation, { userId: user._id })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body)
    expect(body).toMatchObject({ event: 'hero activated', properties: { distinct_id: 'user_Support123', game: 'desk-crawler' } })
    expect(JSON.stringify(body)).not.toContain('issuer|')
    await identity.mutation(api.users.setAnalyticsConsent, { allowed: false })
    await t.action(internal.analytics.captureActivation, { userId: user._id })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('never changes gameplay or fails activation when PostHog is unavailable', async () => {
    const { user } = await owner(true)
    const before = await t.run(ctx => ctx.db.query('heroes').first())
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    await expect(t.action(internal.analytics.captureActivation, { userId: user._id })).resolves.toBeNull()
    expect(await t.run(ctx => ctx.db.query('heroes').first())).toEqual(before)
  })
  it('queues removal of person, events and recordings during account deletion', async () => {
    const { identity } = await owner(true)
    await identity.mutation(api.deletion.requestDeletion, { operationId: 'delete-analytics', confirm: 'DELETE', token: await seedDeletionConfirmation(t, 'user_Support123') })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const erasure = fetchMock.mock.calls.find(([url]) => String(url).includes('/persons/bulk_delete/'))
    expect(erasure?.[0]).toBe('https://eu.posthog.com/api/projects/123/persons/bulk_delete/')
    expect(JSON.parse(erasure?.[1]?.body)).toEqual({ distinct_ids: ['user_Support123'], delete_events: true, delete_recordings: true })
    expect(await t.run(ctx => ctx.db.query('accountDeletionJobs').first())).toMatchObject({ state: 'completed', phase: 'done' })
    // A still-open tab with the revoked Clerk JWT must not re-identify after the job removes its user row.
    expect(await identity.query(api.users.me, {})).toBeNull()
  })
  it('keeps the durable deletion job blocked and visible if analytics erasure fails', async () => {
    const { identity } = await owner(true)
    fetchMock.mockImplementation(async (url) => new Response(null, { status: String(url).includes('posthog.com') ? 403 : 200 }))
    await identity.mutation(api.deletion.requestDeletion, { operationId: 'delete-analytics-fail', confirm: 'DELETE', token: await seedDeletionConfirmation(t, 'user_Support123') })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(await t.run(ctx => ctx.db.query('accountDeletionJobs').first())).toMatchObject({ state: 'blocked', phase: 'provider', reasonCode: 'ANALYTICS_DELETE_FAILED' })
    expect((await t.run(ctx => ctx.db.query('users').first()))?.state).toBe('deleting')
  })
  it('also erases identified signup visitors who never enrolled in a game', async () => {
    await t.mutation(internal.deletion.providerDeleted, { clerkUserId: 'user_Unenrolled123' })
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/persons/bulk_delete/'))).toBe(true)
    expect(await t.mutation(internal.deletion.providerDeleted, { clerkUserId: 'user_Unenrolled123' })).toEqual({ started: false })
  })
})
