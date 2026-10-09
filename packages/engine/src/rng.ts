/**
 * Versioned Mulberry32 integer PRNG (simulation.md, seed v1).
 * Pure: the caller supplies a uint32 seed; nothing here reads time or globals.
 */
export interface Rng {
  /** Uniform float in [0, 1): one uint32 draw divided by 2^32. */
  next(): number
  /** Uniform integer in [min, max] inclusive. Consumes exactly one draw. */
  int(min: number, max: number): number
  /** Integer percentage roll 1–100. True when the roll is <= percent. One draw. */
  chance(percent: number): boolean
  /** Number of draws consumed so far (diagnostics and draw-order tests). */
  readonly draws: number
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0
  let draws = 0
  const nextUint32 = (): number => {
    draws += 1
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return (t ^ (t >>> 14)) >>> 0
  }
  return {
    next: () => nextUint32() / 2 ** 32,
    int(min, max) {
      if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || max < min) {
        throw new RangeError(`invalid int range ${min}..${max}`)
      }
      return min + Math.floor((nextUint32() / 2 ** 32) * (max - min + 1))
    },
    chance(percent) {
      return 1 + Math.floor((nextUint32() / 2 ** 32) * 100) <= percent
    },
    get draws() {
      return draws
    },
  }
}

/**
 * Pick from integer weights (sum must be > 0) with one draw.
 * Entries are evaluated in the given order, which is part of the simulation version.
 */
export function pickWeighted<T>(rng: Rng, entries: ReadonlyArray<readonly [T, number]>): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  if (total <= 0) throw new RangeError('weights must sum to a positive value')
  let roll = rng.int(1, total)
  for (const [value, weight] of entries) {
    roll -= weight
    if (roll <= 0) return value
  }
  throw new Error('unreachable: weighted pick exhausted')
}

/** Pick uniformly from a non-empty ordered list with one draw. */
export function pickOne<T>(rng: Rng, items: ReadonlyArray<T>): T {
  if (items.length === 0) throw new RangeError('cannot pick from an empty list')
  return items[rng.int(0, items.length - 1)] as T
}
