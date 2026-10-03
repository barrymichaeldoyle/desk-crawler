import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

/**
 * Current-release schema only (data-model.md). Tables are added as their work
 * packages land; future systems arrive through additive migrations.
 */
export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    publicAlias: v.string(),
    normalizedAlias: v.string(),
    timezone: v.string(),
    state: v.union(v.literal('active'), v.literal('suspended'), v.literal('deleting')),
    createdAt: v.number(),
    publicNameVersion: v.number(),
  })
    .index('by_tokenIdentifier', ['tokenIdentifier'])
    .index('by_normalizedAlias', ['normalizedAlias'])
    .index('by_state', ['state']),
})
