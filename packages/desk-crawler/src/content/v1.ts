import type { BiomeNarrative, ContentCatalog, MonsterTemplate } from '../sim/core/types'

/*
 * Content catalog v1: the documented planning baseline (gameplay.md), before
 * harness tuning. Stable IDs never change meaning. Authored names and story
 * text are reserved content (LICENSE exclusions), not MIT code.
 */

const monster = (
  id: string,
  name: string,
  tier: number,
  hp: number,
  attack: number,
  defense: number,
  xp: [number, number],
  gold: [number, number],
): MonsterTemplate => ({ id, name, tier, hp, attack, defense, xp: { min: xp[0], max: xp[1] }, gold: { min: gold[0], max: gold[1] } })

const office: BiomeNarrative = {
  victory: [
    'Defeated a {monster} by the printer. +{xp} XP, +{gold} gold.',
    'A {monster} fell behind the cubicle wall. +{xp} XP, +{gold} gold.',
    "Filed a {monster} under 'defeated'. +{xp} XP, +{gold} gold.",
    'Beat a {monster} near the water cooler. +{xp} XP, +{gold} gold.',
  ],
  lootGold: [
    'Found {gold} gold in an abandoned desk drawer.',
    'Spare change under the keyboard: {gold} gold.',
    'A forgotten petty-cash envelope held {gold} gold.',
    'Found {gold} gold behind the fax machine.',
  ],
  trapHit: [
    'Tripped over a loose cable. -{damage} HP.',
    'A paper avalanche from the shelf. -{damage} HP.',
    'Ambushed by a swivel chair. -{damage} HP.',
    'Stapled a thumb on a jammed stapler. -{damage} HP.',
  ],
  rest: [
    'Took a quiet break in the break room. +{heal} HP.',
    'Napped under the desk. +{heal} HP.',
    'A decent cup of coffee. +{heal} HP.',
    'Stretched by the window. +{heal} HP.',
  ],
  eliteVictory: ['An elite {monster} fell in the cubicles. +{xp} XP, +{gold} gold.'],
  jackpot: ['Jackpot! A lost expense refund: {gold} gold.'],
}

const serverRoom: BiomeNarrative = {
  victory: [
    'Rebooted a {monster} for good. +{xp} XP, +{gold} gold.',
    'A {monster} crashed between the racks. +{xp} XP, +{gold} gold.',
    'Unplugged a {monster}. +{xp} XP, +{gold} gold.',
    'Defeated a {monster} in the cold aisle. +{xp} XP, +{gold} gold.',
  ],
  lootGold: [
    'Pried {gold} gold from a decommissioned server.',
    'Found {gold} gold in a cable tray.',
    "A sysadmin's stash: {gold} gold.",
    'Recovered {gold} gold from a box of backup tapes.',
  ],
  trapHit: [
    'Zapped by a frayed power cable. -{damage} HP.',
    'A rack door swung shut. -{damage} HP.',
    'Blasted by the hot-aisle exhaust. -{damage} HP.',
    'Slipped on a loose floor tile. -{damage} HP.',
  ],
  rest: [
    'Cooled off by the air conditioning. +{heal} HP.',
    'Rested on a stack of spare drives. +{heal} HP.',
    'Sipped from a forbidden coffee mug. +{heal} HP.',
    'Listened to the soothing fan hum. +{heal} HP.',
  ],
  eliteVictory: ['An elite {monster} went offline for good. +{xp} XP, +{gold} gold.'],
  jackpot: ['Jackpot! A forgotten crypto wallet: {gold} gold.'],
}

