import { hmac } from '@noble/hashes/hmac.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { action, internalAction, internalMutation, internalQuery, mutation, query } from './_generated/server'
import { appError } from './lib/errors'
import { sha256Hex } from './lib/hash'
import { verifiedPrimaryEmail } from './lib/deletionConfirmation'
import { identityHash } from './deletion'

/**
 * Desk Crawler launch list (D105). Anyone can leave an email; the one launch
 * email goes out when Barry runs `sendLaunch` after marketplace approval, and
 * each address is deleted once Resend accepts its message. Signed-in players
 * can attach their account so account deletion removes the entry too.
 */
const JOIN_WINDOW_MS = 10 * 60_000
const JOIN_LIMIT = 300
const LAUNCH_BATCH = 50
const LAUNCH_ATTEMPTS = 3

export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase()
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

const linkKey = () => process.env.WAITLIST_LINK_KEY ?? process.env.ACCOUNT_DELETION_LINK_KEY

/** Unsubscribe proof for one entry; stays valid after the row is gone so a late click still succeeds. */
export function unsubscribeToken(key: string, id: string): string {
  const encode = new TextEncoder()
  return bytesToHex(hmac(sha256, encode.encode(key), encode.encode(JSON.stringify(['waitlist-unsubscribe-v1', id]))))
}

/** Same answer for new and existing addresses, so the form never reveals who is on the list. */
export const join = mutation({
  args: { email: v.string(), source: v.union(v.literal('notify'), v.literal('pitch'), v.literal('landing')), website: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Hidden field only bots fill in: accept quietly, store nothing.
    if (args.website) return null
    const email = normalizeEmail(args.email)
    if (!email) throw appError('INVALID_INPUT', 'Enter a valid email address.')
    const now = Date.now()
    const windowStart = Math.floor(now / JOIN_WINDOW_MS) * JOIN_WINDOW_MS
    const bucket = await ctx.db.query('rateLimitBuckets').withIndex('by_key_and_windowStart', (q) => q.eq('key', 'waitlist:join').eq('windowStart', windowStart)).unique()
    if (bucket && bucket.count >= JOIN_LIMIT) throw appError('RATE_LIMITED', 'Lots of people are signing up right now. Try again in a few minutes.')
    if (bucket) await ctx.db.patch(bucket._id, { count: bucket.count + 1 })
    else await ctx.db.insert('rateLimitBuckets', { key: 'waitlist:join', windowStart, count: 1, expiresAt: windowStart + 2 * JOIN_WINDOW_MS })
    const existing = await ctx.db.query('waitlist').withIndex('by_email', (q) => q.eq('email', email)).first()
    if (!existing) await ctx.db.insert('waitlist', { email, source: args.source, state: 'waiting', attempts: 0, createdAt: now })
    return null
  },
})

/** Unsubscribe link target. Needs a click on the page, so mail scanners that open links never remove anyone. */
export const leave = mutation({
  args: { id: v.string(), token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = linkKey()
    if (!key || !/^[a-f0-9]{64}$/.test(args.token) || unsubscribeToken(key, args.id) !== args.token) throw appError('INVALID_INPUT', 'That unsubscribe link is not valid. Email us and we will remove you.')
    const id = ctx.db.normalizeId('waitlist', args.id)
    if (id && await ctx.db.get(id)) await ctx.db.delete(id)
    return null
  },
})

/** The signed-in player's entry, if their account is attached to one. */
export const mine = query({
  args: {},
  returns: v.union(v.null(), v.object({ email: v.string() })),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    const row = await ctx.db.query('waitlist').withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier)).first()
    return row ? { email: row.email } : null
  },
})

/**
 * Join with the account's verified primary email, or attach the account to the
 * entry that address already has (someone who joined, then created an account).
 */
