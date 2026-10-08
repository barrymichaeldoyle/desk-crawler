/**
 * Desk raids harness (D110, slice R1). Runs a whole world of heroes tick by tick with the real pure simulator,
 * a synthetic raid pool (fixed random shards, a per-target cooldown) and a synthetic ledger (raider inserts,
 * target applies at its next evaluation), then the same world without raid seeds as the baseline. Usage:
 *   pnpm balance:raids [--heroes 300] [--days 30] [--policy three-day] [--content v7] [--json out.json]
 * Heroes take the three stances in turn. Never touches a database.
 */
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { catalogs, type CatalogId } from '@trmnl-games/desk-crawler/content'
import { applyItemChanges } from '@trmnl-games/desk-crawler/sim/core/apply'
import { effectiveStats } from '@trmnl-games/desk-crawler/sim/core/modifiers'
import { planRaid, raidWinChance } from '@trmnl-games/desk-crawler/sim/core/raid'
import { createRng } from '@trmnl-games/desk-crawler/sim/core/rng'
import { simulateHero, SIMULATION_VERSION } from '@trmnl-games/desk-crawler/sim/core/simulate'
import { starterHero, starterKit } from '@trmnl-games/desk-crawler/sim/core/starter'
import type { ContentCatalog, HeroState, IncomingRaid, ItemSnapshot, RaidTarget, StanceId, StreamSeeds } from '@trmnl-games/desk-crawler/sim/core/types'
import { POLICIES, visit, type Policy } from './run'

const TICKS_PER_DAY = 96
const STANCES: readonly StanceId[] = ['cautious', 'balanced', 'bold']

/** The run.ts per-hero/tick streams plus a fifth `raid` seed drawn after them, so the first four are unchanged. */
function streams(heroIndex: number, tick: number, raids: boolean): StreamSeeds {
  const base = createRng((heroIndex * 0x9e3779b1 + tick * 0x85ebca77) >>> 0)
  const next = () => Math.floor(base.next() * 2 ** 32)
  const seeds = { encounter: next(), combat: next(), reward: next(), narrative: next() }
  return raids ? { ...seeds, raid: next() } : seeds
}

interface HeroRun {
  readonly index: number
  readonly stance: StanceId
  readonly name: string
  hero: HeroState
  inventory: ItemSnapshot[]
  nextId: number
  recentSummaries: string[]
  /** Pending ledger rows against this hero, oldest first. */
  pending: IncomingRaid[]
  raidedAtTick: number
  revivedAtTick?: number
  deathDays: Set<number>
  raidDeaths: number
  /** Raid knockouts within the revival window of an earlier knockout. */
  doubleKnockouts: number
  raidHpLost: number
  raidGoldNet: number
  launches: number
  noTarget: number
  targeted: number
  raidDays: Set<number>
  reachTick: Map<number, number>
}

interface Pairing {
  raids: number
  raiderWins: number
}

export interface WorldReport {
  stances: Record<StanceId, StanceReport>
  pairings: Record<string, { raids: number; raiderWinPct: number; expectedPct: number; z: number }>
  gold: { moved: number; clampGap: number; earned: number; clampGapPctOfMoved: number; movedPctOfEarned: number }
  targetedPerHero: { p10: number; median: number; p90: number; max: number }
}

export interface StanceReport {
  heroes: number
  launchesPerHeroDay: number
  noTargetSharePct: number
  raidsInvolvedPerHeroDay: number
  heroDaysWithRaidPct: number
  raidHpLostPerHeroDay: number
  raidGoldNetPerHeroDay: number
  knockoutDayPct: number
  raidKnockoutsPerHeroDay: number
  doubleKnockouts: number
  level8MedianDays: number | string
  level12MedianDays: number | string
  finalGoldMedian: number
}

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? NaN
}
const percentile = (values: readonly number[], p: number): number => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? NaN
}
const round = (n: number, places = 2) => Math.round(n * 10 ** places) / 10 ** places

