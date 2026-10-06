import { currentHero, gameProfile, isDeskCrawler, setCurrentHero, DESK_CRAWLER } from './lib/gameProfile'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import { action, internalMutation, type MutationCtx } from './_generated/server'

import { starterHero, starterKit } from '@trmnl-games/desk-crawler/sim/core/starter'
import { appError } from './lib/errors'
import { sha256Hex } from './lib/hash'
import { ALIAS_RULE, HERO_NAME_RULE, normalizeAlias, validateName, validateTimezone } from './lib/names'
import { getOrCreateWorld, worldContent } from './world'
import { assertNotRevoked, identityHash } from './deletion'

/** Install attempts stay valid for 20 minutes (data-model.md). */
export const INSTALL_ATTEMPT_MS = 20 * 60 * 1000
const TOKEN_ENDPOINT = 'https://trmnl.com/oauth/token'

const linkResult = v.object({
  activationState: v.union(v.literal('pending_trmnl'), v.literal('active')),
  heroCreated: v.boolean(),
})

/**
 * Clerk-authenticated install completion. Exchanges the TRMNL installation code
 * server-side (repeat exchanges return the same token), then links the token
 * hash, records a bounded install attempt and prepares the pending hero in one
 * transaction. The raw token never leaves this action.
 */
export const completeInstall = action({
  args: {
    gameSlug: v.optional(v.literal('desk-crawler')),
    code: v.string(),
    publicAlias: v.optional(v.string()),
    heroName: v.optional(v.string()),
    timezone: v.string(),
  },
  returns: linkResult,
  handler: async (ctx, args): Promise<{ activationState: 'pending_trmnl' | 'active'; heroCreated: boolean }> => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) throw appError('UNAUTHENTICATED', 'Sign in to connect TRMNL.')
    if (args.code.length === 0 || args.code.length > 512 || !/^[\w.~-]+$/.test(args.code)) {
      throw appError('INSTALL_INVALID', 'That installation link is not valid. Start again from TRMNL.')
    }
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ code: args.code }),
    })
    let body: unknown = null
    try {
      body = await response.json()
    } catch {
      body = null
    }
    // An invalid code can still answer 200 with an error body, so require a token explicitly.
    const token = typeof body === 'object' && body !== null && 'access_token' in body ? (body as { access_token: unknown }).access_token : null
    if (!response.ok || typeof token !== 'string' || token.length < 8) {
      throw appError('INSTALL_INVALID', 'TRMNL did not accept that installation. Start again from TRMNL.')
    }
    return await ctx.runMutation(internal.trmnl.linkInstall, {
      gameSlug: args.gameSlug ?? DESK_CRAWLER,
      tokenIdentifier: identity.tokenIdentifier,
      tokenHash: sha256Hex(token),
      ...(args.publicAlias === undefined ? {} : { publicAlias: args.publicAlias }),
      ...(args.heroName === undefined ? {} : { heroName: args.heroName }),
      timezone: args.timezone,
    })
  },
})