const cafeteria: BiomeNarrative = {
  victory: [
    'Scraped a {monster} off the floor. +{xp} XP, +{gold} gold.',
    'Cleared a {monster} from the salad bar. +{xp} XP, +{gold} gold.',
    'Defeated a {monster} by the deep fryer. +{xp} XP, +{gold} gold.',
    'Bagged a {monster} for the compost. +{xp} XP, +{gold} gold.',
  ],
  lootGold: [
    'Found {gold} gold in the tip jar.',
    'Found {gold} gold under a sticky tray.',
    'A vending machine coughed up {gold} gold.',
    'Found {gold} gold in the lost-and-found bin.',
  ],
  trapHit: [
    'Splashed by boiling soup. -{damage} HP.',
    'Slipped on a rogue noodle. -{damage} HP.',
    'The dish conveyor bit back. -{damage} HP.',
    'Burned on a forgotten casserole. -{damage} HP.',
  ],
  rest: [
    'Ate a surprisingly good pudding. +{heal} HP.',
    'Rested in an empty booth. +{heal} HP.',
    'Free soup day. +{heal} HP.',
    'Napped behind the pantry door. +{heal} HP.',
  ],
  eliteVictory: ['Sent an elite {monster} back to the kitchen. +{xp} XP, +{gold} gold.'],
  jackpot: ['Jackpot! The vending machine paid out: {gold} gold.'],
}

