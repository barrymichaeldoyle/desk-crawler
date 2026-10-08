import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { currentHero } from './gameProfile'
import { effectiveStats } from '@trmnl-games/desk-crawler/sim/core/modifiers'
import type { RaidPlan } from '@trmnl-games/desk-crawler/sim/core/raid'
import type { ContentCatalog, IncomingRaid, RaidTarget, SimulationResult } from '@trmnl-games/desk-crawler/sim/core/types'

/**
 * Desk raids adapter (D110). Every read is bounded: a raider whose launch draw hit takes one pool row, then the
 * target hero, its owner and the owner's profile, and the target's two equipped items for thrifty; every hero
 * under a catalog with raids takes its oldest pending ledger row. Nothing here changes a hero the tick does not own.
 */

/** Shown instead of a public name that is gone, suspended or awaiting repair. */
export const HIDDEN_RIVAL = 'A coworker'

const visibleName = (owner: Doc<'users'> | null): string => (owner !== null && owner.state === 'active' && !owner.nameRepairRequired ? owner.publicAlias : HIDDEN_RIVAL)

export interface RaidPick {
  readonly target: RaidTarget
  readonly poolRowId: Id<'raidPool'>
  readonly targetHeroId: Id<'heroes'>
  readonly targetUser: Doc<'users'>
}

export interface PendingRaid {
  readonly row: Doc<'raids'>
  readonly incoming: IncomingRaid
}

/** A pool row for a hero that has none yet, at a random shard; returns the patch for the hero's markers. */
export async function joinRaidPool(ctx: MutationCtx, hero: Doc<'heroes'>): Promise<{ raidPoolId?: Id<'raidPool'> }> {
  if (hero.raidPoolId !== undefined) return {}
  const existing = await ctx.db.query('raidPool').withIndex('by_heroId', (q) => q.eq('heroId', hero._id)).first()
  const raidPoolId = existing?._id ?? (await ctx.db.insert('raidPool', { heroId: hero._id, shard: Math.floor(Math.random() * 2 ** 32) }))
  return { raidPoolId }
}

/**
 * The raid target at `plan.shard`: the first pool row at or after it, wrapping once. Only that one row is tried;
 * when its hero is not raidable right now the raid draw is spent and the tick plays its ordinary encounter.
 * A row whose hero is gone or retired is removed on the way, so the pool does not fill with empty desks.
 */
export async function pickRaidTarget(ctx: MutationCtx, raider: Doc<'heroes'>, plan: RaidPlan, tick: number, content: ContentCatalog): Promise<RaidPick | undefined> {
  const row =
    (await ctx.db.query('raidPool').withIndex('by_shard', (q) => q.gte('shard', plan.shard)).first()) ??
    (await ctx.db.query('raidPool').withIndex('by_shard').first())
  if (row === null || row.heroId === raider._id) return undefined
  const hero = await ctx.db.get(row.heroId)
  if (hero === null || !hero.isActive) {
    await ctx.db.delete(row._id)
    if (hero !== null) await ctx.db.patch(hero._id, { raidPoolId: undefined })
    return undefined
  }
  if (hero.activationState !== 'active' || hero.simulationState !== 'healthy' || hero.eligibleFromTick > tick) return undefined
  if (hero.status !== 'exploring' && hero.status !== 'resting') return undefined
  if (row.raidedAtTick !== undefined && tick - row.raidedAtTick < content.raids!.targetCooldownTicks) return undefined
  const owner = await ctx.db.get(hero.userId)
  if (owner === null || (await currentHero(ctx, owner))?._id !== hero._id) return undefined
  const equipped = await Promise.all([hero.weaponId, hero.armorId].map((id) => (id === undefined ? null : ctx.db.get(id))))
  const inventory = equipped.flatMap((item) => (item === null ? [] : [{ ...item, id: item._id }]))
  const thrifty = effectiveStats(content, { level: hero.level, ...(hero.weaponId ? { weaponId: hero.weaponId } : {}), ...(hero.armorId ? { armorId: hero.armorId } : {}) }, inventory, tick).modifiers.goldLossPct
  return {
    target: { heroId: hero._id, name: visibleName(owner), gold: hero.gold, ...(hero.stance === undefined ? {} : { stance: hero.stance }), ...(thrifty > 0 ? { goldLossPct: thrifty } : {}) },
    poolRowId: row._id,
    targetHeroId: hero._id,
    targetUser: owner,
  }
}

/** The oldest raid still waiting to land on this hero, with the raider's name as it can be shown now. */
export async function nextIncomingRaid(ctx: MutationCtx, heroId: Id<'heroes'>): Promise<PendingRaid | undefined> {
  const row = await ctx.db
    .query('raids')
    .withIndex('by_targetHeroId_and_state_and_tick', (q) => q.eq('targetHeroId', heroId).eq('state', 'pending'))
    .first()
  if (row === null) return undefined
  const raiderOwner = await ctx.db.get(row.raiderUserId)
  const name = raiderOwner !== null && raiderOwner.publicNameVersion === row.raiderNameVersion ? row.raiderName : visibleName(raiderOwner)
  return {
    row,
    incoming: { raiderHeroId: row.raiderHeroId, raiderName: name, tick: row.tick, raiderWon: row.raiderWon, gold: row.gold, targetHpPct: row.targetHpPct },
  }
}

