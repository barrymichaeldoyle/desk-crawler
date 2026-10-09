// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import type { T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')

describe('game lifecycle status (D115)', () => {
  let t: T
  beforeEach(() => {
    vi.stubEnv('ADMIN_TOKEN_IDENTIFIERS', 'issuer|Admin')
    t = convexTest(schema, modules)
  })
  afterEach(() => vi.unstubAllEnvs())

  const player = () => t.withIdentity({ issuer: 'issuer', subject: 'Player' })
  const admin = () => t.withIdentity({ issuer: 'issuer', subject: 'Admin' })

  it('keeps a hidden game out of every non-admin listing, signed in or not', async () => {
    const expected = { admin: false, games: [{ slug: 'desk-crawler', status: 'live', canOpen: true }] }
    expect(await t.query(api.platform.list, {})).toEqual(expected)
    expect(await player().query(api.platform.list, {})).toEqual(expected)
  })

  it('shows admins the hidden game and lets them open it', async () => {
    expect(await admin().query(api.platform.list, {})).toEqual({
      admin: true,
      games: [
        { slug: 'desk-crawler', status: 'live', canOpen: true },
        { slug: 'slow-cast', status: 'hidden', canOpen: true },
      ],
    })
  })

  it('lists a preview game for everyone but opens it only for admins', async () => {
    await admin().mutation(api.platform.setGameStatus, { slug: 'slow-cast', status: 'preview', reasonCode: 'art_ready' })
    expect((await player().query(api.platform.list, {})).games).toContainEqual({ slug: 'slow-cast', status: 'preview', canOpen: false })
    expect((await admin().query(api.platform.list, {})).games).toContainEqual({ slug: 'slow-cast', status: 'preview', canOpen: true })
    await t.mutation(internal.platform.setGameStatusInternal, { slug: 'slow-cast', status: 'live' })
    expect((await player().query(api.platform.list, {})).games).toContainEqual({ slug: 'slow-cast', status: 'live', canOpen: true })
  })

  it('refuses the switch to non-admins and audits it for admins', async () => {
    await expect(player().mutation(api.platform.setGameStatus, { slug: 'slow-cast', status: 'live', reasonCode: 'nope' })).rejects.toThrow()
    expect(await admin().mutation(api.platform.setGameStatus, { slug: 'slow-cast', status: 'preview', reasonCode: 'art_ready' })).toEqual({ from: 'hidden', to: 'preview' })
    const events = await t.run(async (ctx) => await ctx.db.query('adminAuditEvents').collect())
    expect(events).toMatchObject([{ action: 'platform.setGameStatus', targetRef: 'slow-cast', reasonCode: 'art_ready', outcome: 'hidden -> preview' }])
  })
})