export const linkInstall = internalMutation({
  args: {
    gameSlug: v.optional(v.literal('desk-crawler')),
    tokenIdentifier: v.string(),
    tokenHash: v.string(),
    publicAlias: v.optional(v.string()),
    heroName: v.optional(v.string()),
    timezone: v.string(),
  },
  returns: linkResult,
  handler: async (ctx, args) => {
    const now = Date.now()
    // Deleted accounts: replayed Clerk tokens and old TRMNL codes/tokens never regain authority (D22/V09).
    assertNotRevoked(await ctx.db.query('revokedAuthIdentities').withIndex('by_identityHash', (q) => q.eq('identityHash', identityHash(args.tokenIdentifier))).first())
    if (await ctx.db.query('revokedTrmnlCredentials').withIndex('by_tokenHash', (q) => q.eq('tokenHash', args.tokenHash)).first()) {
      throw appError('CONNECTION_UNAVAILABLE', 'This TRMNL installation belonged to a deleted account. Install Desk Crawler again from TRMNL.')
    }
    let user = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', args.tokenIdentifier))
      .unique()
    if (user === null) {
      const alias = validateName(args.publicAlias ?? '', ALIAS_RULE)
      if (!alias.ok) throw appError('INVALID_INPUT', `Public name: ${alias.reason}`)
      const normalizedAlias = normalizeAlias(alias.value)
      const taken = await ctx.db
        .query('users')
        .withIndex('by_normalizedAlias', (q) => q.eq('normalizedAlias', normalizedAlias))
        .first()
      if (taken) throw appError('ALIAS_TAKEN', 'That public name is taken. Try another.')
      const userId = await ctx.db.insert('users', {
        tokenIdentifier: args.tokenIdentifier,
        publicAlias: alias.value,
        normalizedAlias,
        timezone: validateTimezone(args.timezone),
        state: 'active',
        createdAt: now,
        publicNameVersion: 1,
      })
      user = (await ctx.db.get(userId))!
    }
    if (user.state !== 'active') throw appError('ACCOUNT_UNAVAILABLE', 'This account is not available.')
    if ((await gameProfile(ctx, user._id))?.state === 'deleting') throw appError('GAME_UNAVAILABLE', 'Desk Crawler progress is being deleted. Try again shortly.')

    // A known token can never be reassigned to another owner.
    let grant = await ctx.db
      .query('trmnlGrants')
      .withIndex('by_tokenHash', (q) => q.eq('tokenHash', args.tokenHash))
      .unique()
    if (grant && (!isDeskCrawler(grant) || grant.userId !== user._id)) throw appError('CONNECTION_CONFLICT', 'This TRMNL installation is linked to another account.')
    if (grant && grant.state !== 'active') throw appError('CONNECTION_UNAVAILABLE', 'This TRMNL connection was revoked. Install again from TRMNL.')
    if (grant === null) {
      const grantId = await ctx.db.insert('trmnlGrants', { gameSlug: DESK_CRAWLER, userId: user._id, tokenHash: args.tokenHash, state: 'active', createdAt: now, lastVerifiedAt: now })
      grant = (await ctx.db.get(grantId))!
    } else {
      await ctx.db.patch(grant._id, { lastVerifiedAt: now })
    }

    // One pending attempt per grant: supersede older ones.
    const pending = await ctx.db
      .query('trmnlInstallAttempts')
      .withIndex('by_grantId_and_state', (q) => q.eq('grantId', grant._id).eq('state', 'pending'))
      .take(10)
    for (const attempt of pending) await ctx.db.patch(attempt._id, { state: 'expired' })
    await ctx.db.insert('trmnlInstallAttempts', { gameSlug: DESK_CRAWLER, userId: user._id, grantId: grant._id, state: 'pending', createdAt: now, expiresAt: now + INSTALL_ATTEMPT_MS })

    const existing = await currentHero(ctx, user)
    if (existing) return { activationState: existing.activationState, heroCreated: false }

    const heroName = validateName(args.heroName ?? '', HERO_NAME_RULE)
    if (!heroName.ok) throw appError('INVALID_INPUT', `Hero name: ${heroName.reason}`)
    await prepareHero(ctx, user, heroName.value, now)
    return { activationState: 'pending_trmnl' as const, heroCreated: true }
  },
})

/** Pending Warrior + starter kit + welcome log. Initialization, not an earned reward; no rank or simulation until activation. */
async function prepareHero(ctx: MutationCtx, user: Doc<'users'>, name: string, now: number): Promise<Id<'heroes'>> {
  const world = await getOrCreateWorld(ctx)
  // The world's pinned catalog decides the starting bag, so a hero never starts on rules its ticks do not use.
  const content = worldContent(world)
  const base = starterHero('pending', content, world.currentTick)
  const heroId = await ctx.db.insert('heroes', {
    userId: user._id,
    name,
    class: 'warrior',
    createdAt: now,
    isActive: true,
    schemaVersion: 1,
    activationState: 'pending_trmnl',
    level: base.level,
    xp: base.xp,
    lifetimeXp: base.lifetimeXp,
    hp: base.hp,
    gold: base.gold,
    lastLevelUpTick: world.currentTick,
    status: base.status,
    biomeId: base.biomeId,
    bagCapacity: base.bagCapacity,
    eligibleFromTick: world.currentTick + 1,
    lastTick: world.currentTick,
    lastProgressTick: world.currentTick,
    logSequence: 1,
    simulationState: 'healthy',
    counters: base.counters,
    scoreHourXp: 0,
  })
  const kit = starterKit(content)
  const weaponId = await ctx.db.insert('items', { ...kit.weapon, heroId, createdAt: now })
  const armorId = await ctx.db.insert('items', { ...kit.armor, heroId, createdAt: now })
  await ctx.db.insert('items', { ...kit.potions, heroId, createdAt: now })
  await ctx.db.patch(heroId, { weaponId, armorId })
  await setCurrentHero(ctx, user, heroId)
  await ctx.db.insert('tickLogs', {
    heroId,
    source: 'lifecycle',
    sequence: 1,
    at: now,
    kind: 'system',
    summary: 'Your shift begins in the [[Office Cubicles]].',
    detail: { v: 1, operation: 'hero_created' },
    deltas: { xpEarned: 0, gold: 0, hp: 0 },
  })
  return heroId
}

