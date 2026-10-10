import { v } from 'convex/values'
import { ACHIEVEMENTS_VERSION, allSatisfied, familyProgress, needsFullPass, newlyUnlocked, type AchievementDef, type AchievementState } from '@trmnl-games/slow-cast/content/achievements'
import type { SlowCastCatalog } from '@trmnl-games/slow-cast/sim'
import { contentV1 } from '@trmnl-games/slow-cast/content'
import type { Doc, Id } from '../_generated/dataModel'
import { query, type MutationCtx, type QueryCtx } from '../_generated/server'
import { currentUser } from '../lib/intent'
import { readEngineWorld } from '../lib/engine/world'
import { currentAngler } from './profile'
import { SLOW_CAST_RUNTIME } from './runtime'

/**
 * Slow Cast achievement authority (slow-cast.md "Achievements"), the D65 rules: unlock rows keyed by owner and unique
 * per id, so a retried evaluation writes nothing twice; each unlock also writes an `achievement` story.
 */
export const MAX_SW_UNLOCKS = 512

export const stateOf = (a: Pick<Doc<'anglers'>, 'rodTier' | 'counters' | 'logbook'>, flies = 0): AchievementState => ({ rodTier: a.rodTier, counters: a.counters, logbook: a.logbook, flies })

export async function awardAngler(ctx: MutationCtx, angler: Doc<'anglers'>, before: AchievementState, after: AchievementState, content: SlowCastCatalog, now: number, tick: number): Promise<AchievementDef[]> {
  const fullPass = needsFullPass(angler.achievementsVersion)
  const candidates = fullPass ? allSatisfied(after, content) : newlyUnlocked(before, after, content)
  const written: AchievementDef[] = []
  let sequence = angler.logSequence
  for (const def of candidates) {
    const existing = await ctx.db.query('swAchievements').withIndex('by_userId_and_achievementId', (q) => q.eq('userId', angler.userId).eq('achievementId', def.id)).unique()
    if (existing) continue
    await ctx.db.insert('swAchievements', { userId: angler.userId, anglerId: angler._id, achievementId: def.id, unlockedAt: now, tick, catalogVersion: ACHIEVEMENTS_VERSION })
    sequence += 1
    await ctx.db.insert('swTickLogs', { anglerId: angler._id, source: 'lifecycle', tick, sequence, at: now, kind: 'achievement', summary: `Achievement: ${def.name}`, detail: { v: 1, achievementId: def.id, name: def.name }, deltas: { xpEarned: 0, gold: 0 } })
    written.push(def)
  }
  const patch: Partial<Doc<'anglers'>> = {}
  if (sequence !== angler.logSequence) patch.logSequence = sequence
  if (fullPass) patch.achievementsVersion = ACHIEVEMENTS_VERSION
  if (Object.keys(patch).length > 0) await ctx.db.patch(angler._id, patch)
  return written
}

/** After an intent: compare the angler before it with its committed state. */
export async function awardAfterAnglerIntent(ctx: MutationCtx, before: Doc<'anglers'>, content: SlowCastCatalog, tick: number): Promise<void> {
  const angler = await ctx.db.get(before._id)
  if (!angler) return
  const flies = (await ctx.db.query('flyBoxes').withIndex('by_userId', (q) => q.eq('userId', angler.userId)).unique())?.totalCollected ?? 0
  await awardAngler(ctx, angler, stateOf(before, flies), stateOf(angler, flies), content, Date.now(), tick)
}

/** Publication runs: add one owner's unlocks to the run's rarity tally. */
export async function tallyAnglerUnlocks(ctx: QueryCtx, userId: Id<'users'>, counts: Record<string, number>): Promise<void> {
  const rows = await ctx.db.query('swAchievements').withIndex('by_userId_and_achievementId', (q) => q.eq('userId', userId)).take(MAX_SW_UNLOCKS)
  for (const row of rows) counts[row.achievementId] = (counts[row.achievementId] ?? 0) + 1
}

/** The owner's Slow Cast achievements: progress per family and rarity from the current publication. */
export const mine = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const user = await currentUser(ctx)
    const angler = await currentAngler(ctx, user)
    if (user === null || angler === null || angler.activationState !== 'active') return null
    const world = await readEngineWorld(ctx, SLOW_CAST_RUNTIME)
    const content = (world && SLOW_CAST_RUNTIME.content(world.activeContentVersion)) ?? contentV1
    const rows = await ctx.db.query('swAchievements').withIndex('by_userId_and_achievementId', (q) => q.eq('userId', user._id)).take(MAX_SW_UNLOCKS)
    const unlocked = new Map(rows.map((row) => [row.achievementId, row.unlockedAt]))
    const publicationId = world?.publishedPublicationId as unknown as Id<'swLeaderboardPublications'> | undefined
    const stats = publicationId ? await ctx.db.query('swAchievementStats').withIndex('by_publicationId', (q) => q.eq('publicationId', publicationId)).unique() : null
    return {
      catalogVersion: ACHIEVEMENTS_VERSION,
      earnedCount: rows.length,
      families: familyProgress(stateOf(angler, (await ctx.db.query('flyBoxes').withIndex('by_userId', (q) => q.eq('userId', user._id)).unique())?.totalCollected ?? 0), content, new Set(unlocked.keys())).map((f) => ({
        family: f.family,
        name: f.name,
        category: f.category,
        tiers: f.tiers,
        earned: f.earned ? { id: f.earned.id, name: f.earned.name, blurb: f.earned.blurb, tier: f.earned.tier, unlockedAt: unlocked.get(f.earned.id) ?? null } : null,
        next: f.next ? { id: f.next.id, name: f.next.name, tier: f.next.tier } : null,
        value: f.value,
        target: f.target,
      })),
      rarity: stats ? { counts: stats.counts, totalPlayers: stats.totalPlayers } : null,
    }
  },
})
