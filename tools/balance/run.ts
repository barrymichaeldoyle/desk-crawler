/**
 * Deterministic balance harness (quality.md, A03). Runs the real pure simulator
 * in memory; never touches a database. Usage:
 *   pnpm balance [--heroes 500] [--days 30] [--content v2] [--json out.json]
 */
import { writeFileSync } from 'node:fs'
import { catalogs, type CatalogId } from '@trmnl-games/desk-crawler/content'
import { applyItemChanges } from '@trmnl-games/desk-crawler/sim/core/apply'
import { simulateHero, SIMULATION_VERSION } from '@trmnl-games/desk-crawler/sim/core/simulate'
import { starterHero, starterKit } from '@trmnl-games/desk-crawler/sim/core/starter'
import { cumulativeXpToReach } from '@trmnl-games/desk-crawler/sim/core/stats'
import type { ContentCatalog, HeroState, ItemSnapshot } from '@trmnl-games/desk-crawler/sim/core/types'
import { createRng } from '@trmnl-games/desk-crawler/sim/core/rng'

const TICKS_PER_DAY = 96

type Mutable<T> = { -readonly [K in keyof T]: T[K] }

interface Policy {
  readonly name: string
  /** Days between visits; 0 never visits. */
  readonly everyDays: number
}

const POLICIES: readonly Policy[] = [
  { name: 'unattended', everyDays: 0 },
  { name: 'daily', everyDays: 1 },
  { name: 'three-day', everyDays: 3 },
  { name: 'seven-day', everyDays: 7 },
]

interface HeroLog {
  reachTick: Map<number, number>
  firstSleepTick?: number
  bestInSlotTick?: number
  deathsByBiome: Map<string, number>
  exploringTicksByBiome: Map<string, number>
  stateTicks: Map<string, number>
  gearFound: number
  elites: number
  jackpots: number
  jackpotGold: number
  goldEarned: number
  dailyXp: number[]
  finalLevel: number
  finalGold: number
  goldDay30?: number
}

function args() {
  const argv = process.argv.slice(2)
  const get = (flag: string, fallback: string) => {
    const i = argv.indexOf(flag)
    return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1]! : fallback
  }
  return {
    heroes: Number(get('--heroes', '500')),
    days: Number(get('--days', '30')),
    content: get('--content', 'v1') as CatalogId,
    json: get('--json', ''),
  }
}

/** Fast deterministic per-hero/tick stream seeds for the harness (production uses seed v1 SHA-256). */
function streams(heroIndex: number, tick: number) {
  const base = createRng((heroIndex * 0x9e3779b1 + tick * 0x85ebca77) >>> 0)
  const next = () => Math.floor(base.next() * 2 ** 32)
  return { encounter: next(), combat: next(), reward: next(), narrative: next() }
}

function bestInSlot(content: ContentCatalog): { attack: number; defense: number } {
  const top = Math.max(...content.biomes.map((b) => b.tier))
  const tier = content.gearTiers[top]!
  const bonus = Math.max(...content.rarities.map((r) => r.statBonus))
  return { attack: tier.weaponAttack + bonus, defense: tier.armorDefense + bonus }
}

/** One visit: equip best eligible gear, claim and sell everything else, resume/travel to the hardest unlocked biome (D29). */
function visit(hero: HeroState, inventory: ItemSnapshot[], tick: number, content: ContentCatalog): { hero: HeroState; inventory: ItemSnapshot[] } {
  if (!['exploring', 'resting', 'sleeping'].includes(hero.status)) return { hero, inventory }
  const h: Mutable<HeroState> = { ...hero }
  const gear = inventory.filter((item) => item.kind !== 'potion')
  const best = (kind: 'weapon' | 'armor') =>
    gear
      .filter((item) => item.kind === kind && item.requiredLevel <= h.level)
      .reduce<ItemSnapshot | undefined>((top, item) => {
        const score = (x: ItemSnapshot) => (kind === 'weapon' ? x.attack : x.defense)
        return top === undefined || score(item) > score(top) ? item : top
      }, undefined)
  const weapon = best('weapon')
  const armor = best('armor')
  if (weapon) h.weaponId = weapon.id
  if (armor) h.armorId = armor.id
  delete h.heldItemId
  let gold = h.gold
  const kept = inventory.filter((item) => {
    if (item.kind === 'potion' || item.id === h.weaponId || item.id === h.armorId) return true
    gold += item.saleValue
    return false
  })
  h.gold = gold
  const hardest = content.biomes.filter((b) => b.unlockLevel <= h.level).at(-1)!
  if (h.status === 'sleeping') {
    h.wakeAtTick = tick + 1
    if (hardest.id !== h.biomeId) h.targetBiomeId = hardest.id
  } else if (hardest.id !== h.biomeId) {
    h.status = 'travelling'
    h.targetBiomeId = hardest.id
    h.arriveAtTick = tick + 1
  }
  return { hero: h, inventory: kept }
}

