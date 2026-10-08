import { describe, expect, it } from 'vitest'
import { contentV6 } from '@trmnl-games/desk-crawler/content/v6'
import { contentV7 } from '@trmnl-games/desk-crawler/content/v7'
import { validateCatalog } from '@trmnl-games/desk-crawler/content/validate'
import { codePoints, fill } from '@trmnl-games/desk-crawler/sim/core/narrative'
import { planRaid, raidWinChance } from '@trmnl-games/desk-crawler/sim/core/raid'
import { simulateHero, SIMULATION_VERSION } from '@trmnl-games/desk-crawler/sim/core/simulate'
import { maxHp } from '@trmnl-games/desk-crawler/sim/core/stats'
import type { ContentCatalog, HeroState, IncomingRaid, ItemSnapshot, RaidTarget, SimulationInput, StanceId, StreamSeeds } from '@trmnl-games/desk-crawler/sim/core/types'
import { simulateWorld } from '../../tools/balance/raids'
import { POLICIES } from '../../tools/balance/run'
import { baseState, seeds } from './helpers'

const withRaid = (n: number): StreamSeeds => ({ ...seeds(n), raid: (n * 2891336453 + 7) >>> 0 })
const ready = (overrides: Partial<HeroState> = {}) => baseState({ level: 5, hp: maxHp(5), gold: 200, biomeId: 'server_room', potionCap: 20, bagCapacity: 13, ...overrides })
const target: RaidTarget = { heroId: 'rival', name: 'Quill', gold: 300 }
const tick = (hero: HeroState, inventory: ItemSnapshot[], content: ContentCatalog, seed: number, extra: Partial<SimulationInput> = {}) =>
  simulateHero({ hero, inventory, tick: 10, content, simulationVersion: SIMULATION_VERSION, streams: withRaid(seed), ...extra })
const launching = (stance: StanceId | undefined, count: number) => {
  const found: number[] = []
  for (let seed = 0; found.length < count; seed += 1) if (planRaid(withRaid(seed), stance, contentV7)) found.push(seed)
  return found
}
const incoming = (overrides: Partial<IncomingRaid> = {}): IncomingRaid => ({ raiderHeroId: 'rival', raiderName: 'Baz', tick: 9, raiderWon: true, gold: 14, targetHpPct: 30, ...overrides })

