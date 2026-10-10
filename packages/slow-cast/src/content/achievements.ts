import type { AnglerCounters, SlowCastCatalog } from '../sim/types'
import { contentV1 } from './v1'

/**
 * Slow Cast achievements (slow-cast.md "Achievements"), versioned like the content catalog: a release appends
 * families under a new version and never edits an existing id. Every predicate reads bounded angler state, so a
 * new achievement is earned retroactively at the next evaluation.
 */
/** v2 (S6) appends the Flies family. */
export const ACHIEVEMENTS_VERSION = 2

export type AchievementCategory = 'Fishing' | 'Logbook' | 'Trade' | 'Progress' | 'Species'

export type Predicate =
  | { readonly kind: 'counter'; readonly counter: keyof AnglerCounters; readonly atLeast: number }
  | { readonly kind: 'level'; readonly atLeast: number }
  | { readonly kind: 'rod'; readonly atLeast: number }
  | { readonly kind: 'logbook'; readonly atLeast: number }
  | { readonly kind: 'waters'; readonly atLeast: number }
  | { readonly kind: 'first'; readonly speciesId: string }
  | { readonly kind: 'specimen'; readonly speciesId: string; readonly grams: number }
  | { readonly kind: 'flies'; readonly atLeast: number }

export interface AchievementDef {
  readonly id: string
  readonly family: string
  readonly familyName: string
  readonly category: AchievementCategory
  readonly tier: number
  readonly name: string
  readonly blurb: string
  readonly predicate: Predicate
}

type Tier = readonly [atLeast: number, name: string, blurb: string]

function family(id: string, familyName: string, category: AchievementCategory, make: (atLeast: number) => Predicate, tiers: readonly Tier[]): AchievementDef[] {
  return tiers.map(([atLeast, name, blurb], index) => ({ id: `${id}_${index + 1}`, family: id, familyName, category, tier: index + 1, name, blurb, predicate: make(atLeast) }))
}

const counter = (name: keyof AnglerCounters) => (atLeast: number): Predicate => ({ kind: 'counter', counter: name, atLeast })

const FAMILIES: AchievementDef[] = [
  ...family('catches', 'Catches', 'Fishing', counter('fishCaught'), [
    [1, 'First Bite', 'Something on the end of the line.'],
    [10, 'Tight Lines', 'Ten fish on the float.'],
    [100, 'Regular on the Bank', 'The heron nods as you arrive.'],
    [1000, 'Old Hand', 'You can tie a knot in the dark.'],
    [10000, 'Legend of the Water', 'They name a swim after you.'],
  ]),
  ...family('big_ones', 'Big ones', 'Fishing', counter('heaviestGrams'), [
    [1000, 'A Kilo Fish', 'Two hands to hold it.'],
    [5000, 'Heavyweight', 'The rod hoops over.'],
    [10000, 'Net Bender', 'A new landing net is on the list.'],
    [20000, 'Monster of the Deep', 'Nobody at the pub believes you.'],
  ]),
  ...family('rare_catches', 'Rare catches', 'Fishing', counter('rareCaught'), [
    [1, 'Something Special', 'Not a fish you see every day.'],
    [10, 'Rare Form', 'You know where the good ones hide.'],
    [100, 'Collector', 'A hundred rare fish in the net.'],
  ]),
  ...family('epic_catches', 'Epic catches', 'Fishing', counter('epicCaught'), [
    [1, 'Once in a Season', 'The right bait, hour and weather, all at once.'],
    [3, 'Fisher of Legends', 'Golden, silver and spotted.'],
  ]),
  ...family('got_away', 'Got away', 'Fishing', counter('gotAway'), [
    [1, 'The One That Got Away', 'The line went slack.'],
    [10, 'Snapped Again', 'A better rod is calling.'],
    [50, 'Tall Tales', 'Fifty lost to a snapped line.'],
  ]),
  ...family('night_fishing', 'Night fishing', 'Fishing', counter('nightCatches'), [
    [1, 'After Dark', 'The lamp hisses. Something bites.'],
    [25, 'Night Owl', 'The flask is always full.'],
    [250, 'Moonlighter', 'Two hundred and fifty fish after dark.'],
  ]),
  ...family('released', 'Released', 'Fishing', counter('released'), [
    [1, 'Catch and Release', 'Back you go.'],
    [25, 'Gentle Hands', 'Wet hands, quick release.'],
    [250, 'Friend of the Fish', 'They might be the same ones.'],
  ]),
  ...family('logbook', 'Logbook', 'Logbook', (n) => ({ kind: 'logbook', atLeast: n }), [
    [5, 'Five in the Book', 'The pages start to fill.'],
    [10, 'Naturalist', 'You know a rudd from a roach.'],
    [20, 'Field Guide', 'Other anglers ask you what they caught.'],
    [30, 'Every Fish in the Book', 'Every species, every water.'],
  ]),
  ...family('waters', 'Waters', 'Progress', (n) => ({ kind: 'waters', atLeast: n }), [
    [2, 'Down to the River', 'Waders on, into the current.'],
    [3, 'Salt Water', 'Gulls, tide and a pier to call home.'],
  ]),
  ...family('levels', 'Levels', 'Progress', (n) => ({ kind: 'level', atLeast: n }), [
    [4, 'Getting the Hang of It', 'River Bend is open.'],
    [8, 'Seasoned', 'The Harbour Pier is open.'],
    [12, 'Expert', 'The tackle shop greets you by name.'],
    [16, 'Master Angler', 'The club wants you on the committee.'],
    [20, 'Grand Master', 'There is a plaque by the gate.'],
  ]),
  ...family('rods', 'Rods', 'Progress', (n) => ({ kind: 'rod', atLeast: n }), [
    [2, 'Fibreglass', 'Lighter and stronger than the old cane.'],
    [3, 'Carbon Fibre', 'You can feel every nibble.'],
    [4, 'Beachcaster', 'Built for the biggest fish in the sea.'],
  ]),
  ...family('gold_earned', 'Gold earned', 'Trade', counter('goldEarned'), [
    [100, 'Pocket Money', 'Enough for a tub of worms or four.'],
    [1000, 'Market Stall', 'The fishmonger saves you a spot.'],
    [10000, 'Fishmonger', 'A van with your name on it.'],
    [100000, 'Fish Baron', 'You own the market.'],
  ]),
  ...family('sales', 'Sales', 'Trade', counter('fishSold'), [
    [1, 'First Sale', 'Fresh today.'],
    [25, 'Regular Supplier', 'They know your cooler.'],
    [250, 'Wholesale', 'Restaurants call ahead.'],
    [1000, 'Fish Market', 'A thousand fish sold.'],
  ]),
]