export const joinWithAccount = action({
  args: {},
  returns: v.object({ email: v.string() }),
  handler: async (ctx): Promise<{ email: string }> => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw appError('UNAUTHENTICATED', 'Sign in to continue.')
    const clerkSecret = process.env.CLERK_SECRET_KEY
    let address: string | null = null
    if (clerkSecret) {
      try {
        const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(identity.subject)}`, { headers: { Authorization: `Bearer ${clerkSecret}` }, signal: AbortSignal.timeout(10_000) })
        if (response.ok) address = verifiedPrimaryEmail(await response.json())?.address ?? null
      } catch { /* Fail closed: only a verified address joins. */ }
    }
    const email = address ? normalizeEmail(address) : null
    if (!email) throw appError('EMAIL_UNAVAILABLE', 'Add a verified email to your account first, or use the form on the Desk Crawler page.')
    await ctx.runMutation(internal.waitlist.attachAccount, { tokenIdentifier: identity.tokenIdentifier, email })
    return { email }
  },
})

export const attachAccount = internalMutation({
  args: { tokenIdentifier: v.string(), email: v.string() },
  returns: v.null(),
  handler: async (ctx, { tokenIdentifier, email }) => {
    if (await ctx.db.query('revokedAuthIdentities').withIndex('by_identityHash', (q) => q.eq('identityHash', identityHash(tokenIdentifier))).first()) throw appError('ACCOUNT_UNAVAILABLE', 'This account is not available.')
    const user = await ctx.db.query('users').withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', tokenIdentifier)).unique()
    if (user && user.state !== 'active') throw appError('ACCOUNT_UNAVAILABLE', 'This account is not available.')
    const linked = await ctx.db.query('waitlist').withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', tokenIdentifier)).first()
    const byEmail = await ctx.db.query('waitlist').withIndex('by_email', (q) => q.eq('email', email)).first()
    if (linked && byEmail && linked._id !== byEmail._id) await ctx.db.delete(byEmail._id)
    if (linked) {
      if (linked.email !== email) await ctx.db.patch(linked._id, { email })
    } else if (byEmail) {
      await ctx.db.patch(byEmail._id, { tokenIdentifier })
    } else {
      await ctx.db.insert('waitlist', { email, source: 'account', state: 'waiting', attempts: 0, tokenIdentifier, createdAt: Date.now() })
    }
    return null
  },
})

export const leaveWithAccount = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw appError('UNAUTHENTICATED', 'Sign in to continue.')
    const rows = await ctx.db.query('waitlist').withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier)).take(10)
    for (const row of rows) await ctx.db.delete(row._id)
    return null
  },
})

/** Operator view: `npx convex run --prod waitlist:summary`. Counts stop at 5,000 per state. */
export const summary = internalQuery({
  args: {},
  returns: v.object({ waiting: v.number(), sending: v.number(), failed: v.number(), withAccount: v.number() }),
  handler: async (ctx) => {
    const rows = (state: 'waiting' | 'sending' | 'failed') => ctx.db.query('waitlist').withIndex('by_state', (q) => q.eq('state', state)).take(5000)
    const waiting = await rows('waiting')
    return { waiting: waiting.length, sending: (await rows('sending')).length, failed: (await rows('failed')).length, withAccount: waiting.filter((row) => row.tokenIdentifier).length }
  },
})

export const claimLaunchBatch = internalMutation({
  args: {},
  returns: v.array(v.object({ id: v.id('waitlist'), email: v.string() })),
  handler: async (ctx) => {
    const rows = await ctx.db.query('waitlist').withIndex('by_state', (q) => q.eq('state', 'waiting')).take(LAUNCH_BATCH)
    for (const row of rows) await ctx.db.patch(row._id, { state: 'sending' })
    return rows.map((row) => ({ id: row._id, email: row.email }))
  },
})

/** Accepted messages delete their rows (the privacy promise); failures retry, then park as failed. */
export const finishLaunchBatch = internalMutation({
  args: { ids: v.array(v.id('waitlist')), ok: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { ids, ok }) => {
    for (const id of ids) {
      const row = await ctx.db.get(id)
      if (!row || row.state !== 'sending') continue
      if (ok) await ctx.db.delete(id)
      else await ctx.db.patch(id, { attempts: row.attempts + 1, state: row.attempts + 1 >= LAUNCH_ATTEMPTS ? 'failed' : 'waiting' })
    }
    return null
  },
})

/** Put stuck or failed entries back in the queue before another `sendLaunch`. */
export const requeue = internalMutation({
  args: {},
  returns: v.object({ requeued: v.number() }),
  handler: async (ctx) => {
    let requeued = 0
    for (const state of ['sending', 'failed'] as const) {
      const rows = await ctx.db.query('waitlist').withIndex('by_state', (q) => q.eq('state', state)).take(500)
      for (const row of rows) await ctx.db.patch(row._id, { state: 'waiting', attempts: 0 })
      requeued += rows.length
    }
    return { requeued }
  },
})

export function launchEmail(args: { id: Id<'waitlist'>; email: string; installUrl: string; origin: string; from: string; key: string }) {
  const unsubscribe = new URL('/desk-crawler/unsubscribe', args.origin)
  unsubscribe.searchParams.set('id', args.id)
  unsubscribe.searchParams.set('token', unsubscribeToken(args.key, args.id))
  return {
    from: args.from,
    to: [args.email],
    subject: 'Desk Crawler is live on TRMNL',
    headers: { 'List-Unsubscribe': `<${unsubscribe.toString()}>` },
    text: [
      'Desk Crawler is now in the TRMNL marketplace. Install it here:',
      args.installUrl,
      '',
      'Install the plugin, connect it with your TRMNL Games account, name your hero and click Save in TRMNL. The first adventure shows up within fifteen minutes.',
      '',
      'You are getting this one email because you joined the Desk Crawler launch list at trmnlgames.com. Your address has now been removed from that list, and no further emails will follow.',
      '',
      `Questions or problems: reply to barry@barrymichaeldoyle.com. Unsubscribe: ${unsubscribe.toString()}`,
    ].join('\n'),
  }
}

/**
 * Sends the launch email to everyone waiting, LAUNCH_BATCH at a time, through
 * Resend's batch endpoint. Run once, after approval and with Barry's go-ahead:
 * `npx convex run --prod waitlist:sendLaunch '{"installUrl":"https://trmnl.com/..."}'`.
 * Rows are claimed before sending, so a second concurrent run never double-sends.
 */
export const sendLaunch = internalAction({
  args: { installUrl: v.string() },
  returns: v.object({ sent: v.number(), failed: v.number(), status: v.union(v.literal('continuing'), v.literal('done'), v.literal('disabled')) }),
  handler: async (ctx, { installUrl }): Promise<{ sent: number; failed: number; status: 'continuing' | 'done' | 'disabled' }> => {
    const resendKey = process.env.RESEND_API_KEY
    const key = linkKey()
    if (!resendKey || !key || !/^https:\/\//.test(installUrl)) return { sent: 0, failed: 0, status: 'disabled' }
    const batch = await ctx.runMutation(internal.waitlist.claimLaunchBatch, {})
    if (batch.length === 0) return { sent: 0, failed: 0, status: 'done' }
    const origin = new URL(process.env.COMPANION_ORIGIN ?? 'https://trmnlgames.com').origin
    const from = process.env.WAITLIST_FROM ?? 'TRMNL Games <hello@trmnlgames.com>'
    let ok = false
    try {
      const response = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        signal: AbortSignal.timeout(20_000),
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `waitlist-launch/${sha256Hex(batch.map((row) => row.id).join(','))}` },
        body: JSON.stringify(batch.map((row) => ({ ...launchEmail({ ...row, installUrl, origin, from, key }), reply_to: 'barry@barrymichaeldoyle.com' }))),
      })
      ok = response.ok
    } catch { ok = false }
    await ctx.runMutation(internal.waitlist.finishLaunchBatch, { ids: batch.map((row) => row.id), ok })
    // Keep going until the queue is empty; a failed batch backs off before its retry.
    await ctx.scheduler.runAfter(ok ? 1_000 : 60_000, internal.waitlist.sendLaunch, { installUrl })
    return { sent: ok ? batch.length : 0, failed: ok ? 0 : batch.length, status: 'continuing' }
  },
})
