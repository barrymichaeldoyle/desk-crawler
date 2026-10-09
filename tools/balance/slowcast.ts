/**
 * Slow Cast balance harness (slow-cast.md "Work slices", S1). Runs the real pure
 * core over simulated anglers and player policies and reports the spec's gates.
 *   pnpm balance:slowcast            (200 anglers per policy, 30 days)
 *   pnpm balance:slowcast -- --json  (machine-readable report)
 */
import { contentV1 } from '@trmnl-games/slow-cast/content'
import { canFish, coolerOf, simulateAngler, starterAngler, waterOf, type AnglerState, type BaitClass, type SlowCastCatalog, type WaterId } from '@trmnl-games/slow-cast/sim'
import { buyAccess, buyBait, buyCooler, buyRod, nextCooler, nextRod, sell, tubsThatFit } from '@trmnl-games/slow-cast/sim/shop'
import { deriveAnglerSeeds, forecast } from '@trmnl-games/slow-cast/sim/seed'

export const TICKS_PER_DAY = 96
const SLOT_MS = 15 * 60_000
/** Runs start at local midnight so day boundaries are clean. */
const START = Date.UTC(2026, 10, 1, 0, 5)

export interface Policy {
  readonly name: string
  /** Days between companion visits; 0 never visits. */
  readonly everyDays: number
  /** Local hour of the visit. */
  readonly visitHour?: number
  /** Fish one water with one bait for the whole run (epic checks), with every upgrade owned. */
  readonly fixed?: { readonly water: WaterId; readonly bait: BaitClass }
}

/** Bait a sensible player keeps on the hook at each water. */
export const POLICY_BAIT: Readonly<Record<WaterId, BaitClass>> = { millpond: 'worms', river_bend: 'maggots', harbour_pier: 'ragworm' }

export interface AnglerLog {
  readonly dailyLanded: number[]
  readonly dailyXp: number[]
  readonly dailyGoldEarned: number[]
  readonly dailyBaitSpend: number[]
  levelFourDay: number | null
  pierDay: number | null
  riverDay: number | null
  firstBucketFillHours: number | null
  crateFillHours: number | null
  final: AnglerState | null
  epicsCaught: Record<string, number>
}

function visit(content: SlowCastCatalog, angler: AnglerState, cooler: number[], log: AnglerLog, day: number): { angler: AnglerState; cooler: number[] } {
  // 1. Sell everything in the cooler.
  let next = sell(angler, cooler)
  log.dailyGoldEarned[day]! += cooler.reduce((a, b) => a + b, 0)
  cooler = []
  // 2. Restock the hook bait for the water the angler will fish next.
  const target = bestWater(content, next)
  const bait = POLICY_BAIT[target]
  // Enough bait for about two coolers of kept fish (bait is only used by kept fish and ones that get away).
  const restock = () => {
    const tub = content.baits.find((b) => b.class === bait)!.castsPerTub
    const want = Math.max(0, coolerOf(content, next.coolerTier).capacity * 2 - (next.bait[bait] ?? 0))
    const fit = Math.min(tubsThatFit(content, next, bait), Math.ceil(want / tub))
    for (let tubs = fit; tubs > 0; tubs -= 1) {
      const bought = buyBait(content, next, bait, tubs)
      if (bought.ok) {
        next = bought.angler
        log.dailyBaitSpend[day]! += bought.spent
        return
      }
    }
  }
  restock()
  // 3. Upgrades in a sensible order, saving for the next one when it is not affordable.
  for (;;) {
    const options: Array<() => ReturnType<typeof buyRod>> = []
    if (nextCooler(content, next)?.tier === 2) options.push(() => buyCooler(content, next))
    if (next.level >= 4 && !next.access.includes('waders')) options.push(() => buyAccess(content, next, 'waders'))
    if (nextRod(content, next)?.tier === 2) options.push(() => buyRod(content, next))
    if (nextCooler(content, next)?.tier === 3) options.push(() => buyCooler(content, next))
    if (nextRod(content, next)?.tier === 3) options.push(() => buyRod(content, next))
    if (next.level >= 8 && !next.access.includes('pier_permit')) options.push(() => buyAccess(content, next, 'pier_permit'))
    if (nextCooler(content, next)?.tier === 4) options.push(() => buyCooler(content, next))
    if (nextRod(content, next)?.tier === 4) options.push(() => buyRod(content, next))
    const first = options[0]
    if (!first) break
    const bought = first()
    if (!bought.ok) break
    next = bought.angler
  }
  // 4. Move to the best open water and put its bait on.
  const water = bestWater(content, next)
  if (water !== next.waterId) next = { ...next, travelTo: water }
  next = { ...next, baitOnHook: POLICY_BAIT[water] }
  if ((next.bait[POLICY_BAIT[water]] ?? 0) === 0) restock()
  return { angler: next, cooler }
}

