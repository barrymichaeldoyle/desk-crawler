import type { Id } from '@trmnl-games/backend/data-model'

/** The client's view of `slowCast.anglers.dock` (slow-cast.md "Companion"). */
export interface Dock {
  readonly gameState: 'active' | 'deleting' | null
  readonly angler: null | {
    readonly alias: string
    readonly activationState: 'pending_trmnl' | 'active'
    readonly status: 'fishing' | 'paused'
    /** Standing by species logged (slow-cast titles.ts), and the next title with the species it needs. */
    readonly title: string
    readonly nextTitle: { name: string; species: number } | null
    readonly gold: number
    readonly waterId: string
    readonly travelTo: string | null
    readonly rod: { tier: number; name: string; limitGrams: number }
    readonly cooler: { tier: number; name: string; capacity: number; used: number }
    readonly baitOnHook: string | null
    readonly bait: ReadonlyArray<{ class: string; name: string; units: number; tubSize: number; price: number; tubsThatFit: number }>
    readonly access: readonly string[]
    readonly counters: Record<string, number>
    readonly publicProfile: boolean
    readonly speciesLogged: number
    readonly speciesTotal: number
  }
  readonly catches?: ReadonlyArray<{ id: Id<'catches'>; speciesId: string; name: string; grams: number; value: number; caughtTick: number; record?: boolean }>
  readonly waters?: ReadonlyArray<{ id: string; name: string; opensAfter: { waterId: string; waterName: string; species: number; logged: number } | null; access: string | null; open: boolean; weather: string; band: string; bitePercent: number; baits: readonly string[]; weatherUntil: number }>
  readonly shop?: {
    readonly rod: { name: string; price: number; limitGrams: number; biteBonusPercent: number } | null
    readonly cooler: { name: string; price: number; capacity: number } | null
    readonly access: ReadonlyArray<{ id: 'waders' | 'pier_permit'; name: string; price: number; water: string; owned: boolean }>
  }
  readonly logs?: ReadonlyArray<{ id: string; at: number; kind: string; summary: string; gold: number }>
  readonly recap?: { landed: number; released: number; records: number; firsts: number; best: { speciesId: string; grams: number } | null; gotAway: number; awayGrams: number[] }
  readonly nextTickAt?: number
}

export const formatWeight = (grams: number) => (grams >= 1000 ? `${(Math.round(grams / 100) / 10).toFixed(1)} kg` : `${grams} g`)

export const BAND_LABEL: Record<string, string> = { dawn: 'Dawn', day: 'Day', dusk: 'Dusk', night: 'Night' }
export const WEATHER_LABEL: Record<string, string> = { clear: 'Clear', overcast: 'Overcast', rain: 'Rain', wind: 'Wind', fog: 'Fog' }
export const BAIT_LABEL: Record<string, string> = { worms: 'Worms', bread: 'Bread', maggots: 'Maggots', spinner: 'Spinner', ragworm: 'Ragworm', strip: 'Mackerel strip' }
