import { makeSchedule } from '@trmnl-games/engine/schedule'

/** Desk Crawler ticks on the quarter-hour exactly (D42): offset 0 within the shared engine schedule. */
const schedule = makeSchedule(0)
export const SLOT_MS = schedule.SLOT_MS
export const SLOT_OFFSET_MS = schedule.SLOT_OFFSET_MS
export const wallSlotFor = schedule.wallSlotFor
export const nextSlotAfter = schedule.nextSlotAfter
export const slotEta = schedule.slotEta
export const CRON_MINUTES = schedule.cronMinutes
