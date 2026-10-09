// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import { seedHero, seedWorld, type T } from './helpers'
import { seedAngler } from './slowCastHelpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')

describe('shared public profile (D115, S5)', () => {
  let t: T
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.UTC(2026, 10, 2, 6, 5, 3))
    t = convexTest(schema, modules)
    await seedWorld(t)
    await t.mutation(internal.platform.setGameStatusInternal, { slug: 'slow-cast', status: 'live' })
  })
  afterEach(() => vi.useRealTimers())

  it('reads the same not-found for private and missing names', async () => {
    await seedHero(t, {}, 'Quiet')
    expect(await t.query(api.platformProfile.view, { alias: 'Quiet' })).toBeNull()
    expect(await t.query(api.platformProfile.view, { alias: 'Nobody' })).toBeNull()
  })

  it('lists each opted-in game and the Regular badge for two active games', async () => {
    await seedHero(t, { publicProfile: true }, 'Both')
    await seedAngler(t, { publicProfile: true }, 'Both')
    const profile = await t.query(api.platformProfile.view, { alias: 'both' })
    expect(profile).toMatchObject({ alias: 'Both', games: [{ slug: 'desk-crawler', name: 'Baz' }, { slug: 'slow-cast', level: 1, species: 0 }], platform: [{ id: 'regular_1', name: 'Regular', share: null }] })
  })

  it('keeps a game that is not live off the profile for everyone but admins', async () => {
    await t.mutation(internal.platform.setGameStatusInternal, { slug: 'slow-cast', status: 'hidden' })
    await seedHero(t, { publicProfile: true }, 'Both')
    await seedAngler(t, { publicProfile: true }, 'Both')
    expect((await t.query(api.platformProfile.view, { alias: 'Both' })).games.map((g: { slug: string }) => g.slug)).toEqual(['desk-crawler'])
  })

  it('tallies platform rarity daily over players with an active game', async () => {
    await seedHero(t, { publicProfile: true }, 'Both')
    await seedAngler(t, {}, 'Both')
    await seedHero(t, {}, 'Solo')
    await t.mutation(internal.platformProfile.tally, {})
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    const current = await t.run(async (ctx) => await ctx.db.query('platformStats').collect())
    expect(current).toMatchObject([{ key: 'current', totalPlayers: 2, counts: { regular_1: 1 } }])
    expect((await t.query(api.platformProfile.view, { alias: 'Both' })).platform[0]).toMatchObject({ id: 'regular_1', share: 50 })
  })
})
