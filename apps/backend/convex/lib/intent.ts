import { currentHero } from './gameProfile'
import type { Doc } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { appError } from './errors'
import { sha256Hex } from './hash'

/** Receipt retention (api.md): duplicate safety lasts 24 hours. */
export const RECEIPT_TTL_MS = 24 * 60 * 60 * 1000
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT = 60

export type IntentResult = Doc<'operationReceipts'>['result']

export async function currentUser(ctx: QueryCtx): Promise<Doc<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (identity === null) return null
  return await ctx.db
    .query('users')
    .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
    .unique()
}

export async function requireActiveUser(ctx: QueryCtx): Promise<Doc<'users'>> {
  const identity = await ctx.auth.getUserIdentity()
  if (identity === null) throw appError('UNAUTHENTICATED', 'Sign in to continue.')
  const user = await currentUser(ctx)
  if (user === null || user.state !== 'active') throw appError('ACCOUNT_UNAVAILABLE', 'This account is not available.')
  return user
}

/** Gameplay intents need an activated, healthy current hero (api.md). */
export async function requirePlayableHero(ctx: QueryCtx, user: Doc<'users'>): Promise<Doc<'heroes'>> {
  const hero = await currentHero(ctx, user)
  if (hero === null) throw appError('HERO_NOT_FOUND', 'No hero yet.')
  if (hero.activationState !== 'active') throw appError('TRMNL_REQUIRED', 'Save Desk Crawler in TRMNL to start adventures.')
  if (hero.simulationState === 'quarantined') throw appError('SERVICE_PAUSED', 'This hero is paused for a service check.')
  return hero
}

/**
 * Shared intent envelope: identity/owner checks, idempotent receipt, atomic rate
 * limit, then the state change. Same operation ID + arguments returns the
 * original result; different arguments conflict. A thrown error rolls back the
 * whole transaction, including the limiter write, so no receipt is stored.
 */
export async function runIntent(
  ctx: MutationCtx,
  operationId: string,
  operation: string,
  args: unknown,
  handler: (user: Doc<'users'>) => Promise<IntentResult>,
): Promise<IntentResult & { operationId: string }> {
  if (!/^[\w-]{8,64}$/.test(operationId)) throw appError('INVALID_INPUT', 'Invalid operation ID.')
  const user = await requireActiveUser(ctx)
  const argumentHash = sha256Hex(JSON.stringify([operation, args]))
  const now = Date.now()
  const prior = await ctx.db
    .query('operationReceipts')
    .withIndex('by_userId_and_operationId', (q) => q.eq('userId', user._id).eq('operationId', operationId))
    .unique()
  if (prior && prior.expiresAt > now) {
    if (prior.argumentHash !== argumentHash) throw appError('OPERATION_CONFLICT', 'This operation ID was already used for a different action.')
    return { ...prior.result, operationId }
  }

  const windowStart = Math.floor(now / RATE_WINDOW_MS) * RATE_WINDOW_MS
  const key = `intent:${user._id}`
  const bucket = await ctx.db
    .query('rateLimitBuckets')
    .withIndex('by_key_and_windowStart', (q) => q.eq('key', key).eq('windowStart', windowStart))
    .unique()
  if (bucket && bucket.count >= RATE_LIMIT) throw appError('RATE_LIMITED', 'Too many actions. Try again in a few minutes.')
  if (bucket) await ctx.db.patch(bucket._id, { count: bucket.count + 1 })
  else await ctx.db.insert('rateLimitBuckets', { key, windowStart, count: 1, expiresAt: windowStart + 2 * RATE_WINDOW_MS })

  const result = await handler(user)
  if (prior) await ctx.db.delete(prior._id)
  await ctx.db.insert('operationReceipts', { scope: operation === 'deletion.requestDeletion' || operation.startsWith('users.') ? 'platform' : 'desk-crawler', userId: user._id, operationId, operation, argumentHash, result, createdAt: now, expiresAt: now + RECEIPT_TTL_MS })
  return { ...result, operationId }
}

/** Append a short command log line for the hero (device and web history). */
export async function commandLog(ctx: MutationCtx, hero: Doc<'heroes'>, operation: string, summary: string, deltas: Doc<'tickLogs'>['deltas'] = { xpEarned: 0, gold: 0, hp: 0 }, extra: { bagSlots?: number; potionsBought?: number; eventId?: string; optionId?: string; effectGained?: string } = {}): Promise<void> {
  const sequence = hero.logSequence + 1
  await ctx.db.patch(hero._id, { logSequence: sequence })
  await ctx.db.insert('tickLogs', {
    heroId: hero._id,
    source: 'command',
    sequence,
    at: Date.now(),
    kind: 'system',
    summary: summary.slice(0, 90),
    detail: { v: 1, operation, ...extra },
    deltas,
  })
}
