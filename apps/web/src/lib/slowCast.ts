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

/** What each bait catches, for the shop (content v1 species table). Epic fish stay unnamed: the logbook keeps them a surprise. */
export const BAIT_BLURB: Record<string, string> = {
  worms: 'Most small fish take worms, and so do tench, chub and barbel. Eels take nothing else.',
  bread: 'Crucian and common carp take only bread. Roach, rudd, bream and tench take it too.',
  maggots: 'Grayling take only maggots. Chub, dace, gudgeon and barbel take them too.',
  spinner: 'A metal lure for hunting fish. Pike, zander and rainbow trout take nothing else; perch, mackerel and sea bass take it too.',
  ragworm: 'Whiting, flounder and wrasse take only ragworm. Pollock, sea bass and smoothhounds take it too.',
  strip: 'Conger eels take only mackerel strip. Mackerel and smoothhounds take it too.',
}

/** "About 1 cast in 5 gets a bite": easier to picture than a percentage. */
export const biteOdds = (percent: number) => (percent > 0 ? `About 1 cast in ${Math.max(1, Math.round(100 / percent))} gets a bite.` : 'No bites are possible right now.')
