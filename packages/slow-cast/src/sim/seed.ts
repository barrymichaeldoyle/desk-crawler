import { deriveNamedSeeds, deriveSharedSeed } from '@trmnl-games/engine/seed'
import { forecastBlock, weatherFromSeed } from './conditions'
import type { SlowCastCatalog, StreamName, StreamSeeds, WaterDef, WaterId, Weather } from './types'

export const STREAMS: readonly StreamName[] = ['bite', 'species', 'size', 'narrative']

/** Per-angler stream seeds (seed v1, the engine's hash). Lives outside the pure core. */
export function deriveAnglerSeeds(worldSeed: string, anglerId: string, tick: number, simulationVersion: number): StreamSeeds {
  return deriveNamedSeeds(worldSeed, anglerId, tick, simulationVersion, STREAMS)
}

/** The shared forecast: one weather per water per six-hour UTC block, the same for every angler. */
export function forecast(worldSeed: string, water: WaterDef, at: number): Weather {
  return weatherFromSeed(deriveSharedSeed(worldSeed, water.id, forecastBlock(at)), water)
}

export function forecastFor(worldSeed: string, content: SlowCastCatalog, waterId: WaterId, at: number): Weather {
  const water = content.waters.find((w) => w.id === waterId)
  if (!water) throw new Error(`unknown water ${waterId}`)
  return forecast(worldSeed, water, at)
}
