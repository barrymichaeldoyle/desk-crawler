// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, describe, expect, it, vi } from 'vitest'
import schema from '../../apps/backend/convex/schema'
import { sha256Hex } from '../../apps/backend/convex/lib/hash'
import { seedHero, seedWorld } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')

afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs() })

describe('TRMNL local sky', () => {
  it('uses request time and the configured offset for every scale, including paused heroes', async () => {
    vi.useFakeTimers()
    const now = Date.UTC(2026, 9, 5, 10)
    vi.setSystemTime(now)
    vi.stubEnv('CONVEX_SITE_URL', 'https://example.test')
    const t = convexTest(schema, modules)
    await seedWorld(t)
    const heroId = await seedHero(t, { status: 'paused', lastAdvancedAt: now - 86400000 }, 'Ana')
    const token = 'scene-test-token'
    const uuid = 'aaaaaaaa-1111-4aed-8464-bad68368e97c'
    await t.run(async (ctx) => {
      const hero = (await ctx.db.get(heroId))!
      const grantId = await ctx.db.insert('trmnlGrants', { userId: hero.userId, tokenHash: sha256Hex(token), state: 'active', createdAt: now })
      await ctx.db.insert('trmnlInstances', { userId: hero.userId, grantId, uuid, state: 'active', confirmedBy: 'success_callback', createdAt: now })
    })
    const before = await t.run(async (ctx) => await ctx.db.get(heroId))
    for (const [offset, time] of [['7200', 'day'], ['28800', 'night'], ['-21600', 'night'], ['', 'day'], ['invalid', 'day']] as const) {
      const body = new URLSearchParams({ user_uuid: uuid, 'trmnl[user][utc_offset]': offset })
      const response = await t.fetch('/trmnl/v1/screen', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })
      expect(response.status).toBe(200)
      const { merge_variables: vars } = await response.json() as { merge_variables: Record<string, string> }
      for (const key of ['scene_url', 'scene_url_small', 'scene_url_large', 'scene_url_medium']) {
        expect(vars[key]).toContain(`/office_cubicles/${time}/rest/prop-campfire/`)
        const asset = await t.fetch(new URL(vars[key]!).pathname)
        expect(asset.status).toBe(200)
        expect(asset.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
        expect(asset.headers.get('Content-Type')).toBe('image/png')
      }
    }
    expect(await t.run(async (ctx) => await ctx.db.get(heroId))).toEqual(before)
  })
})
