// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../convex/_generated/api'
import schema from '../../convex/schema'
import { seedHero, seedWorld, type T } from './helpers'

const modules = import.meta.glob('../../convex/**/*.ts')

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
})
