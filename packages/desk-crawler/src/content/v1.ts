import type { BiomeNarrative, ContentCatalog, MonsterNarrative, MonsterTemplate, SharedNarrative } from '../sim/core/types'
import { POTION_HEAL_PCT } from './sustain'

/*
 * Content catalog v1, the first public release (D63). Numbers are harness-tuned
 * toward D24 pacing and D30's late game (docs/evidence/balance.md); the bag
 * ladder is D61. Stable IDs never change meaning, and later balance changes
 * ship as a new catalog version so live runs never mix rules. Authored names
 * and story text are reserved content (LICENSE exclusions), not MIT code.
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

const win = ' +{xp} XP, +{gold} gold.'

const office: BiomeNarrative = {
  victory: [
    `Defeated a {monster} by the printer.${win}`,
    `A {monster} fell behind the cubicle wall.${win}`,
    `Filed a {monster} under 'defeated'.${win}`,
    `Beat a {monster} near the water cooler.${win}`,
    `Escalated a {monster} straight to the bin.${win}`,
    `Put a {monster} on a permanent break.${win}`,
    `Won the meeting against a {monster}.${win}`,
    `Sent a {monster} home early.${win}`,
  ],
  lootGold: [
    'Found {gold} gold in an abandoned desk drawer.',
    'Spare change under the keyboard: {gold} gold.',
    'A forgotten petty-cash envelope held {gold} gold.',
    'Found {gold} gold behind the fax machine.',
    "Found {gold} gold in the coffee machine's coin tray.",
    'An old expense claim finally paid out: {gold} gold.',
  ],
  trapHit: [
    'Tripped over a loose cable. -{damage} HP.',
    'A paper avalanche from the shelf. -{damage} HP.',
    'Ambushed by a swivel chair. -{damage} HP.',
    'Stapled a thumb on a jammed stapler. -{damage} HP.',
    'Paper cut from a rogue memo. -{damage} HP.',
    'Walked into a glass door. Again. -{damage} HP.',
    'The printer spat a toner cloud. -{damage} HP.',
    'A desk drawer attacked a knee. -{damage} HP.',
    'Stepped on an abandoned plug. -{damage} HP.',
    'A filing cabinet opened at shin height. -{damage} HP.',
    'The whiteboard rolled downhill. -{damage} HP.',
    'Got stuck in the revolving door. -{damage} HP.',
    'Sat on a chair with a broken leg. -{damage} HP.',
    'A hole punch fell off the shelf. -{damage} HP.',
    'Caught a finger in the paper shredder lid. -{damage} HP.',
    'Walked into the coat rack. -{damage} HP.',
    'Slipped on a freshly laminated memo. -{damage} HP.',
    'Brushed against a spiky desk cactus. -{damage} HP.',
  ],
  // A deliberate callback when this mishap happens twice in a row.
  trapHitCallbacks: { 'Tripped over a loose cable. -{damage} HP.': 'Tripped over another loose cable. -{damage} HP.' },
  rest: [
    'Took a quiet break in the break room. +{heal} HP.',
    'Napped under the desk. +{heal} HP.',
    'A decent cup of coffee. +{heal} HP.',
    'Stretched by the window. +{heal} HP.',
    'Hid in a meeting room nobody booked. +{heal} HP.',
    'Ate the last donut in the kitchen. +{heal} HP.',
  ],
  eliteVictory: [
    `An elite {monster} fell in the cubicles.${win}`,
    `Took down an elite {monster}. The floor clapped.${win}`,
    `An elite {monster} got the out-of-office treatment.${win}`,
  ],
  jackpot: [
    'Jackpot! A lost expense refund: {gold} gold.',
    'Jackpot! An unclaimed bonus envelope: {gold} gold.',
    'Jackpot! The office lottery pool came in: {gold} gold.',
  ],
  lootGear: ['Found a {item} in the supply closet.', 'A {item} was left on a hot desk. Finders keepers.', 'Unboxed a {item} from facilities.'],
  arrive: ['Badge accepted. Back in the {destination}.', 'Returned to the {destination}. The printer is still jammed.'],
}

const serverRoom: BiomeNarrative = {
  victory: [
    `Rebooted a {monster} for good.${win}`,
    `A {monster} crashed between the racks.${win}`,
    `Unplugged a {monster}.${win}`,
    `Defeated a {monster} in the cold aisle.${win}`,
    `Rolled a {monster} back to factory settings.${win}`,
    `Closed the ticket on a {monster}.${win}`,
    `Took a {monster} offline for maintenance.${win}`,
    `Garbage-collected a {monster}.${win}`,
  ],
  lootGold: [
    'Pried {gold} gold from a decommissioned server.',
    'Found {gold} gold in a cable tray.',
    "A sysadmin's stash: {gold} gold.",
    'Recovered {gold} gold from a box of backup tapes.',
    'Sold a spare stick of RAM for {gold} gold.',
    'Found {gold} gold taped under a rack.',
  ],
  trapHit: [
    'Zapped by a frayed power cable. -{damage} HP.',
    'A rack door swung shut. -{damage} HP.',
    'Blasted by the hot-aisle exhaust. -{damage} HP.',
    'Slipped on a loose floor tile. -{damage} HP.',
    'Set off the fire suppression. -{damage} HP.',
    'Static shock from a server chassis. -{damage} HP.',
    'A cable tray came down. -{damage} HP.',
    'Bumped into a very solid UPS. -{damage} HP.',
    'A loose drive sled found a toe. -{damage} HP.',
    'Caught a sleeve in a cooling fan. -{damage} HP.',
    'The raised floor became a lowered floor. -{damage} HP.',
    'A rack rail snapped back. -{damage} HP.',
    'Walked into a dangling patch panel. -{damage} HP.',
    'A backup tape stack gave way. -{damage} HP.',
    'Dropped a spare power supply. Onto a foot. -{damage} HP.',
    'Cut a hand on a snapped cable tie. -{damage} HP.',
    'Knelt on a forgotten rack screw. -{damage} HP.',
    'A maintenance hatch closed unexpectedly. -{damage} HP.',
  ],
  rest: [
    'Cooled off by the air conditioning. +{heal} HP.',
    'Rested on a stack of spare drives. +{heal} HP.',
    'Sipped from a forbidden coffee mug. +{heal} HP.',
    'Listened to the soothing fan hum. +{heal} HP.',
    'Warmed up in the hot aisle. +{heal} HP.',
    'Waited out a very long backup. +{heal} HP.',
  ],
  eliteVictory: [
    `An elite {monster} went offline for good.${win}`,
    `Took down an elite {monster}. The floor heard it.${win}`,
    `An elite {monster} reached end of life.${win}`,
  ],
  jackpot: [
    'Jackpot! A forgotten crypto wallet: {gold} gold.',
    'Jackpot! A vendor rebate finally arrived: {gold} gold.',
    'Jackpot! Scrap value of a dead server: {gold} gold.',
  ],
  lootGear: ['Pulled a {item} out of a cable tray.', 'Found a {item} in a box marked DO NOT TOUCH.', 'Took a {item} from the spare-parts shelf.'],
  arrive: ['Badge accepted. Entered the {destination}. The fans roar.', 'Made it to the {destination}. It is very loud in here.'],
}

const cafeteria: BiomeNarrative = {
  victory: [
    `Scraped a {monster} off the floor.${win}`,
    `Cleared a {monster} from the salad bar.${win}`,
    `Defeated a {monster} by the deep fryer.${win}`,
    `Bagged a {monster} for the compost.${win}`,
    `Sent a {monster} back with the dirty trays.${win}`,
    `Served a {monster} its final course.${win}`,
    `Locked a {monster} in the walk-in freezer.${win}`,
    `Microwaved a {monster} on high.${win}`,
  ],
  lootGold: [
    'Found {gold} gold in the tip jar.',
    'Found {gold} gold under a sticky tray.',
    'A vending machine coughed up {gold} gold.',
    'Found {gold} gold in the lost-and-found bin.',
    'Found {gold} gold in a mislabeled lunchbox.',
    'Collected {gold} gold in returned-tray deposits.',
  ],
  trapHit: [
    'Splashed by boiling soup. -{damage} HP.',
    'Slipped on a rogue noodle. -{damage} HP.',
    'The dish conveyor bit back. -{damage} HP.',
    'Burned on a forgotten casserole. -{damage} HP.',
    'Opened the fridge. Something lunged. -{damage} HP.',
    'Tried the mystery-meat special. -{damage} HP.',
    'The wet-floor sign caused the fall. -{damage} HP.',
    'A tray stack collapsed at the worst moment. -{damage} HP.',
    'The toaster fired out a crust. -{damage} HP.',
    'A freezer door clipped an elbow. -{damage} HP.',
    'Stepped on a fork. Business end up. -{damage} HP.',
    'Scalded by the coffee urn. -{damage} HP.',
    'Lost footing in a puddle of custard. -{damage} HP.',
    'A bag of flour burst overhead. -{damage} HP.',
    'The vending machine returned a bruise. -{damage} HP.',
    'A swinging kitchen door landed first. -{damage} HP.',
    'The blender lid flew off. -{damage} HP.',
    'Caught a rolling pin with a shin. -{damage} HP.',
  ],
  rest: [
    'Ate a surprisingly good pudding. +{heal} HP.',
    'Rested in an empty booth. +{heal} HP.',
    'Free soup day. +{heal} HP.',
    'Napped behind the pantry door. +{heal} HP.',
    "Finished someone's abandoned fries. +{heal} HP.",
    'Lingered over a long lunch. +{heal} HP.',
  ],
  eliteVictory: [
    `Sent an elite {monster} back to the kitchen.${win}`,
    `Took an elite {monster} off the menu.${win}`,
    `An elite {monster} was 86'd for good.${win}`,
  ],
  jackpot: [
    'Jackpot! The vending machine paid out: {gold} gold.',
    'Jackpot! The tip jar overflowed: {gold} gold.',
    'Jackpot! A forgotten catering budget: {gold} gold.',
  ],
  lootGear: ['Found a {item} behind the walk-in fridge.', 'Fished a {item} out of the dish pit.', 'A {item} was in the lost-and-found bin.'],
  arrive: ['Made it to the {destination}. Something smells off.', 'Arrived in the {destination}. Mind the sticky floor.'],
}

const signature = (...lines: string[]): MonsterNarrative => ({ victory: lines.map((line) => `${line}${win}`) })

const monsters: Record<string, MonsterNarrative> = {
  paper_imp: signature('Fed a {monster} to the shredder.', 'Put a {monster} in the recycling.'),
  rogue_roomba: signature('Flipped a {monster} onto its back.', "Emptied a {monster}'s dust bin for good."),
  stapler_mimic: signature('Pried the last staple out of a {monster}.', 'Unjammed a {monster}, permanently.'),
  dust_daemon: signature('Banished a {monster} with a can of air.', 'Vacuumed up a {monster}.'),
  cable_serpent: signature('Untangled a {monster} and zip-tied it.', 'Coiled up a {monster} and labelled it.'),
  overheated_rack: signature('Talked a {monster} down to room temperature.', 'Vented the heat out of a {monster}.'),
  firewall_gremlin: signature('Patched out a {monster}.', 'Got past a {monster} on port 443.'),
  legacy_mainframe: signature('Finally decommissioned a {monster}.', 'Migrated a {monster} to the cloud.'),
  coffee_slime: signature('Mopped up a {monster}.', 'Poured a {monster} down the sink.'),
  crumb_golem: signature('Broke a {monster} into crumbs.', 'Swept a {monster} into the dustpan.'),
  microwave_wraith: signature('Hit cancel on a {monster}.', 'Unplugged a {monster} mid-ding.'),
  leftovers_hydra: signature('Cleared out a {monster}. Nobody claimed it.', 'Binned every head of a {monster}.'),
}

const shared: SharedNarrative = {
  retreat: [
    'Retreated from a stubborn {monster}.',
    'Backed away from a {monster} to fight another day.',
    'Called it quits against a {monster}.',
    'Left a {monster} for the night shift.',
    'Took a rain check on a {monster}.',
  ],
  // The status line shows when the hero is back, in the owner's time.
  death: ['Knocked out by a {monster}.', 'A {monster} won this round. Out cold.', 'Flattened by a {monster}.'],
  rescue: [
    'A {monster} nearly won; a coworker came to the rescue.',
    'A {monster} nearly won; the first-aider stepped in.',
    'Saved from a {monster} by a surprise fire drill.',
  ],
  trapDeath: ['Knocked out by a nasty trap.', 'A trap got the better of this one. Out cold.'],
  trapRescue: ['A trap nearly won; a coworker came to the rescue.', 'A trap nearly won; the first-aider stepped in.'],
  restFull: ['Took a quiet break at full health.', 'Took a coffee break anyway.', 'Refilled the water bottle and carried on.'],
  trapAvoided: [
    'Spotted a trap and stepped around it.',
    'Noticed a suspicious cable just in time.',
    'Stepped over a suspiciously wet floor.',
    'Saw the trap and stepped aside.',
  ],
  lootGear: ['Found a {item}.'],
  lootPotion: [
    'Found a healing potion.',
    'Someone left a healing potion on their desk. Finders keepers.',
    'Found a healing potion in the first-aid kit.',
    'A healing potion rolled out from under a desk.',
  ],
  potionFullGold: ['Potion pouch full; sold a spare for {gold} gold.', 'No room for another potion; sold it for {gold} gold.'],
  pouchFind: ['Found a {item}. The pouch now holds {capacity} potions.', 'Someone left a {item} in the kitchen. It holds {capacity} potions.'],
  merchant: [
    'A [[Wandering Merchant]] set up a trestle table. Open for {ticks} adventures.',
    'Met a [[Wandering Merchant]] by the lifts. Offers stand for {ticks} adventures.',
    'A [[Wandering Merchant]] wheeled a cart past. Shop in the companion within {ticks} adventures.',
  ],
  restingHeal: [
    'Resting to recover. +{heal} HP.',
    'Caught a power nap. +{heal} HP.',
    'Raided the first-aid kit. +{heal} HP.',
    'Put the feet up for a bit. +{heal} HP.',
    'Set status to "out of office". +{heal} HP.',
  ],
  revive: [
    'Revived in the {destination} with {heal} HP.',
    'Back on their feet in the {destination}. {heal} HP.',
    'HR signed off on the return to work. {heal} HP.',
  ],
  arrive: ['Arrived in the {destination}.', 'Made it to the {destination}.'],
  depart: [
    'Woke up and set off for the {destination}.',
    'Grabbed a coffee and headed for the {destination}.',
    'Packed a snack and set off for the {destination}.',
  ],
  unlock: ['The {destination} is now open.', 'New area unlocked: the {destination}.'],
  bagFind: [
    'Found a {item} in lost property! Bag now holds {capacity}.',
    'Someone left a {item} by the lifts. Bag now holds {capacity}.',
    'A {item} turned up behind the coat rack. Bag now holds {capacity}.',
    'Claimed an abandoned {item}. Bag now holds {capacity}.',
  ],
}

export const contentV1: ContentCatalog = {
  contentVersion: 'v1',
  constants: {
    potionStackCap: 20,
    potionHealPct: POTION_HEAL_PCT,
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
      lootGold: { min: 1, max: 3 },
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
      lootGold: { min: 4, max: 6 },
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
      lootGold: { min: 7, max: 10 },
      trapDamage: { min: 20, max: 36 },
    },
  ],
  safeBiomeId: 'office_cubicles',
  monsters: [
    monster('paper_imp', 'Paper Imp', 1, 14, 6, 1, [5, 6], [1, 2]),
    monster('rogue_roomba', 'Rogue Roomba', 1, 20, 7, 2, [5, 7], [1, 2]),
    monster('stapler_mimic', 'Stapler Mimic', 1, 25, 9, 2, [6, 7], [2, 3]),
    monster('dust_daemon', 'Dust Daemon', 1, 30, 10, 3, [6, 8], [2, 3]),
    monster('cable_serpent', 'Cable Serpent', 2, 40, 14, 4, [12, 15], [4, 5]),
    monster('overheated_rack', 'Overheated Rack', 2, 48, 16, 6, [13, 16], [4, 6]),
    monster('firewall_gremlin', 'Firewall Gremlin', 2, 55, 17, 5, [14, 17], [5, 6]),
    monster('legacy_mainframe', 'Legacy Mainframe', 2, 65, 19, 7, [15, 18], [5, 6]),
    monster('coffee_slime', 'Coffee Slime', 3, 80, 22, 8, [35, 41], [7, 8]),
    monster('crumb_golem', 'Crumb Golem', 3, 95, 26, 10, [38, 45], [7, 9]),
    monster('microwave_wraith', 'Microwave Wraith', 3, 105, 29, 9, [40, 47], [8, 10]),
    monster('leftovers_hydra', 'Leftovers Hydra', 3, 120, 32, 12, [43, 50], [8, 10]),
  ],
  // Each tier pairs two items per slot with different stats, so a second find is never a duplicate. The starter pair keeps
  // the tier stat (first-day pacing unchanged) and its partner is the first small upgrade; tiers 2 and 3 split
  // one point either side of the tier stat (two apart) so their average holds. Items copy stats at creation.
  gearTemplates: [
    { id: 'letter_opener', kind: 'weapon', tier: 1, name: 'Letter Opener' },
    { id: 'ruler_blade', kind: 'weapon', tier: 1, name: 'Ruler Blade', statOffset: 1 },
    { id: 'cardigan', kind: 'armor', tier: 1, name: 'Cardigan' },
    { id: 'lanyard_mail', kind: 'armor', tier: 1, name: 'Lanyard Mail', statOffset: 1 },
    { id: 'cable_cutter', kind: 'weapon', tier: 2, name: 'Cable Cutter', statOffset: -1 },
    { id: 'keyboard_mace', kind: 'weapon', tier: 2, name: 'Keyboard Mace', statOffset: 1 },
    { id: 'insulated_cardigan', kind: 'armor', tier: 2, name: 'Insulated Cardigan', statOffset: -1 },
    { id: 'anti_static_vest', kind: 'armor', tier: 2, name: 'Anti-Static Vest', statOffset: 1 },
    { id: 'ladle_of_ruin', kind: 'weapon', tier: 3, name: 'Ladle of Ruin', statOffset: -1 },
    { id: 'spork_halberd', kind: 'weapon', tier: 3, name: 'Spork Halberd', statOffset: 1 },
    { id: 'apron_of_warding', kind: 'armor', tier: 3, name: 'Apron of Warding', statOffset: -1 },
    { id: 'oven_mitt_plate', kind: 'armor', tier: 3, name: 'Oven-Mitt Plate', statOffset: 1 },
  ],
  gearTiers: {
    1: { weaponAttack: 3, armorDefense: 2, requiredLevel: 1, saleValue: 5 },
    2: { weaponAttack: 7, armorDefense: 5, requiredLevel: 4, saleValue: 12 },
    3: { weaponAttack: 12, armorDefense: 9, requiredLevel: 8, saleValue: 24 },
  },
  rarities: [
    { rarity: 'common', weight: 70, statBonus: 0, saleMultiplier: 1 },
    { rarity: 'uncommon', weight: 26, statBonus: 2, saleMultiplier: 2 },
    { rarity: 'rare', weight: 4, statBonus: 4, saleMultiplier: 4 },
  ],
  potion: { templateId: 'healing_potion', name: 'Healing Potion' },
  // D61: a new hero starts small; milestones guarantee each step, finds and gold may run one ahead.
  bagLadder: {
    tiers: [
      { id: 'paper_bag', name: 'Paper Bag', capacity: 6 },
      // The first upgrade is a guaranteed early find, about two hours in.
      { id: 'tote_bag', name: 'Tote Bag', capacity: 10, milestone: { ticksExplored: 6 }, price: 40 },
      { id: 'laptop_backpack', name: 'Laptop Backpack', capacity: 13, milestone: { level: 4 }, price: 150 },
      { id: 'messenger_bag', name: 'Messenger Bag', capacity: 16, milestone: { level: 8 }, price: 600 },
      // The release ceiling: crafting, raids and later content offer bigger bags.
      { id: 'rolling_suitcase', name: 'Rolling Suitcase', capacity: 20, milestone: { level: 12 }, price: 2000 },
    ],
    findPermille: 8,
  },
  narrative: { biomes: { office_cubicles: office, server_room: serverRoom, cafeteria_depths: cafeteria }, shared, monsters },
}