/** Two tiers per species: the first one caught, and a specimen over three quarters of the species' largest size. */
const SPECIES: AchievementDef[] = contentV1.species.flatMap((s) => [
  { id: `first_${s.id}`, family: `species_${s.id}`, familyName: s.name, category: 'Species' as const, tier: 1, name: `First ${s.name}`, blurb: `A ${s.name} in the logbook.`, predicate: { kind: 'first' as const, speciesId: s.id } },
  { id: `specimen_${s.id}`, family: `species_${s.id}`, familyName: s.name, category: 'Species' as const, tier: 2, name: `Specimen ${s.name}`, blurb: `A ${s.name} over ${Math.round(((s.maxGrams * 0.75) / 1000) * 10) / 10} kg.`, predicate: { kind: 'specimen' as const, speciesId: s.id, grams: Math.ceil(s.maxGrams * 0.75) } },
])

/** Version 2: the fly box (S6). Two full boxes is the top tier. */
const FLIES: AchievementDef[] = family('flies', 'Flies', 'Logbook', (n) => ({ kind: 'flies', atLeast: n }), [
  [1, 'First Fly', 'Pinned to your hat for luck.'],
  [6, 'Half a Box', 'Six patterns, all tied by hand.'],
  [12, 'Full Fly Box', 'Every pattern in its own little slot.'],
  [24, 'Second Box', 'One for the hat, one for the jacket.'],
])

export const ACHIEVEMENTS: readonly AchievementDef[] = [...FAMILIES, ...SPECIES, ...FLIES]
export const ACHIEVEMENT_BY_ID: ReadonlyMap<string, AchievementDef> = new Map(ACHIEVEMENTS.map((a) => [a.id, a]))

/** The bounded state predicates read. */
export interface AchievementState {
  readonly level: number
  readonly rodTier: number
  readonly counters: AnglerCounters
  readonly logbook: Readonly<Record<string, { readonly count: number; readonly bestGrams: number }>>
  /** Flies collected from the device's weekly code; zero until the owner claims one. */
  readonly flies: number
}

export function measure(predicate: Predicate, state: AchievementState, content: SlowCastCatalog): { value: number; target: number } {
  switch (predicate.kind) {
    case 'counter':
      return { value: state.counters[predicate.counter], target: predicate.atLeast }
    case 'level':
      return { value: state.level, target: predicate.atLeast }
    case 'rod':
      return { value: state.rodTier, target: predicate.atLeast }
    case 'logbook':
      return { value: Object.keys(state.logbook).length, target: predicate.atLeast }
    case 'waters': {
      const waters = new Set(Object.keys(state.logbook).map((id) => content.species.find((s) => s.id === id)?.water).filter(Boolean))
      return { value: waters.size, target: predicate.atLeast }
    }
    case 'first':
      return { value: state.logbook[predicate.speciesId] ? 1 : 0, target: 1 }
    case 'specimen':
      return { value: state.logbook[predicate.speciesId]?.bestGrams ?? 0, target: predicate.grams }
    case 'flies':
      return { value: state.flies, target: predicate.atLeast }
  }
}

export const satisfied = (def: AchievementDef, state: AchievementState, content: SlowCastCatalog) => {
  const { value, target } = measure(def.predicate, state, content)
  return value >= target
}

/** Achievements `after` satisfies that `before` did not. */
export function newlyUnlocked(before: AchievementState, after: AchievementState, content: SlowCastCatalog): AchievementDef[] {
  return ACHIEVEMENTS.filter((def) => satisfied(def, after, content) && !satisfied(def, before, content))
}

/** Every achievement the state satisfies, for an angler behind the catalog version. */
export function allSatisfied(state: AchievementState, content: SlowCastCatalog): AchievementDef[] {
  return ACHIEVEMENTS.filter((def) => satisfied(def, state, content))
}

export const needsFullPass = (evaluated: number | undefined) => (evaluated ?? 0) < ACHIEVEMENTS_VERSION

/** Each family's highest earned tier and progress to the next, for the companion. */
export function familyProgress(state: AchievementState, content: SlowCastCatalog, unlocked: ReadonlySet<string>) {
  const families = new Map<string, AchievementDef[]>()
  for (const def of ACHIEVEMENTS) families.set(def.family, [...(families.get(def.family) ?? []), def])
  return [...families.entries()].map(([id, tiers]) => {
    const earned = [...tiers].reverse().find((t) => unlocked.has(t.id)) ?? null
    const next = tiers.find((t) => !unlocked.has(t.id)) ?? null
    const goal = next ?? tiers.at(-1)!
    const { value, target } = measure(goal.predicate, state, content)
    return { family: id, name: tiers[0]!.familyName, category: tiers[0]!.category, tiers: tiers.length, earned, next, value, target }
  })
}
