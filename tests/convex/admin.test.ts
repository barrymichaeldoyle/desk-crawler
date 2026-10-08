// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '@trmnl-games/backend/api'
import schema from '../../apps/backend/convex/schema'
import { seedHero, seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../apps/backend/convex/**/*.ts')

describe('owner-run moderation (D23)', () => {
  let t: T
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.UTC(2026, 9, 3, 10, 0))
    vi.stubEnv('ADMIN_TOKEN_IDENTIFIERS', 'issuer|Admin')
    t = convexTest(schema, modules)
    await seedWorld(t)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('refuses non-admins and audits admin name repair without touching progress', async () => {
    const heroId = await seedHero(t, { lifetimeXp: 300, level: 3, xp: 99 }, 'Rude')
    const user = await t.run(async (ctx) => (await ctx.db.get(heroId))!.userId)
    await expect(t.withIdentity({ issuer: 'issuer', subject: 'Rude' }).mutation(api.admin.repairPublicNames, { userId: user, reasonCode: 'x' })).rejects.toThrow()

    const admin = t.withIdentity({ issuer: 'issuer', subject: 'Admin' })
    await admin.mutation(api.admin.repairPublicNames, { userId: user, reasonCode: 'offensive_name' })
    const [u, h, events] = await t.run(async (ctx) => [await ctx.db.get(user), await ctx.db.get(heroId), await ctx.db.query('adminAuditEvents').collect()])
    expect(u).toMatchObject({ publicNameVersion: 2, nameRepairRequired: true })
    expect(u?.publicAlias).toMatch(/^Adventurer-/)
    expect(h).toMatchObject({ name: 'Hero', lifetimeXp: 300, level: 3, xp: 99 })
    expect(events).toHaveLength(1)

    const owner = t.withIdentity({ issuer: 'issuer', subject: 'Rude' })
    await owner.mutation(api.users.replacePublicNames, { operationId: 'names-0001', publicAlias: 'Polite', heroName: 'Gentle' })
    expect(await t.run(async (ctx) => await ctx.db.get(user))).toMatchObject({ publicAlias: 'Polite', publicNameVersion: 3, nameRepairRequired: false })
    await expect(owner.mutation(api.users.replacePublicNames, { operationId: 'names-0002', publicAlias: 'Again', heroName: 'Again' })).rejects.toThrow()
  })

  it('suspension blocks commands until restored', async () => {
    const heroId = await seedHero(t, {}, 'Spam')
    const user = await t.run(async (ctx) => (await ctx.db.get(heroId))!.userId)
    const admin = t.withIdentity({ issuer: 'issuer', subject: 'Admin' })
    await admin.mutation(api.admin.setSuspended, { userId: user, suspended: true, reasonCode: 'abuse' })
    const player = t.withIdentity({ issuer: 'issuer', subject: 'Spam' })
    await expect(player.mutation(api.heroes.pause, { operationId: 'pause-0009' })).rejects.toThrow()
    await admin.mutation(api.admin.setSuspended, { userId: user, suspended: false, reasonCode: 'appeal_ok' })
    await player.mutation(api.heroes.pause, { operationId: 'pause-0010' })
  })

  it('reports v1.1 engagement across active heroes regardless of analytics consent', async () => {
    const chooser = await seedHero(t, { stance: 'bold', potionCap: 30 })
    await t.run(async (ctx) => {
      const hero = (await ctx.db.get(chooser))!
      await ctx.db.patch(chooser, { counters: { ...hero.counters, choicesMade: 2, choicesDefaulted: 1, stanceChanges: 3, merchantVisits: 2, purchases: 1 }, companionVisitBaseline: { at: Date.now(), level: 1, lifetimeXp: 0, logSequence: 1, counters: hero.counters } })
      await ctx.db.patch(hero.userId, { analyticsConsent: false })
    })
    const passive = await seedHero(t, { choice: { eventId: 'e', offeredAtTick: 1, expiresAtTick: 97, biomeTier: 1 } })
    await t.run(async (ctx) => await ctx.db.patch(passive, { counters: { ...(await ctx.db.get(passive))!.counters, choicesDefaulted: 4 } }))
    await seedHero(t, { activationState: 'pending_trmnl' })

    const stats = await t.query(internal.admin.engagement, {})
    expect(stats).toMatchObject({
      truncated: false,
      activeHeroes: 2,
      companionVisits: { within1Day: 1, within7Days: 1, never: 1 },
      stances: { bold: 1, balanced: 1 },
      stanceChanges: { total: 3, heroes: 1 },
      choices: { made: 2, defaulted: 5, heroesWhoChose: 1, pending: 1 },
      merchant: { visits: 2, purchases: 1, heroesMet: 1, heroesBought: 1, open: 0 },
      potionCap: { 30: 1, default: 1 },
      analyticsConsent: { declined: 1, unset: 2 },
    })
  })
})
