import type { Id } from '@trmnl-games/backend/data-model'

/** The client's view of `slowCast.anglers.dock` (slow-cast.md "Companion"). */
export interface Dock {
  readonly gameState: 'active' | 'deleting' | null
  readonly angler: null | {
    readonly alias: string
    readonly activationState: 'pending_trmnl' | 'active'
    readonly status: 'fishing' | 'paused'
    readonly level: number
    readonly xp: number
    readonly xpToNext: number
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
  readonly catches?: ReadonlyArray<{ id: Id<'catches'>; speciesId: string; name: string; grams: number; value: number; caughtTick: number }>
  readonly waters?: ReadonlyArray<{ id: string; name: string; unlockLevel: number; access: string | null; open: boolean; weather: string; band: string; bitePercent: number; baits: readonly string[]; weatherUntil: number }>
  readonly shop?: {
    readonly rod: { name: string; price: number; limitGrams: number; biteBonusPercent: number } | null
    readonly cooler: { name: string; price: number; capacity: number } | null
    readonly access: ReadonlyArray<{ id: 'waders' | 'pier_permit'; name: string; price: number; water: string; owned: boolean }>
  }
  readonly logs?: ReadonlyArray<{ id: string; at: number; kind: string; summary: string; xp: number; gold: number }>
  readonly nextTickAt?: number
}

export const formatWeight = (grams: number) => (grams >= 1000 ? `${(Math.round(grams / 100) / 10).toFixed(1)} kg` : `${grams} g`)

export const BAND_LABEL: Record<string, string> = { dawn: 'Dawn', day: 'Day', dusk: 'Dusk', night: 'Night' }
export const WEATHER_LABEL: Record<string, string> = { clear: 'Clear', overcast: 'Overcast', rain: 'Rain', wind: 'Wind', fog: 'Fog' }
export const BAIT_LABEL: Record<string, string> = { worms: 'Worms', bread: 'Bread', maggots: 'Maggots', spinner: 'Spinner', ragworm: 'Ragworm', strip: 'Mackerel strip' }

/** Who takes a bait, split into the fish that take nothing else and the rest; only fish in `seen` are named. */
export function baitCatches(species: ReadonlyArray<{ id: string; name: string; baits: readonly string[] }>, bait: string, seen: ReadonlySet<string>) {
  const takers = species.filter((s) => s.baits.includes(bait))
  const named = (rows: typeof takers) => ({ names: rows.filter((s) => seen.has(s.id)).map((s) => s.name), unseen: rows.filter((s) => !seen.has(s.id)).length })
  return { only: named(takers.filter((s) => s.baits.length === 1)), also: named(takers.filter((s) => s.baits.length > 1)) }
}

/** "Roach, Perch, +2 not caught yet", or "3 fish not caught yet", for a baitCatches group. */
export const fishList = ({ names, unseen }: { names: string[]; unseen: number }) =>
  [...names, ...(unseen > 0 ? [names.length > 0 ? `+${unseen} not caught yet` : `${unseen} fish not caught yet`] : [])].join(', ')
