import { sha256 } from '@noble/hashes/sha2.js'

export const SEED_VERSION = 1

/**
 * Seed v1 (simulation.md): SHA-256 of the UTF-8 JSON encoding of
 * [worldSeed, subjectId, tick, simulationVersion, streamName]; the first four
 * digest bytes as an unsigned little-endian 32-bit integer. Each stream hashes
 * on its own name, so a game can add a stream without moving the others.
 *
 * Lives outside the pure core: the adapter derives seeds and passes them in.
 */
export function deriveStreamSeed(worldSeed: string, subjectId: string, tick: number, simulationVersion: number, stream: string): number {
  const bytes = new TextEncoder().encode(JSON.stringify([worldSeed, subjectId, tick, simulationVersion, stream]))
  const digest = sha256(bytes)
  return (digest[0]! | (digest[1]! << 8) | (digest[2]! << 16) | (digest[3]! << 24)) >>> 0
}

/** One seed per named stream, in the order given. */
export function deriveNamedSeeds<S extends string>(worldSeed: string, subjectId: string, tick: number, simulationVersion: number, streams: readonly S[]): Record<S, number> {
  const seeds = {} as Record<S, number>
  for (const stream of streams) seeds[stream] = deriveStreamSeed(worldSeed, subjectId, tick, simulationVersion, stream)
  return seeds
}

/**
 * Shared forecast seed: the same hash family over [worldSeed, 'forecast', scopeId, blockKey], with no
 * subject, so everyone at one water in one block draws the same weather (slow-cast.md).
 */
export function deriveSharedSeed(worldSeed: string, scopeId: string, blockKey: number): number {
  const bytes = new TextEncoder().encode(JSON.stringify([worldSeed, 'forecast', scopeId, blockKey]))
  const digest = sha256(bytes)
  return (digest[0]! | (digest[1]! << 8) | (digest[2]! << 16) | (digest[3]! << 24)) >>> 0
}
