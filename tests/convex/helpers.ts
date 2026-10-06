import { sha256Hex } from '../../apps/backend/convex/lib/hash'
import type { convexTest } from 'convex-test'
import { vi } from 'vitest'
import { internal } from '@trmnl-games/backend/api'
import type { Id } from '@trmnl-games/backend/data-model'
import { contentV1 } from '@trmnl-games/desk-crawler/content/v1'
import { starterHero, starterKit } from '@trmnl-games/desk-crawler/sim/core/starter'

export type T = ReturnType<typeof convexTest>

let counter = 0

export async function seedWorld(t: T, overrides: Record<string, unknown> = {}): Promise<void> {
  await t.run(async (ctx) => {
    await ctx.db.insert('worldState', {
      key: 'world',
      currentTick: 0,
      activeContentVersion: 'v1',
      activeSimulationVersion: 1,
      worldSeed: 'seed',
      ticksPaused: false,
      maintenanceMode: false,
      createdAt: Date.now() - 3_600_000,
      schemaVersion: 1,
      ...overrides,
    })
  })
}

export async function seedHero(t: T, overrides: Record<string, unknown> = {}, alias = `Hero${++counter}`): Promise<Id<'heroes'>> {
  return await t.run(async (ctx) => {
    const now = Date.now() - 60_000
    const userId = await ctx.db.insert('users', {
      tokenIdentifier: `issuer|${alias}`,
      publicAlias: alias,
      normalizedAlias: alias.toLowerCase(),
      timezone: 'UTC',
      state: 'active',
      createdAt: now,
      publicNameVersion: 1,
    })
    const base = starterHero('x', contentV1, 0)
    const heroId = await ctx.db.insert('heroes', {
      userId,
      name: 'Baz',
      class: 'warrior',
      createdAt: now - counter,
      isActive: true,
      schemaVersion: 1,
      activationState: 'active',
      activatedAt: now - counter,
      level: base.level,
      xp: base.xp,
      lifetimeXp: base.lifetimeXp,
      hp: base.hp,
      gold: base.gold,
      lastLevelUpTick: 0,
      status: 'exploring',
      biomeId: base.biomeId,
      bagCapacity: base.bagCapacity,
      eligibleFromTick: 1,
      lastTick: 0,
      lastProgressTick: 0,
      logSequence: 1,
      simulationState: 'healthy',
      counters: base.counters,
      scoreHourXp: 0,
      ...overrides,
    })
    const kit = starterKit(contentV1)
    const weaponId = await ctx.db.insert('items', { ...kit.weapon, heroId, createdAt: now })
    const armorId = await ctx.db.insert('items', { ...kit.armor, heroId, createdAt: now })
    await ctx.db.insert('items', { ...kit.potions, heroId, createdAt: now })
    await ctx.db.patch(heroId, { weaponId, armorId })
    await ctx.db.patch(userId, { activeHeroId: heroId })
    return heroId
  })
}

export async function runTick(t: T) {
  const runId = await t.mutation(internal.sim.runs.tick.startTick, {})
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  return runId
}

export const world = async (t: T) => await t.run(async (ctx) => await ctx.db.query('worldState').first())

/** Existing purge fixtures begin after successful email delivery. */
export async function seedDeletionConfirmation(t: T, subject: string): Promise<string> {
  const token = sha256Hex(`deletion-confirmation:${subject}`)
  await t.run(async ctx => {
    await ctx.db.insert('accountDeletionConfirmations', {
      tokenIdentifier: `issuer|${subject}`, tokenHash: sha256Hex(token),
      email: 'owner@example.com', emailId: 'email_fixture',
      from: 'TRMNL Games <alerts@trmnlgames.com>', origin: 'https://trmnlgames.com',
      state: 'sent', attempts: 1, createdAt: Date.now(), expiresAt: Date.now() + 30 * 60_000,
    })
  })
  return token
}
