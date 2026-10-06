import { contentV1 } from '@trmnl-games/desk-crawler/content/v1'
import { simulateHero, SIMULATION_VERSION } from '@trmnl-games/desk-crawler/sim/core/simulate'
import { starterHero, starterKit } from '@trmnl-games/desk-crawler/sim/core/starter'
import type { HeroState, ItemSnapshot, NewItem, SimulationInput, SimulationResult, StreamSeeds } from '@trmnl-games/desk-crawler/sim/core/types'

export const content = contentV1

export const seeds = (n: number): StreamSeeds => ({
  encounter: (n * 2654435761) >>> 0,
  combat: (n * 2246822519 + 1) >>> 0,
  reward: (n * 3266489917 + 2) >>> 0,
  narrative: (n * 668265263 + 3) >>> 0,
})

export const withId = (item: NewItem, id: string): ItemSnapshot => ({ ...item, id })

/** Starter hero with equipped kit: weapon i000, armor i001, potions i999. */
export function baseState(overrides: Partial<HeroState> = {}, potions = 3): { hero: HeroState; inventory: ItemSnapshot[] } {
  const kit = starterKit(content)
  const inventory: ItemSnapshot[] = [withId(kit.weapon, 'i000'), withId(kit.armor, 'i001')]
  if (potions > 0) inventory.push(withId({ ...kit.potions, quantity: potions }, 'i999'))
  const hero: HeroState = { ...starterHero('hero1', content, 0), weaponId: 'i000', armorId: 'i001', ...overrides }
  return { hero, inventory }
}

/** Add common gear until the hero owns `count` gear rows (including the two equipped). */
export function fillBag(inventory: ItemSnapshot[], count: number): ItemSnapshot[] {
  const kit = starterKit(content)
  const gear = inventory.filter((item) => item.kind !== 'potion').length
  const extra = Array.from({ length: count - gear }, (_, i) => withId(kit.weapon, `i${String(i + 2).padStart(3, '0')}`))
  return [...inventory, ...extra].sort((a, b) => (a.id < b.id ? -1 : 1))
}

export function input(hero: HeroState, inventory: ItemSnapshot[], tick: number, seed: number): SimulationInput {
  return { hero, inventory, tick, content, simulationVersion: SIMULATION_VERSION, streams: seeds(seed) }
}

export function run(hero: HeroState, inventory: ItemSnapshot[], tick = 10, seed = 1): SimulationResult {
  return simulateHero(input(hero, inventory, tick, seed))
}

/** Find the first seed whose result satisfies the predicate. */
export function findSeed(
  hero: HeroState,
  inventory: ItemSnapshot[],
  predicate: (result: SimulationResult) => boolean,
  tick = 10,
  limit = 20_000,
): { seed: number; result: SimulationResult } {
  for (let seed = 0; seed < limit; seed += 1) {
    const result = run(hero, inventory, tick, seed)
    if (predicate(result)) return { seed, result }
  }
  throw new Error('no seed satisfied the predicate')
}
