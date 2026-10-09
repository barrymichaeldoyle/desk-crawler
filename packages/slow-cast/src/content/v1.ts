import type { SlowCastCatalog, SpeciesDef, WaterDef } from '../sim/types'

/**
 * Slow Cast content v1 (slow-cast.md "Waters", "Species", "Gear"). Starting
 * numbers from the spec, tuned by the S1 harness (tools/balance/slowcast.ts);
 * the harness evidence records each change from the spec's table.
 */

const freshwaterTime = { dawn: 130, day: 100, dusk: 130, night: 80 } as const

const waters: readonly WaterDef[] = [
  {
    id: 'millpond',
    name: 'Millpond',
    the: 'the Millpond',
    unlockLevel: 1,
    biteBasePermille: 130,
    baits: ['worms', 'bread', 'spinner'],
    weather: [['clear', 45], ['overcast', 30], ['rain', 15], ['fog', 10]],
    timePercent: freshwaterTime,
    weatherPercent: { clear: 100, overcast: 110, rain: 100, wind: 90, fog: 100 },
  },
  {
    id: 'river_bend',
    name: 'River Bend',
    the: 'River Bend',
    unlockLevel: 4,
    access: 'waders',
    biteBasePermille: 140,
    baits: ['worms', 'maggots', 'spinner'],
    weather: [['clear', 35], ['overcast', 30], ['rain', 25], ['fog', 10]],
    timePercent: freshwaterTime,
    weatherPercent: { clear: 100, overcast: 110, rain: 120, wind: 90, fog: 100 },
  },
  {
    id: 'harbour_pier',
    name: 'Harbour Pier',
    the: 'the Harbour Pier',
    unlockLevel: 8,
    access: 'pier_permit',
    biteBasePermille: 120,
    baits: ['ragworm', 'strip', 'spinner'],
    weather: [['clear', 30], ['overcast', 25], ['rain', 15], ['wind', 20], ['fog', 10]],
    timePercent: { dawn: 130, day: 100, dusk: 130, night: 100 },
    weatherPercent: { clear: 100, overcast: 110, rain: 100, wind: 90, fog: 100 },
  },
]

const g = (kg: number) => Math.round(kg * 1000)