function simulateCohort(policy: Policy, heroes: number, days: number, content: ContentCatalog): HeroLog[] {
  const logs: HeroLog[] = []
  const bis = bestInSlot(content)
  const kit = starterKit(content)
  for (let index = 0; index < heroes; index += 1) {
    let nextId = 0
    const id = () => `h${String(nextId++).padStart(6, '0')}`
    let inventory: ItemSnapshot[] = [{ ...kit.weapon, id: id() }, { ...kit.armor, id: id() }, { ...kit.potions, id: id() }]
    let hero: HeroState = { ...starterHero(`hero-${index}`, content, 0), weaponId: inventory[0]!.id, armorId: inventory[1]!.id }
    const offset = (index * 37) % TICKS_PER_DAY
    const log: HeroLog = {
      reachTick: new Map(),
      deathsByBiome: new Map(),
      exploringTicksByBiome: new Map(),
      stateTicks: new Map(),
      gearFound: 0,
      elites: 0,
      jackpots: 0,
      jackpotGold: 0,
      goldEarned: 0,
      dailyXp: [],
      finalLevel: 1,
      finalGold: 0,
    }
    let dayXp = 0
    for (let tick = 1; tick <= days * TICKS_PER_DAY; tick += 1) {
      if (policy.everyDays > 0 && (tick - offset) % (policy.everyDays * TICKS_PER_DAY) === 0) {
        ;({ hero, inventory } = visit(hero, inventory, tick, content))
      }
      log.stateTicks.set(hero.status, (log.stateTicks.get(hero.status) ?? 0) + 1)
      const biomeBefore = hero.biomeId
      const result = simulateHero({ hero, inventory, tick, content, simulationVersion: SIMULATION_VERSION, streams: streams(index, tick) })
      if (result.metrics.encounter !== 'none') {
        log.exploringTicksByBiome.set(biomeBefore, (log.exploringTicksByBiome.get(biomeBefore) ?? 0) + 1)
      }
      if (result.metrics.deaths) log.deathsByBiome.set(biomeBefore, (log.deathsByBiome.get(biomeBefore) ?? 0) + 1)
      if (result.metrics.heldFinds && log.firstSleepTick === undefined) log.firstSleepTick = tick
      log.elites += result.metrics.elites
      if (result.metrics.jackpots) {
        log.jackpots += 1
        log.jackpotGold += result.event?.detail.outcome.variant === 'loot' ? result.event.detail.outcome.goldGranted : 0
      }
      log.gearFound += result.itemChanges.filter((change) => change.type === 'create' && change.item.kind !== 'potion').length
      dayXp += result.event?.deltas.xpEarned ?? 0
      ;({ hero, inventory } = applyItemChanges(result.nextHero, inventory, result.itemChanges, id))
      for (let level = 2; level <= hero.level; level += 1) if (!log.reachTick.has(level)) log.reachTick.set(level, tick)
      if (log.bestInSlotTick === undefined) {
        const w = inventory.find((i) => i.id === hero.weaponId)
        const a = inventory.find((i) => i.id === hero.armorId)
        if ((w?.attack ?? 0) >= bis.attack && (a?.defense ?? 0) >= bis.defense) log.bestInSlotTick = tick
      }
      if (tick === 30 * TICKS_PER_DAY) log.goldDay30 = hero.gold
      if (tick % TICKS_PER_DAY === 0) {
        log.dailyXp.push(dayXp)
        dayXp = 0
      }
    }
    log.finalLevel = hero.level
    log.finalGold = hero.gold
    log.goldEarned = hero.counters.goldEarned
    logs.push(log)
  }
  return logs
}

const pct = (values: readonly number[], p: number): number => {
  if (values.length === 0) return NaN
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!
}
const days = (tick: number) => tick / TICKS_PER_DAY
const round1 = (n: number) => Math.round(n * 10) / 10

