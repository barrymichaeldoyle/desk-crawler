/**
 * Deterministic balance harness (quality.md, A03). Runs the real pure simulator
 * in memory; never touches a database. Usage:
 *   pnpm balance [--heroes 500] [--days 30] [--content v3] [--stance cautious|balanced|bold] [--drawer 6] [--json out.json]
 * `--drawer N` overrides the desk drawer size (P32) of a catalog that has one, for the size comparison.
 */
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { ACTIVE_CONTENT, catalogs, type CatalogId } from '@trmnl-games/desk-crawler/content'
import { applyItemChanges } from '@trmnl-games/desk-crawler/sim/core/apply'
import { nextEarlyTier } from '@trmnl-games/desk-crawler/sim/core/bag'
import { simulateHero, SIMULATION_VERSION } from '@trmnl-games/desk-crawler/sim/core/simulate'
import { starterHero, starterKit } from '@trmnl-games/desk-crawler/sim/core/starter'
import { cumulativeXpToReach } from '@trmnl-games/desk-crawler/sim/core/stats'
import type { ContentCatalog, HeroState, ItemSnapshot, StanceId } from '@trmnl-games/desk-crawler/sim/core/types'
import { createRng } from '@trmnl-games/desk-crawler/sim/core/rng'
import { ACHIEVEMENTS, ACHIEVEMENT_FAMILIES, rarityBand } from '@trmnl-games/desk-crawler/content/achievements'
import { allSatisfied } from '@trmnl-games/desk-crawler/sim/core/achievements'

/** Days at which each hero's satisfied achievements are snapshotted (achievements.md "Verification"). */
const ACHIEVEMENT_DAYS = [1, 7, 30] as const

const TICKS_PER_DAY = 96

type Mutable<T> = { -readonly [K in keyof T]: T[K] }

export interface Policy {
  readonly name: string
  /** Days between visits; 0 never visits. */
  readonly everyDays: number
  readonly equipGear?: boolean
  readonly staySafe?: boolean
  /** D61: buy the next bag whenever affordable (default true for visiting cohorts). */
  readonly buyBags?: boolean
}

export const POLICIES: readonly Policy[] = [
  { name: 'unattended', everyDays: 0 },
  { name: 'daily', everyDays: 1 },
  { name: 'three-day', everyDays: 3 },
  { name: 'seven-day', everyDays: 7 },
  { name: 'undergeared-three-day', everyDays: 3, equipGear: false },
  { name: 'safe-farming-three-day', everyDays: 3, staySafe: true },
]

export interface HeroLog {
  reachTick: Map<number, number>
  firstSleepTick?: number
  bestInSlotTick?: number
  deathsByBiome: Map<string, number>
  exploringTicksByBiome: Map<string, number>
  eligibleDaysByBiome: Map<string, Set<number>>
  deathDaysByBiome: Map<string, Set<number>>
  stateTicks: Map<string, number>
  gearFound: number
  usefulGearFound: number
  equippedUpgrades: number
  startingPotions: number
  potionsFound: number
  potionsUsed: number
  potionFullFallbacks: number
  finalPotions: number
  retreats: number
  rescues: number
  elites: number
  jackpots: number
  jackpotGold: number
  goldEarned: number
  dailyXp: number[]
  finalLevel: number
  finalGold: number
  goldDay30?: number
  /** D61: first tick at each bag capacity, plus how each upgrade arrived. */
  bagTick: Map<number, number>
  bagFinds: number
  bagMilestones: number
  bagPurchases: number
  bagGoldSpent: number
  /** P32: gear finds the desk drawer caught. */
  drawerFinds: number
  /** D65: achievement ids satisfied at the end of each snapshot day. */
  achievementsByDay: Map<number, readonly string[]>
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
    content: get('--content', ACTIVE_CONTENT) as CatalogId,
    /** D76: every hero plays this stance; omitted means no stance (the catalog constants). */
    stance: argv.includes('--stance') ? (get('--stance', 'balanced') as StanceId) : undefined,
    /** P32: desk drawer size override; only meaningful for a catalog with a drawer. */
    drawer: argv.includes('--drawer') ? Number(get('--drawer', '')) : undefined,
    json: get('--json', ''),
    ticks: argv.includes('--ticks') ? Number(get('--ticks', '')) : undefined,
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
  const offset = (kind: 'weapon' | 'armor') => Math.max(...content.gearTemplates.filter((t) => t.tier === top && t.kind === kind).map((t) => t.statOffset ?? 0))
  return { attack: tier.weaponAttack + offset('weapon') + bonus, defense: tier.armorDefense + offset('armor') + bonus }
}

