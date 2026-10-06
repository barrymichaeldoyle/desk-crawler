import { describe, expect, it } from 'vitest'
import { contentV1 } from '@trmnl-games/desk-crawler/content/v1'
import { applyItemChanges } from '@trmnl-games/desk-crawler/sim/core/apply'
import { codePoints, markedRuns, stripMarks, variant } from '@trmnl-games/desk-crawler/sim/core/narrative'
import { createRng } from '@trmnl-games/desk-crawler/sim/core/rng'
import { simulateHero, SIMULATION_VERSION } from '@trmnl-games/desk-crawler/sim/core/simulate'
import { starterHero, starterKit } from '@trmnl-games/desk-crawler/sim/core/starter'
import type { HeroState, ItemSnapshot } from '@trmnl-games/desk-crawler/sim/core/types'
import { baseState, seeds, withId } from './helpers'

const content = contentV1
const office = content.narrative.biomes.office_cubicles!
const cable = 'Tripped over a loose cable. -4 HP.'
const anotherCable = 'Tripped over another loose cable. -7 HP.'

function start(): { hero: HeroState; inventory: ItemSnapshot[] } {
  const kit = starterKit(content)
  const inventory = [withId(kit.weapon, 'i000'), withId(kit.armor, 'i001'), withId({ ...kit.potions, quantity: 3 }, 'i999')]
  return { hero: { ...starterHero('hero1', content, 0), weaponId: 'i000', armorId: 'i001' }, inventory }
}

/** Every 40 ticks an exploring hero heads for the deepest open area, so travel lines run too. */
function maybeTravel(hero: HeroState, tick: number): HeroState {
  if (tick % 40 !== 0 || hero.status !== 'exploring') return hero
  const open = content.biomes.filter((b) => b.unlockLevel <= hero.level && b.id !== hero.biomeId)
  const target = open[open.length - 1]
  return target ? { ...hero, status: 'travelling', targetBiomeId: target.id, arriveAtTick: tick + 1 } : hero
}

describe('narration', () => {
  it('tells varied, well-formed stories within budget over long runs', { timeout: 15_000 }, () => {
    const texts = new Set<string>()
    for (let heroIndex = 0; heroIndex < 60; heroIndex += 1) {
      let { hero, inventory } = start()
      let recent: string[] = []
      for (let tick = 1; tick <= 400; tick += 1) {
        const result = simulateHero({ hero, inventory, tick, content, simulationVersion: SIMULATION_VERSION, streams: seeds(heroIndex * 10_000 + tick), recentSummaries: recent })
        if (result.event) {
          const summary = result.event.summary
          texts.add(stripMarks(summary))
          recent = [summary, ...recent].slice(0, 2)
          expect(codePoints(summary)).toBeLessThanOrEqual(content.constants.summaryMaxCodePoints)
          expect(summary.split('[[').length).toBe(summary.split(']]').length)
          expect(summary).not.toMatch(/[{}]|\bticks?\b/)
        }
        let n = 0
        const applied = applyItemChanges(result.nextHero, inventory, result.itemChanges, () => `t${tick}n${n++}`)
        hero = maybeTravel(applied.hero, tick)
        // Keep the bag from filling so long runs keep exploring.
        inventory = applied.inventory.filter((item) => item.kind === 'potion' || item.id === hero.weaponId || item.id === hero.armorId)
        if (hero.status === 'sleeping') {
          const { heldItemId: _held, ...awake } = hero
          hero = { ...awake, wakeAtTick: tick + 1 }
        }
      }
    }
    // The wider pool shows up in practice, including monster signatures and area unlocks.
    expect(texts.size).toBeGreaterThan(300)
    expect([...texts].some((t) => t.startsWith('Fed a Paper Imp to the shredder.'))).toBe(true)
    expect([...texts].some((t) => /Reached level 4! (The Server Room is now open\.|New area unlocked: the Server Room\.)/.test(t))).toBe(true)
  })

  it('marks names in bold', () => {
    expect(markedRuns('Fed a [[Paper Imp]] to the shredder.')).toEqual([
      { text: 'Fed a ', bold: false },
      { text: 'Paper Imp', bold: true },
      { text: ' to the shredder.', bold: false },
    ])
    expect(markedRuns('Plain text.')).toEqual([{ text: 'Plain text.', bold: false }])
  })

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
      expect(variant(createRng(seed), contentV1.narrative.shared.restingHeal, { heal: 20 }, ['Resting to recover. +5 HP.']))
        .not.toBe('Resting to recover. +20 HP.')
    }
  })

  it('uses history in the simulator without changing any gameplay result', () => {
    const { hero, inventory } = baseState()
    let foundCable = false
    const withoutSummary = (result: ReturnType<typeof simulateHero>) => ({ ...result, event: result.event && { ...result.event, summary: undefined } })
    for (let seed = 0; seed < 3000; seed += 1) {
      const input = { hero, inventory, tick: 10, content: contentV1, simulationVersion: SIMULATION_VERSION, streams: seeds(seed) }
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
      break
    }
    expect(foundCable).toBe(true)
  })

})