function summarize(policy: Policy, logs: HeroLog[], totalDays: number, content: ContentCatalog) {
  /** Percentiles over every hero; heroes who never got there count as later than the run (reported as '>N'). */
  const censored = (ticks: (number | undefined)[]) => {
    const values = ticks.map((t) => (t === undefined ? Infinity : days(t)))
    const show = (v: number) => (Number.isFinite(v) ? round1(v) : `>${totalDays}`)
    return { p10: show(pct(values, 0.1)), median: show(pct(values, 0.5)), p90: show(pct(values, 0.9)), reached: values.filter(Number.isFinite).length }
  }
  const reach = (level: number) => ({ level, ...censored(logs.map((l) => l.reachTick.get(level))) })
  const sum = (f: (l: HeroLog) => number) => logs.reduce((total, l) => total + f(l), 0)
  const deathRate = Object.fromEntries(
    content.biomes
      .filter((b) => !b.safe)
      .map((b) => {
        const heroDays = sum((l) => l.exploringTicksByBiome.get(b.id) ?? 0) / TICKS_PER_DAY
        return [b.id, heroDays > 0 ? Math.round((sum((l) => l.deathsByBiome.get(b.id) ?? 0) / heroDays) * 1000) / 1000 : null]
      }),
  )
  const totalTicks = logs.length * totalDays * TICKS_PER_DAY
  const states = Object.fromEntries(
    ['exploring', 'resting', 'travelling', 'dead', 'sleeping'].map((s) => [s, Math.round((sum((l) => l.stateTicks.get(s) ?? 0) / totalTicks) * 1000) / 10]),
  )
  const firstSleep = logs.map((l) => l.firstSleepTick).filter((t): t is number => t !== undefined).map(days)
  const lastDay = logs.map((l) => l.dailyXp.at(-1) ?? 0)
  const last7 = logs.map((l) => l.dailyXp.slice(-7).reduce((a, b) => a + b, 0))
  const spread = (values: number[]) => ({ p10: pct(values, 0.1), median: pct(values, 0.5), p90: pct(values, 0.9), ratio: round1((pct(values, 0.9) / Math.max(1, pct(values, 0.1))) * 100) / 100 })
  return {
    policy: policy.name,
    heroes: logs.length,
    days: totalDays,
    reach: [2, 4, 8, 12].map(reach),
    finalLevelMedian: pct(logs.map((l) => l.finalLevel), 0.5),
    deathsPerExploringHeroDay: deathRate,
    stateSharePct: states,
    firstInventorySleep: { heroes: firstSleep.length, median: round1(pct(firstSleep, 0.5)), p10: round1(pct(firstSleep, 0.1)) },
    gearPerDay: round1(sum((l) => l.gearFound) / logs.length / totalDays),
    bestInSlot: censored(logs.map((l) => l.bestInSlotTick)),
    goldDayEnd: { median: pct(logs.map((l) => l.finalGold), 0.5), p90: pct(logs.map((l) => l.finalGold), 0.9) },
    goldDay30: totalDays >= 30 ? pct(logs.map((l) => l.goldDay30 ?? 0), 0.5) : null,
    jackpotGoldShare: Math.round((sum((l) => l.jackpotGold) / Math.max(1, sum((l) => l.goldEarned))) * 1000) / 10,
    elitesPerHeroDay: Math.round((sum((l) => l.elites) / logs.length / totalDays) * 100) / 100,
    xpLastDay: spread(lastDay),
    xpLast7Days: spread(last7),
  }
}

function main() {
  const options = args()
  const content = catalogs[options.content]
  if (!content) throw new Error(`unknown content ${options.content}`)
  const started = Date.now()
  const reports = POLICIES.map((policy) => summarize(policy, simulateCohort(policy, options.heroes, options.days, content), options.days, content))
  const meta = { contentVersion: content.contentVersion, simulationVersion: SIMULATION_VERSION, heroes: options.heroes, days: options.days, seconds: (Date.now() - started) / 1000, cumulativeXpToLevel8: cumulativeXpToReach(8) }
  if (options.json) writeFileSync(options.json, JSON.stringify({ meta, reports }, null, 2) + '\n')
  console.log(JSON.stringify(meta))
  for (const r of reports) {
    console.log(`\n== ${r.policy} (${r.heroes} heroes x ${r.days} days)`)
    for (const x of r.reach) console.log(`  L${x.level}: p10 ${x.p10}d  median ${x.median}d  p90 ${x.p90}d  reached ${x.reached}/${r.heroes}`)
    console.log(`  final level median ${r.finalLevelMedian}; deaths/exploring hero-day ${JSON.stringify(r.deathsPerExploringHeroDay)}`)
    console.log(`  state % ${JSON.stringify(r.stateSharePct)}; first sleep ${JSON.stringify(r.firstInventorySleep)}`)
    console.log(`  gear/day ${r.gearPerDay}; best-in-slot ${JSON.stringify(r.bestInSlot)}; gold end ${JSON.stringify(r.goldDayEnd)}; gold day 30 median ${r.goldDay30}`)
    console.log(`  jackpot gold share ${r.jackpotGoldShare}%; elites/hero-day ${r.elitesPerHeroDay}`)
    console.log(`  XP last day ${JSON.stringify(r.xpLastDay)}; last 7 days ${JSON.stringify(r.xpLast7Days)}`)
  }
}

main()
