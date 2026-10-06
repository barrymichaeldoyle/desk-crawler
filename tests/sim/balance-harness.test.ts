import { describe, expect, it } from 'vitest'
import { contentV1 } from '@trmnl-games/desk-crawler/content/v1'
import { simulateCohort, summarize } from '../../tools/balance/run'

describe('balance evidence', () => {
  it('accounts for potion supply and consumption with the real simulator', () => {
    const logs = simulateCohort({ name: 'daily', everyDays: 1 }, 8, 12, contentV1)
    expect(logs.some(log => log.potionsUsed > 0)).toBe(true)
    expect(logs.some(log => log.potionFullFallbacks > 0)).toBe(true)
    for (const log of logs) {
      expect(log.startingPotions + log.potionsFound - log.potionsUsed).toBe(log.finalPotions)
      expect(log.finalPotions).toBeLessThanOrEqual(contentV1.constants.potionStackCap)
      expect(log.usefulGearFound).toBeLessThanOrEqual(log.gearFound)
      for (const [biome, days] of log.deathDaysByBiome) {
        expect([...days].every(day => log.eligibleDaysByBiome.get(biome)?.has(day))).toBe(true)
      }
    }
  })

  it('counts two deaths on one eligible hero-day once for probability', () => {
    const logs = simulateCohort({ name: 'test', everyDays: 0 }, 1, 1, contentV1)
    const log = logs[0]!
    log.eligibleDaysByBiome = new Map([['server_room', new Set([0, 1])]])
    log.deathDaysByBiome = new Map([['server_room', new Set([0])]])
    log.deathsByBiome = new Map([['server_room', 2]])
    const report = summarize({ name: 'test', everyDays: 0 }, logs, 2, contentV1)
    expect(report.deathByBiome['server_room']).toMatchObject({ eligibleHeroDays: 2, heroDaysWithDeath: 1, deathProbabilityPct: 50, deathsPerEligibleHeroDay: 1 })
    expect(report.deathByBiome['cafeteria_depths']?.deathProbabilityPct).toBeNull()
    log.dailyXp = [0]
    expect(summarize({ name: 'test', everyDays: 0 }, logs, 2, contentV1).xpLastDay.ratio).toBeNull()
  })

  it('keeps starter gear in the undergeared policy and produces deterministic reports', () => {
    const policy = { name: 'undergeared', everyDays: 3, equipGear: false }
    const first = simulateCohort(policy, 2, 8, contentV1)
    expect(first.every(log => log.equippedUpgrades === 0)).toBe(true)
    expect(first).toEqual(simulateCohort(policy, 2, 8, contentV1))
    const safe = simulateCohort({ name: 'safe', everyDays: 3, staySafe: true }, 2, 8, contentV1)
    expect(safe.every(log => log.eligibleDaysByBiome.size === 1 && log.eligibleDaysByBiome.has('office_cubicles'))).toBe(true)
  })
})
