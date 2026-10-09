import { v } from 'convex/values'

/** Slow Cast storage validators (slow-cast.md "Data"). Mirrors the pure core's types in packages/slow-cast. */
export const waterId = v.union(v.literal('millpond'), v.literal('river_bend'), v.literal('harbour_pier'))
export const baitClass = v.union(v.literal('worms'), v.literal('bread'), v.literal('maggots'), v.literal('spinner'), v.literal('ragworm'), v.literal('strip'))
export const accessId = v.union(v.literal('waders'), v.literal('pier_permit'))
export const timeBand = v.union(v.literal('dawn'), v.literal('day'), v.literal('dusk'), v.literal('night'))
export const weather = v.union(v.literal('clear'), v.literal('overcast'), v.literal('rain'), v.literal('wind'), v.literal('fog'))

export const anglerCounters = v.object({
  casts: v.number(),
  bites: v.number(),
  fishCaught: v.number(),
  released: v.number(),
  gotAway: v.number(),
  rareCaught: v.number(),
  epicCaught: v.number(),
  nightCatches: v.number(),
  heaviestGrams: v.number(),
  goldEarned: v.number(),
  fishSold: v.number(),
  trips: v.number(),
  baitRunOuts: v.number(),
})

export const logbookEntry = v.object({ count: v.number(), bestGrams: v.number(), firstTick: v.number() })

export const swLogKind = v.union(
  v.literal('catch'),
  v.literal('release'),
  v.literal('got_away'),
  v.literal('ambient'),
  v.literal('travel'),
  v.literal('bait_out'),
  v.literal('levelup'),
  v.literal('achievement'),
  v.literal('system'),
)

export const swLogDetail = v.object({
  v: v.literal(1),
  operation: v.optional(v.string()),
  speciesId: v.optional(v.string()),
  grams: v.optional(v.number()),
  value: v.optional(v.number()),
  record: v.optional(v.boolean()),
  firstOfSpecies: v.optional(v.boolean()),
  waterId: v.optional(waterId),
  bait: v.optional(baitClass),
  level: v.optional(v.number()),
  weather: v.optional(weather),
  band: v.optional(timeBand),
  count: v.optional(v.number()),
  achievementId: v.optional(v.string()),
  name: v.optional(v.string()),
})
