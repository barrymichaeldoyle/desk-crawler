import { createRng, type Rng } from './rng'
import type { ContentCatalog, StanceId, StreamSeeds } from './types'

/**
 * Desk raids (D110). The `raid` stream's draws have fixed positions so the adapter and the core read the same
 * numbers: 1 launch (permille), 2 target shard (uint32), 3 the target's new shard (uint32), 4 contest (percent). The stream exists only under a
 * catalog with raid rules, so earlier catalogs draw nothing and replay unchanged.
 */

export interface RaidPlan {
  /** Where the adapter starts looking in the raid pool: the first row at or after this shard, wrapping once. */
  readonly shard: number
  /** The picked target's new pool position, so no hero stays behind a wide gap and gets picked far more often. */
  readonly reshard: number
}

/** The raid stream for this tick, or undefined when raids cannot happen (no rules or no seed). */
export function raidStream(streams: StreamSeeds, content: ContentCatalog): Rng | undefined {
  return content.raids === undefined || streams.raid === undefined ? undefined : createRng(streams.raid)
}

/** Draws 1 to 3: whether the hero launches a raid if this tick reaches its encounter, where to look, where the target moves. */
export function drawRaidPlan(rng: Rng, stance: StanceId | undefined, content: ContentCatalog): RaidPlan | undefined {
  const launch = rng.int(1, 1000) <= content.raids!.launchPermille[stance ?? 'balanced']
  const shard = Math.floor(rng.next() * 2 ** 32)
  const reshard = Math.floor(rng.next() * 2 ** 32)
  return launch ? { shard, reshard } : undefined
}

/**
 * For the adapter, before it calls the core: whether to look for a target this tick. Pure; the core takes the
 * same first draws from the same seed, so the two can never disagree.
 */
export function planRaid(streams: StreamSeeds, stance: StanceId | undefined, content: ContentCatalog): RaidPlan | undefined {
  const rng = raidStream(streams, content)
  return rng === undefined ? undefined : drawRaidPlan(rng, stance, content)
}

/** The raider's chance to win, in percent: 50 moved only by the two stances' edges. */
export function raidWinChance(content: ContentCatalog, raider: StanceId | undefined, target: StanceId | undefined): number {
  const edge = content.raids!.edgePct
  return 50 + edge[raider ?? 'balanced'] - edge[target ?? 'balanced']
}

/** A share of maximum HP, rounded up so a raid always costs at least one HP. */
export const raidHpLoss = (max: number, pct: number): number => Math.ceil((max * pct) / 100)

/** The loser's gold loss: the retreat rule, with thrifty points taken off (D81). */
export const raidGoldLoss = (gold: number, goldLossPct: number, thriftyPct: number): number => Math.floor((gold * Math.max(0, goldLossPct - thriftyPct)) / 100)
