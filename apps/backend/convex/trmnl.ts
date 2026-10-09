import { currentHero, gameProfile, isDeskCrawler, setCurrentHero, DESK_CRAWLER } from './lib/gameProfile'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import { action, internalMutation, mutation, query, type MutationCtx } from './_generated/server'

import { starterHero, starterKit } from '@trmnl-games/desk-crawler/sim/core/starter'
import { appError } from './lib/errors'
import { sha256Hex } from './lib/hash'
import { ALIAS_RULE, HERO_NAME_RULE, normalizeAlias, validateName, validateTimezone } from './lib/names'
import { getOrCreateWorld, worldContent } from './world'
import { assertNotRevoked, identityHash } from './deletion'
import { runIntent } from './lib/intent'
import { MANAGEMENT_PROOF_MS, verifyManagementJwt } from './lib/trmnlManagement'

/** Install attempts stay valid for 20 minutes (data-model.md). */
export const INSTALL_ATTEMPT_MS = 20 * 60 * 1000
const TOKEN_ENDPOINT = 'https://trmnl.com/oauth/token'

const linkResult = v.object({
  activationState: v.union(v.literal('pending_trmnl'), v.literal('active')),
  heroCreated: v.boolean(),
  reconnectionRequired: v.optional(v.literal(true)),
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
    analyticsConsent: v.optional(v.boolean()),
  },
  returns: linkResult,
  handler: async (ctx, args): Promise<{ activationState: 'pending_trmnl' | 'active'; heroCreated: boolean; reconnectionRequired?: true }> => {
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
      allowReconnection: true,
      ...(args.publicAlias === undefined ? {} : { publicAlias: args.publicAlias }),
      ...(args.heroName === undefined ? {} : { heroName: args.heroName }),
      timezone: args.timezone,
      ...(args.analyticsConsent === undefined ? {} : { analyticsConsent: args.analyticsConsent }),
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
    analyticsConsent: v.optional(v.boolean()),
    allowReconnection: v.optional(v.boolean()),
  },
  returns: linkResult,
  handler: async (ctx, args) => {
    const now = Date.now()
    // Deleted accounts: replayed Clerk tokens and old TRMNL codes/tokens never regain authority (D22/V09).
    assertNotRevoked(await ctx.db.query('revokedAuthIdentities').withIndex('by_identityHash', (q) => q.eq('identityHash', identityHash(args.tokenIdentifier))).first())
    if (await ctx.db.query('revokedTrmnlCredentials').withIndex('by_tokenHash', (q) => q.eq('tokenHash', args.tokenHash)).first()) {
      if (!args.allowReconnection) throw appError('CONNECTION_UNAVAILABLE', 'This connection needs fresh verification from TRMNL. Start from Install, then Save and open Configure.')
      await reserveReconnection(ctx, args, now)
      return { activationState: 'pending_trmnl' as const, heroCreated: false, reconnectionRequired: true as const }
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
    if (args.analyticsConsent !== undefined) await ctx.db.patch(user._id, { analyticsConsent: args.analyticsConsent })
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
    if (args.analyticsConsent === true || (args.analyticsConsent === undefined && user.analyticsConsent === true)) await ctx.scheduler.runAfter(0, internal.analytics.captureActivation, { userId: user._id, event: 'installation connected' })

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
  reason: v.union(v.literal('confirmed'), v.literal('already_confirmed'), v.literal('unknown_grant'), v.literal('tombstoned'), v.literal('foreign_instance'), v.literal('no_pending_attempt'), v.literal('reauthorization_required')),
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
    const instance = await ctx.db
      .query('trmnlInstances')
      .withIndex('by_uuid', (q) => q.eq('uuid', args.uuid))
      .unique()
    // A revoked token never authorizes a new UUID through callbacks or polling.
    const revoked = await ctx.db.query('revokedTrmnlCredentials').withIndex('by_tokenHash', q => q.eq('tokenHash', args.tokenHash)).first()
    if (!instance && revoked) {
      const pending = await ctx.db.query('trmnlReconnectAttempts').withIndex('by_tokenHash_and_expiresAt', q => q.eq('tokenHash', args.tokenHash).gt('expiresAt', now)).first()
      return { ok: false, reason: pending ? 'reauthorization_required' as const : 'unknown_grant' as const }
    }
    const grant = instance ? await ctx.db.get(instance.grantId) : await ctx.db.query('trmnlGrants').withIndex('by_tokenHash', q => q.eq('tokenHash', args.tokenHash)).unique()
    if (!grant || !isDeskCrawler(grant) || grant.state !== 'active') return { ok: false, reason: 'unknown_grant' as const }
    if (grant.tokenHash !== args.tokenHash || (grant.authorizedUuid && grant.authorizedUuid !== args.uuid)) return { ok: false, reason: 'foreign_instance' as const }
    const owner = await ctx.db.get(grant.userId)
    if (!owner || owner.state !== 'active' || (await gameProfile(ctx, owner._id))?.state === 'deleting') return { ok: false, reason: 'unknown_grant' as const }
    if (instance) {
      if (!isDeskCrawler(instance) || instance.grantId !== grant._id || instance.userId !== grant.userId) return { ok: false, reason: 'foreign_instance' as const }
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
  if (user?.analyticsConsent === true) await ctx.scheduler.runAfter(0, internal.analytics.captureActivation, { userId })
}

/** Uninstall webhook: tombstone one instance; the hero and other instances are untouched. */
/**
 * P31: store the owner's TRMNL UTC offset for the stand-up. The screen route calls this only when the payload query
 * saw a different value, and it rechecks, so a burst of requests writes once.
 */
export const recordUtcOffset = internalMutation({
  args: { userId: v.id('users'), utcOffset: v.number() },
  returns: v.null(),
  handler: async (ctx, { userId, utcOffset }) => {
    const user = await ctx.db.get(userId)
    if (!Number.isSafeInteger(utcOffset) || Math.abs(utcOffset) > 14 * 3600) return null
    if (user === null || user.state !== 'active' || user.trmnlUtcOffset === utcOffset) return null
    await ctx.db.patch(userId, { trmnlUtcOffset: utcOffset })
    return null
  },
})

export const uninstallInstance = internalMutation({
  args: { gameSlug: v.optional(v.literal('desk-crawler')), tokenHash: v.string(), uuid: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const instance = await ctx.db
      .query('trmnlInstances')
      .withIndex('by_uuid', (q) => q.eq('uuid', args.uuid))
      .unique()
    if (!instance || !isDeskCrawler(instance)) return false
    const grant = await ctx.db.get(instance.grantId)
    if (!grant || !isDeskCrawler(grant) || grant.tokenHash !== args.tokenHash || grant.userId !== instance.userId || (grant.authorizedUuid && grant.authorizedUuid !== args.uuid)) return false
    if (instance.state === 'active') await ctx.db.patch(instance._id, { state: 'uninstalled' })
    return true
  },
})

/** A replayed code can reserve a draft only. No account, hero or grant is created. */
async function reserveReconnection(ctx: MutationCtx, args: { tokenIdentifier: string; tokenHash: string; publicAlias?: string; heroName?: string; timezone: string; analyticsConsent?: boolean }, now: number) {
  const user = await ctx.db.query('users').withIndex('by_tokenIdentifier', q => q.eq('tokenIdentifier', args.tokenIdentifier)).unique()
  if (user && user.state !== 'active') throw appError('ACCOUNT_UNAVAILABLE', 'This account is not available.')
  if (user && (await gameProfile(ctx, user._id))?.state === 'deleting') throw appError('GAME_UNAVAILABLE', 'Desk Crawler progress is being deleted. Try again shortly.')
  const hero = user ? await currentHero(ctx, user) : null
  const alias = validateName(user?.publicAlias ?? args.publicAlias ?? '', ALIAS_RULE)
  const heroName = validateName(hero?.name ?? args.heroName ?? '', HERO_NAME_RULE)
  if (!alias.ok) throw appError('INVALID_INPUT', `Public name: ${alias.reason}`)
  if (!heroName.ok) throw appError('INVALID_INPUT', `Hero name: ${heroName.reason}`)
  const current = await ctx.db.query('trmnlReconnectAttempts').withIndex('by_tokenIdentifier', q => q.eq('tokenIdentifier', args.tokenIdentifier)).unique()
  const draft = { publicAlias: alias.value, heroName: heroName.value, timezone: validateTimezone(args.timezone), ...(args.analyticsConsent === undefined ? {} : { analyticsConsent: args.analyticsConsent }) }
  if (current && current.tokenHash === args.tokenHash && current.expiresAt > now) {
    await ctx.db.patch(current._id, draft)
    return
  }
  if (current) await ctx.db.delete(current._id)
  await ctx.db.insert('trmnlReconnectAttempts', { tokenIdentifier: args.tokenIdentifier, tokenHash: args.tokenHash, ...draft, createdAt: now, expiresAt: now + INSTALL_ATTEMPT_MS })
}

const reconnectionView = v.object({ id: v.id('trmnlReconnectAttempts'), publicAlias: v.string(), heroName: v.string(), expiresAt: v.number(), proofExpiresAt: v.union(v.number(), v.null()), verifiedUuid: v.union(v.string(), v.null()), verified: v.boolean() })

/** Own draft only; no credential hash or proof token reaches the client. */
export const reconnectionStatus = query({
  args: {}, returns: v.union(v.null(), reconnectionView),
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    if (await ctx.db.query('revokedAuthIdentities').withIndex('by_identityHash', q => q.eq('identityHash', identityHash(identity.tokenIdentifier))).first()) return null
    const row = await ctx.db.query('trmnlReconnectAttempts').withIndex('by_tokenIdentifier', q => q.eq('tokenIdentifier', identity.tokenIdentifier)).unique()
    // Expiry is checked in verification/confirmation mutations, not in the reactive query.
    return row ? { id: row._id, publicAlias: row.publicAlias, heroName: row.heroName, expiresAt: row.expiresAt, proofExpiresAt: row.proofExpiresAt ?? null, verifiedUuid: row.verifiedUuid ?? null, verified: Boolean(row.verifiedUuid && row.proofExpiresAt) } : null
  },
})

/** A freshly signed TRMNL management JWT is the independent ownership proof. */
export const verifyReconnection = action({
  args: { attemptId: v.id('trmnlReconnectAttempts'), uuid: v.string(), jwt: v.string() },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw appError('UNAUTHENTICATED', 'Sign in to reconnect TRMNL.')
    const clientId = process.env.TRMNL_CLIENT_ID
    if (!clientId) throw appError('CONNECTION_UNAVAILABLE', 'TRMNL verification is unavailable. Please contact support.')
    let issuedAt: number
    try { issuedAt = await verifyManagementJwt(args.jwt, args.uuid, clientId, Date.now()) }
    catch { throw appError('INSTALL_INVALID', 'Open Configure again from your TRMNL plugin settings to verify this installation.') }
    await ctx.runMutation(internal.trmnl.recordReconnectionProof, { attemptId: args.attemptId, tokenIdentifier: identity.tokenIdentifier, uuid: args.uuid, issuedAt })
    return null
  },
})

export const recordReconnectionProof = internalMutation({
  args: { attemptId: v.id('trmnlReconnectAttempts'), tokenIdentifier: v.string(), uuid: v.string(), issuedAt: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now()
    assertNotRevoked(await ctx.db.query('revokedAuthIdentities').withIndex('by_identityHash', q => q.eq('identityHash', identityHash(args.tokenIdentifier))).first())
    const attempt = await ctx.db.get(args.attemptId)
    if (!attempt || attempt.tokenIdentifier !== args.tokenIdentifier || attempt.expiresAt <= now) throw appError('INSTALL_INVALID', 'This reconnection expired. Start again from Install in TRMNL.')
    // A Configure link obtained before the explicit reconnect request cannot be replayed.
    if (args.issuedAt <= Math.floor(attempt.createdAt / 1000) * 1000) throw appError('INSTALL_INVALID', 'Open a fresh Configure link from your TRMNL plugin settings.')
    const user = await ctx.db.query('users').withIndex('by_tokenIdentifier', q => q.eq('tokenIdentifier', args.tokenIdentifier)).unique()
    if (user && (user.state !== 'active' || (await gameProfile(ctx, user._id))?.state === 'deleting')) throw appError('ACCOUNT_UNAVAILABLE', 'This account is not available.')
    const existing = await ctx.db.query('trmnlInstances').withIndex('by_uuid', q => q.eq('uuid', args.uuid)).unique()
    if (existing && existing.userId !== user?._id) throw appError('CONNECTION_CONFLICT', 'This installation is connected to another TRMNL Games account.')
    await ctx.db.patch(attempt._id, { verifiedUuid: args.uuid, verifiedAt: now, proofExpiresAt: Math.min(attempt.expiresAt, now + MANAGEMENT_PROOF_MS) })
    return null
  },
})

/** The explicit same-account confirmation is the only point that creates/relinks game data. */
export const completeReconnection = mutation({
  args: { operationId: v.string(), attemptId: v.id('trmnlReconnectAttempts'), confirm: v.literal('CONNECT') },
  returns: v.object({ operationId: v.string(), changed: v.boolean() }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw appError('UNAUTHENTICATED', 'Sign in to reconnect TRMNL.')
    assertNotRevoked(await ctx.db.query('revokedAuthIdentities').withIndex('by_identityHash', q => q.eq('identityHash', identityHash(identity.tokenIdentifier))).first())
    const now = Date.now()
    const pending = await ctx.db.get(args.attemptId)
    let user = await ctx.db.query('users').withIndex('by_tokenIdentifier', q => q.eq('tokenIdentifier', identity.tokenIdentifier)).unique()
    if (!user) {
      if (!pending || pending.tokenIdentifier !== identity.tokenIdentifier || !pending.verifiedUuid || pending.expiresAt <= now || !pending.proofExpiresAt || pending.proofExpiresAt <= now) throw appError('INSTALL_INVALID', 'Verify this installation through Configure in TRMNL before connecting.')
      const alias = validateName(pending.publicAlias, ALIAS_RULE)
      if (!alias.ok) throw appError('INVALID_INPUT', `Public name: ${alias.reason}`)
      const taken = await ctx.db.query('users').withIndex('by_normalizedAlias', q => q.eq('normalizedAlias', normalizeAlias(alias.value))).first()
      if (taken) throw appError('ALIAS_TAKEN', 'That public name is taken. Start Install again and choose another name.')
      const id = await ctx.db.insert('users', { tokenIdentifier: identity.tokenIdentifier, publicAlias: alias.value, normalizedAlias: normalizeAlias(alias.value), timezone: pending.timezone, state: 'active', createdAt: now, publicNameVersion: 1 })
      user = (await ctx.db.get(id))!
    }
    const result = await runIntent(ctx, args.operationId, 'trmnl.completeReconnection', { attemptId: args.attemptId, confirm: args.confirm }, async owner => {
      if ((await gameProfile(ctx, owner._id))?.state === 'deleting') throw appError('GAME_UNAVAILABLE', 'Desk Crawler progress is being deleted. Try again shortly.')
      const attempt = await ctx.db.get(args.attemptId)
      if (!attempt || attempt.tokenIdentifier !== identity.tokenIdentifier || !attempt.verifiedUuid || attempt.expiresAt <= now || !attempt.proofExpiresAt || attempt.proofExpiresAt <= now) throw appError('INSTALL_INVALID', 'This verification expired. Open Configure again from TRMNL.')
      const instance = await ctx.db.query('trmnlInstances').withIndex('by_uuid', q => q.eq('uuid', attempt.verifiedUuid!)).unique()
      if (instance && instance.userId !== owner._id) throw appError('CONNECTION_CONFLICT', 'This installation is connected to another TRMNL Games account.')
      const grantId = await ctx.db.insert('trmnlGrants', { gameSlug: DESK_CRAWLER, userId: owner._id, tokenHash: attempt.tokenHash, authorizedUuid: attempt.verifiedUuid, state: 'active', createdAt: now, lastVerifiedAt: now })
      if (instance) {
        // Only an explicit signed confirmation can reconnect a selected own tombstone.
        await ctx.db.patch(instance._id, { grantId, state: 'active', confirmedBy: 'management_confirmation' })
        const oldGrant = await ctx.db.get(instance.grantId)
        if (oldGrant?.authorizedUuid) await ctx.db.delete(oldGrant._id)
      } else {
        await ctx.db.insert('trmnlInstances', { gameSlug: DESK_CRAWLER, grantId, userId: owner._id, uuid: attempt.verifiedUuid, state: 'active', confirmedBy: 'management_confirmation', createdAt: now })
      }
      if (attempt.analyticsConsent !== undefined) await ctx.db.patch(owner._id, { analyticsConsent: attempt.analyticsConsent })
      if (!await currentHero(ctx, owner)) await prepareHero(ctx, owner, attempt.heroName, now)
      await activateForConfirmedInstallation(ctx, owner._id, now)
      if (attempt.analyticsConsent === true || (attempt.analyticsConsent === undefined && owner.analyticsConsent === true)) await ctx.scheduler.runAfter(0, internal.analytics.captureActivation, { userId: owner._id, event: 'installation connected' })
      await ctx.db.delete(attempt._id)
      return { changed: true }
    })
    return { operationId: result.operationId, changed: result.changed }
  },
})