describe('desk raids (D110)', () => {
  it('validates v7 and leaves v6 untouched by a raid seed, a target or a pending raid', () => {
    expect(validateCatalog(contentV7)).toEqual([])
    const { hero, inventory } = ready()
    for (let seed = 0; seed < 400; seed += 1) {
      const plain = simulateHero({ hero, inventory, tick: 10, content: contentV6, simulationVersion: SIMULATION_VERSION, streams: seeds(seed) })
      expect(tick(hero, inventory, contentV6, seed, { raidTarget: target, incomingRaid: incoming() })).toEqual(plain)
    }
  })

  it('launches exactly when planRaid says so, and a tick without a target plays as if raids did not exist', () => {
    const { hero, inventory } = ready({ stance: 'bold' })
    let launches = 0
    for (let seed = 0; seed < 3000; seed += 1) {
      const plan = planRaid(withRaid(seed), 'bold', contentV7)
      const raided = tick(hero, inventory, contentV7, seed, { raidTarget: target })
      const alone = tick(hero, inventory, contentV7, seed)
      if (plan === undefined) expect(raided).toEqual(alone)
      else {
        launches += 1
        expect(raided.raidLaunch).toBeDefined()
        expect(raided.event?.kind === 'raid' || raided.event?.kind === 'death').toBe(true)
      }
      expect(alone.raidLaunch).toBeUndefined()
      // Without a raid seed the stream does not exist at all.
      expect(simulateHero({ hero, inventory, tick: 10, content: contentV7, simulationVersion: SIMULATION_VERSION, streams: seeds(seed), raidTarget: target })).toEqual(simulateHero({ hero, inventory, tick: 10, content: contentV7, simulationVersion: SIMULATION_VERSION, streams: seeds(seed) }))
    }
    // Bold launches at 20 permille.
    expect(launches).toBeGreaterThan(35)
    expect(launches).toBeLessThan(85)
  })

  it('never raids itself and never raids from a tick that rests instead', () => {
    const [seed] = launching('balanced', 1)
    const { hero, inventory } = ready()
    expect(tick(hero, inventory, contentV7, seed!, { raidTarget: { ...target, heroId: hero.id } }).raidLaunch).toBeUndefined()
    const low = baseState({ level: 5, hp: 5, gold: 200, biomeId: 'server_room', potionCap: 20, bagCapacity: 13 }, 0)
    expect(tick(low.hero, low.inventory, contentV7, seed!, { raidTarget: target }).raidLaunch).toBeUndefined()
  })

  it('wins at the stance odds, moves gold from loser to winner and costs both sides HP', () => {
    const seedsFor = launching('cautious', 2000)
    const { hero, inventory } = ready({ stance: 'cautious' })
    let wins = 0
    for (const seed of seedsFor) {
      const result = tick(hero, inventory, contentV7, seed, { raidTarget: { ...target, stance: 'bold' } })
      const launch = result.raidLaunch!
      const outcome = result.event!.detail.outcome
      if (outcome.variant !== 'raid') throw new Error('expected a raid')
      expect(outcome.role).toBe('raider')
      expect(outcome.rivalName).toBe('Quill')
      if (launch.raiderWon) {
        wins += 1
        expect(launch.gold).toBe(15)
        expect(result.nextHero.gold).toBe(215)
        expect(result.nextHero.hp).toBe(maxHp(5) - Math.ceil(maxHp(5) * 0.1))
        expect(launch.targetHpPct).toBe(30)
        expect(result.nextHero.counters.raidsWon).toBe(1)
        expect(result.event!.summary).toContain('[[Quill]]')
      } else {
        expect(launch.gold).toBe(10)
        expect(result.nextHero.gold).toBe(190)
        expect(result.nextHero.hp).toBe(maxHp(5) - Math.ceil(maxHp(5) * 0.3))
        expect(launch.targetHpPct).toBe(10)
        expect(result.nextHero.counters.raidsWon).toBe(0)
      }
      expect(result.nextHero.counters.raidsLaunched).toBe(1)
      expect(result.nextHero.counters.ticksExplored).toBe(1)
      expect(result.metrics.encounter).toBe('none')
    }
    expect(raidWinChance(contentV7, 'cautious', 'bold')).toBe(65)
    // 65% of 2000, well inside four standard deviations (about 21 each).
    expect(Math.abs(wins - 1300)).toBeLessThan(90)
  })

  it('takes thrifty points off the loser’s gold loss', () => {
    const [seed] = launching('balanced', 400).filter((s) => !tick(ready().hero, ready().inventory, contentV7, s, { raidTarget: target }).raidLaunch!.raiderWon)
    const won = launching('balanced', 400).find((s) => tick(ready().hero, ready().inventory, contentV7, s, { raidTarget: target }).raidLaunch!.raiderWon)!
    const { hero, inventory } = ready()
    expect(tick(hero, inventory, contentV7, won, { raidTarget: { ...target, goldLossPct: 5 } }).raidLaunch!.gold).toBe(0)
    const thrifty = inventory.map((item) => (item.id === hero.armorId ? { ...item, affixId: 'thrifty' } : item))
    expect(tick(hero, thrifty, contentV7, seed!, { raidTarget: target }).raidLaunch!.gold).toBe(0)
  })

  it('applies a pending raid on the target side, clamping a loss to the gold the hero holds', () => {
    const { hero, inventory } = ready({ gold: 9 })
    const lost = tick(hero, inventory, contentV7, 1, { incomingRaid: incoming() })
    expect(lost.raidApplied).toBe(true)
    expect(lost.nextHero.gold).toBe(0)
    expect(lost.nextHero.hp).toBe(maxHp(5) - Math.ceil(maxHp(5) * 0.3))
    expect(lost.nextHero.counters.raidsLost).toBe(1)
    expect(lost.event?.kind).toBe('raid')
    expect(lost.event?.detail.outcome).toMatchObject({ variant: 'raid', role: 'target', won: false, gold: 9, raidTick: 9, outcome: 'survived' })
    const repelled = tick(hero, inventory, contentV7, 1, { incomingRaid: incoming({ raiderWon: false, gold: 6, targetHpPct: 10 }) })
    expect(repelled.nextHero.gold).toBe(15)
    expect(repelled.nextHero.counters.raidsRepelled).toBe(1)
    expect(repelled.nextHero.counters.goldEarned).toBe(hero.counters.goldEarned + 6)
    // A resting hero takes it too, and stays resting.
    const resting = ready({ status: 'resting', hp: 40 })
    const rested = tick(resting.hero, resting.inventory, contentV7, 1, { incomingRaid: incoming({ raiderWon: false, gold: 6, targetHpPct: 10 }) })
    expect(rested.raidApplied).toBe(true)
    expect(rested.nextHero.status).toBe('resting')
  })

  it('kills with lethal raid damage outside Office Cubicles and rescues inside', () => {
    const { hero, inventory } = ready({ hp: 10, status: 'resting' })
    const dead = tick(hero, inventory, contentV7, 1, { incomingRaid: incoming() })
    expect(dead.nextHero.status).toBe('dead')
    expect(dead.nextHero.reviveAtTick).toBe(10 + contentV7.constants.reviveAfterTicks)
    expect(dead.nextHero.counters.deaths).toBe(1)
    expect(dead.event?.kind).toBe('death')
    expect(dead.event?.detail.outcome).toMatchObject({ variant: 'raid', outcome: 'death' })
    // 14 gold raided, then the knockout's 10% of what is left.
    expect(dead.nextHero.gold).toBe(200 - 14 - Math.floor((186 * 10) / 100))
    const safe = ready({ hp: 10, status: 'resting', biomeId: 'office_cubicles' })
    const rescued = tick(safe.hero, safe.inventory, contentV7, 1, { incomingRaid: incoming() })
    expect(rescued.nextHero).toMatchObject({ status: 'resting', hp: 1 })
    expect(rescued.nextHero.counters.rescues).toBe(1)
    expect(rescued.event?.detail.outcome).toMatchObject({ variant: 'raid', outcome: 'rescue' })
  })

  it('keeps a raid pending while the hero is dead, paused, sleeping or travelling, or the catalog has no raids', () => {
    const states: Partial<HeroState>[] = [
      { status: 'dead', hp: 0, reviveAtTick: 50 },
      { status: 'paused', pausedFromStatus: 'exploring' },
      { status: 'travelling', targetBiomeId: 'office_cubicles', arriveAtTick: 50 },
    ]
    for (const state of states) {
      const { hero, inventory } = ready(state)
      expect(tick(hero, inventory, contentV7, 1, { incomingRaid: incoming() }).raidApplied).toBeUndefined()
    }
    const { hero, inventory } = ready()
    expect(tick(hero, inventory, contentV6, 1, { incomingRaid: incoming() }).raidApplied).toBeUndefined()
  })

  it('fits every raid line in the summary budget with the longest name and a large purse', () => {
    const lines = contentV7.raids!.narrative
    const vars = { rival: 'W'.repeat(20), gold: 99999, ticks: 8 }
    for (const pool of [lines.raidWon, lines.raidLost, lines.raided, lines.repelled]) {
      for (const line of pool) expect(codePoints(fill(line, vars))).toBeLessThanOrEqual(contentV7.constants.summaryMaxCodePoints)
    }
    // A lethal raid still says who and what in the summary the device shows.
    const { hero, inventory } = ready({ hp: 10, status: 'resting', gold: 99999 })
    const dead = tick(hero, inventory, contentV7, 1, { incomingRaid: incoming({ raiderName: 'W'.repeat(20), gold: 4999 }) })
    expect(codePoints(dead.event!.summary)).toBeLessThanOrEqual(contentV7.constants.summaryMaxCodePoints)
    expect(dead.event!.summary).toContain('Knocked out for 8 ticks.')
  })
})

describe('desk raids harness (D110 R1)', () => {
  it('moves gold only between heroes: raid gains and losses net to the clamp gap plus raids still pending', () => {
    const { runs, report } = simulateWorld(contentV7, 30, 4, POLICIES.find((p) => p.name === 'daily')!, true)
    const net = runs.reduce((total, run) => total + run.raidGoldNet, 0)
    // A pending raid has only its raider's side applied so far.
    const pendingRaiderSide = runs.flatMap((run) => run.pending).reduce((total, raid) => total + (raid.raiderWon ? raid.gold : -raid.gold), 0)
    expect(net - pendingRaiderSide).toBe(report.gold.clampGap)
    expect(Object.values(report.pairings).reduce((total, p) => total + p.raids, 0)).toBe(runs.reduce((total, run) => total + run.launches, 0))
    expect(report.gold.moved).toBeGreaterThan(0)
  }, 30_000)
})
