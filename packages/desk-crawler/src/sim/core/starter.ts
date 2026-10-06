import { maxHp } from './stats'
import type { ContentCatalog, HeroState, NewItem } from './types'

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
    counters: { combatWins: 0, retreats: 0, deaths: 0, rescues: 0, goldEarned: 0, itemsFound: 0, ticksExplored: 0 },
  }
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
      attack: kind === 'weapon' ? tier.weaponAttack : 0,
      defense: kind === 'armor' ? tier.armorDefense : 0,
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
