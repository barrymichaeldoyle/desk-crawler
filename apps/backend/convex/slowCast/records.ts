import type { WaterId } from '@trmnl-games/slow-cast/sim'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { currentAngler } from './profile'

/**
 * Slow Cast boards (2026-10-10): the heaviest fish each angler has landed at each water, this week and of all time.
 * Written as fish land (records the tick's catches); read with fixed, indexed reads. Desk Crawler ranks by XP;
 * Slow Cast has no XP and ranks by the fish itself.
 */

export type Period = 'week' | 'all'

/** Rows a board reads: the shown entries, and how far down the angler's own rank is looked for. */
export const BOARD_DEPTH = 100

const DAY_MS = 86_400_000

/** The week's key: its Monday in UTC, "w2026-10-05". */
export function weekKey(at: number): string {
  const day = new Date(at)
  const sinceMonday = (day.getUTCDay() + 6) % 7
  const monday = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()) - sinceMonday * DAY_MS)
  return `w${monday.toISOString().slice(0, 10)}`
}

/** The next Monday 00:00 UTC after `at`, when the weekly boards start again. */
export function weekEndsAt(at: number): number {
  return Date.parse(`${weekKey(at).slice(1)}T00:00:00Z`) + 7 * DAY_MS
}

export const periodKey = (period: Period, at: number) => (period === 'all' ? 'all' : weekKey(at))

/** Keep the heavier of a landed fish and the angler's row for its water, this week and all time. */
export async function recordCatch(ctx: MutationCtx, angler: Doc<'anglers'>, fish: { waterId: WaterId; speciesId: string; grams: number }, at: number): Promise<void> {
  for (const period of [weekKey(at), 'all']) {
    const existing = await ctx.db
      .query('swCatchRecords')
      .withIndex('by_anglerId_and_waterId_and_period', (q) => q.eq('anglerId', angler._id).eq('waterId', fish.waterId).eq('period', period))
      .unique()
    const row = { speciesId: fish.speciesId, grams: fish.grams, at, earlierFirst: -at }
    if (existing === null) await ctx.db.insert('swCatchRecords', { waterId: fish.waterId, period, anglerId: angler._id, userId: angler.userId, ...row })
    else if (fish.grams > existing.grams) await ctx.db.patch(existing._id, row)
  }
}

export type BoardRow = { rank: number; name: string; speciesId: string; grams: number; own: boolean; profile: boolean }

/**
 * A water's board: its first `limit` rows by weight, and the viewer's own row and rank when it is within
 * `BOARD_DEPTH`. Names are the owner's current public name; a row whose owner is gone, suspended or deleting, or whose
 * angler is no longer the owner's own, reads "Hidden player".
 */
export async function readBoard(ctx: QueryCtx, waterId: WaterId, period: string, viewer: Id<'anglers'> | null, limit: number) {
  const rows = await ctx.db
    .query('swCatchRecords')
    .withIndex('by_waterId_and_period_and_grams', (q) => q.eq('waterId', waterId).eq('period', period))
    .order('desc')
    .take(BOARD_DEPTH)
  const shown = rows.slice(0, limit)
  const owners = await Promise.all(shown.map((row) => ctx.db.get(row.userId)))
  const anglers = await Promise.all(owners.map((owner) => currentAngler(ctx, owner ?? null)))
  const entries: BoardRow[] = shown.map((row, index) => {
    const owner = owners[index]
    const visible = owner !== null && owner !== undefined && owner.state === 'active' && anglers[index]?._id === row.anglerId
    return { rank: index + 1, name: visible ? owner.publicAlias : 'Hidden player', speciesId: row.speciesId, grams: row.grams, own: row.anglerId === viewer, profile: visible && anglers[index]?.publicProfile === true }
  })
  const ownIndex = viewer === null ? -1 : rows.findIndex((row) => row.anglerId === viewer)
  const ownRow = viewer === null ? null : ownIndex >= 0 ? rows[ownIndex]! : await ctx.db.query('swCatchRecords').withIndex('by_anglerId_and_waterId_and_period', (q) => q.eq('anglerId', viewer).eq('waterId', waterId).eq('period', period)).unique()
  return {
    entries,
    own: ownRow ? { rank: ownIndex >= 0 ? ownIndex + 1 : null, speciesId: ownRow.speciesId, grams: ownRow.grams } : null,
    full: rows.length === BOARD_DEPTH,
  }
}
