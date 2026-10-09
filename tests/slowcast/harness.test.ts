import { describe, expect, it } from 'vitest'
import { runHarness, simulateAnglerRun } from '../../tools/balance/slowcast'

describe('Slow Cast balance harness', () => {
  it('is deterministic per angler and policy', () => {
    const policy = { name: 'daily', everyDays: 1 }
    expect(simulateAnglerRun(policy, 3, 4)).toEqual(simulateAnglerRun(policy, 3, 4))
  })

  it('never lets bait go negative or above the cap, and never spends gold it does not have', () => {
    for (const policy of [{ name: 'daily', everyDays: 1 }, { name: 'three-day', everyDays: 3 }, { name: 'never', everyDays: 0 }]) {
      for (let i = 0; i < 4; i += 1) {
        const log = simulateAnglerRun(policy, i, 12)
        const angler = log.final!
        expect(angler.gold).toBeGreaterThanOrEqual(0)
        for (const units of Object.values(angler.bait)) {
          expect(units).toBeGreaterThanOrEqual(0)
          expect(units).toBeLessThanOrEqual(72)
        }
        expect(angler.counters.fishCaught).toBe(Object.values(angler.logbook).reduce((sum, entry) => sum + entry.count, 0))
      }
    }
  })

  it('reports every gate with a value', () => {
    const report = runHarness(6, 6)
    expect(report.gates.length).toBeGreaterThanOrEqual(13)
    expect(report.gates.filter((g) => g.name.startsWith('Millpond')).every((g) => g.value !== null)).toBe(true)
  }, 60_000)
})