export function simulateWorld(content: ContentCatalog, heroes: number, days: number, policy: Policy, raids: boolean): { runs: HeroRun[]; report: WorldReport } {
  const ticks = days * TICKS_PER_DAY
  const kit = starterKit(content)
  const runs: HeroRun[] = []
  for (let index = 0; index < heroes; index += 1) {
    const stance = STANCES[index % STANCES.length]!
    const run: HeroRun = {
      index,
      stance,
      name: `Hero ${index}`,
      hero: undefined as unknown as HeroState,
      inventory: [],
      nextId: 0,
      recentSummaries: [],
      pending: [],
      raidedAtTick: -Infinity,
      deathDays: new Set(),
      raidDeaths: 0,
      doubleKnockouts: 0,
      raidHpLost: 0,
      raidGoldNet: 0,
      launches: 0,
      noTarget: 0,
      targeted: 0,
      raidDays: new Set(),
      reachTick: new Map(),
    }
    const id = () => `h${String(run.nextId++).padStart(6, '0')}`
    run.inventory = [{ ...kit.weapon, id: id() }, { ...kit.armor, id: id() }, { ...kit.potions, id: id() }]
    run.hero = { ...starterHero(`hero-${index}`, content, 0), weaponId: run.inventory[0]!.id, armorId: run.inventory[1]!.id, stance }
    runs.push(run)
  }
  // The pool: one row per hero at a fixed random shard, ordered by shard.
  const shardRng = createRng(0x5eed)
  const pool = runs.map((run) => ({ shard: Math.floor(shardRng.next() * 2 ** 32), run })).sort((a, b) => a.shard - b.shard)
  const pick = (shard: number): HeroRun => {
    let lo = 0
    let hi = pool.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (pool[mid]!.shard < shard) lo = mid + 1
      else hi = mid
    }
    return pool[lo === pool.length ? 0 : lo]!.run
  }
  const pairings = new Map<string, Pairing>()
  let moved = 0
  let clampGap = 0
  const cooldown = content.raids?.targetCooldownTicks ?? 0

  for (let tick = 1; tick <= ticks; tick += 1) {
    const day = Math.floor((tick - 1) / TICKS_PER_DAY)
    for (const run of runs) {
      const offset = (run.index * 37) % TICKS_PER_DAY
      if (policy.everyDays > 0 && (tick - offset) % (policy.everyDays * TICKS_PER_DAY) === 0) {
        ;({ hero: run.hero, inventory: run.inventory } = visit(run.hero, run.inventory, tick, content, policy))
      }
      const seeds = streams(run.index, tick, raids)
      let raidTarget: RaidTarget | undefined
      const plan = raids ? planRaid(seeds, run.hero.stance, content) : undefined
      let candidate: HeroRun | undefined
      if (plan !== undefined) {
        candidate = pick(plan.shard)
        const eligible = candidate !== run && (candidate.hero.status === 'exploring' || candidate.hero.status === 'resting') && tick - candidate.raidedAtTick >= cooldown
        if (eligible) {
          const thrifty = effectiveStats(content, candidate.hero, candidate.inventory, tick).modifiers.goldLossPct
          raidTarget = { heroId: candidate.hero.id, name: candidate.name, gold: candidate.hero.gold, ...(candidate.hero.stance ? { stance: candidate.hero.stance } : {}), ...(thrifty > 0 ? { goldLossPct: thrifty } : {}) }
        } else candidate = undefined
      }
      const incomingRaid = run.pending[0]
      const before = run.hero
      const result = simulateHero({
        hero: run.hero,
        inventory: run.inventory,
        tick,
        content,
        simulationVersion: SIMULATION_VERSION,
        streams: seeds,
        recentSummaries: run.recentSummaries,
        ...(raidTarget ? { raidTarget } : {}),
        ...(incomingRaid ? { incomingRaid } : {}),
      })
      if (result.event) run.recentSummaries = [result.event.summary, ...run.recentSummaries].slice(0, 2)
      // The launch draw hit and the tick reached its encounter, but nobody raidable was at the picked desk.
      if (plan !== undefined && candidate === undefined && result.metrics.encounter !== 'none') run.noTarget += 1
      const outcome = result.event?.detail.outcome
      if (result.raidLaunch && candidate) {
        const launch = result.raidLaunch
        run.launches += 1
        candidate.raidedAtTick = tick
        // The picked row moves to a fresh random shard, as the adapter will patch it.
        const at = pool.findIndex((row) => row.run === candidate)
        const [row] = pool.splice(at, 1)
        row!.shard = plan!.reshard
        let to = pool.findIndex((other) => other.shard >= row!.shard)
        if (to < 0) to = pool.length
        pool.splice(to, 0, row!)
        candidate.targeted += 1
        candidate.pending.push({ raiderHeroId: run.hero.id, raiderName: run.name, tick, raiderWon: launch.raiderWon, gold: launch.gold, targetHpPct: launch.targetHpPct })
        const key = `${run.stance}>${candidate.stance}`
        const pairing = pairings.get(key) ?? { raids: 0, raiderWins: 0 }
        pairing.raids += 1
        if (launch.raiderWon) pairing.raiderWins += 1
        pairings.set(key, pairing)
        moved += launch.gold
      }
      if (result.raidApplied) {
        const applied = run.pending.shift()!
        if (outcome?.variant === 'raid' && !outcome.won) clampGap += applied.gold - outcome.gold
      }
      if (outcome?.variant === 'raid') {
        run.raidDays.add(day)
        run.raidHpLost += outcome.hpLost
        run.raidGoldNet += outcome.won ? outcome.gold : -outcome.gold
        if (outcome.outcome === 'death') {
          run.raidDeaths += 1
          if (run.revivedAtTick !== undefined && tick - run.revivedAtTick <= content.constants.reviveAfterTicks) run.doubleKnockouts += 1
        }
      }
      if (result.metrics.deaths) run.deathDays.add(day)
      if (result.disposition === 'revived') run.revivedAtTick = tick
      const id = () => `h${String(run.nextId++).padStart(6, '0')}`
      ;({ hero: run.hero, inventory: run.inventory } = applyItemChanges(result.nextHero, run.inventory, result.itemChanges, id))
      for (let level = before.level + 1; level <= run.hero.level; level += 1) if (!run.reachTick.has(level)) run.reachTick.set(level, tick)
    }
  }

  const byStance = Object.fromEntries(
    STANCES.map((stance) => {
      const group = runs.filter((run) => run.stance === stance)
      const heroDays = group.length * days
      const sum = (f: (run: HeroRun) => number) => group.reduce((total, run) => total + f(run), 0)
      const reach = (level: number): number | string => {
        const values = group.map((run) => (run.reachTick.has(level) ? run.reachTick.get(level)! / TICKS_PER_DAY : Infinity))
        const m = median(values)
        return Number.isFinite(m) ? round(m, 1) : `>${days}`
      }
      const attempts = sum((run) => run.launches + run.noTarget)
      const report: StanceReport = {
        heroes: group.length,
        launchesPerHeroDay: round(sum((run) => run.launches) / heroDays, 3),
        noTargetSharePct: attempts ? round((sum((run) => run.noTarget) / attempts) * 100, 1) : 0,
        raidsInvolvedPerHeroDay: round(sum((run) => run.launches + run.targeted) / heroDays, 3),
        heroDaysWithRaidPct: round((sum((run) => run.raidDays.size) / heroDays) * 100, 1),
        raidHpLostPerHeroDay: round(sum((run) => run.raidHpLost) / heroDays, 1),
        raidGoldNetPerHeroDay: round(sum((run) => run.raidGoldNet) / heroDays, 2),
        knockoutDayPct: round((sum((run) => run.deathDays.size) / heroDays) * 100, 2),
        raidKnockoutsPerHeroDay: round(sum((run) => run.raidDeaths) / heroDays, 4),
        doubleKnockouts: sum((run) => run.doubleKnockouts),
        level8MedianDays: reach(8),
        level12MedianDays: reach(12),
        finalGoldMedian: median(group.map((run) => run.hero.gold)),
      }
      return [stance, report]
    }),
  ) as Record<StanceId, StanceReport>

  const pairingReport: WorldReport['pairings'] = {}
  for (const raider of STANCES) {
    for (const target of STANCES) {
      const key = `${raider}>${target}`
      const pairing = pairings.get(key) ?? { raids: 0, raiderWins: 0 }
      const expected = content.raids ? raidWinChance(content, raider, target) : 0
      const p = expected / 100
      const z = pairing.raids ? (pairing.raiderWins - pairing.raids * p) / Math.sqrt(pairing.raids * p * (1 - p)) : 0
      pairingReport[key] = { raids: pairing.raids, raiderWinPct: pairing.raids ? round((pairing.raiderWins / pairing.raids) * 100, 1) : 0, expectedPct: expected, z: round(z, 2) }
    }
  }
  const earned = runs.reduce((total, run) => total + run.hero.counters.goldEarned, 0)
  const targeted = runs.map((run) => run.targeted)
  return {
    runs,
    report: {
      stances: byStance,
      pairings: pairingReport,
      gold: { moved, clampGap, earned, clampGapPctOfMoved: moved ? round((clampGap / moved) * 100, 3) : 0, movedPctOfEarned: earned ? round((moved / earned) * 100, 2) : 0 },
      targetedPerHero: { p10: percentile(targeted, 0.1), median: percentile(targeted, 0.5), p90: percentile(targeted, 0.9), max: Math.max(...targeted) },
    },
  }
}