/** The newest water the angler can fish, needing the Carbon Rod before the pier. */
function bestWater(content: SlowCastCatalog, angler: AnglerState): WaterId {
  if (canFish(content, angler, 'harbour_pier') && angler.rodTier >= 3) return 'harbour_pier'
  if (canFish(content, angler, 'river_bend')) return 'river_bend'
  return 'millpond'
}

export function simulateAnglerRun(policy: Policy, index: number, days: number, content: SlowCastCatalog = contentV1): AnglerLog {
  const worldSeed = `harness-${index}`
  const id = `angler-${policy.name}-${index}`
  let angler = starterAngler(content, 0)
  if (policy.fixed) {
    angler = { ...angler, level: 20, rodTier: 4, coolerTier: 4, access: ['waders', 'pier_permit'], waterId: policy.fixed.water, baitOnHook: policy.fixed.bait, bait: { [policy.fixed.bait]: content.baitCap } }
  }
  let cooler: number[] = []
  const log: AnglerLog = {
    dailyLanded: Array(days).fill(0),
    dailyXp: Array(days).fill(0),
    dailyGoldEarned: Array(days).fill(0),
    dailyBaitSpend: Array(days).fill(0),
    levelFourDay: null,
    pierDay: null,
    riverDay: null,
    firstBucketFillHours: null,
    crateFillHours: null,
    final: null,
    epicsCaught: {},
  }
  let crateBoughtTick: number | null = null
  const visitHour = policy.visitHour ?? 19
  for (let tick = 1; tick <= days * TICKS_PER_DAY; tick += 1) {
    const at = START + (tick - 1) * SLOT_MS
    const day = Math.floor((tick - 1) / TICKS_PER_DAY)
    const hour = new Date(at).getUTCHours()
    if (policy.fixed) {
      // Epic checks: sold and restocked every tick so the cooler and bait never limit the catch.
      cooler = []
      angler = { ...angler, bait: { [policy.fixed.bait]: content.baitCap } }
    } else if (policy.everyDays > 0 && day % policy.everyDays === 0 && hour === visitHour && new Date(at).getUTCMinutes() === 5) {
      const hadCrate = angler.coolerTier === 4
      ;({ angler, cooler } = visit(content, angler, cooler, log, day))
      if (!hadCrate && angler.coolerTier === 4) crateBoughtTick = tick
    }
    const water = waterOf(content, angler.travelTo ?? angler.waterId)
    const result = simulateAngler({
      angler,
      coolerCount: cooler.length,
      tick,
      tickAt: at,
      weather: forecast(worldSeed, water, at),
      content,
      streams: deriveAnglerSeeds(worldSeed, id, tick, 1),
    })
    angler = result.angler
    if (result.catch) cooler.push(result.catch.value)
    log.dailyLanded[day]! += result.metrics.landed
    log.dailyXp[day]! += result.event?.deltas.xpEarned ?? 0
    if (result.event?.detail.speciesId && result.metrics.landed && content.species.find((s) => s.id === result.event!.detail.speciesId)?.rarity === 'epic') {
      log.epicsCaught[result.event.detail.speciesId] = (log.epicsCaught[result.event.detail.speciesId] ?? 0) + 1
    }
    if (log.levelFourDay === null && angler.level >= 4) log.levelFourDay = tick / TICKS_PER_DAY
    if (log.riverDay === null && angler.waterId === 'river_bend') log.riverDay = tick / TICKS_PER_DAY
    if (log.pierDay === null && angler.waterId === 'harbour_pier') log.pierDay = tick / TICKS_PER_DAY
    if (log.firstBucketFillHours === null && cooler.length >= 6 && angler.coolerTier === 1) log.firstBucketFillHours = tick / 4
    if (crateBoughtTick !== null && log.crateFillHours === null && cooler.length >= 24) log.crateFillHours = (tick - crateBoughtTick) / 4
  }
  log.final = angler
  return log
}

const median = (values: number[]): number | null => {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}
const round = (value: number | null, places = 2) => (value === null ? null : Math.round(value * 10 ** places) / 10 ** places)
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

export interface Gate {
  readonly name: string
  readonly value: number | null
  readonly min: number
  readonly max: number
  readonly pass: boolean
}

const gate = (name: string, value: number | null, min: number, max: number): Gate => ({ name, value: round(value), min, max, pass: value !== null && value >= min && value <= max })

