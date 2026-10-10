import { coolerOf, rodOf, waterOf } from './simulate'
import type { AccessId, AnglerState, BaitClass, SlowCastCatalog, WaterId } from './types'

/**
 * Companion purchase and setup rules (slow-cast.md "Selling and the shop"), pure so the intents and
 * the harness share them. Each returns the new angler or a refusal code; nothing here reads storage.
 */
export type ShopRefusal = 'NOT_ENOUGH_GOLD' | 'MAX_TIER' | 'ALREADY_OWNED' | 'BAIT_FULL' | 'LOCKED' | 'UNKNOWN' | 'SAME_WATER' | 'NOT_USED_HERE'
export type ShopResult = { readonly ok: true; readonly angler: AnglerState; readonly spent: number } | { readonly ok: false; readonly code: ShopRefusal }

const refuse = (code: ShopRefusal): ShopResult => ({ ok: false, code })

export function nextRod(content: SlowCastCatalog, angler: AnglerState) {
  return content.rods.find((r) => r.tier === angler.rodTier + 1)
}

export function nextCooler(content: SlowCastCatalog, angler: AnglerState) {
  return content.coolers.find((c) => c.tier === angler.coolerTier + 1)
}

export function buyRod(content: SlowCastCatalog, angler: AnglerState): ShopResult {
  const rod = nextRod(content, angler)
  if (!rod) return refuse('MAX_TIER')
  if (angler.gold < rod.price) return refuse('NOT_ENOUGH_GOLD')
  return { ok: true, angler: { ...angler, rodTier: rod.tier, gold: angler.gold - rod.price }, spent: rod.price }
}

export function buyCooler(content: SlowCastCatalog, angler: AnglerState): ShopResult {
  const cooler = nextCooler(content, angler)
  if (!cooler) return refuse('MAX_TIER')
  if (angler.gold < cooler.price) return refuse('NOT_ENOUGH_GOLD')
  return { ok: true, angler: { ...angler, coolerTier: cooler.tier, gold: angler.gold - cooler.price }, spent: cooler.price }
}

export function buyAccess(content: SlowCastCatalog, angler: AnglerState, id: AccessId): ShopResult {
  const item = content.access.find((a) => a.id === id)
  if (!item) return refuse('UNKNOWN')
  if (angler.access.includes(id)) return refuse('ALREADY_OWNED')
  if (angler.gold < item.price) return refuse('NOT_ENOUGH_GOLD')
  return { ok: true, angler: { ...angler, access: [...angler.access, id], gold: angler.gold - item.price }, spent: item.price }
}

/** Tubs that fit under the cap right now. */
export function tubsThatFit(content: SlowCastCatalog, angler: AnglerState, cls: BaitClass): number {
  const bait = content.baits.find((b) => b.class === cls)
  if (!bait) return 0
  return Math.max(0, Math.floor((content.baitCap - (angler.bait[cls] ?? 0)) / bait.castsPerTub))
}

export function buyBait(content: SlowCastCatalog, angler: AnglerState, cls: BaitClass, tubs: number): ShopResult {
  const bait = content.baits.find((b) => b.class === cls)
  if (!bait || !Number.isSafeInteger(tubs) || tubs < 1) return refuse('UNKNOWN')
  if (tubs > tubsThatFit(content, angler, cls)) return refuse('BAIT_FULL')
  const cost = bait.price * tubs
  if (angler.gold < cost) return refuse('NOT_ENOUGH_GOLD')
  return { ok: true, angler: { ...angler, bait: { ...angler.bait, [cls]: (angler.bait[cls] ?? 0) + bait.castsPerTub * tubs }, gold: angler.gold - cost }, spent: cost }
}

/** Whether the angler may fish a water: its level and its access item. */
export function canFish(content: SlowCastCatalog, angler: Pick<AnglerState, 'level' | 'access'>, waterId: WaterId): boolean {
  const water = waterOf(content, waterId)
  return angler.level >= water.unlockLevel && (water.access === undefined || angler.access.includes(water.access))
}

/**
 * The bait to switch to when moving: none while the chosen bait works at the destination and has units left, otherwise
 * the held bait that water takes with the most units (the water's order breaks ties). Without it, an angler who moved
 * with bread to River Bend fished a bare hook until the player noticed. The travel cast casts nothing, so the switch
 * never touches a cast at the old water.
 */
export function baitForTravel(content: SlowCastCatalog, angler: Pick<AnglerState, 'baitOnHook' | 'bait'>, waterId: WaterId): BaitClass | undefined {
  const to = waterOf(content, waterId)
  const held = (cls: BaitClass) => angler.bait[cls] ?? 0
  if (angler.baitOnHook !== undefined && to.baits.includes(angler.baitOnHook) && held(angler.baitOnHook) > 0) return undefined
  return to.baits.filter((cls) => held(cls) > 0).sort((a, b) => held(b) - held(a))[0]
}

export function travel(content: SlowCastCatalog, angler: AnglerState, waterId: WaterId): ShopResult {
  if (!content.waters.some((w) => w.id === waterId)) return refuse('UNKNOWN')
  if (angler.waterId === waterId && angler.travelTo === undefined) return refuse('SAME_WATER')
  if (!canFish(content, angler, waterId)) return refuse('LOCKED')
  const swap = baitForTravel(content, angler, waterId)
  return { ok: true, angler: { ...angler, travelTo: waterId, ...(swap ? { baitOnHook: swap } : {}) }, spent: 0 }
}

/** Put a bait class on the hook. Any owned class may be chosen; an unused one at this water fishes as a bare hook. */
export function setBait(content: SlowCastCatalog, angler: AnglerState, cls: BaitClass): ShopResult {
  if (!content.baits.some((b) => b.class === cls)) return refuse('UNKNOWN')
  return { ok: true, angler: { ...angler, baitOnHook: cls }, spent: 0 }
}

/** Sell catches: the angler gains their value. Selection is explicit (the caller passes the rows). */
export function sell(angler: AnglerState, values: readonly number[]): AnglerState {
  const total = values.reduce((sum, value) => sum + value, 0)
  return { ...angler, gold: angler.gold + total, counters: { ...angler.counters, goldEarned: angler.counters.goldEarned + total, fishSold: angler.counters.fishSold + values.length } }
}

export { coolerOf, rodOf }
