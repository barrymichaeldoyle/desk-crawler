import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { ACHIEVEMENTS_VERSION, type AchievementDef } from '@trmnl-games/desk-crawler/content/achievements'
import { allSatisfied, needsFullPass, newlyUnlocked, type AchievementState } from '@trmnl-games/desk-crawler/sim/core/achievements'
import type { ContentCatalog } from '@trmnl-games/desk-crawler/sim/core/types'
import { withCounterDefaults } from '@trmnl-games/desk-crawler/sim/core/starter'

/**
 * Achievement authority (achievements.md "Storage", D65). Unlock rows are
 * keyed by owner and unique per achievement id; a duplicate evaluation under a
 * retried or concurrent transaction finds the row and writes nothing. Every
 * unlock also writes one `achievement` log so the device can celebrate it.
 */

/** At most this many unlock rows are read per owner; the catalog is far smaller. */
export const MAX_UNLOCK_ROWS = 1024

export function achievementState(hero: Pick<Doc<'heroes'>, 'level' | 'bagCapacity' | 'counters'>, keepsakeTotal: number): AchievementState {
  return { level: hero.level, bagCapacity: hero.bagCapacity, counters: withCounterDefaults(hero.counters), keepsakeTotal }
}

export async function keepsakeTotal(ctx: QueryCtx, userId: Id<'users'>): Promise<number> {
  const collection = await ctx.db.query('deskKeepsakes').withIndex('by_userId', (q) => q.eq('userId', userId)).unique()
  return collection?.totalCollected ?? 0
}

/** The owner's unlocked achievement ids. */
export async function unlockedIds(ctx: QueryCtx, userId: Id<'users'>): Promise<Set<string>> {
  const rows = await ctx.db.query('heroAchievements').withIndex('by_userId_and_achievementId', (q) => q.eq('userId', userId)).take(MAX_UNLOCK_ROWS)
  return new Set(rows.map((row) => row.achievementId))
}

/**
 * Award whatever `after` newly satisfies. The fast path diffs the two states
 * without reading storage; a hero behind the catalog version gets one full
 * pass against its unlock rows. Returns the achievements written this call.
 */
export async function awardAchievements(
  ctx: MutationCtx,
  hero: Doc<'heroes'>,
  before: AchievementState,
  after: AchievementState,
  content: ContentCatalog,
  now: number,
  tick: number,
): Promise<AchievementDef[]> {
  const fullPass = needsFullPass(hero.achievementsVersion)
  const candidates = fullPass ? allSatisfied(after, content) : newlyUnlocked(before, after, content)
  const written: AchievementDef[] = []
  let sequence = hero.logSequence
  for (const def of candidates) {
    const existing = await ctx.db
      .query('heroAchievements')
      .withIndex('by_userId_and_achievementId', (q) => q.eq('userId', hero.userId).eq('achievementId', def.id))
      .unique()
    if (existing) continue
    await ctx.db.insert('heroAchievements', { userId: hero.userId, heroId: hero._id, achievementId: def.id, unlockedAt: now, tick, catalogVersion: ACHIEVEMENTS_VERSION })
    sequence += 1
    await ctx.db.insert('tickLogs', {
      heroId: hero._id,
      source: 'lifecycle',
      tick,
      sequence,
      at: now,
      kind: 'achievement',
      summary: `Achievement: [[${def.name}]]`,
      detail: { v: 1, achievementId: def.id, name: def.name, family: def.family, tier: def.tier },
      deltas: { xpEarned: 0, gold: 0, hp: 0 },
    })
    written.push(def)
  }
  const patch: Partial<Doc<'heroes'>> = {}
  if (sequence !== hero.logSequence) patch.logSequence = sequence
  if (fullPass) patch.achievementsVersion = ACHIEVEMENTS_VERSION
  if (Object.keys(patch).length > 0) await ctx.db.patch(hero._id, patch)
  return written
}

/** For intents: compare the hero before the intent with its committed state now. */
export async function awardAfterIntent(ctx: MutationCtx, before: Doc<'heroes'>, content: ContentCatalog, tick: number): Promise<AchievementDef[]> {
  const hero = await ctx.db.get(before._id)
  if (hero === null) return []
  const keepsakes = await keepsakeTotal(ctx, hero.userId)
  return await awardAchievements(ctx, hero, achievementState(before, keepsakes), achievementState(hero, keepsakes), content, Date.now(), tick)
}

/** Publication runs: add one hero's unlocks to the run tally (achievements.md "Rarity"). */
export async function tallyUnlocks(ctx: QueryCtx, userId: Id<'users'>, counts: Record<string, number>): Promise<void> {
  for (const id of await unlockedIds(ctx, userId)) counts[id] = (counts[id] ?? 0) + 1
}

export function mergeCounts(base: Record<string, number> | undefined, add: Record<string, number>): Record<string, number> {
  const merged: Record<string, number> = { ...(base ?? {}) }
  for (const [id, count] of Object.entries(add)) merged[id] = (merged[id] ?? 0) + count
  return merged
}
