import type { BiomeNarrative, ContentCatalog, MonsterNarrative, SharedNarrative } from '../sim/core/types'
import { contentV2 } from './v2'

/*
 * Content catalog v3: v2's numbers unchanged, with a larger narrative (D45).
 * More variants per encounter, signature victory lines per monster, biome
 * flavor for gear finds and arrivals, area-unlock lines on level-up, and
 * deaths that leave the revive time to the status line instead of counting
 * ticks. Text draws only use the narrative stream, so rewards match v2.
 * Authored story text is reserved content (LICENSE exclusions), not MIT code.
 */

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
  ],
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
  paper_imp: signature('Fed a {monster} to the shredder.', 'Recycled a {monster}. Blue bin, of course.'),
  rogue_roomba: signature('Flipped a {monster} onto its back.', "Emptied a {monster}'s dust bin for good."),
  stapler_mimic: signature('Pried the last staple out of a {monster}.', 'Unjammed a {monster}, permanently.'),
  dust_daemon: signature('Banished a {monster} with a can of air.', 'Vacuumed up a {monster}.'),
  cable_serpent: signature('Untangled a {monster} and zip-tied it.', 'Coiled up a {monster} and labelled it.'),
  overheated_rack: signature('Talked a {monster} down to room temperature.', 'Vented the heat out of a {monster}.'),
  firewall_gremlin: signature('Patched a {monster} out of existence.', 'Got past a {monster} on port 443.'),
  legacy_mainframe: signature('Finally decommissioned a {monster}.', 'Migrated a {monster} to the cloud. Forever.'),
  coffee_slime: signature('Mopped up a {monster}.', 'Poured a {monster} down the sink.'),
  crumb_golem: signature('Broke a {monster} into, well, crumbs.', 'Swept a {monster} into the dustpan.'),
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
  restFull: ['Took a quiet break. Already feeling great.', 'Took a coffee break anyway.', 'Refilled the water bottle and carried on.'],
  trapAvoided: [
    'Spotted a trap and stepped around it.',
    'Noticed a suspicious cable just in time.',
    'Stepped over a suspiciously wet floor.',
    'Saw the trap coming. Not today.',
  ],
  lootGear: ['Found a {item}.'],
  lootPotion: [
    'Found a healing potion.',
    'Someone left a healing potion on their desk. Finders keepers.',
    'Found a healing potion in the first-aid kit.',
    'A healing potion rolled out from under a desk.',
  ],
  potionFullGold: ['Potion pouch full; sold a spare for {gold} gold.', 'No room for another potion; sold it for {gold} gold.'],
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
}

export const contentV3: ContentCatalog = {
  ...contentV2,
  contentVersion: 'v3',
  narrative: { biomes: { office_cubicles: office, server_room: serverRoom, cafeteria_depths: cafeteria }, shared, monsters },
}