export const contentV1: ContentCatalog = {
  contentVersion: 'v1',
  constants: {
    bagCapacity: 30,
    potionStackCap: 20,
    potionHealPct: 40,
    autoPotionBelowPct: 35,
    restBelowPct: 25,
    restingHealPct: 20,
    resumeExploringAtPct: 75,
    restEncounterHealPct: 25,
    maxCombatRounds: 6,
    damageVariance: { min: 80, max: 120 },
    combatGearDropPct: 3,
    lootWeights: { gear: 15, potion: 20, gold: 65 },
    trapAvoidPct: 25,
    retreatGoldLossPct: 5,
    deathGoldLossPct: 10,
    reviveAfterTicks: 8,
    reviveHpPct: 50,
    elite: { chancePct: 3, hpMultiplierPct: 150, xpMultiplier: 4, goldMultiplier: 3 },
    jackpot: { chancePct: 1, goldMultiplier: 10 },
    summaryMaxCodePoints: 90,
  },
  biomes: [
    {
      id: 'office_cubicles',
      name: 'Office Cubicles',
      unlockLevel: 1,
      safe: true,
      tier: 1,
      weights: { combat: 30, loot: 30, trap: 10, rest: 30 },
      monsterIds: ['paper_imp', 'rogue_roomba', 'stapler_mimic', 'dust_daemon'],
      lootGold: { min: 3, max: 5 },
      trapDamage: { min: 5, max: 12 },
    },
    {
      id: 'server_room',
      name: 'Server Room',
      unlockLevel: 4,
      safe: false,
      tier: 2,
      weights: { combat: 40, loot: 25, trap: 15, rest: 20 },
      monsterIds: ['cable_serpent', 'overheated_rack', 'firewall_gremlin', 'legacy_mainframe'],
      lootGold: { min: 8, max: 12 },
      trapDamage: { min: 12, max: 24 },
    },
    {
      id: 'cafeteria_depths',
      name: 'Cafeteria Depths',
      unlockLevel: 8,
      safe: false,
      tier: 3,
      weights: { combat: 45, loot: 25, trap: 15, rest: 15 },
      monsterIds: ['coffee_slime', 'crumb_golem', 'microwave_wraith', 'leftovers_hydra'],
      lootGold: { min: 14, max: 20 },
      trapDamage: { min: 20, max: 36 },
    },
  ],
  safeBiomeId: 'office_cubicles',
  monsters: [
    monster('paper_imp', 'Paper Imp', 1, 14, 6, 1, [8, 10], [3, 4]),
    monster('rogue_roomba', 'Rogue Roomba', 1, 20, 7, 2, [9, 11], [3, 5]),
    monster('stapler_mimic', 'Stapler Mimic', 1, 25, 9, 2, [10, 12], [4, 5]),
    monster('dust_daemon', 'Dust Daemon', 1, 30, 10, 3, [10, 12], [4, 5]),
    monster('cable_serpent', 'Cable Serpent', 2, 40, 14, 4, [20, 24], [8, 10]),
    monster('overheated_rack', 'Overheated Rack', 2, 48, 16, 6, [22, 26], [9, 11]),
    monster('firewall_gremlin', 'Firewall Gremlin', 2, 55, 17, 5, [23, 27], [9, 12]),
    monster('legacy_mainframe', 'Legacy Mainframe', 2, 65, 19, 7, [24, 28], [10, 12]),
    monster('coffee_slime', 'Coffee Slime', 3, 80, 22, 8, [35, 41], [14, 16]),
    monster('crumb_golem', 'Crumb Golem', 3, 95, 26, 10, [38, 45], [15, 18]),
    monster('microwave_wraith', 'Microwave Wraith', 3, 105, 29, 9, [40, 47], [16, 19]),
    monster('leftovers_hydra', 'Leftovers Hydra', 3, 120, 32, 12, [43, 50], [17, 20]),
  ],
  gearTemplates: [
    { id: 'letter_opener', kind: 'weapon', tier: 1, name: 'Letter Opener' },
    { id: 'ruler_blade', kind: 'weapon', tier: 1, name: 'Ruler Blade' },
    { id: 'cardigan', kind: 'armor', tier: 1, name: 'Cardigan' },
    { id: 'lanyard_mail', kind: 'armor', tier: 1, name: 'Lanyard Mail' },
    { id: 'cable_cutter', kind: 'weapon', tier: 2, name: 'Cable Cutter' },
    { id: 'keyboard_mace', kind: 'weapon', tier: 2, name: 'Keyboard Mace' },
    { id: 'insulated_cardigan', kind: 'armor', tier: 2, name: 'Insulated Cardigan' },
    { id: 'anti_static_vest', kind: 'armor', tier: 2, name: 'Anti-Static Vest' },
    { id: 'ladle_of_ruin', kind: 'weapon', tier: 3, name: 'Ladle of Ruin' },
    { id: 'spork_halberd', kind: 'weapon', tier: 3, name: 'Spork Halberd' },
    { id: 'apron_of_warding', kind: 'armor', tier: 3, name: 'Apron of Warding' },
    { id: 'oven_mitt_plate', kind: 'armor', tier: 3, name: 'Oven-Mitt Plate' },
  ],
  gearTiers: {
    1: { weaponAttack: 3, armorDefense: 2, requiredLevel: 1, saleValue: 5 },
    2: { weaponAttack: 7, armorDefense: 5, requiredLevel: 4, saleValue: 12 },
    3: { weaponAttack: 12, armorDefense: 9, requiredLevel: 8, saleValue: 24 },
  },
  rarities: [
    { rarity: 'common', weight: 70, statBonus: 0, saleMultiplier: 1 },
    { rarity: 'uncommon', weight: 25, statBonus: 2, saleMultiplier: 2 },
    { rarity: 'rare', weight: 5, statBonus: 4, saleMultiplier: 4 },
  ],
  potion: { templateId: 'healing_potion', name: 'Healing Potion' },
  narrative: {
    biomes: { office_cubicles: office, server_room: serverRoom, cafeteria_depths: cafeteria },
    shared: {
      retreat: ['Retreated from a stubborn {monster}.', 'Backed away from a {monster} to fight another day.'],
      death: ['Fell to a {monster}. Revives in the Office in {ticks} ticks.'],
      rescue: ['A {monster} nearly won; a coworker came to the rescue.'],
      trapDeath: ['Knocked out by a nasty trap. Revives in the Office in {ticks} ticks.'],
      trapRescue: ['A trap nearly won; a coworker came to the rescue.'],
      restFull: ['Took a quiet break. Already feeling great.'],
      trapAvoided: ['Spotted a trap and stepped around it.', 'Noticed a suspicious cable just in time.'],
      lootGear: ['Found a {item}.'],
      lootPotion: ['Found a healing potion.'],
      potionFullGold: ['Potion pouch full; sold a spare for {gold} gold.'],
      restingHeal: ['Resting to recover. +{heal} HP.'],
      revive: ['Revived in the Office Cubicles with {heal} HP.'],
      arrive: ['Arrived in the {destination}.'],
      depart: ['Woke up and set off for the {destination}.'],
    },
  },
}