/**
 * Commit both sides' ledger effects for one evaluation, once: the raider's launch inserts its row (keyed by raider and
 * tick, so a replayed evaluation finds it) and moves the target's pool row; an applied raid is marked with what landed.
 */
export async function settleRaids(
  ctx: MutationCtx,
  args: { hero: Doc<'heroes'>; owner: Doc<'users'>; result: SimulationResult; plan: RaidPlan | undefined; pick: RaidPick | undefined; pending: PendingRaid | undefined; tick: number },
): Promise<void> {
  const { hero, owner, result, plan, pick, pending, tick } = args
  const outcome = result.event?.detail.outcome
  const launch = result.raidLaunch
  if (launch !== undefined && pick !== undefined && plan !== undefined) {
    const duplicate = await ctx.db.query('raids').withIndex('by_raiderHeroId_and_tick', (q) => q.eq('raiderHeroId', hero._id).eq('tick', tick)).first()
    if (duplicate === null) {
      await ctx.db.insert('raids', {
        raiderHeroId: hero._id,
        raiderUserId: owner._id,
        raiderName: visibleName(owner),
        raiderNameVersion: owner.publicNameVersion,
        targetHeroId: pick.targetHeroId,
        targetUserId: pick.targetUser._id,
        targetName: pick.target.name,
        targetNameVersion: pick.targetUser.publicNameVersion,
        tick,
        raiderWon: launch.raiderWon,
        gold: launch.gold,
        raiderHpLost: outcome?.variant === 'raid' ? outcome.hpLost : 0,
        targetHpPct: launch.targetHpPct,
        state: 'pending',
      })
      await ctx.db.patch(pick.poolRowId, { raidedAtTick: tick, shard: plan.reshard })
    }
  }
  if (result.raidApplied && pending !== undefined && pending.row.state === 'pending') {
    await ctx.db.patch(pending.row._id, {
      state: 'applied',
      appliedTick: tick,
      ...(outcome?.variant === 'raid' ? { targetGold: outcome.gold, targetHpLost: outcome.hpLost } : {}),
    })
  }
}

/** The rival behind this evaluation's raid log, for the stored detail's masking annotation. */
export function raidRival(result: SimulationResult, pick: RaidPick | undefined, pending: PendingRaid | undefined): { userId: Id<'users'>; nameVersion: number } | undefined {
  if (result.raidLaunch !== undefined && pick !== undefined) return { userId: pick.targetUser._id, nameVersion: pick.targetUser.publicNameVersion }
  if (result.raidApplied && pending !== undefined) return { userId: pending.row.raiderUserId, nameVersion: pending.row.raiderNameVersion }
  return undefined
}

/** Deletion (raids.md "Names and privacy"): the hero's pool row and every ledger row it is party to, a batch at a time. */
export async function purgeRaidRows(ctx: MutationCtx, heroId: Id<'heroes'>, batch: number): Promise<number> {
  const pool = await ctx.db.query('raidPool').withIndex('by_heroId', (q) => q.eq('heroId', heroId)).take(batch)
  const launched = await ctx.db.query('raids').withIndex('by_raiderHeroId_and_tick', (q) => q.eq('raiderHeroId', heroId)).take(batch)
  const received = await ctx.db.query('raids').withIndex('by_targetHeroId_and_tick', (q) => q.eq('targetHeroId', heroId)).take(batch)
  const rows = [...pool, ...launched, ...received]
  const seen = new Set<string>()
  for (const row of rows) {
    if (seen.has(row._id)) continue
    seen.add(row._id)
    await ctx.db.delete(row._id)
  }
  return seen.size
}

/** The last raids a hero was party to, newest first, both directions merged, names masked as rank rows are. */
export async function recentRaids(ctx: QueryCtx, heroId: Id<'heroes'>, limit: number) {
  const launched = await ctx.db.query('raids').withIndex('by_raiderHeroId_and_tick', (q) => q.eq('raiderHeroId', heroId)).order('desc').take(limit)
  const received = await ctx.db.query('raids').withIndex('by_targetHeroId_and_tick', (q) => q.eq('targetHeroId', heroId)).order('desc').take(limit)
  const rows = [...launched.map((row) => ({ row, role: 'raider' as const })), ...received.map((row) => ({ row, role: 'target' as const }))]
    .sort((a, b) => b.row.tick - a.row.tick)
    .slice(0, limit)
  return await Promise.all(
    rows.map(async ({ row, role }) => {
      const rivalUserId = role === 'raider' ? row.targetUserId : row.raiderUserId
      const storedName = role === 'raider' ? row.targetName : row.raiderName
      const storedVersion = role === 'raider' ? row.targetNameVersion : row.raiderNameVersion
      const rival = await ctx.db.get(rivalUserId)
      const name = rival !== null && rival.state === 'active' && !rival.nameRepairRequired && rival.publicNameVersion === storedVersion ? storedName : HIDDEN_RIVAL
      const won = role === 'raider' ? row.raiderWon : !row.raiderWon
      return {
        tick: row.tick,
        role,
        rivalName: name,
        won,
        // The raider's own gold is exact; the target's is what landed, or the ledger amount while still pending.
        gold: role === 'raider' ? row.gold : (row.targetGold ?? row.gold),
        hpLost: role === 'raider' ? row.raiderHpLost : (row.targetHpLost ?? null),
        pending: row.state === 'pending',
      }
    }),
  )
}
