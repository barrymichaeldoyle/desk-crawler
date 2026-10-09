import { currentHero, gameProfile } from './lib/gameProfile'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Doc } from './_generated/dataModel'
import { internalQuery, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { appError } from './lib/errors'
import { requireAdmin } from './lib/adminAccess'
import { sha256Hex } from './lib/hash'
import { normalizeAlias } from './lib/names'
import { readWorld } from './world'

/**
 * Owner-run support and moderation (D23). Admin authority comes only from the
 * server-side ADMIN_TOKEN_IDENTIFIERS allowlist, never from client data. Every
 * action is audited with a reason; none resets progress.
 */

export async function audit(ctx: MutationCtx, actorRef: string, action: string, targetRef: string, reasonCode: string, outcome: string) {
  await ctx.db.insert('adminAuditEvents', { actorRef, action, targetRef, reasonCode: reasonCode.slice(0, 64), outcome: outcome.slice(0, 120), at: Date.now() })
}

const reason = v.string()

export const isAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    try {
      await requireAdmin(ctx)
      return true
    } catch {
      return false
    }
  },
})

export const health = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const world = await readWorld(ctx)
    const activeRun = world?.activeRunId ? await ctx.db.get(world.activeRunId) : null
    const quarantined = await ctx.db.query('heroes').withIndex('by_simulationState', (q) => q.eq('simulationState', 'quarantined')).take(50)
    const openIncidents = await ctx.db.query('operationalIncidents').withIndex('by_state_and_openedAt', (q) => q.eq('state', 'open')).take(20)
    const blockedDeletions = await ctx.db.query('accountDeletionJobs').withIndex('by_state_and_lastProgressAt', (q) => q.eq('state', 'blocked')).take(20)
    const recentAudit = await ctx.db.query('adminAuditEvents').withIndex('by_at').order('desc').take(20)
    return {
      world: world && { currentTick: world.currentTick, lastCompletedTick: world.lastCompletedTick ?? null, lastCompletedAt: world.lastCompletedAt ?? null, lastPublishedAt: world.lastPublishedAt ?? null, ticksPaused: world.ticksPaused },
      activeRun: activeRun && { id: activeRun._id, tick: activeRun.tick, state: activeRun.state, lastProgressAt: activeRun.lastProgressAt, failureCode: activeRun.failureCode ?? null, recoveryAttempts: activeRun.recoveryAttempts },
      quarantined: quarantined.map((h) => ({ id: h._id, name: h.name, reasonCode: h.quarantineReasonCode ?? null })),
      openIncidents: openIncidents.map((i) => ({ id: i._id, openedAt: i.openedAt, alert: i.alert.state })),
      blockedDeletions: blockedDeletions.map((j) => ({ id: j._id, phase: j.phase, reasonCode: j.reasonCode ?? null })),
      recentAudit: recentAudit.map((a) => ({ at: a.at, action: a.action, targetRef: a.targetRef, reasonCode: a.reasonCode, outcome: a.outcome })),
    }
  },
})

const ENGAGEMENT_SCAN = 5000
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Operator view of v1.1 engagement for every active hero, consent or not:
 * `npx convex run --prod admin:engagement`. Reads lifetime counters only (no
 * logs); stops at 5,000 heroes and says so with `truncated`.
 */
export const engagement = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const scanned = await ctx.db.query('heroes').withIndex('by_createdAt').take(ENGAGEMENT_SCAN)
    const heroes = scanned.filter((h) => h.isActive && h.activationState === 'active')
    const now = Date.now()
    const tally = (values: (string | number)[]) => values.reduce<Record<string, number>>((acc, key) => ({ ...acc, [key]: (acc[key] ?? 0) + 1 }), {})
    const sum = (pick: (c: Doc<'heroes'>['counters']) => number | undefined) => heroes.reduce((total, h) => total + (pick(h.counters) ?? 0), 0)
    const reached = (pick: (c: Doc<'heroes'>['counters']) => number | undefined) => heroes.filter((h) => (pick(h.counters) ?? 0) > 0).length
    const visitedWithin = (days: number) => heroes.filter((h) => h.companionVisitBaseline && now - h.companionVisitBaseline.at <= days * DAY_MS).length
    const users = await ctx.db.query('users').withIndex('by_state', (q) => q.eq('state', 'active')).take(ENGAGEMENT_SCAN)
    return {
      truncated: scanned.length === ENGAGEMENT_SCAN,
      activeHeroes: heroes.length,
      companionVisits: { within1Day: visitedWithin(1), within7Days: visitedWithin(7), never: heroes.filter((h) => !h.companionVisitBaseline).length },
      stances: tally(heroes.map((h) => h.stance ?? 'balanced')),
      stanceChanges: { total: sum((c) => c.stanceChanges), heroes: reached((c) => c.stanceChanges) },
      choices: { made: sum((c) => c.choicesMade), defaulted: sum((c) => c.choicesDefaulted), heroesWhoChose: reached((c) => c.choicesMade), pending: heroes.filter((h) => h.choice).length },
      merchant: { visits: sum((c) => c.merchantVisits), purchases: sum((c) => c.purchases), heroesMet: reached((c) => c.merchantVisits), heroesBought: reached((c) => c.purchases), open: heroes.filter((h) => h.merchant).length },
      bagCapacity: tally(heroes.map((h) => h.bagCapacity)),
      potionCap: tally(heroes.map((h) => h.potionCap ?? 'default')),
      epicFinds: { total: sum((c) => c.epicFinds), heroes: reached((c) => c.epicFinds) },
      // D110: raids from both sides; launched minus won is failed raids.
      raids: { launched: sum((c) => c.raidsLaunched), won: sum((c) => c.raidsWon), repelled: sum((c) => c.raidsRepelled), lost: sum((c) => c.raidsLost), heroesRaiding: reached((c) => c.raidsLaunched), heroesRaided: heroes.filter((h) => (h.counters.raidsRepelled ?? 0) + (h.counters.raidsLost ?? 0) > 0).length },
      // D112: to-do tasks ticked off, and how many heroes have finished one.
      tasks: { completed: sum((c) => c.tasksCompleted), heroes: reached((c) => c.tasksCompleted) },
      analyticsConsent: tally(users.map((u) => (u.analyticsConsent === undefined ? 'unset' : u.analyticsConsent ? 'allowed' : 'declined'))),
    }
  },
})

