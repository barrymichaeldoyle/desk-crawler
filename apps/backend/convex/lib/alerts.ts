import { internal } from '../_generated/api'
import type { Doc } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import type { SimulationResult } from '@trmnl-games/desk-crawler/sim/core/types'

/**
 * P33 hero alerts (alerts.md): an alert goes out only when the hero has stopped or is about to lose something the
 * player can act on. The tick writes one outbox row per qualifying event; the sender rechecks, applies quiet hours
 * and caps, and pushes.
 */
export const ALERTS = {
  /** A player already fixing the bag in the companion gets no alert. */
  asleepDelayMs: 30 * 60_000,
  dailyCap: 2,
  merchantDailyCap: 1,
  batch: 50,
  /** One send and two retries. */
  maxAttempts: 3,
  retryMs: 5 * 60_000,
  retentionMs: 7 * 24 * 60 * 60_000,
  maxSubscriptions: 5,
  quietStart: 21,
  quietEnd: 8,
} as const

export type AlertKind = Doc<'alertOutbox'>['kind']
export type AlertPreferences = NonNullable<Doc<'users'>['alerts']>

/** The preference switch for each kind. */
export const PREF_FOR: Readonly<Record<AlertKind, 'asleep' | 'merchant' | 'coolerFull' | 'baitOut'>> = { asleep: 'asleep', merchant: 'merchant', cooler_full: 'coolerFull', bait_out: 'baitOut' }
export const kindOn = (prefs: AlertPreferences | undefined, kind: AlertKind) => prefs?.[PREF_FOR[kind]] === true
/** Desk Crawler's kinds and Slow Cast's (D115). */
export const DESK_CRAWLER_KINDS: readonly AlertKind[] = ['asleep', 'merchant']
export const SLOW_CAST_KINDS: readonly AlertKind[] = ['cooler_full', 'bait_out']

const STEP_MS = 15 * 60_000

function parts(at: number, timeZone: string): { day: string; hour: number } {
  try {
    const fields = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(at))
    const get = (type: string) => fields.find((field) => field.type === type)?.value ?? '00'
    return { day: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) % 24 }
  } catch {
    return timeZone === 'UTC' ? { day: new Date(at).toISOString().slice(0, 10), hour: new Date(at).getUTCHours() } : parts(at, 'UTC')
  }
}

/** The owner's local date (YYYY-MM-DD) at `at`, for the daily caps. */
export const localDay = (at: number, timeZone: string) => parts(at, timeZone).day

/** Quiet hours run from `start` up to `end` and may wrap midnight (21 to 8 by default). */
export function inQuietHours(at: number, timeZone: string, prefs: Pick<AlertPreferences, 'quietStart' | 'quietEnd'>): boolean {
  const { hour } = parts(at, timeZone)
  const { quietStart: start, quietEnd: end } = prefs
  return start < end ? hour >= start && hour < end : hour >= start || hour < end
}

/**
 * When the quiet window that contains `at` ends. Every timezone offset is a multiple of 15 minutes, so stepping by
 * quarter-hours lands on the local hour boundary exactly, DST included.
 */
export function quietEndsAt(at: number, timeZone: string, prefs: Pick<AlertPreferences, 'quietStart' | 'quietEnd'>): number {
  let t = Math.ceil(at / STEP_MS) * STEP_MS
  for (let i = 0; i < 26 * 4 && inQuietHours(t, timeZone, prefs); i += 1) t += STEP_MS
  return t
}

/** The next bag or pouch on a merchant visit this tick opened, if the hero's gold after the tick covers it. */
export function merchantDeal(result: SimulationResult): { id: 'bag' | 'pouch'; name: string } | undefined {
  const outcome = result.event?.detail.outcome
  if (outcome?.variant !== 'merchant') return undefined
  const gold = result.nextHero.gold
  for (const id of ['bag', 'pouch'] as const) {
    const offer = outcome.offers.find((candidate) => candidate.id === id)
    if (offer !== undefined && offer.price <= gold) return { id, name: offer.name }
  }
  return undefined
}

/**
 * Tick hook: insert an outbox row for each qualifying transition the owner turned on. Reads nothing unless the owner
 * has alerts and the tick produced an event worth one, so ordinary ticks cost no extra read.
 */