/** One visit: equip best eligible gear, claim and sell everything else, resume/travel to the hardest unlocked biome (D29). */
export function visit(hero: HeroState, inventory: ItemSnapshot[], tick: number, content: ContentCatalog, policy: Policy): { hero: HeroState; inventory: ItemSnapshot[]; bought: number } {
  let bought = 0
  if (!['exploring', 'resting', 'sleeping'].includes(hero.status)) return { hero, inventory, bought }
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
  if (weapon && policy.equipGear !== false) h.weaponId = weapon.id
  if (armor && policy.equipGear !== false) h.armorId = armor.id
  delete h.heldItemId
  // P32: the visit sells the drawer along with the bag.
  delete h.drawer
  let gold = h.gold
  const kept = inventory.filter((item) => {
    if (item.kind === 'potion' || item.id === h.weaponId || item.id === h.armorId) return true
    gold += item.saleValue
    return false
  })
  h.gold = gold
  // D61: buy at most the next bag (purchases never run more than one ahead of milestones).
  const bag = policy.buyBags === false ? undefined : nextEarlyTier(content, h)
  if (bag?.price !== undefined && h.gold >= bag.price) {
    h.gold -= bag.price
    h.bagCapacity = bag.capacity
    bought = bag.price
  }
  const hardest = policy.staySafe ? content.biomes.find(b => b.safe)! : content.biomes.filter((b) => b.unlockLevel <= h.level).at(-1)!
  if (h.status === 'sleeping') {
    h.wakeAtTick = tick + 1
    if (hardest.id !== h.biomeId) h.targetBiomeId = hardest.id
  } else if (hardest.id !== h.biomeId) {
    h.status = 'travelling'
    h.targetBiomeId = hardest.id
    h.arriveAtTick = tick + 1
  }
  return { hero: h, inventory: kept, bought }
}

