import { v } from 'convex/values'
import { internal } from './_generated/api'
import { internalAction, internalQuery } from './_generated/server'
import { currentHero } from './lib/gameProfile'
import { currentAngler } from './slowCast/profile'
import { gameSlug } from './schema'

/** Re-check consent and account state at send time; no telemetry in simulation or polling. */
export const activationSubject = internalQuery({
  args: { userId: v.id('users'), event: v.union(v.literal('installation connected'), v.literal('hero activated')), game: v.optional(gameSlug) },
  returns: v.union(v.null(), v.object({ distinctId: v.string() })),
  handler: async (ctx, { userId, event, game }) => {
    const user = await ctx.db.get(userId)
    if (!user || user.state !== 'active' || user.analyticsConsent !== true) return null
    const hero = game === 'slow-cast' ? await currentAngler(ctx, user) : await currentHero(ctx, user)
    const distinctId = user.tokenIdentifier.split('|').at(-1)
    return (event === 'installation connected' || hero?.activationState === 'active') && distinctId ? { distinctId } : null
  },
})

export const captureActivation = internalAction({
  args: { userId: v.id('users'), event: v.optional(v.union(v.literal('installation connected'), v.literal('hero activated'))), game: v.optional(gameSlug) },
  returns: v.null(),
  handler: async (ctx, { userId, event = 'hero activated', game = 'desk-crawler' }) => {
    const token = process.env.POSTHOG_PROJECT_TOKEN
    if (!token) return null
    const subject = await ctx.runQuery(internal.analytics.activationSubject, { userId, event, game })
    if (!subject) return null
    try {
      const response = await fetch(`${process.env.POSTHOG_HOST ?? 'https://eu.i.posthog.com'}/i/v0/e/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(5000),
        body: JSON.stringify({ api_key: token, event, properties: { distinct_id: subject.distinctId, $process_person_profile: true, $ip: null, game, environment: process.env.POSTHOG_ENVIRONMENT ?? 'development', source: 'convex' } }),
      })
      if (!response.ok) console.warn('POSTHOG_ACTIVATION_CAPTURE_FAILED', response.status)
    } catch { console.warn('POSTHOG_ACTIVATION_CAPTURE_FAILED') }
    return null
  },
})

/** The API queues erasure of the person, their events and all linked recordings. */
export async function eraseAnalyticsPerson(distinctId: string): Promise<boolean> {
  const projectId = process.env.POSTHOG_PROJECT_ID
  const secret = process.env.POSTHOG_PERSONAL_API_KEY
  if (!projectId || !secret) return false
  try {
    const response = await fetch(`${process.env.POSTHOG_API_HOST ?? 'https://eu.posthog.com'}/api/projects/${encodeURIComponent(projectId)}/persons/bulk_delete/`, {
      method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({ distinct_ids: [distinctId], delete_events: true, delete_recordings: true }),
    })
    return response.ok
  } catch { return false }
}
