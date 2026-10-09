import { deriveStreamSeed as engineSeed, SEED_VERSION } from '@trmnl-games/engine/seed'
import type { StreamName, StreamSeeds } from './core/types'

export { SEED_VERSION }

const STREAMS: readonly StreamName[] = ['encounter', 'combat', 'reward', 'narrative', 'raid', 'quest']

/** Seed v1 (simulation.md), computed by the shared engine; the hash input is unchanged since launch. */
export function deriveStreamSeed(worldSeed: string, heroId: string, tick: number, simulationVersion: number, stream: StreamName): number {
  return engineSeed(worldSeed, heroId, tick, simulationVersion, stream)
}

export function deriveStreamSeeds(worldSeed: string, heroId: string, tick: number, simulationVersion: number): StreamSeeds {
  // Each stream hashes on its own name, so adding the D110 `raid` and P31 `quest` streams leaves the earlier seeds unchanged.
  const [encounter, combat, reward, narrative, raid, quest] = STREAMS.map((stream) => deriveStreamSeed(worldSeed, heroId, tick, simulationVersion, stream)) as [number, number, number, number, number, number]
  return { encounter, combat, reward, narrative, raid, quest }
}