const species: readonly SpeciesDef[] = [
  // Millpond
  { id: 'minnow', name: 'Minnow', water: 'millpond', rarity: 'common', minGrams: g(0.01), maxGrams: g(0.05), baits: ['worms', 'bread'], anyBait: true, price: 5, xp: 8 },
  { id: 'roach', name: 'Roach', water: 'millpond', rarity: 'common', minGrams: g(0.05), maxGrams: g(0.6), baits: ['worms', 'bread'], anyBait: true, price: 10, xp: 12 },
  { id: 'rudd', name: 'Rudd', water: 'millpond', rarity: 'common', minGrams: g(0.05), maxGrams: g(0.7), baits: ['bread', 'worms'], times: ['day'], price: 10, xp: 12 },
  { id: 'perch', name: 'Perch', water: 'millpond', rarity: 'common', minGrams: g(0.1), maxGrams: g(1.4), baits: ['worms', 'spinner'], price: 15, xp: 16 },
  { id: 'bream', name: 'Bream', water: 'millpond', rarity: 'uncommon', minGrams: g(0.3), maxGrams: g(3.5), baits: ['bread', 'worms'], times: ['dawn', 'dusk', 'night'], price: 25, xp: 24 },
  { id: 'crucian_carp', name: 'Crucian Carp', water: 'millpond', rarity: 'uncommon', minGrams: g(0.2), maxGrams: g(1.6), baits: ['bread'], times: ['dawn', 'day'], price: 30, xp: 24 },
  { id: 'tench', name: 'Tench', water: 'millpond', rarity: 'uncommon', minGrams: g(0.5), maxGrams: g(3.0), baits: ['bread', 'worms'], times: ['dawn', 'dusk'], price: 35, xp: 28 },
  { id: 'eel', name: 'Eel', water: 'millpond', rarity: 'rare', minGrams: g(0.3), maxGrams: g(2.5), baits: ['worms'], times: ['night'], price: 50, xp: 40 },
  { id: 'common_carp', name: 'Common Carp', water: 'millpond', rarity: 'rare', minGrams: g(1.0), maxGrams: g(12.0), baits: ['bread'], times: ['dawn', 'dusk'], price: 75, xp: 56 },
  { id: 'golden_carp', name: 'Golden Carp', water: 'millpond', rarity: 'epic', weight: 22, minGrams: g(1.5), maxGrams: g(8.0), baits: ['bread'], times: ['dawn', 'dusk'], weather: ['clear', 'overcast'], price: 225, xp: 120 },
  // River Bend
  { id: 'gudgeon', name: 'Gudgeon', water: 'river_bend', rarity: 'common', minGrams: g(0.02), maxGrams: g(0.1), baits: ['worms', 'maggots'], anyBait: true, price: 11, xp: 14 },
  { id: 'dace', name: 'Dace', water: 'river_bend', rarity: 'common', minGrams: g(0.05), maxGrams: g(0.4), baits: ['worms', 'maggots'], anyBait: true, price: 14, xp: 17 },
  { id: 'chub', name: 'Chub', water: 'river_bend', rarity: 'common', minGrams: g(0.2), maxGrams: g(2.5), baits: ['worms', 'maggots'], price: 28, xp: 25 },
  { id: 'grayling', name: 'Grayling', water: 'river_bend', rarity: 'uncommon', minGrams: g(0.2), maxGrams: g(1.5), baits: ['maggots'], weather: ['overcast', 'rain'], price: 49, xp: 39 },
  { id: 'brown_trout', name: 'Brown Trout', water: 'river_bend', rarity: 'uncommon', minGrams: g(0.2), maxGrams: g(2.5), baits: ['worms', 'spinner'], times: ['dawn', 'dusk'], price: 56, xp: 45 },
  { id: 'barbel', name: 'Barbel', water: 'river_bend', rarity: 'uncommon', minGrams: g(0.5), maxGrams: g(6.0), baits: ['maggots', 'worms'], times: ['dusk', 'night'], price: 63, xp: 50 },
  { id: 'rainbow_trout', name: 'Rainbow Trout', water: 'river_bend', rarity: 'rare', minGrams: g(0.3), maxGrams: g(3.5), baits: ['spinner'], times: ['day'], price: 84, xp: 62 },
  { id: 'pike', name: 'Pike', water: 'river_bend', rarity: 'rare', minGrams: g(1.0), maxGrams: g(14.0), baits: ['spinner'], times: ['dawn', 'dusk'], price: 126, xp: 90 },
  { id: 'zander', name: 'Zander', water: 'river_bend', rarity: 'rare', minGrams: g(0.8), maxGrams: g(7.0), baits: ['spinner'], times: ['dusk', 'night'], price: 112, xp: 84 },
  { id: 'salmon', name: 'Salmon', water: 'river_bend', rarity: 'epic', minGrams: g(2.0), maxGrams: g(15.0), baits: ['spinner'], times: ['dawn', 'dusk'], weather: ['rain'], price: 385, xp: 196 },
  // Harbour Pier
  { id: 'sand_eel', name: 'Sand Eel', water: 'harbour_pier', rarity: 'common', minGrams: g(0.01), maxGrams: g(0.05), baits: ['ragworm', 'strip'], anyBait: true, price: 8, xp: 10 },
  { id: 'whiting', name: 'Whiting', water: 'harbour_pier', rarity: 'common', minGrams: g(0.1), maxGrams: g(1.0), baits: ['ragworm'], price: 20, xp: 18 },
  { id: 'mackerel', name: 'Mackerel', water: 'harbour_pier', rarity: 'common', minGrams: g(0.2), maxGrams: g(1.2), baits: ['spinner', 'strip'], times: ['day'], price: 25, xp: 20 },
  { id: 'pollock', name: 'Pollock', water: 'harbour_pier', rarity: 'uncommon', minGrams: g(0.5), maxGrams: g(5.0), baits: ['spinner', 'ragworm'], times: ['dawn', 'dusk'], price: 45, xp: 36 },
  { id: 'flounder', name: 'Flounder', water: 'harbour_pier', rarity: 'uncommon', minGrams: g(0.2), maxGrams: g(1.5), baits: ['ragworm'], price: 40, xp: 32 },
  { id: 'wrasse', name: 'Wrasse', water: 'harbour_pier', rarity: 'uncommon', minGrams: g(0.3), maxGrams: g(2.5), baits: ['ragworm'], times: ['day'], weather: ['clear'], price: 45, xp: 36 },
  { id: 'sea_bass', name: 'Sea Bass', water: 'harbour_pier', rarity: 'rare', minGrams: g(0.8), maxGrams: g(8.0), baits: ['spinner', 'ragworm'], times: ['dusk', 'night'], price: 110, xp: 72 },
  { id: 'conger_eel', name: 'Conger Eel', water: 'harbour_pier', rarity: 'rare', minGrams: g(2.0), maxGrams: g(30.0), baits: ['strip'], times: ['night'], price: 125, xp: 80 },
  { id: 'smoothhound', name: 'Smoothhound', water: 'harbour_pier', rarity: 'rare', minGrams: g(2.0), maxGrams: g(12.0), baits: ['ragworm', 'strip'], times: ['dusk', 'night'], price: 120, xp: 76 },
  { id: 'thornback_ray', name: 'Thornback Ray', water: 'harbour_pier', rarity: 'epic', minGrams: g(2.0), maxGrams: g(10.0), baits: ['strip'], times: ['night'], weather: ['overcast', 'fog'], price: 350, xp: 160 },
]

