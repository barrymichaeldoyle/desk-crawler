// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import { sha256Hex } from '../../apps/backend/convex/lib/hash'
import { flyCode } from '../../apps/backend/convex/lib/keepsakes'
import { flyWeek } from '@trmnl-games/slow-cast/content/flies'
import { seedWorld, type T } from './helpers'
import { runSlowCastTick } from './slowCastHelpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')
const UUID = 'ffffffff-1111-4aed-8464-bad68368e97c'
const TOKEN = 'fly-token-ana'

describe('Slow Cast fly box (D115, S6)', () => {
  let t: T
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.UTC(2026, 10, 4, 10, 5, 3))
    vi.stubEnv('CONVEX_SITE_URL', 'https://art.example')
    t = convexTest(schema, modules)
    await seedWorld(t)
    await runSlowCastTick(t)
    await t.mutation(internal.platform.setGameStatusInternal, { slug: 'slow-cast', status: 'live' })
    await t.mutation(internal.trmnl.linkInstall, { gameSlug: 'slow-cast', tokenIdentifier: 'issuer|Ana', tokenHash: sha256Hex(TOKEN), publicAlias: 'Ana', timezone: 'UTC' })
    await t.mutation(internal.trmnl.confirmInstance, { gameSlug: 'slow-cast', tokenHash: sha256Hex(TOKEN), uuid: UUID, confirmedBy: 'success_callback' })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  const ana = () => t.withIdentity({ issuer: 'issuer', subject: 'Ana' })
  const userId = async () => (await t.run(async (ctx) => await ctx.db.query('users').first()))!._id
  const screen = async () => (await (await t.fetch('/trmnl/slow-cast/v1/screen', { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ user_uuid: UUID }).toString() })).json()).merge_variables

  it('shows the weekly code on the device only, and adds one fly a week for it', async () => {
    const code = flyCode(sha256Hex(TOKEN), await userId(), flyWeek(Date.now()))
    expect((await screen()).fly_code).toBe(code)
    expect(await ana().query(api.slowCast.payload.preview, {})).not.toHaveProperty('fly_code')
    expect(await ana().mutation(api.slowCast.flies.claim, { operationId: 'fly-000001', code })).toMatchObject({ outcome: 'claimed', totalCollected: 1 })
    expect(await ana().mutation(api.slowCast.flies.claim, { operationId: 'fly-000002', code })).toMatchObject({ outcome: 'already_claimed', totalCollected: 1 })
    // Claimed this week: the screen stops showing a code, the fly rides on the hat and the Flies family starts.
    const after = await screen()
    expect(after.fly_code).toBeNull()
    expect(after.scene_base).toMatch(/\/black_gnat$/)
    expect((await t.run(async (ctx) => await ctx.db.query('swAchievements').collect())).map((r) => r.achievementId)).toContain('flies_1')
  })

  it("accepts last week's code from a slow screen and limits wrong guesses", async () => {
    const lastWeek = flyCode(sha256Hex(TOKEN), await userId(), flyWeek(Date.now()) - 1)
    for (let i = 0; i < 10; i += 1) expect((await ana().mutation(api.slowCast.flies.claim, { operationId: `miss-${String(i).padStart(5, '0')}`, code: '000000' })).outcome).toBe('invalid_code')
    await expect(ana().mutation(api.slowCast.flies.claim, { operationId: 'miss-final1', code: lastWeek })).rejects.toThrow(/Too many/)
    vi.advanceTimersByTime(24 * 3_600_000)
    expect((await ana().mutation(api.slowCast.flies.claim, { operationId: 'fly-late01', code: flyCode(sha256Hex(TOKEN), await userId(), flyWeek(Date.now()) - 1) })).outcome).toBe('claimed')
  })
})
