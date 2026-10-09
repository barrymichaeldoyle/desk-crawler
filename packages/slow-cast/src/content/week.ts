/** The weekly code's week, Monday 00:00 UTC, the same calendar as Desk Crawler's keepsakes (D46). */
const MONDAY_EPOCH = Date.UTC(1970, 0, 5)
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000
export const keepsakeWeek = (now: number) => Math.floor((now - MONDAY_EPOCH) / WEEK_MS)
export const keepsakeWeekStartsAt = (week: number) => MONDAY_EPOCH + week * WEEK_MS
