import type { AnglerState, SlowCastCatalog, WaterDef, WaterId } from './types'

/**
 * Slow Cast's progression (2026-10-10): an angler's standing is a title earned by species logged, and a water opens
 * once enough of the previous water's species are in the logbook. Desk Crawler climbs by level; Slow Cast by knowing
 * its fish. Slow Cast has no XP or levels.
 */
export const TITLES = [
  { id: 'newcomer', name: 'Newcomer', species: 0 },
  { id: 'regular', name: 'Regular', species: 4 },
  { id: 'local', name: 'Local', species: 8 },
  { id: 'old_hand', name: 'Old Hand', species: 14 },
  { id: 'specimen_hunter', name: 'Specimen Hunter', species: 20 },
  { id: 'master_angler', name: 'Master Angler', species: 26 },
] as const

export type Title = (typeof TITLES)[number]

/** Species in the logbook, in all or at one water. */
export function speciesLogged(content: SlowCastCatalog, logbook: AnglerState['logbook'], waterId?: WaterId): number {
  return content.species.filter((s) => logbook[s.id] !== undefined && (waterId === undefined || s.water === waterId)).length
}

export function titleFor(species: number): Title {
  return [...TITLES].reverse().find((t) => species >= t.species)!
}

export function nextTitle(species: number): Title | null {
  return TITLES.find((t) => t.species > species) ?? null
}

/**
 * Whether the logbook opens a water: it has no requirement, the angler is there or has logged a fish there (so an
 * angler who reached it under the old level rule keeps it), or enough of the previous water's species are logged.
 */
export function waterKnown(content: SlowCastCatalog, angler: Pick<AnglerState, 'logbook' | 'waterId'>, water: WaterDef): boolean {
  if (water.opensAfter === undefined || angler.waterId === water.id) return true
  if (speciesLogged(content, angler.logbook, water.id) > 0) return true
  return speciesLogged(content, angler.logbook, water.opensAfter.water) >= water.opensAfter.species
}