export async function queueAlerts(ctx: MutationCtx, args: { owner: Doc<'users'>; hero: Doc<'heroes'>; result: SimulationResult; tick: number; now: number }): Promise<void> {
  const { owner, hero, result, tick, now } = args
  const prefs = owner.alerts
  if (prefs === undefined) return
  const rows: Array<Pick<Doc<'alertOutbox'>, 'kind' | 'notBefore'> & { offerId?: 'bag' | 'pouch'; offerName?: string }> = []
  if (prefs.asleep && hero.status !== 'sleeping' && result.nextHero.status === 'sleeping') rows.push({ kind: 'asleep', notBefore: now + ALERTS.asleepDelayMs })
  if (prefs.merchant) {
    const deal = merchantDeal(result)
    if (deal !== undefined) rows.push({ kind: 'merchant', notBefore: now, offerId: deal.id, offerName: deal.name })
  }
  for (const row of rows) {
    const key = `${hero._id}:${row.kind}:${tick}`
    // The key is the row's identity, so a retried tick inserts nothing more.
    if (await ctx.db.query('alertOutbox').withIndex('by_key', (q) => q.eq('key', key)).first()) continue
    await ctx.db.insert('alertOutbox', { userId: owner._id, heroId: hero._id, key, eventTick: tick, state: 'pending', attempts: 0, createdAt: now, updatedAt: now, ...row })
    await ensureSender(ctx, row.notBefore)
  }
}

/**
 * Make sure one sender run is scheduled no later than `at`. An idle outbox has no run at all; the tick that inserts
 * a row, or a sender run that leaves rows pending, schedules the next.
 */
export async function ensureSender(ctx: MutationCtx, at: number): Promise<void> {
  const now = Date.now()
  const runAt = Math.max(at, now)
  const sender = await ctx.db.query('alertSender').withIndex('by_key', (q) => q.eq('key', 'sender')).unique()
  if (sender?.scheduledId !== undefined) {
    const job = await ctx.db.system.get(sender.scheduledId)
    if (job?.state.kind === 'pending') {
      if ((sender.runAt ?? now) <= runAt) return
      await ctx.scheduler.cancel(sender.scheduledId)
    }
  }
  const scheduledId = await ctx.scheduler.runAt(runAt, internal.alertsPush.deliver, {})
  if (sender) await ctx.db.patch(sender._id, { scheduledId, runAt })
  else await ctx.db.insert('alertSender', { key: 'sender', scheduledId, runAt })
}

/**
 * Slow Cast tick hook (D115): a cooler that filled on this cast (held 30 minutes, like a nap) and a bait that ran out.
 * Reads nothing unless the owner turned the kind on.
 */
export async function queueSlowCastAlerts(ctx: MutationCtx, args: { owner: Doc<'users'>; anglerId: Doc<'anglers'>['_id']; filledCooler: boolean; ranOut: boolean; tick: number; now: number }): Promise<void> {
  const { owner, anglerId, tick, now } = args
  const prefs = owner.alerts
  if (prefs === undefined) return
  const rows: Array<{ kind: AlertKind; notBefore: number }> = []
  if (args.filledCooler && prefs.coolerFull) rows.push({ kind: 'cooler_full', notBefore: now + ALERTS.asleepDelayMs })
  if (args.ranOut && prefs.baitOut) rows.push({ kind: 'bait_out', notBefore: now })
  for (const row of rows) {
    const key = `${anglerId}:${row.kind}:${tick}`
    if (await ctx.db.query('alertOutbox').withIndex('by_key', (q) => q.eq('key', key)).first()) continue
    await ctx.db.insert('alertOutbox', { userId: owner._id, anglerId, key, eventTick: tick, state: 'pending', attempts: 0, createdAt: now, updatedAt: now, ...row })
    await ensureSender(ctx, row.notBefore)
  }
}

/** One sentence in the game's voice, with nothing private on a lock screen, and the page it opens. */
export function alertMessage(row: Pick<Doc<'alertOutbox'>, 'kind' | 'offerName'>, heroName: string): { title: string; body: string; url: string } {
  if (row.kind === 'cooler_full') return { title: 'Your cooler is full', body: 'New catches are being released. Sell some fish to make room.', url: '/app/slow-cast/cooler?alert=cooler_full' }
  if (row.kind === 'bait_out') return { title: 'Out of bait', body: 'Your angler is fishing a bare hook. Restock in the tackle shop.', url: '/app/slow-cast/shop?alert=bait_out' }
  if (row.kind === 'asleep') {
    return { title: `${heroName} is napping`, body: `${heroName}'s bag is full, so they've stopped for a nap. Make room to send them back out.`, url: '/app/desk-crawler/inventory?alert=asleep' }
  }
  return { title: 'A merchant is visiting', body: `A merchant is selling ${heroName} a ${row.offerName ?? 'bigger bag'}, and they have the gold. The offer lasts about an hour.`, url: '/app/desk-crawler/inventory?alert=merchant' }
}
