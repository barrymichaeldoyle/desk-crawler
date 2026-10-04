import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

/** P01: one logical world tick per quarter-hour, at UTC minutes 13, 28, 43 and 58. */
crons.cron('world tick', '13,28,43,58 * * * *', internal.sim.runs.tick.startTick, {})

/** Stalled-run detection and guarded recovery (simulation.md "Watchdog"). */
crons.interval('tick watchdog', { minutes: 5 }, internal.sim.runs.tick.watchdog, {})

/** Bounded retention cleanup (data-model.md), away from tick slots. */
crons.daily('retention cleanup', { hourUTC: 3, minuteUTC: 5 }, internal.maintenance.cleanup, {})

export default crons
