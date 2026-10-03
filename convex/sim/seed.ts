import { sha256 } from '@noble/hashes/sha2.js'
import type { StreamName, StreamSeeds } from './core/types'

export const SEED_VERSION = 1

const STREAMS: readonly StreamName[] = ['encounter', 'combat', 'reward', 'narrative']

/**
 * Seed v1 (simulation.md): SHA-256 of the UTF-8 JSON encoding of
 * [worldSeed, heroId, tick, simulationVersion, streamName]; the first four
 * digest bytes as an unsigned little-endian 32-bit integer.
 *
 * Lives outside the pure core: the adapter derives seeds and passes them in.
 */
export function deriveStreamSeed(
  worldSeed: string,
  heroId: string,
  tick: number,
  simulationVersion: number,
  stream: StreamName,
): number {
  const bytes = new TextEncoder().encode(JSON.stringify([worldSeed, heroId, tick, simulationVersion, stream]))
  const digest = sha256(bytes)
  return ((digest[0]! | (digest[1]! << 8) | (digest[2]! << 16) | (digest[3]! << 24)) >>> 0)
}

export function deriveStreamSeeds(
  worldSeed: string,
  heroId: string,
  tick: number,
  simulationVersion: number,
): StreamSeeds {
  const [encounter, combat, reward, narrative] = STREAMS.map((stream) =>
    deriveStreamSeed(worldSeed, heroId, tick, simulationVersion, stream),
  ) as [number, number, number, number]
  return { encounter, combat, reward, narrative }
}
