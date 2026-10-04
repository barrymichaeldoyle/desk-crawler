import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

/** D42: one logical world tick per quarter-hour, on the hour and at minutes 15, 30 and 45 UTC. */
crons.cron('world tick', '0,15,30,45 * * * *', internal.sim.runs.tick.startTick, {})

/** Stalled-run detection and guarded recovery (simulation.md "Watchdog"). */
crons.interval('tick watchdog', { minutes: 5 }, internal.sim.runs.tick.watchdog, {})

/** Bounded retention cleanup (data-model.md), away from tick slots. */
crons.daily('retention cleanup', { hourUTC: 3, minuteUTC: 5 }, internal.maintenance.cleanup, {})

export default crons
