import { currentHero } from './gameProfile'
import type { Doc } from '../_generated/dataModel'
import type { QueryCtx } from '../_generated/server'
import { HOUR_MS, hourStart, WINDOW_7D_HOURS } from '@trmnl-games/desk-crawler/sim/score'
import { levelGroup } from '@trmnl-games/desk-crawler/sim/core/stats'
import { TOP_ROWS, type PayloadRanking } from '@trmnl-games/desk-crawler/payload'

export type Board = 'overall' | 'recent_24h' | 'recent_7d'

const labelFor = (cohortKey: string) => {
  if (cohortKey === 'all') return 'All heroes'
  const [min, max] = cohortKey.split('-')
  return `Levels ${min}-${max}`
}

/** Mask copied public names whose owner is gone, suspended/deleting, or renamed since the snapshot (leaderboards.md). */
export async function maskedEntries(ctx: QueryCtx, entries: Doc<'leaderboardGenerations'>['entries'], limit: number) {
  const rows = entries.slice(0, limit)
  const owners = await Promise.all(rows.map((row) => ctx.db.get(row.userId)))
  const heroes = await Promise.all(owners.map((owner) => currentHero(ctx, owner ?? null)))
  return rows.map((row, index) => {
    const owner = owners[index]
    const visible = owner !== null && owner !== undefined && owner.state === 'active' && owner.publicNameVersion === row.publicNameVersion && heroes[index]?._id === row.heroId
    return {
      rank: row.rank,
      name: visible ? row.ownerAlias : 'Hidden player',
      hero_name: visible ? row.heroName : '',
      level: row.level,
      score: row.score ?? 0,
    }
  })
}

/**
 * Device ranking (D20/D31/D32): the hero's own seven-day group rank from the
 * published set, its group's first `TOP_ROWS` rows and both populations. Fixed indexed reads;
 * the captured cohort comes from the hero's own row, never from live level.
 */
export async function readDeviceRanking(ctx: QueryCtx, world: Doc<'worldState'> | null, hero: Doc<'heroes'>): Promise<PayloadRanking | null> {
  if (!world?.publishedPublicationId) return null
  const publication = await ctx.db.get(world.publishedPublicationId)
  if (publication === null || publication.state !== 'published') return null
  const own = await ctx.db
    .query('heroRanks')
    .withIndex('by_publicationId_and_board_and_heroId', (q) => q.eq('publicationId', publication._id).eq('board', 'recent_7d').eq('heroId', hero._id))
    .unique()
  const cohortKey = own?.cohortKey ?? levelGroup(hero.level).key
  const generation = own
    ? await ctx.db.get(own.generationId)
    : await ctx.db
        .query('leaderboardGenerations')
        .withIndex('by_publicationId_and_board_and_cohortKey', (q) => q.eq('publicationId', publication._id).eq('board', 'recent_7d').eq('cohortKey', cohortKey))
        .unique()
  const dormant = hero.status === 'paused' || (hero.status === 'sleeping' && hero.wakeAtTick === undefined)
  return {
    rank: own?.rank ?? null,
    rankDelta: own?.rankDelta ?? null,
    status: own ? 'ranked' : dormant ? 'dormant' : 'awaiting',
    cohortKey,
    cohortLabel: labelFor(cohortKey),
    score: own?.score ?? null,
    scoreAt: publication.scoreAt,
    asOfTick: publication.asOfTick,
    builtAt: publication.builtAt ?? publication.scoreAt,
    windowStart: hourStart(publication.scoreAt) - (WINDOW_7D_HOURS - 1) * HOUR_MS,
    totalPlayers: generation?.totalPlayers ?? 0,
    globalTotalPlayers: publication.globalTotalPlayers,
    top: generation ? await maskedEntries(ctx, generation.entries, TOP_ROWS) : [],
  }
}
