import { describe, expect, it } from 'vitest'
import { contentV2 } from '@trmnl-games/desk-crawler/content/v2'
import { contentV3 } from '@trmnl-games/desk-crawler/content/v3'
import { applyItemChanges } from '@trmnl-games/desk-crawler/sim/core/apply'
import { codePoints, markedRuns, stripMarks } from '@trmnl-games/desk-crawler/sim/core/narrative'
import { simulateHero, SIMULATION_VERSION } from '@trmnl-games/desk-crawler/sim/core/simulate'
import { starterHero, starterKit } from '@trmnl-games/desk-crawler/sim/core/starter'
import type { ContentCatalog, HeroState, ItemSnapshot } from '@trmnl-games/desk-crawler/sim/core/types'
import { seeds, withId } from './helpers'

function start(content: ContentCatalog): { hero: HeroState; inventory: ItemSnapshot[] } {
  const kit = starterKit(content)
  const inventory = [withId(kit.weapon, 'i000'), withId(kit.armor, 'i001'), withId({ ...kit.potions, quantity: 3 }, 'i999')]
  return { hero: { ...starterHero('hero1', content, 0), weaponId: 'i000', armorId: 'i001' }, inventory }
}

/** Every 40 ticks an exploring hero heads for the deepest open area, so travel lines run too. */
function maybeTravel(hero: HeroState, content: ContentCatalog, tick: number): HeroState {
  if (tick % 40 !== 0 || hero.status !== 'exploring') return hero
  const open = content.biomes.filter((b) => b.unlockLevel <= hero.level && b.id !== hero.biomeId)
  const target = open[open.length - 1]
  return target ? { ...hero, status: 'travelling', targetBiomeId: target.id, arriveAtTick: tick + 1 } : hero
}

describe('content v3 narrative', () => {
  // 48,000 simulations can exceed the default five seconds on the CI runner.
  it('changes only the text: v2 and v3 heroes stay identical on the same seeds', { timeout: 15_000 }, () => {
    const texts = new Set<string>()
    for (let heroIndex = 0; heroIndex < 60; heroIndex += 1) {
      let a = start(contentV2)
      let b = start(contentV3)
      for (let tick = 1; tick <= 400; tick += 1) {
        const streams = seeds(heroIndex * 10_000 + tick)
        const ra = simulateHero({ hero: a.hero, inventory: a.inventory, tick, content: contentV2, simulationVersion: SIMULATION_VERSION, streams })
        const rb = simulateHero({ hero: b.hero, inventory: b.inventory, tick, content: contentV3, simulationVersion: SIMULATION_VERSION, streams })
        expect(rb.nextHero).toEqual(ra.nextHero)
        // New items carry their catalog version; everything else must match.
        const unversioned = (changes: typeof ra.itemChanges) => JSON.parse(JSON.stringify(changes).replaceAll('"contentVersion":"v3"', '"contentVersion":"v2"'))
        expect(unversioned(rb.itemChanges)).toEqual(unversioned(ra.itemChanges))
        expect(rb.event?.kind).toBe(ra.event?.kind)
        if (rb.event) {
          const summary = rb.event.summary
          texts.add(stripMarks(summary))
          expect(codePoints(summary)).toBeLessThanOrEqual(contentV3.constants.summaryMaxCodePoints)
          expect(summary.split('[[').length).toBe(summary.split(']]').length)
          expect(summary).not.toMatch(/[{}]|\bticks?\b/)
        }
        // Same id sequence on both sides, so new items match too.
        const ids = () => {
          let n = 0
          return () => `t${tick}n${n++}`
        }
        const appliedA = applyItemChanges(ra.nextHero, a.inventory, ra.itemChanges, ids())
        const appliedB = applyItemChanges(rb.nextHero, b.inventory, rb.itemChanges, ids())
        a = { hero: maybeTravel(appliedA.hero, contentV2, tick), inventory: appliedA.inventory }
        b = { hero: maybeTravel(appliedB.hero, contentV3, tick), inventory: appliedB.inventory }
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
    expect(markedRuns('Old plain text.')).toEqual([{ text: 'Old plain text.', bold: false }])
  })
})