export function simulateCohort(policy: Policy, heroes: number, days: number, content: ContentCatalog, ticks = days * TICKS_PER_DAY, stance?: StanceId): HeroLog[] {
  const logs: HeroLog[] = []
  const bis = bestInSlot(content)
  const kit = starterKit(content)
  for (let index = 0; index < heroes; index += 1) {
    let nextId = 0
    const id = () => `h${String(nextId++).padStart(6, '0')}`
    let inventory: ItemSnapshot[] = [{ ...kit.weapon, id: id() }, { ...kit.armor, id: id() }, { ...kit.potions, id: id() }]
    let hero: HeroState = { ...starterHero(`hero-${index}`, content, 0), weaponId: inventory[0]!.id, armorId: inventory[1]!.id, ...(stance === undefined ? {} : { stance }) }
    const offset = (index * 37) % TICKS_PER_DAY
    const log: HeroLog = {
      reachTick: new Map(),
      deathsByBiome: new Map(),
      exploringTicksByBiome: new Map(),
      eligibleDaysByBiome: new Map(),
      deathDaysByBiome: new Map(),
      stateTicks: new Map(),
      gearFound: 0,
      usefulGearFound: 0,
      equippedUpgrades: 0,
      startingPotions: kit.potions.quantity,
      potionsFound: 0,
      potionsUsed: 0,
      potionFullFallbacks: 0,
      finalPotions: 0,
      retreats: 0,
      rescues: 0,
      elites: 0,
      jackpots: 0,
      jackpotGold: 0,
      goldEarned: 0,
      dailyXp: [],
      finalLevel: 1,
      finalGold: 0,
      bagTick: new Map([[hero.bagCapacity, 0]]),
      bagFinds: 0,
      bagMilestones: 0,
      bagPurchases: 0,
      bagGoldSpent: 0,
      drawerFinds: 0,
      achievementsByDay: new Map(),
    }
    let dayXp = 0
    let recentSummaries: string[] = []
    const markDay = (map: Map<string, Set<number>>, biome: string, day: number) => {
      const set = map.get(biome) ?? new Set<number>()
      set.add(day)
      map.set(biome, set)
    }
    for (let tick = 1; tick <= ticks; tick += 1) {
      if (policy.everyDays > 0 && (tick - offset) % (policy.everyDays * TICKS_PER_DAY) === 0) {
        const before = hero
        let bought: number
        ;({ hero, inventory, bought } = visit(hero, inventory, tick, content, policy))
        if (bought > 0) {
          log.bagPurchases += 1
          log.bagGoldSpent += bought
          if (!log.bagTick.has(hero.bagCapacity)) log.bagTick.set(hero.bagCapacity, tick)
        }
        log.equippedUpgrades += Number(before.weaponId !== hero.weaponId) + Number(before.armorId !== hero.armorId)
      }
      log.stateTicks.set(hero.status, (log.stateTicks.get(hero.status) ?? 0) + 1)
      const biomeBefore = hero.biomeId
      const day = Math.floor((tick - 1) / TICKS_PER_DAY)
      if (hero.status === 'exploring' || hero.status === 'resting') markDay(log.eligibleDaysByBiome, biomeBefore, day)
      const result = simulateHero({ hero, inventory, tick, content, simulationVersion: SIMULATION_VERSION, streams: streams(index, tick), recentSummaries })
      if (result.event) recentSummaries = [result.event.summary, ...recentSummaries].slice(0, 2)
      if (result.metrics.encounter !== 'none') {
        log.exploringTicksByBiome.set(biomeBefore, (log.exploringTicksByBiome.get(biomeBefore) ?? 0) + 1)
      }
      if (result.metrics.deaths) {
        log.deathsByBiome.set(biomeBefore, (log.deathsByBiome.get(biomeBefore) ?? 0) + result.metrics.deaths)
        markDay(log.deathDaysByBiome, biomeBefore, day)
      }
      log.potionsUsed += result.metrics.potionsUsed
      log.retreats += result.metrics.retreats
      log.rescues += result.metrics.rescues
      const outcome = result.event?.detail.outcome
      if (outcome?.variant === 'loot' && outcome.potionFullFallback) log.potionFullFallbacks += 1
      // A found potion can cancel this tick's decrement, leaving no item directive.
      // Count the encounter outcome so gross supply and usage still conserve the stack.
      if (outcome?.variant === 'loot' && outcome.found === 'potion') log.potionsFound += 1
      for (const change of result.itemChanges) {
        if (change.type !== 'create') continue
        if (change.item.kind === 'potion') continue
        const current = inventory.find(item => item.id === (change.item.kind === 'weapon' ? hero.weaponId : hero.armorId))
        const score = change.item.kind === 'weapon' ? change.item.attack : change.item.defense
        const equippedScore = change.item.kind === 'weapon' ? current?.attack ?? 0 : current?.defense ?? 0
        if (change.item.requiredLevel <= result.nextHero.level && score > equippedScore) log.usefulGearFound += 1
      }
      if (result.metrics.heldFinds && log.firstSleepTick === undefined) log.firstSleepTick = tick
      const upgrade = result.event?.detail.bagUpgrade
      if (upgrade) {
        if (upgrade.source === 'find') log.bagFinds += 1
        else log.bagMilestones += 1
        if (!log.bagTick.has(upgrade.to)) log.bagTick.set(upgrade.to, tick)
      }
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
      if (tick % TICKS_PER_DAY === 0 && (ACHIEVEMENT_DAYS as readonly number[]).includes(tick / TICKS_PER_DAY)) {
        log.achievementsByDay.set(tick / TICKS_PER_DAY, allSatisfied({ level: hero.level, bagCapacity: hero.bagCapacity, counters: hero.counters, keepsakeTotal: 0 }, content).map((a) => a.id))
      }
      if (tick % TICKS_PER_DAY === 0) {
        log.dailyXp.push(dayXp)
        dayXp = 0
      }
    }
    if (ticks % TICKS_PER_DAY !== 0) log.dailyXp.push(dayXp)
    log.drawerFinds = hero.counters.drawerFinds
    log.finalLevel = hero.level
    log.finalGold = hero.gold
    log.goldEarned = hero.counters.goldEarned
    log.finalPotions = inventory.find(item => item.kind === 'potion')?.quantity ?? 0
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

export function summarize(policy: Policy, logs: HeroLog[], totalDays: number, content: ContentCatalog) {
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
        const heroDays = sum(l => l.eligibleDaysByBiome.get(b.id)?.size ?? 0)
        const daysWithDeath = sum(l => l.deathDaysByBiome.get(b.id)?.size ?? 0)
        const p = daysWithDeath / Math.max(1, heroDays)
        const z2 = 1.96 ** 2
        const center = (p + z2 / (2 * Math.max(1, heroDays))) / (1 + z2 / Math.max(1, heroDays))
        const half = 1.96 * Math.sqrt(p * (1 - p) / Math.max(1, heroDays) + z2 / (4 * Math.max(1, heroDays) ** 2)) / (1 + z2 / Math.max(1, heroDays))
        return [b.id, { eligibleHeroDays: heroDays, heroDaysWithDeath: daysWithDeath, deathProbabilityPct: heroDays ? round1(p * 100) : null, wilson95Pct: heroDays ? [round1(Math.max(0, center - half) * 100), round1(Math.min(1, center + half) * 100)] : null, deathsPerEligibleHeroDay: heroDays ? Math.round(sum(l => l.deathsByBiome.get(b.id) ?? 0) / heroDays * 1000) / 1000 : null }]
      }),
  )
  const totalTicks = logs.length * totalDays * TICKS_PER_DAY
  const states = Object.fromEntries(
    ['exploring', 'resting', 'travelling', 'dead', 'sleeping'].map((s) => [s, Math.round((sum((l) => l.stateTicks.get(s) ?? 0) / totalTicks) * 1000) / 10]),
  )
  const lastDay = logs.map((l) => l.dailyXp.at(-1) ?? 0)
  const last7 = logs.map((l) => l.dailyXp.slice(-7).reduce((a, b) => a + b, 0))
  const spread = (values: number[]) => {
    const p10 = pct(values, 0.1)
    const p90 = pct(values, 0.9)
    return { p10, median: pct(values, 0.5), p90, ratio: p10 > 0 ? Math.round(p90 / p10 * 100) / 100 : null }
  }
  return {
    policy: policy.name,
    heroes: logs.length,
    days: totalDays,
    reach: [2, 4, 8, 12].map(reach),
    finalLevelMedian: pct(logs.map((l) => l.finalLevel), 0.5),
    deathByBiome: deathRate,
    stateSharePct: states,
    firstInventorySleep: censored(logs.map(l => l.firstSleepTick)),
    drawerFindsPerHero: round1(sum((l) => l.drawerFinds) / logs.length),
    gearPerDay: round1(sum((l) => l.gearFound) / logs.length / totalDays),
    usefulGearPerDay: round1(sum(l => l.usefulGearFound) / logs.length / totalDays),
    equippedUpgradesPerHero: round1(sum(l => l.equippedUpgrades) / logs.length),
    potions: { acquiredPerHeroDay: round1(sum(l => l.potionsFound) / logs.length / totalDays), usedPerHeroDay: round1(sum(l => l.potionsUsed) / logs.length / totalDays), fullStackFallbacksPerHeroDay: round1(sum(l => l.potionFullFallbacks) / logs.length / totalDays), finalCount: { p10: pct(logs.map(l => l.finalPotions), 0.1), median: pct(logs.map(l => l.finalPotions), 0.5), p90: pct(logs.map(l => l.finalPotions), 0.9) } },
    retreatsPerHeroDay: round1(sum(l => l.retreats) / logs.length / totalDays),
    rescuesPerHeroDay: round1(sum(l => l.rescues) / logs.length / totalDays),
    bestInSlot: censored(logs.map((l) => l.bestInSlotTick)),
    goldDayEnd: { median: pct(logs.map((l) => l.finalGold), 0.5), p90: pct(logs.map((l) => l.finalGold), 0.9) },
    goldDay30: totalDays >= 30 ? pct(logs.map((l) => l.goldDay30 ?? 0), 0.5) : null,
    jackpotGoldShare: Math.round((sum((l) => l.jackpotGold) / Math.max(1, sum((l) => l.goldEarned))) * 1000) / 10,
    elitesPerHeroDay: Math.round((sum((l) => l.elites) / logs.length / totalDays) * 100) / 100,
    bag: {
      reach: content.bagLadder.tiers.slice(1).map((tier) => ({ capacity: tier.capacity, ...censored(logs.map((l) => l.bagTick.get(tier.capacity))) })),
      findsPerHero: Math.round(sum((l) => l.bagFinds) / logs.length * 100) / 100,
      purchasesPerHero: Math.round(sum((l) => l.bagPurchases) / logs.length * 100) / 100,
      goldSpentMedian: pct(logs.map((l) => l.bagGoldSpent), 0.5),
    },
    xpLastDay: spread(lastDay),
    xpLast7Days: spread(last7),
    achievements: achievementShares(logs),
  }
}

