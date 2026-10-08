import { v } from 'convex/values'
import { internal } from './_generated/api'
import { internalAction, internalMutation, internalQuery, mutation } from './_generated/server'
import { appError } from './lib/errors'
import { verifiedPrimaryEmail } from './lib/deletionConfirmation'
import { identityHash } from './deletion'

/**
 * Player feedback (D107). Signed-in players send a short message; it is stored,
 * then emailed to Barry with the player's verified address as Reply-To. Rows go
 * with the account on deletion. Read them with `npx convex run --prod feedback:recent`.
 */
export const FEEDBACK_MAX = 2000
const WINDOW_MS = 60 * 60_000
const PLAYER_LIMIT = 5
const GLOBAL_LIMIT = 200
const SEND_ATTEMPTS = 3
const TO = 'barry@barrymichaeldoyle.com'

export const send = mutation({
  args: { message: v.string(), page: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw appError('UNAUTHENTICATED', 'Sign in to send feedback.')
    if (await ctx.db.query('revokedAuthIdentities').withIndex('by_identityHash', (q) => q.eq('identityHash', identityHash(identity.tokenIdentifier))).first()) throw appError('ACCOUNT_UNAVAILABLE', 'This account is not available.')
    // An account without a game yet has no users row; it can still send feedback.
    const user = await ctx.db.query('users').withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier)).unique()
    if (user && user.state !== 'active') throw appError('ACCOUNT_UNAVAILABLE', 'This account is not available.')
    const message = args.message.trim()
    if (!message) throw appError('INVALID_INPUT', 'Write a message first.')
    if (message.length > FEEDBACK_MAX) throw appError('INVALID_INPUT', `Keep it under ${FEEDBACK_MAX} characters.`)
    const now = Date.now()
    const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS
    for (const [key, limit] of [[`feedback:${identity.tokenIdentifier}`, PLAYER_LIMIT], ['feedback:all', GLOBAL_LIMIT]] as const) {
      const bucket = await ctx.db.query('rateLimitBuckets').withIndex('by_key_and_windowStart', (q) => q.eq('key', key).eq('windowStart', windowStart)).unique()
      if (bucket && bucket.count >= limit) throw appError('RATE_LIMITED', 'Thanks, that is plenty for now. Try again in an hour.')
      if (bucket) await ctx.db.patch(bucket._id, { count: bucket.count + 1 })
      else await ctx.db.insert('rateLimitBuckets', { key, windowStart, count: 1, expiresAt: windowStart + 2 * WINDOW_MS })
    }
    const page = args.page && /^\/[\w\-/]{0,120}$/.test(args.page) ? args.page : undefined
    const id = await ctx.db.insert('feedback', {
      tokenIdentifier: identity.tokenIdentifier,
      clerkUserId: identity.subject,
      ...(user ? { publicAlias: user.publicAlias } : {}),
      message,
      ...(page ? { page } : {}),
      state: 'pending',
      attempts: 0,
      createdAt: now,
    })
    await ctx.scheduler.runAfter(0, internal.feedback.deliver, { id })
    return null
  },
})

export const getForDelivery = internalQuery({
  args: { id: v.id('feedback') },
  returns: v.union(v.null(), v.object({ clerkUserId: v.string(), publicAlias: v.optional(v.string()), message: v.string(), page: v.optional(v.string()), createdAt: v.number() })),
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id)
    if (!row || row.state !== 'pending') return null
    return { clerkUserId: row.clerkUserId, publicAlias: row.publicAlias, message: row.message, page: row.page, createdAt: row.createdAt }
  },
})

/** Emails one message to Barry. Without Resend the row simply waits in the table for `recent`. */
export const deliver = internalAction({
  args: { id: v.id('feedback') },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const row = await ctx.runQuery(internal.feedback.getForDelivery, { id })
    const resendKey = process.env.RESEND_API_KEY
    if (!row || !resendKey) return null
    let replyTo: string | null = null
    const clerkSecret = process.env.CLERK_SECRET_KEY
    if (clerkSecret) {
      try {
        const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(row.clerkUserId)}`, { headers: { Authorization: `Bearer ${clerkSecret}` }, signal: AbortSignal.timeout(10_000) })
        if (response.ok) replyTo = verifiedPrimaryEmail(await response.json())?.address ?? null
      } catch { /* Still deliver; Barry just can't reply directly. */ }
    }
    const from = process.env.FEEDBACK_FROM ?? 'TRMNL Games <alerts@trmnlgames.com>'
    const who = row.publicAlias ?? 'a player without a game yet'
    const text = [
      row.message,
      '',
      '---',
      `From: ${who}${replyTo ? ` <${replyTo}>` : ' (no verified email)'}`,
      ...(row.page ? [`Page: ${row.page}`] : []),
      `Sent: ${new Date(row.createdAt).toISOString()}`,
      `Feedback id: ${id}`,
    ].join('\n')
    let ok = false
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `feedback/${id}` },
        body: JSON.stringify({ from, to: [TO], subject: `TRMNL Games feedback from ${who}`, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
      })
      ok = response.ok
    } catch { ok = false }
    await ctx.runMutation(internal.feedback.recordDelivery, { id, ok })
    return null
  },
})

export const recordDelivery = internalMutation({
  args: { id: v.id('feedback'), ok: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { id, ok }) => {
    const row = await ctx.db.get(id)
    if (!row || row.state !== 'pending') return null
    const attempts = row.attempts + 1
    const state = ok ? 'sent' as const : attempts >= SEND_ATTEMPTS ? 'failed' as const : 'pending' as const
    await ctx.db.patch(id, { state, attempts })
    if (state === 'pending') await ctx.scheduler.runAfter(60_000 * 2 ** attempts, internal.feedback.deliver, { id })
    return null
  },
})

/** Operator view: `npx convex run --prod feedback:recent '{"limit":20}'`, newest first. */
export const recent = internalQuery({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({ id: v.id('feedback'), publicAlias: v.optional(v.string()), message: v.string(), page: v.optional(v.string()), state: v.string(), createdAt: v.string() })),
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db.query('feedback').withIndex('by_createdAt').order('desc').take(Math.min(Math.max(1, limit ?? 20), 200))
    return rows.map((row) => ({ id: row._id, publicAlias: row.publicAlias, message: row.message, page: row.page, state: row.state, createdAt: new Date(row.createdAt).toISOString() }))
  },
})
