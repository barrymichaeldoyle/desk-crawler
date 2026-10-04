/**
 * Pure recent-XP score projection with hourly buckets (ranking.md, D31).
 * Times are UTC epoch milliseconds supplied by the caller; nothing reads a clock.
 */
export const HOUR_MS = 3_600_000
export const WINDOW_24H_HOURS = 24
export const WINDOW_7D_HOURS = 168

export interface ScoreBucket {
  readonly hourStart: number
  readonly xp: number
}

export interface ScoreAccumulator {
  readonly scoreHour?: number
  readonly scoreHourXp: number
}

export const hourStart = (timestamp: number): number => Math.floor(timestamp / HOUR_MS) * HOUR_MS

/** Add positive XP to a bucket list, merging into an existing hour. Keeps ascending order. */
export function addToBuckets(buckets: readonly ScoreBucket[], hour: number, xp: number): ScoreBucket[] {
  if (xp <= 0) return [...buckets]
  const existing = buckets.find((bucket) => bucket.hourStart === hour)
  const next = existing
    ? buckets.map((bucket) => (bucket.hourStart === hour ? { hourStart: hour, xp: bucket.xp + xp } : bucket))
    : [...buckets, { hourStart: hour, xp }]
  return next.sort((a, b) => a.hourStart - b.hourStart)
}

/**
 * Per-tick credit. If the accumulator holds an older hour (a publication was
 * missed), return it as `fold` so the caller folds it before crediting.
 */
export function creditTick(
  accumulator: ScoreAccumulator,
  scoreAt: number,
  xpEarned: number,
): { accumulator: ScoreAccumulator; fold?: ScoreBucket } {
  const hour = hourStart(scoreAt)
  const stale = accumulator.scoreHour !== undefined && accumulator.scoreHour !== hour && accumulator.scoreHourXp > 0
  const base = stale || accumulator.scoreHour !== hour ? 0 : accumulator.scoreHourXp
  const next: ScoreAccumulator = xpEarned > 0 || base > 0 ? { scoreHour: hour, scoreHourXp: base + xpEarned } : { scoreHourXp: 0 }
  return stale ? { accumulator: next, fold: { hourStart: accumulator.scoreHour!, xp: accumulator.scoreHourXp } } : { accumulator: next }
}

export interface PublicationScore {
  readonly buckets: ScoreBucket[]
  readonly xp24h: number
  readonly xp7d: number
  readonly accumulator: ScoreAccumulator
}

/**
 * At a publication run: fold the accumulator, expire buckets at/before the
 * seven-day start, and sum windows (scoreHour - duration, scoreHour].
 */
export function projectAtPublication(
  buckets: readonly ScoreBucket[],
  accumulator: ScoreAccumulator,
  scoreAt: number,
): PublicationScore {
  const scoreHour = hourStart(scoreAt)
  let merged = [...buckets]
  if (accumulator.scoreHour !== undefined && accumulator.scoreHourXp > 0) {
    merged = addToBuckets(merged, accumulator.scoreHour, accumulator.scoreHourXp)
  }
  const start7d = scoreHour - WINDOW_7D_HOURS * HOUR_MS
  const start24h = scoreHour - WINDOW_24H_HOURS * HOUR_MS
  const retained = merged.filter((bucket) => bucket.hourStart > start7d && bucket.hourStart <= scoreHour)
  const sum = (from: number) => retained.filter((bucket) => bucket.hourStart > from).reduce((total, bucket) => total + bucket.xp, 0)
  return { buckets: retained, xp24h: sum(start24h), xp7d: sum(start7d), accumulator: { scoreHourXp: 0 } }
}