/**
 * Share of heroes holding each achievement at each snapshot day, plus a band
 * census, so a release can check that monster tier V stays Legendary at day 30.
 */
function achievementShares(logs: HeroLog[]) {
  const byDay: Record<string, { bands: Record<string, number>; monsterTiers: Record<string, number[]>; shares: Record<string, number> }> = {}
  for (const day of ACHIEVEMENT_DAYS) {
    const counts = new Map<string, number>()
    let heroes = 0
    for (const log of logs) {
      const ids = log.achievementsByDay.get(day)
      if (ids === undefined) continue
      heroes += 1
      for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    if (heroes === 0) continue
    const shares: Record<string, number> = {}
    const bands: Record<string, number> = { common: 0, uncommon: 0, rare: 0, legendary: 0 }
    for (const def of ACHIEVEMENTS) {
      const share = (counts.get(def.id) ?? 0) / heroes
      shares[def.id] = Math.round(share * 1000) / 10
      bands[rarityBand(share)] = (bands[rarityBand(share)] ?? 0) + 1
    }
    const monsterTiers: Record<string, number[]> = {}
    for (const family of ACHIEVEMENT_FAMILIES) {
      if (!family.id.startsWith('slay_')) continue
      monsterTiers[family.id] = ACHIEVEMENTS.filter((a) => a.family === family.id).map((a) => shares[a.id]!)
    }
    byDay[`day${day}`] = { bands, monsterTiers, shares }
  }
  return byDay
}

function main() {
  const options = args()
  if (!Number.isSafeInteger(options.heroes) || options.heroes < 1 || options.heroes > 10_000) throw new Error('--heroes must be an integer from 1 to 10000')
  if (!Number.isSafeInteger(options.days) || options.days < 1 || options.days > 365) throw new Error('--days must be an integer from 1 to 365')
  if (options.ticks !== undefined && (!Number.isSafeInteger(options.ticks) || options.ticks < 1 || options.ticks > 365 * TICKS_PER_DAY)) throw new Error('--ticks must be an integer from 1 to 35040')
  const catalog = catalogs[options.content]
  if (!catalog) throw new Error(`unknown content ${options.content}`)
  if (options.drawer !== undefined && (catalog.deskDrawer === undefined || !Number.isSafeInteger(options.drawer) || options.drawer < 1 || options.drawer > 8)) throw new Error('--drawer needs a catalog with a desk drawer and a size from 1 to 8')
  const content: ContentCatalog = options.drawer === undefined ? catalog : { ...catalog, deskDrawer: { ...catalog.deskDrawer!, capacity: options.drawer } }
  const started = Date.now()
  const ticks = options.ticks ?? options.days * TICKS_PER_DAY
  const totalDays = ticks / TICKS_PER_DAY
  const reports = POLICIES.map((policy) => summarize(policy, simulateCohort(policy, options.heroes, totalDays, content, ticks, options.stance), totalDays, content))
  const meta = { reportVersion: 2, contentVersion: content.contentVersion, stance: options.stance ?? null, deskDrawer: content.deskDrawer?.capacity ?? null, simulationVersion: SIMULATION_VERSION, heroes: options.heroes, days: totalDays, ticks, seconds: (Date.now() - started) / 1000, cumulativeXpToLevel8: cumulativeXpToReach(8), deathDenominator: 'hero-days with at least one exploring/resting tick in the biome; multiple deaths count once for probability', uncertainty: 'Wilson 95% descriptive interval; repeated days per seeded hero are correlated, not a player forecast' }
  if (options.json) writeFileSync(options.json, JSON.stringify({ meta, reports }, null, 2) + '\n')
  console.log(JSON.stringify(meta))
  for (const r of reports) {
    console.log(`\n== ${r.policy} (${r.heroes} heroes x ${r.days} days)`)
    for (const x of r.reach) console.log(`  L${x.level}: p10 ${x.p10}d  median ${x.median}d  p90 ${x.p90}d  reached ${x.reached}/${r.heroes}`)
    console.log(`  final level median ${r.finalLevelMedian}; death hero-days ${JSON.stringify(r.deathByBiome)}`)
    console.log(`  state % ${JSON.stringify(r.stateSharePct)}; first sleep ${JSON.stringify(r.firstInventorySleep)}; drawer finds/hero ${r.drawerFindsPerHero}`)
    console.log(`  gear/day ${r.gearPerDay}; best-in-slot ${JSON.stringify(r.bestInSlot)}; gold end ${JSON.stringify(r.goldDayEnd)}; gold day 30 median ${r.goldDay30}`)
    console.log(`  jackpot gold share ${r.jackpotGoldShare}%; elites/hero-day ${r.elitesPerHeroDay}`)
    console.log(`  potions ${JSON.stringify(r.potions)}; useful gear/day ${r.usefulGearPerDay}; equipped upgrades/hero ${r.equippedUpgradesPerHero}`)
    console.log(`  bag ${r.bag.reach.map((b) => `${b.capacity}: ${b.median}d (p10 ${b.p10}, p90 ${b.p90})`).join('; ')}; finds/hero ${r.bag.findsPerHero}; buys/hero ${r.bag.purchasesPerHero}; gold spent median ${r.bag.goldSpentMedian}`)
    console.log(`  XP last day ${JSON.stringify(r.xpLastDay)}; last 7 days ${JSON.stringify(r.xpLast7Days)}`)
    for (const [day, a] of Object.entries(r.achievements)) {
      console.log(`  achievements ${day}: bands ${JSON.stringify(a.bands)}; monster tier shares % ${Object.entries(a.monsterTiers).map(([f, tiers]) => `${f.slice(5)} ${tiers.join('/')}`).join('; ')}`)
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
