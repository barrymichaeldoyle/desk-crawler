import { describe, expect, it } from 'vitest'
import { contentV3 } from '@trmnl-games/desk-crawler/content/v3'
import { contentV4 } from '@trmnl-games/desk-crawler/content/v4'
import { codePoints, variant } from '@trmnl-games/desk-crawler/sim/core/narrative'
import { createRng } from '@trmnl-games/desk-crawler/sim/core/rng'
import { simulateHero, SIMULATION_VERSION } from '@trmnl-games/desk-crawler/sim/core/simulate'
import { baseState, seeds } from './helpers'

const office = contentV4.narrative.biomes.office_cubicles!
const cable = 'Tripped over a loose cable. -4 HP.'
const anotherCable = 'Tripped over another loose cable. -7 HP.'

describe('content v4 narration', () => {
  it('makes a second loose cable a callback, then excludes a third across changing damage', () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 500; seed += 1) {
      const rng = createRng(seed)
      const second = variant(rng, office.trapHit, { damage: 7 }, [cable], office.trapHitCallbacks)
      seen.add(second)
      expect(second).not.toBe('Tripped over a loose cable. -7 HP.')
      expect(rng.draws).toBe(1)
      for (const recent of [[anotherCable, cable], [cable, anotherCable]]) {
        expect(variant(createRng(seed), office.trapHit, { damage: 9 }, recent, office.trapHitCallbacks)).not.toContain('loose cable')
      }
    }
    expect(seen.has(anotherCable)).toBe(true)
  })

  it('ignores appended consequences and permits the joke again after another action', () => {
    const withConsequence = `${cable} Used a potion. +40 HP.`
    let callbackSeen = false
    let ordinarySeen = false
    for (let seed = 0; seed < 200; seed += 1) {
      const second = variant(createRng(seed), office.trapHit, { damage: 7 }, [withConsequence], office.trapHitCallbacks)
      expect(second).not.toBe('Tripped over a loose cable. -7 HP.')
      callbackSeen ||= second === anotherCable
      const afterBreak = variant(createRng(seed), office.trapHit, { damage: 4 }, ['Found a healing potion.', cable], office.trapHitCallbacks)
      ordinarySeen ||= afterBreak === cable
    }
    expect(callbackSeen && ordinarySeen).toBe(true)
  })

  it('avoids accidental repeats in other pools, including changing healing amounts', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      expect(variant(createRng(seed), contentV4.narrative.shared.restingHeal, { heal: 20 }, ['Resting to recover. +5 HP.']))
        .not.toBe('Resting to recover. +20 HP.')
    }
  })

  it('uses history in the simulator without changing any gameplay result or legacy text', () => {
    const { hero, inventory } = baseState()
    let foundCable = false
    const withoutSummary = (result: ReturnType<typeof simulateHero>) => ({ ...result, event: result.event && { ...result.event, summary: undefined } })
    for (let seed = 0; seed < 3000; seed += 1) {
      const input = { hero, inventory, tick: 10, content: contentV4, simulationVersion: SIMULATION_VERSION, streams: seeds(seed) }
      const original = simulateHero(input)
      if (!original.event?.summary.startsWith('Tripped over a loose cable.')) continue
      foundCable = true
      const second = simulateHero({ ...input, recentSummaries: [cable] })
      expect(second.event?.summary).toMatch(/^Tripped over another loose cable\./)
      const third = simulateHero({ ...input, recentSummaries: [anotherCable, cable] })
      expect(third.event?.summary).not.toContain('loose cable')
      expect(withoutSummary(second)).toEqual(withoutSummary(original))
      expect(withoutSummary(third)).toEqual(withoutSummary(original))
      expect(simulateHero({ ...input, recentSummaries: [anotherCable, cable] })).toEqual(third)
      const legacy = { ...input, content: contentV3 }
      expect(simulateHero({ ...legacy, recentSummaries: [cable] })).toEqual(simulateHero(legacy))
      break
    }
    expect(foundCable).toBe(true)
  })

  it('keeps v3 game outcomes identical across every biome, with all stories in budget', () => {
    for (const biome of contentV4.biomes) {
      const { hero, inventory } = baseState({ level: 12, hp: 232, biomeId: biome.id })
      for (let seed = 0; seed < 500; seed += 1) {
        const input = { hero, inventory, tick: 10, simulationVersion: SIMULATION_VERSION, streams: seeds(seed) }
        const old = simulateHero({ ...input, content: contentV3 })
        const current = simulateHero({ ...input, content: contentV4, recentSummaries: [cable, anotherCable] })
        expect(current.nextHero).toEqual(old.nextHero)
        const unversioned = (value: unknown) => JSON.parse(JSON.stringify(value).replaceAll('"contentVersion":"v4"', '"contentVersion":"v3"'))
        expect(unversioned(current.itemChanges)).toEqual(old.itemChanges)
        expect(current.metrics).toEqual(old.metrics)
        expect(current.event?.deltas).toEqual(old.event?.deltas)
        expect(unversioned(current.event?.detail ?? null)).toEqual(old.event?.detail ?? null)
        if (current.event) expect(codePoints(current.event.summary)).toBeLessThanOrEqual(contentV4.constants.summaryMaxCodePoints)
      }
    }
  })
})
