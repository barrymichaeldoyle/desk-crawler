/**
 * World tick schedule (D42): one tick per quarter-hour on the hour and at
 * minutes 15, 30 and 45 UTC. Shared by the scheduler and the companion countdown so they can
 * never disagree.
 */
export const SLOT_MS = 15 * 60 * 1000
export const SLOT_OFFSET_MS = 0

/** The scheduled wall slot a timestamp belongs to (e.g. 10:15:04 -> 10:15:00). */
export const wallSlotFor = (now: number): number => Math.floor((now - SLOT_OFFSET_MS) / SLOT_MS) * SLOT_MS + SLOT_OFFSET_MS

/** When the next tick is due to start after `now`. */
export const nextSlotAfter = (now: number): number => wallSlotFor(now) + SLOT_MS

/** Expected start of the tick `ticksAhead` ticks from now (1 = the next one). */
export const slotEta = (now: number, ticksAhead: number): number => nextSlotAfter(now) + Math.max(0, ticksAhead - 1) * SLOT_MS
