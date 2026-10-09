import { bagUsed, drawerCapacity } from './bag'
import { potionCap } from './pouch'
import { maxHp, xpToLeave } from './stats'
import type { ContentCatalog, HeroState, ItemSnapshot } from './types'

/** A recognized pure-core failure. The adapter quarantines the hero; it never retries blindly. */
export class SimulationInvariantError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(`${code}: ${message}`)
    this.name = 'SimulationInvariantError'
  }
}

const fail = (code: string, message: string): never => {
  throw new SimulationInvariantError(code, message)
}

const isCount = (value: number): boolean => Number.isSafeInteger(value) && value >= 0

export const MAX_INVENTORY_ROWS = 32

/** Cross-field hero/inventory invariants shared by input and output validation. */
export function assertHeroInvariants(hero: HeroState, inventory: readonly ItemSnapshot[], content: ContentCatalog): void {
  const { constants } = content
  if (!Number.isSafeInteger(hero.level) || hero.level < 1) fail('LEVEL', `invalid level ${hero.level}`)
  if (!isCount(hero.xp) || hero.xp >= xpToLeave(hero.level)) fail('XP', `xp ${hero.xp} outside level ${hero.level}`)
  if (!isCount(hero.lifetimeXp)) fail('LIFETIME_XP', 'lifetime XP must be a safe nonnegative integer')
  if (!isCount(hero.gold)) fail('GOLD', `invalid gold ${hero.gold}`)
  const max = maxHp(hero.level)
  if (!isCount(hero.hp) || hero.hp > max) fail('HP', `hp ${hero.hp} outside 0..${max}`)
  if (!isCount(hero.lastLevelUpTick)) fail('LEVEL_TICK', 'invalid last level-up tick')
  for (const [name, value] of Object.entries(hero.counters)) {
    if (name === 'monsterWins') continue
    if (typeof value !== 'number' || !isCount(value)) fail('COUNTER', `counter ${name} invalid`)
  }
  const monsterIds = new Set(content.monsters.map((monster) => monster.id))
  for (const [id, wins] of Object.entries(hero.counters.monsterWins)) {
    if (!monsterIds.has(id)) fail('COUNTER', `monster wins for unknown monster ${id}`)
    if (!isCount(wins)) fail('COUNTER', `monster wins for ${id} invalid`)
  }

  if (hero.stance !== undefined && !['cautious', 'balanced', 'bold'].includes(hero.stance)) fail('STANCE', `unknown stance ${hero.stance}`)
  if (hero.potionCap !== undefined && content.potionPouch !== undefined && !content.potionPouch.tiers.some((tier) => tier.cap === hero.potionCap)) fail('POUCH', `potion cap ${hero.potionCap} is not a pouch tier`)
  if (hero.potionCap !== undefined && !isCount(hero.potionCap)) fail('POUCH', 'invalid potion cap')
  if (hero.effects !== undefined && (hero.effects.length > 3 || hero.effects.some((effect) => typeof effect.id !== 'string' || !Number.isSafeInteger(effect.untilTick)))) fail('EFFECTS', 'invalid effects')
  if (hero.choice !== undefined && content.choices !== undefined && !content.choices.events.some((event) => event.id === hero.choice?.eventId)) fail('CHOICE', `unknown event ${hero.choice.eventId}`)
  const biomeIds = new Set(content.biomes.map((biome) => biome.id))
  if (!biomeIds.has(hero.biomeId)) fail('BIOME', `unknown biome ${hero.biomeId}`)
  if (hero.targetBiomeId !== undefined && !biomeIds.has(hero.targetBiomeId)) fail('TARGET', `unknown target ${hero.targetBiomeId}`)

  switch (hero.status) {
    case 'dead':
      if (hero.hp !== 0 || hero.reviveAtTick === undefined) fail('DEAD', 'dead requires hp 0 and a revival tick')
      break
    case 'travelling':
      if (hero.targetBiomeId === undefined || hero.arriveAtTick === undefined) fail('TRAVEL', 'travelling requires target and arrival')
      break
    case 'paused':
      if (hero.pausedFromStatus === undefined) fail('PAUSED', 'paused requires its prior status')
      break
    case 'sleeping':
      if (hero.hp === 0) fail('SLEEP', 'sleeping hero must be alive')
      // D29: a pending Resume may carry a destination without an arrival tick.
      if (hero.targetBiomeId !== undefined && hero.wakeAtTick === undefined) fail('SLEEP', 'destination requires a pending wake')
      break
    case 'exploring':
    case 'resting':
      if (hero.hp === 0) fail('ALIVE', `${hero.status} hero must have hp`)
      break
  }
  if (hero.status !== 'dead' && hero.reviveAtTick !== undefined) fail('STALE_REVIVE', 'revival tick outside dead state')
  if (hero.status !== 'travelling' && hero.arriveAtTick !== undefined) fail('STALE_ARRIVAL', 'arrival tick outside travel')
  if (hero.status !== 'travelling' && hero.status !== 'sleeping' && hero.targetBiomeId !== undefined) fail('STALE_TARGET', 'target outside travel/pending wake')
  if (hero.status !== 'sleeping' && hero.wakeAtTick !== undefined) fail('STALE_WAKE', 'wake tick outside sleep')
  if (hero.status !== 'paused' && hero.pausedFromStatus !== undefined) fail('STALE_PAUSE', 'paused status outside pause')

  if (inventory.length > MAX_INVENTORY_ROWS) fail('INVENTORY_SIZE', `${inventory.length} rows`)
  const ids = new Set<string>()
  let potionRows = 0
  for (let i = 0; i < inventory.length; i += 1) {
    const item = inventory[i]!
    if (ids.has(item.id)) fail('ITEM_DUPLICATE', item.id)
    ids.add(item.id)
    if (i > 0 && inventory[i - 1]!.id >= item.id) fail('ITEM_ORDER', 'inventory must be sorted by ID')
    for (const value of [item.requiredLevel, item.attack, item.defense, item.saleValue, item.quantity]) {
      if (!isCount(value)) fail('ITEM_STAT', `item ${item.id} has an invalid number`)
    }
    if (item.kind === 'potion') {
      potionRows += 1
      if (item.quantity < 1 || item.quantity > potionCap(content, hero)) fail('POTION_QTY', `potion quantity ${item.quantity}`)
    } else if (item.quantity !== 1) {
      fail('GEAR_QTY', `gear ${item.id} quantity ${item.quantity}`)
    }
  }
  if (potionRows > 1) fail('POTION_ROWS', 'more than one potion stack')

  const byId = new Map(inventory.map((item) => [item.id, item]))
  const ref = (id: string | undefined, kind: 'weapon' | 'armor' | 'gear', code: string) => {
    if (id === undefined) return
    const item = byId.get(id)
    if (item === undefined) fail(code, `missing item ${id}`)
    else if (kind === 'gear' ? item.kind === 'potion' : item.kind !== kind) fail(code, `item ${id} has wrong kind`)
  }
  ref(hero.weaponId, 'weapon', 'WEAPON_REF')
  ref(hero.armorId, 'armor', 'ARMOR_REF')
  ref(hero.heldItemId, 'gear', 'HELD_REF')
  if (hero.heldItemId !== undefined && (hero.heldItemId === hero.weaponId || hero.heldItemId === hero.armorId)) {
    fail('HELD_EQUIPPED', 'held gear cannot be equipped')
  }
  // P32: drawer ids are owned, unequipped, unheld gear, each once, within the catalog's capacity.
  const drawer = hero.drawer ?? []
  if (drawer.length > drawerCapacity(content)) fail('DRAWER_FULL', `${drawer.length} drawer items above capacity`)
  if (new Set(drawer).size !== drawer.length) fail('DRAWER_DUPLICATE', 'drawer lists an item twice')
  for (const id of drawer) {
    ref(id, 'gear', 'DRAWER_REF')
    if (id === hero.weaponId || id === hero.armorId || id === hero.heldItemId) fail('DRAWER_ELSEWHERE', `drawer item ${id} is equipped or held`)
  }
  if (!content.bagLadder.tiers.some((tier) => tier.capacity === hero.bagCapacity)) fail('BAG_CAPACITY', `capacity ${hero.bagCapacity} is not a bag tier`)
  if (bagUsed(hero, inventory) > hero.bagCapacity) fail('BAG_FULL', 'bag gear above capacity')
}
