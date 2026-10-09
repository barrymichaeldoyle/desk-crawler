import { maxHp } from './stats'
import type { ContentCatalog, HeroCounters, HeroState, NewItem } from './types'

/**
 * Starting hero and kit (gameplay.md). Initialization, not an earned reward.
 * The adapter allocates item IDs, then sets weaponId/armorId to the starter rows.
 */
export function starterHero(id: string, content: ContentCatalog, tick: number): HeroState {
  return {
    id,
    class: 'warrior',
    level: 1,
    xp: 0,
    lifetimeXp: 0,
    hp: maxHp(1),
    gold: 0,
    status: 'exploring',
    biomeId: content.safeBiomeId,
    bagCapacity: content.bagLadder.tiers[0]!.capacity,
    lastLevelUpTick: tick,
    counters: zeroCounters(),
    ...(content.potionPouch === undefined ? {} : { potionCap: content.potionPouch.tiers[0]!.cap }),
  }
}

/** Every lifetime counter at zero; the only place the full counter shape is spelled out. */
export function zeroCounters(): HeroCounters {
  return {
    combatWins: 0,
    retreats: 0,
    deaths: 0,
    rescues: 0,
    goldEarned: 0,
    itemsFound: 0,
    ticksExplored: 0,
    monsterWins: {},
    eliteWins: 0,
    jackpots: 0,
    rareFinds: 0,
    potionsUsed: 0,
    trapsAvoided: 0,
    restTicks: 0,
    trips: 0,
    itemsSold: 0,
    stanceChanges: 0,
    purchases: 0,
    merchantVisits: 0,
    choicesMade: 0,
    choicesDefaulted: 0,
    epicFinds: 0,
    raidsLaunched: 0,
    raidsWon: 0,
    raidsRepelled: 0,
    raidsLost: 0,
    drawerFinds: 0,
    tasksCompleted: 0,
  }
}

/**
 * Fill counters a stored hero may not have yet (the D65 counters are optional in
 * storage until the one-off backfill has run). Every read path uses this, so a
 * missing counter is always zero and never undefined.
 */
export function withCounterDefaults(counters: Partial<HeroCounters> & Pick<HeroCounters, 'combatWins' | 'retreats' | 'deaths' | 'rescues' | 'goldEarned' | 'itemsFound' | 'ticksExplored'>): HeroCounters {
  const base = zeroCounters()
  const full = { ...base } as { -readonly [K in keyof HeroCounters]: HeroCounters[K] }
  for (const key of Object.keys(base) as (keyof HeroCounters)[]) {
    const value = counters[key]
    if (value !== undefined) (full as Record<string, unknown>)[key] = value
  }
  return full
}

export const STARTER_POTIONS = 3

export function starterKit(content: ContentCatalog): { weapon: NewItem; armor: NewItem; potions: NewItem } {
  const tier = content.gearTiers[1]!
  const gear = (templateId: string, kind: 'weapon' | 'armor'): NewItem => {
    const template = content.gearTemplates.find((t) => t.id === templateId)
    if (template === undefined) throw new Error(`missing starter template ${templateId}`)
    return {
      templateId,
      contentVersion: content.contentVersion,
      kind,
      name: template.name,
      rarity: 'common',
      requiredLevel: tier.requiredLevel,
      attack: kind === 'weapon' ? tier.weaponAttack + (template.statOffset ?? 0) : 0,
      defense: kind === 'armor' ? tier.armorDefense + (template.statOffset ?? 0) : 0,
      saleValue: tier.saleValue,
      quantity: 1,
    }
  }
  return {
    weapon: gear('letter_opener', 'weapon'),
    armor: gear('cardigan', 'armor'),
    potions: {
      templateId: content.potion.templateId,
      contentVersion: content.contentVersion,
      kind: 'potion',
      name: content.potion.name,
      rarity: 'common',
      requiredLevel: 1,
      attack: 0,
      defense: 0,
      saleValue: 0,
      quantity: STARTER_POTIONS,
    },
  }
}