const confirmResult = v.object({
  ok: v.boolean(),
  reason: v.union(v.literal('confirmed'), v.literal('already_confirmed'), v.literal('unknown_grant'), v.literal('tombstoned'), v.literal('foreign_instance'), v.literal('no_pending_attempt')),
})

/**
 * Saved-instance confirmation from the authenticated success callback, or the
 * first authenticated screen request when that callback was lost (V06 gate).
 * Creates the instance only under a current pending attempt for this grant,
 * never revives a tombstone, and activates an already prepared hero once.
 */
export const confirmInstance = internalMutation({
  args: {
    gameSlug: v.optional(v.literal('desk-crawler')),
    tokenHash: v.string(),
    uuid: v.string(),
    pluginSettingId: v.optional(v.string()),
    confirmedBy: v.union(v.literal('success_callback'), v.literal('screen_request')),
  },
  returns: confirmResult,
  handler: async (ctx, args) => {
    const now = Date.now()
    const grant = await ctx.db
      .query('trmnlGrants')
      .withIndex('by_tokenHash', (q) => q.eq('tokenHash', args.tokenHash))
      .unique()
    if (grant === null || !isDeskCrawler(grant) || grant.state !== 'active') return { ok: false, reason: 'unknown_grant' as const }

    const owner = await ctx.db.get(grant.userId)
    if (!owner || owner.state !== 'active' || (await gameProfile(ctx, owner._id))?.state === 'deleting') return { ok: false, reason: 'unknown_grant' as const }

    const instance = await ctx.db
      .query('trmnlInstances')
      .withIndex('by_uuid', (q) => q.eq('uuid', args.uuid))
      .unique()
    if (instance) {
      if (!isDeskCrawler(instance) || instance.grantId !== grant._id) return { ok: false, reason: 'foreign_instance' as const }
      if (instance.state !== 'active') return { ok: false, reason: 'tombstoned' as const }
      if (args.pluginSettingId && !instance.pluginSettingId) await ctx.db.patch(instance._id, { pluginSettingId: args.pluginSettingId })
      return { ok: true, reason: 'already_confirmed' as const }
    }

    const attempt = (
      await ctx.db
        .query('trmnlInstallAttempts')
        .withIndex('by_grantId_and_state', (q) => q.eq('grantId', grant._id).eq('state', 'pending'))
        .take(5)
    ).find((candidate) => isDeskCrawler(candidate) && candidate.expiresAt > now)
    if (attempt === undefined) return { ok: false, reason: 'no_pending_attempt' as const }

    await ctx.db.insert('trmnlInstances', {
      gameSlug: DESK_CRAWLER,
      grantId: grant._id,
      userId: grant.userId,
      uuid: args.uuid,
      ...(args.pluginSettingId ? { pluginSettingId: args.pluginSettingId } : {}),
      state: 'active',
      confirmedBy: args.confirmedBy,
      createdAt: now,
    })
    await ctx.db.patch(attempt._id, { state: 'completed', completedUuid: args.uuid })
    await activateForConfirmedInstallation(ctx, grant.userId, now)
    return { ok: true, reason: 'confirmed' as const }
  },
})

/** First activation baseline (data-model.md): next world tick, no pre-activation catch-up. Never resets an active hero. */
async function activateForConfirmedInstallation(ctx: MutationCtx, userId: Id<'users'>, now: number): Promise<void> {
  const user = await ctx.db.get(userId)
  const hero = await currentHero(ctx, user)
  if (hero === null || hero.activationState === 'active') return
  const world = await getOrCreateWorld(ctx)
  await ctx.db.patch(hero._id, {
    activationState: 'active',
    activatedAt: now,
    eligibleFromTick: world.currentTick + 1,
    lastTick: world.currentTick,
    lastProgressTick: world.currentTick,
    lastLevelUpTick: world.currentTick,
  })
}

/** Uninstall webhook: tombstone one instance; the hero and other instances are untouched. */
export const uninstallInstance = internalMutation({
  args: { gameSlug: v.optional(v.literal('desk-crawler')), tokenHash: v.string(), uuid: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const grant = await ctx.db
      .query('trmnlGrants')
      .withIndex('by_tokenHash', (q) => q.eq('tokenHash', args.tokenHash))
      .unique()
    if (grant === null || !isDeskCrawler(grant)) return false
    const instance = await ctx.db
      .query('trmnlInstances')
      .withIndex('by_uuid', (q) => q.eq('uuid', args.uuid))
      .unique()
    if (instance === null || !isDeskCrawler(instance) || instance.grantId !== grant._id) return false
    if (instance.state === 'active') await ctx.db.patch(instance._id, { state: 'uninstalled' })
    return true
  },
})