export interface Report {
  readonly anglers: number
  readonly days: number
  readonly gates: Gate[]
  readonly detail: Record<string, unknown>
}

export function runHarness(anglers = 200, days = 30, content: SlowCastCatalog = contentV1): Report {
  const cohort = (policy: Policy) => Array.from({ length: anglers }, (_, i) => simulateAnglerRun(policy, i, days, content))
  const daily = cohort({ name: 'daily', everyDays: 1 })
  const threeDay = cohort({ name: 'three-day', everyDays: 3 })
  const never = cohort({ name: 'never', everyDays: 0 })
  const epics = content.species.filter((s) => s.rarity === 'epic')
  const epicShare: Record<string, number> = {}
  for (const epic of epics) {
    const runs = Array.from({ length: Math.max(20, Math.floor(anglers / 4)) }, (_, i) => simulateAnglerRun({ name: `epic-${epic.id}`, everyDays: 0, fixed: { water: epic.water, bait: epic.baits[0]! } }, i, days, content))
    epicShare[epic.id] = runs.filter((log) => (log.epicsCaught[epic.id] ?? 0) > 0).length / runs.length
  }
  const millpondFishPerDay = median(daily.map((log) => (log.dailyLanded[0]! + log.dailyLanded[1]!) / 2))
  const baitShare = sum(daily.map((log) => sum(log.dailyBaitSpend))) / Math.max(1, sum(daily.map((log) => sum(log.dailyGoldEarned))))
  const gates = [
    gate('Millpond fish a day, first two days (daily player)', millpondFishPerDay, 10, 14),
    gate('Days to level 4 (daily player)', median(daily.map((log) => log.levelFourDay ?? days + 1)), 2, 3),
    gate('Days to reach the Harbour Pier (daily player)', median(daily.map((log) => log.pierDay ?? days + 1)), 10, 16),
    gate('Hours to fill the Bucket the first time', median(daily.map((log) => log.firstBucketFillHours ?? days * 24)), 8, 14),
    // A daily seller never lets the crate fill, so the gate reads the end-game catch rate: hours for 24 fish.
    gate('Hours to fill the Dockside Crate at the last week\'s catch rate (daily player)', median(daily.map((log) => (24 * 24) / Math.max(0.01, sum(log.dailyLanded.slice(-7)) / 7))), 36, 60),
    gate('Bait spend as a share of fish sales (daily player)', baitShare, 0.15, 0.4),
    // Added in S1: a player who visits every three days still moves on, more slowly.
    gate('Days to reach River Bend (three-day player)', median(threeDay.map((log) => log.riverDay ?? days + 1)), 3, 12),
    gate('Days to reach the Harbour Pier (three-day player)', median(threeDay.map((log) => log.pierDay ?? days + 1)), 14, 30),
    gate('Level after 30 days, never visiting', median(never.map((log) => log.final!.level)), 4, 99),
    gate('Species logged after 30 days, never visiting', median(never.map((log) => Object.keys(log.final!.logbook).length)), 3, 99),
    ...epics.map((epic) => gate(`Share catching a ${epic.name} in 30 days at its water`, epicShare[epic.id]!, 0.5, 1)),
  ]
  const policyDetail = (logs: AnglerLog[]) => ({
    level: median(logs.map((log) => log.final!.level)),
    species: median(logs.map((log) => Object.keys(log.final!.logbook).length)),
    gold: median(logs.map((log) => log.final!.gold)),
    rodTier: median(logs.map((log) => log.final!.rodTier)),
    coolerTier: median(logs.map((log) => log.final!.coolerTier)),
    released: median(logs.map((log) => log.final!.counters.released)),
    gotAway: median(logs.map((log) => log.final!.counters.gotAway)),
    landedPerDayLastWeek: round(median(logs.map((log) => sum(log.dailyLanded.slice(-7)) / 7))),
    xpPerDayLastWeek: round(median(logs.map((log) => sum(log.dailyXp.slice(-7)) / 7))),
    riverDay: round(median(logs.map((log) => log.riverDay ?? days + 1))),
    pierDay: round(median(logs.map((log) => log.pierDay ?? days + 1))),
  })
  return { anglers, days, gates, detail: { daily: policyDetail(daily), threeDay: policyDetail(threeDay), never: policyDetail(never), epicShare } }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = runHarness()
  if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2))
  else {
    for (const g of report.gates) console.log(`${g.pass ? 'PASS' : 'FAIL'}  ${g.name}: ${g.value} (gate ${g.min} to ${g.max})`)
    console.log(JSON.stringify(report.detail, null, 2))
  }
}