function args() {
  const argv = process.argv.slice(2)
  const get = (flag: string, fallback: string) => {
    const i = argv.indexOf(flag)
    return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1]! : fallback
  }
  return { heroes: Number(get('--heroes', '300')), days: Number(get('--days', '30')), policy: get('--policy', 'three-day'), content: get('--content', 'v7') as CatalogId, json: get('--json', '') }
}

function main() {
  const options = args()
  const content = catalogs[options.content]
  if (!content?.raids) throw new Error(`content ${options.content} has no raid rules`)
  const policy = POLICIES.find((p) => p.name === options.policy)
  if (!policy) throw new Error(`unknown policy ${options.policy}`)
  if (!Number.isSafeInteger(options.heroes) || options.heroes < 3 || options.heroes > 3000) throw new Error('--heroes must be an integer from 3 to 3000')
  if (!Number.isSafeInteger(options.days) || options.days < 1 || options.days > 120) throw new Error('--days must be an integer from 1 to 120')
  const started = Date.now()
  const withRaids = simulateWorld(content, options.heroes, options.days, policy, true).report
  const baseline = simulateWorld(content, options.heroes, options.days, policy, false).report
  const meta = { reportVersion: 1, contentVersion: content.contentVersion, simulationVersion: SIMULATION_VERSION, heroes: options.heroes, days: options.days, policy: policy.name, raids: content.raids, seconds: (Date.now() - started) / 1000 }
  const { narrative: _narrative, ...rules } = content.raids
  const out = { meta: { ...meta, raids: rules }, withRaids, baseline: { stances: baseline.stances } }
  if (options.json) writeFileSync(options.json, JSON.stringify(out, null, 2) + '\n')
  console.log(JSON.stringify(out.meta))
  for (const stance of STANCES) {
    const r = withRaids.stances[stance]
    const b = baseline.stances[stance]
    console.log(`\n== ${stance} (${r.heroes} heroes)`)
    console.log(`  launches/hero-day ${r.launchesPerHeroDay}; no target ${r.noTargetSharePct}%; raids involved/hero-day ${r.raidsInvolvedPerHeroDay}; hero-days with a raid ${r.heroDaysWithRaidPct}%`)
    console.log(`  raid HP lost/hero-day ${r.raidHpLostPerHeroDay}; raid gold net/hero-day ${r.raidGoldNetPerHeroDay}`)
    console.log(`  knockout hero-days ${r.knockoutDayPct}% (baseline ${b.knockoutDayPct}%); raid knockouts/hero-day ${r.raidKnockoutsPerHeroDay}; double knockouts ${r.doubleKnockouts}`)
    console.log(`  L8 median ${r.level8MedianDays}d (baseline ${b.level8MedianDays}d); L12 ${r.level12MedianDays}d (${b.level12MedianDays}d); final gold median ${r.finalGoldMedian} (${b.finalGoldMedian})`)
  }
  console.log('\npairings (raider>target): ' + Object.entries(withRaids.pairings).map(([k, v]) => `${k} ${v.raiderWinPct}%/${v.expectedPct}% n=${v.raids} z=${v.z}`).join('; '))
  console.log(`gold ${JSON.stringify(withRaids.gold)}; targeted per hero ${JSON.stringify(withRaids.targetedPerHero)}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