export const findUser = query({
  args: { alias: v.string() },
  returns: v.any(),
  handler: async (ctx, { alias }) => {
    await requireAdmin(ctx)
    const user = await ctx.db.query('users').withIndex('by_normalizedAlias', (q) => q.eq('normalizedAlias', normalizeAlias(alias))).first()
    if (user === null) return null
    const hero = await currentHero(ctx, user)
    return { id: user._id, alias: user.publicAlias, state: user.state, nameRepairRequired: user.nameRepairRequired ?? false, heroName: hero?.name ?? null, heroId: hero?._id ?? null, quarantined: hero?.simulationState === 'quarantined' }
  },
})

/** Mask a reported name at once with a safe temporary alias/hero name; the owner chooses a replacement. */
export const repairPublicNames = mutation({
  args: { userId: v.id('users'), reasonCode: reason },
  returns: v.null(),
  handler: async (ctx, { userId, reasonCode }) => {
    const actor = await requireAdmin(ctx)
    const user = await ctx.db.get(userId)
    if (user === null) throw appError('ACCOUNT_UNAVAILABLE', 'User not found.')
    const suffix = sha256Hex(`${userId}:${user.publicNameVersion}`).slice(0, 5)
    const temporary = `Adventurer-${suffix}`
    await ctx.db.patch(userId, { publicAlias: temporary, normalizedAlias: normalizeAlias(temporary), publicNameVersion: user.publicNameVersion + 1, nameRepairRequired: true })
    const hero = await currentHero(ctx, user)
    if (hero) await ctx.db.patch(hero._id, { name: 'Hero' })
    await audit(ctx, actor, 'repair_public_names', userId, reasonCode, temporary)
    return null
  },
})

export const setSuspended = mutation({
  args: { userId: v.id('users'), suspended: v.boolean(), reasonCode: reason },
  returns: v.null(),
  handler: async (ctx, { userId, suspended, reasonCode }) => {
    const actor = await requireAdmin(ctx)
    const user = await ctx.db.get(userId)
    if (user === null || user.state === 'deleting') throw appError('ACCOUNT_UNAVAILABLE', 'User not available.')
    await ctx.db.patch(userId, { state: suspended ? 'suspended' : 'active' })
    await audit(ctx, actor, suspended ? 'suspend' : 'restore', userId, reasonCode, suspended ? 'suspended' : 'active')
    return null
  },
})

/** Release a quarantined hero after diagnosis; no retroactive catch-up (simulation.md). */
export const releaseHero = mutation({
  args: { heroId: v.id('heroes'), reasonCode: reason },
  returns: v.null(),
  handler: async (ctx, { heroId, reasonCode }) => {
    const actor = await requireAdmin(ctx)
    const hero = await ctx.db.get(heroId)
    if (hero === null || hero.simulationState !== 'quarantined') throw appError('INVALID_STATE', 'Hero is not quarantined.')
    await ctx.db.patch(heroId, { simulationState: 'healthy', quarantineReasonCode: undefined })
    await audit(ctx, actor, 'release_hero', heroId, reasonCode, 'healthy')
    return null
  },
})

/** Resume a blocked run at its saved phase and cursor after the cause is fixed. */
export const resumeBlockedRun = mutation({
  args: { reasonCode: reason },
  returns: v.null(),
  handler: async (ctx, { reasonCode }) => {
    const actor = await requireAdmin(ctx)
    const world = await readWorld(ctx)
    const run: Doc<'simulationRuns'> | null = world?.activeRunId ? await ctx.db.get(world.activeRunId) : null
    if (run === null || run.state !== 'blocked') throw appError('INVALID_STATE', 'No blocked run.')
    const publication = await ctx.db.query('leaderboardPublications').withIndex('by_runId', (q) => q.eq('runId', run._id)).unique()
    const now = Date.now()
    if (publication && publication.state === 'building') {
      await ctx.db.patch(run._id, { state: 'ranking', failureCode: undefined, recoveryAttempts: 0, lastProgressAt: now })
      const scheduled = await ctx.scheduler.runAfter(0, internal.leaderboard.buildBatch, { publicationId: publication._id, expectedSequence: publication.batchSequence })
      await ctx.db.patch(publication._id, { nextScheduledFunctionId: scheduled, lastProgressAt: now })
    } else {
      const scheduled = await ctx.scheduler.runAfter(0, internal.sim.runs.tick.simulateBatch, { runId: run._id, expectedSequence: run.batchSequence })
      await ctx.db.patch(run._id, { state: 'simulating', failureCode: undefined, recoveryAttempts: 0, lastProgressAt: now, nextScheduledFunctionId: scheduled })
    }
    await audit(ctx, actor, 'resume_run', run._id, reasonCode, `tick ${run.tick}`)
    return null
  },
})
