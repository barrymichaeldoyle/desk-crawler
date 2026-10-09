/**
 * World tick schedule (D42): one tick per quarter-hour. Each game picks its own
 * offset inside the quarter so two worlds never tick in the same slot
 * (Desk Crawler at :00, :15, :30, :45; Slow Cast at :05, :20, :35, :50).
 * Shared by the scheduler and the companion countdown so they can never disagree.
 */
export const SLOT_MS = 15 * 60 * 1000

export interface TickSchedule {
  readonly SLOT_MS: number
  readonly SLOT_OFFSET_MS: number
  /** The scheduled wall slot a timestamp belongs to (e.g. 10:15:04 -> 10:15:00 at offset 0). */
  wallSlotFor(now: number): number
  /** When the next tick is due to start after `now`. */
  nextSlotAfter(now: number): number
  /** Expected start of the tick `ticksAhead` ticks from now (1 = the next one). */
  slotEta(now: number, ticksAhead: number): number
  /** The cron minutes this schedule ticks on, for `crons.cron`. */
  readonly cronMinutes: string
}

export function makeSchedule(offsetMs: number): TickSchedule {
  if (!Number.isInteger(offsetMs) || offsetMs < 0 || offsetMs >= SLOT_MS) throw new RangeError(`slot offset ${offsetMs} must be within one slot`)
  const wallSlotFor = (now: number): number => Math.floor((now - offsetMs) / SLOT_MS) * SLOT_MS + offsetMs
  const nextSlotAfter = (now: number): number => wallSlotFor(now) + SLOT_MS
  const slotEta = (now: number, ticksAhead: number): number => nextSlotAfter(now) + Math.max(0, ticksAhead - 1) * SLOT_MS
  const minute = offsetMs / 60_000
  return { SLOT_MS, SLOT_OFFSET_MS: offsetMs, wallSlotFor, nextSlotAfter, slotEta, cronMinutes: [0, 15, 30, 45].map((m) => m + minute).join(',') }
}
