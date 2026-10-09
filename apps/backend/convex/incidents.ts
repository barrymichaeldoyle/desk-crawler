import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { internalAction, internalMutation, internalQuery, type MutationCtx } from './_generated/server'

/**
 * Owner incident and recovery notices (D27, D36, D38; build-readiness.md
 * "Operational alerts"). One incident per stalled run; one alert and one
 * recovery notice, deduplicated, with bounded retries. Delivery failure never
 * blocks simulation recovery. Disabled until RESEND_API_KEY is configured.
 */
const MAX_ATTEMPTS = 3
type Notice = 'alert' | 'recovery'

export async function openIncident(ctx: MutationCtx, runId: Id<'simulationRuns'>, kind: string, now: number): Promise<void> {
  const incidentKey = `${runId}:${kind}`
  const existing = await ctx.db.query('operationalIncidents').withIndex('by_incidentKey', (q) => q.eq('incidentKey', incidentKey)).unique()
  if (existing) return
  const incidentId = await ctx.db.insert('operationalIncidents', { incidentKey, runId, state: 'open', openedAt: now, alert: { state: 'pending', attempts: 0 } })
  await ctx.scheduler.runAfter(0, internal.incidents.sendNotice, { incidentId, notice: 'alert' })
}

export async function recoverIncidents(ctx: MutationCtx, runId: Id<'simulationRuns'>, now: number): Promise<void> {
  const open = await ctx.db.query('operationalIncidents').withIndex('by_runId_and_state', (q) => q.eq('runId', runId).eq('state', 'open')).take(5)
  for (const incident of open) {
    await ctx.db.patch(incident._id, { state: 'recovered', recoveredAt: now, recovery: { state: 'pending', attempts: 0 } })
    await ctx.scheduler.runAfter(0, internal.incidents.sendNotice, { incidentId: incident._id, notice: 'recovery' })
  }
}

export const getIncident = internalQuery({
  args: { incidentId: v.id('operationalIncidents') },
  returns: v.any(),
  handler: async (ctx, { incidentId }) => {
    const incident = await ctx.db.get(incidentId)
    if (incident === null) return null
    const run = await ctx.db.get(incident.runId)
    // D115: a Slow Cast run lives in its own table.
    const game = ctx.db.normalizeId('swSimulationRuns', incident.runId) === null ? 'Desk Crawler' : 'Slow Cast'
    return { incident, game, run: run ? { tick: run.tick, state: run.state, phase: run.state, contentVersion: run.contentVersion, simulationVersion: run.simulationVersion } : null }
  },
})

const alertFrom = () => process.env.ALERT_FROM ?? 'TRMNL Games <alerts@trmnlgames.com>'
const alertTo = () => process.env.ALERT_TO ?? 'barry@barrymichaeldoyle.com'

export const sendNotice = internalAction({
  args: { incidentId: v.id('operationalIncidents'), notice: v.union(v.literal('alert'), v.literal('recovery')) },
  returns: v.null(),
  handler: async (ctx, { incidentId, notice }) => {
    const data = await ctx.runQuery(internal.incidents.getIncident, { incidentId })
    if (data === null) return null
    const record = notice === 'alert' ? data.incident.alert : data.incident.recovery
    if (!record || record.state !== 'pending' || record.attempts >= MAX_ATTEMPTS) return null
    const key = process.env.RESEND_API_KEY
    if (!key) {
      await ctx.runMutation(internal.incidents.recordDelivery, { incidentId, notice, outcome: 'disabled' })
      return null
    }
    const tick = data.run?.tick ?? 'unknown'
    const game = data.game ?? 'Desk Crawler'
    const subject = notice === 'alert' ? `${game}: world tick ${tick} has stalled` : `${game}: world tick ${tick} recovered`
    const text =
      notice === 'alert'
        ? `World tick ${tick} has made no progress for over five minutes. Opened ${new Date(data.incident.openedAt).toISOString()}. Run state: ${data.run?.state ?? 'unknown'}. Check the Convex dashboard. Player progress is safe; the watchdog keeps trying.`
        : `World tick ${tick} completed. Recovered ${new Date(data.incident.recoveredAt ?? Date.now()).toISOString()}.`
    let outcome: 'sent' | 'failed' = 'failed'
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `${incidentId}-${notice}` },
        body: JSON.stringify({
          from: alertFrom(),
          to: [alertTo()],
          subject,
          text,
        }),
      })
      outcome = response.ok ? 'sent' : 'failed'
    } catch {
      outcome = 'failed'
    }
    await ctx.runMutation(internal.incidents.recordDelivery, { incidentId, notice, outcome })
    return null
  },
})

/**
 * Operator check that alert email reaches the inbox: sends one clearly marked test message through the same
 * sender, recipient and key as real notices. Writes nothing. Run with `npx convex run --prod incidents:sendTestNotice`.
 */
export const sendTestNotice = internalAction({
  args: {},
  returns: v.object({ status: v.union(v.literal('sent'), v.literal('failed'), v.literal('disabled')), from: v.string(), to: v.string(), id: v.union(v.string(), v.null()) }),
  handler: async () => {
    const from = alertFrom()
    const to = alertTo()
    const key = process.env.RESEND_API_KEY
    if (!key) return { status: 'disabled' as const, from, to, id: null }
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [to],
          subject: '[TEST] TRMNL Games alert email check',
          text: 'This is a test of the operational alert email. No incident is open and nothing needs doing.',
        }),
      })
      const body = (await response.json().catch(() => null)) as { id?: unknown } | null
      return { status: response.ok ? ('sent' as const) : ('failed' as const), from, to, id: typeof body?.id === 'string' ? body.id : null }
    } catch {
      return { status: 'failed' as const, from, to, id: null }
    }
  },
})

export const recordDelivery = internalMutation({
  args: { incidentId: v.id('operationalIncidents'), notice: v.union(v.literal('alert'), v.literal('recovery')), outcome: v.union(v.literal('sent'), v.literal('failed'), v.literal('disabled')) },
  returns: v.null(),
  handler: async (ctx, { incidentId, notice, outcome }) => {
    const incident = await ctx.db.get(incidentId)
    if (incident === null) return null
    const field = notice as Notice
    const current = incident[field]
    // A late action result cannot reopen a terminal notice or add retries.
    if (!current || current.state !== 'pending' || current.attempts >= MAX_ATTEMPTS) return null
    const attempts = current.attempts + (outcome === 'disabled' ? 0 : 1)
    const now = Date.now()
    const state = outcome === 'failed' && attempts < MAX_ATTEMPTS ? 'pending' : outcome
    await ctx.db.patch(incidentId, { [field]: { state, attempts, lastAttemptAt: now } })
    if (state === 'pending') await ctx.scheduler.runAfter(60_000 * 2 ** attempts, internal.incidents.sendNotice, { incidentId, notice })
    return null
  },
})
