import type { AnglerState, CastResult, TickEvent } from '@trmnl-games/slow-cast/sim'
import type { Doc } from '../_generated/dataModel'

/** Stored angler to the pure core's state. */
export function toAnglerState(doc: Doc<'anglers'>): AnglerState {
  return {
    gold: doc.gold,
    status: doc.status,
    waterId: doc.waterId,
    ...(doc.travelTo === undefined ? {} : { travelTo: doc.travelTo }),
    rodTier: doc.rodTier,
    coolerTier: doc.coolerTier,
    ...(doc.baitOnHook === undefined ? {} : { baitOnHook: doc.baitOnHook }),
    bait: doc.bait,
    access: doc.access,
    logbook: doc.logbook,
    counters: doc.counters,
    quietTicks: doc.quietTicks,
  }
}

/** The pure core's state back to stored fields. Absent optionals are written as undefined so a cleared travel or bait clears. */
export function fromAnglerState(state: AnglerState): Partial<Doc<'anglers'>> {
  return {
    gold: state.gold,
    status: state.status,
    waterId: state.waterId,
    travelTo: state.travelTo,
    rodTier: state.rodTier,
    coolerTier: state.coolerTier,
    baitOnHook: state.baitOnHook,
    bait: state.bait as Record<string, number>,
    access: [...state.access],
    logbook: state.logbook as Doc<'anglers'>['logbook'],
    counters: state.counters,
    quietTicks: state.quietTicks,
  }
}

/** A core event as a stored log detail. */
export function storedDetail(event: TickEvent): Doc<'swTickLogs'>['detail'] {
  const d = event.detail
  return {
    v: 1,
    ...(d.speciesId === undefined ? {} : { speciesId: d.speciesId }),
    ...(d.grams === undefined ? {} : { grams: d.grams }),
    ...(d.value === undefined ? {} : { value: d.value }),
    ...(d.record ? { record: true } : {}),
    ...(d.firstOfSpecies ? { firstOfSpecies: true } : {}),
    ...(d.waterId === undefined ? {} : { waterId: d.waterId }),
    ...(d.bait === undefined ? {} : { bait: d.bait }),
    ...(d.weather === undefined ? {} : { weather: d.weather }),
    ...(d.band === undefined ? {} : { band: d.band }),
  }
}

export const progressed = (result: CastResult) => result.disposition !== 'paused'
