import type { AnglerCounters, AnglerState, SlowCastCatalog } from './types'

export const zeroCounters = (): AnglerCounters => ({
  casts: 0,
  bites: 0,
  fishCaught: 0,
  released: 0,
  gotAway: 0,
  rareCaught: 0,
  epicCaught: 0,
  nightCatches: 0,
  heaviestGrams: 0,
  goldEarned: 0,
  fishSold: 0,
  trips: 0,
  baitRunOuts: 0,
})

/** A new angler (slow-cast.md "Angler and starting state"): Cane Rod, Bucket, one tub of worms on the hook, at the Millpond. */
export function starterAngler(content: SlowCastCatalog, tick: number): AnglerState {
  const worms = content.baits.find((b) => b.class === 'worms')
  return {
    gold: 0,
    status: 'fishing',
    waterId: 'millpond',
    rodTier: 1,
    coolerTier: 1,
    baitOnHook: 'worms',
    bait: { worms: worms?.castsPerTub ?? 24 },
    access: [],
    logbook: {},
    counters: zeroCounters(),
    quietTicks: 0,
  }
}

export const FIRST_LOG = 'You set up on the bank of the Millpond.'