export const contentV1: SlowCastCatalog = {
  contentVersion: 'v1',
  waters,
  species,
  rods: [
    { tier: 1, id: 'cane_rod', name: 'Cane Rod', limitGrams: g(1.5), biteBonusPercent: 0, price: 0 },
    { tier: 2, id: 'fibreglass_rod', name: 'Fibreglass Rod', limitGrams: g(4), biteBonusPercent: 5, price: 250 },
    { tier: 3, id: 'carbon_rod', name: 'Carbon Rod', limitGrams: g(10), biteBonusPercent: 10, price: 700 },
    { tier: 4, id: 'beachcaster', name: 'Beachcaster', limitGrams: g(30), biteBonusPercent: 15, price: 2000 },
  ],
  baits: [
    { class: 'worms', name: 'Worms', the: 'the worm', castsPerTub: 12, price: 25 },
    { class: 'bread', name: 'Bread', the: 'the bread', castsPerTub: 12, price: 20 },
    { class: 'maggots', name: 'Maggots', the: 'the maggots', castsPerTub: 12, price: 30 },
    { class: 'spinner', name: 'Spinner', the: 'the spinner', castsPerTub: 72, price: 240 },
    { class: 'ragworm', name: 'Ragworm', the: 'the ragworm', castsPerTub: 12, price: 60 },
    { class: 'strip', name: 'Mackerel strip', the: 'the mackerel strip', castsPerTub: 12, price: 75 },
  ],
  coolers: [
    { tier: 1, id: 'bucket', name: 'Bucket', capacity: 6, price: 0 },
    { tier: 2, id: 'cool_box', name: 'Cool Box', capacity: 12, price: 60 },
    { tier: 3, id: 'chest_cooler', name: 'Chest Cooler', capacity: 18, price: 300 },
    { tier: 4, id: 'dockside_crate', name: 'Dockside Crate', capacity: 24, price: 1500 },
  ],
  access: [
    { id: 'waders', name: 'Waders', water: 'river_bend', price: 250 },
    { id: 'pier_permit', name: 'Pier Permit', water: 'harbour_pier', price: 900 },
  ],
  rarityWeights: { common: 700, uncommon: 230, rare: 60, epic: 10 },
  bareHookPercent: 40,
  baitCap: 72,
  ambientEvery: 4,
  ambient: {
    millpond: [
      'A moorhen picks its way along the reeds.',
      'The float sits still on flat water.',
      'Midges hang over the margin.',
      'A heron watches from the far bank.',
      'Something swirls under the lily pads.',
      'The mill wheel creaks in the breeze.',
    ],
    river_bend: [
      'The float trots down the crease.',
      'A kingfisher flashes past, low and blue.',
      'Water chatters over the gravel run.',
      'A trout rises once, out of reach.',
      'Leaves drift down the main flow.',
      'The far bank is all willow roots.',
    ],
    harbour_pier: [
      'Gulls argue over the bait bucket.',
      'The tide pulls at the line.',
      'A fishing boat chugs out past the wall.',
      'Spray comes over the end of the pier.',
      'The rod tip nods with the swell.',
      'A seal surfaces, looks, and goes.',
    ],
  },
  bands: { dawn: 5, day: 8, dusk: 17, night: 20 },
}
