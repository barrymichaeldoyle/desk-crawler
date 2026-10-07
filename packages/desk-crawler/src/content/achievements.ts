import type { NumericCounter } from '../sim/core/types'

/**
 * Achievement catalog (achievements.md, D65). Content, versioned like the
 * monster catalog: ids are append-only and never reused; renaming a joke is a
 * copy change, changing a threshold is a new id. Every predicate reads only
 * bounded hero state (lifetime counters, level, bag capacity, keepsake total),
 * never logs, so a hero who did the deed before an achievement existed earns
 * it on the first evaluation after release.
 */
export const ACHIEVEMENTS_VERSION = 2

export type AchievementPredicate =
  | { readonly kind: 'counter'; readonly counter: NumericCounter; readonly atLeast: number }
  | { readonly kind: 'monster'; readonly monsterId: string; readonly atLeast: number }
  | { readonly kind: 'level'; readonly atLeast: number }
  | { readonly kind: 'bag'; readonly atLeast: number }
  | { readonly kind: 'keepsakes'; readonly atLeast: number }
  /** Every monster in the pinned catalog defeated at least `atLeast` times. */
  | { readonly kind: 'everyMonster'; readonly atLeast: number }
  /** At least one monster of every biome defeated at least `atLeast` times. */
  | { readonly kind: 'everyBiome'; readonly atLeast: number }
  /** Every monster of one biome defeated at least `atLeast` times. */
  | { readonly kind: 'biomeMonsters'; readonly biomeId: string; readonly atLeast: number }

export interface AchievementFamily {
  readonly id: string
  readonly name: string
  /** Shown on an unearned family's "?" card instead of its name. */
  readonly category: string
}

export interface AchievementDef {
  readonly id: string
  readonly family: string
  /** 1-based rung within the family; set pieces are tier 1 of a one-tier family. */
  readonly tier: number
  readonly name: string
  readonly blurb: string
  readonly predicate: AchievementPredicate
}

/** Monster and elite families share one ladder (achievements.md "Catalog rules"). */
export const MONSTER_LADDER = [1, 5, 25, 100, 500] as const

type TierCopy = readonly (readonly [name: string, blurb: string])[]

const families: AchievementFamily[] = []
const defs: AchievementDef[] = []

function family(id: string, name: string, category: string, tiers: TierCopy, predicate: (tier: number) => AchievementPredicate): void {
  families.push({ id, name, category })
  tiers.forEach(([tierName, blurb], index) => {
    // A one-tier family (a set piece) is its own id; ladders number their rungs.
    defs.push({ id: tiers.length === 1 ? id : `${id}_${index + 1}`, family: id, tier: index + 1, name: tierName, blurb, predicate: predicate(index) })
  })
}

const monster = (monsterId: string, name: string, biome: string, tiers: TierCopy) =>
  family(`slay_${monsterId}`, name, `${biome} monster`, tiers, (i) => ({ kind: 'monster', monsterId, atLeast: MONSTER_LADDER[i]! }))

const counter = (id: string, name: string, category: string, key: NumericCounter, ladder: readonly number[], tiers: TierCopy) =>
  family(id, name, category, tiers, (i) => ({ kind: 'counter', counter: key, atLeast: ladder[i]! }))

// ---------------------------------------------------------------- monster families

monster('paper_imp', 'Paper Imp', 'Office Cubicles', [
  ['Shredder Duty', 'Fed a Paper Imp to the shredder. It was mostly staples.'],
  ['Blue Bin Regular', 'Recycling, of course. Always recycling.'],
  ['Imp Exterminator', 'The photocopier has never been quieter.'],
  ['Paperless Office', 'Management is thrilled. The imps are not.'],
  ['Pulp Legend', 'There is a plaque by the shredder now.'],
])
monster('rogue_roomba', 'Rogue Roomba', 'Office Cubicles', [
  ['Flipped It', 'Like a turtle, but with more beeping.'],
  ['Bin Emptier', 'Someone had to do it.'],
  ['Roomba Wrangler', 'They know your footsteps now.'],
  ['Floor Supervisor', 'Every carpet tile answers to you.'],
  ['Clean Sweep', 'The cleaners sent a thank-you card.'],
])
monster('stapler_mimic', 'Stapler Mimic', 'Office Cubicles', [
  ['Unjammed', 'Permanently this time.'],
  ['Staple Remover', 'The little metal jaws fear you.'],
  ['Mimic Spotter', 'You check every stapler twice now.'],
  ['Supplies Auditor', 'Nothing on this floor is what it seems. You checked.'],
  ['Red Stapler', 'It is yours. Nobody will take it.'],
])
monster('dust_daemon', 'Dust Daemon', 'Office Cubicles', [
  ['Canned Air', 'One short blast. Problem solved.'],
  ['Dust Buster', 'Gesundheit.'],
  ['Allergy Season', 'Tissues on expenses.'],
  ['Spring Cleaning', 'The vents have never been this clear.'],
  ['Spotless', 'You can see your reflection in the keyboard.'],
])
monster('cable_serpent', 'Cable Serpent', 'Server Room', [
  ['Zip-Tied', 'Coiled, tied and labelled.'],
  ['Cable Manager', 'Velcro, never tape.'],
  ['Labelled Everything', 'Both ends. Every time.'],
  ['Patch Panel Pro', 'Colour-coded and alphabetical.'],
  ['Structured Cabling', 'The rack photo went viral internally.'],
])
monster('overheated_rack', 'Overheated Rack', 'Server Room', [
  ['Room Temperature', 'Talked it down. Calmly.'],
  ['Vented', 'Hot air out, cold air in.'],
  ['Thermal Throttler', 'Fans at a reasonable hum.'],
  ['Cold Aisle', 'Jumper required.'],
  ['Absolute Zero', 'Nothing in here will ever overheat again.'],
])
monster('firewall_gremlin', 'Firewall Gremlin', 'Server Room', [
  ['Port 443', 'Got through. Encrypted, naturally.'],
  ['Patch Tuesday', 'Reboot required.'],
  ['Deny All', 'Then allow exactly what you mean.'],
  ['Zero Trust', 'Not even the gremlins trust the gremlins.'],
  ['Air Gapped', 'The safest network is the one you unplugged.'],
])
monster('legacy_mainframe', 'Legacy Mainframe', 'Server Room', [
  ['Decommissioned', 'Finally.'],
  ['Migration Lead', 'To the cloud. Forever.'],
  ['Cloud Native', 'Nobody remembers the on-prem days.'],
  ['End of Life', 'Extended support declined.'],
  ['Last COBOL Standing', 'Somebody still has to maintain it.'],
])
monster('coffee_slime', 'Coffee Slime', 'Cafeteria Depths', [
  ['Mopped Up', 'Wet floor sign deployed.'],
  ['Down the Sink', 'With the rest of the morning.'],
  ['Decaf Only', "For everyone's safety."],
  ['Barista', 'Latte art of a defeated slime.'],
  ['Cold Brew Master', 'Steeped for twelve hours. Worth it.'],
])
monster('crumb_golem', 'Crumb Golem', 'Cafeteria Depths', [
  ['Dustpan', 'Into, well, crumbs.'],
  ['Crumb Collector', 'The pigeons are furious.'],
  ['Table Wiper', 'Every table. Every time.'],
  ['Five-Second Rule', 'Not applicable to golems.'],
  ['Breadwinner', 'You earned the loaf.'],
])
monster('microwave_wraith', 'Microwave Wraith', 'Cafeteria Depths', [
  ['Hit Cancel', 'Mid-ding.'],
  ['Unplugged', 'Try turning it off and leaving it off.'],
  ['Thirty Seconds More', 'It was still cold in the middle.'],
  ['Fish Curry Day', 'You have smelled things.'],
  ['Ding', 'The last ding. Ever.'],
])
monster('leftovers_hydra', 'Leftovers Hydra', 'Cafeteria Depths', [
  ['Nobody Claimed It', 'So it was binned. Every head.'],
  ['Fridge Cleaner', "Friday, four o'clock, no mercy."],
  ['Tupperware Hero', 'Returned to its rightful owner.'],
  ['Friday Purge', 'A passive-aggressive note was not needed.'],
  ['Sell-By Legend', 'The fridge is empty. The fridge stays empty.'],
])

// ---------------------------------------------------------------- set pieces

family('office_census', 'Office Census', 'Set piece', [['Office Census', 'Met every monster on the premises at least once.']], () => ({ kind: 'everyMonster', atLeast: 1 }))
family('full_tour', 'Full Tour', 'Set piece', [['Full Tour', 'Won a fight on every floor.']], () => ({ kind: 'everyBiome', atLeast: 1 }))
family('floor_cleared_1', 'Cubicles Cleared', 'Set piece', [['Cubicles Cleared', 'Twenty-five of each in the Office Cubicles.']], () => ({ kind: 'biomeMonsters', biomeId: 'office_cubicles', atLeast: 25 }))
family('floor_cleared_2', 'Server Room Cleared', 'Set piece', [['Server Room Cleared', 'Twenty-five of each in the Server Room.']], () => ({ kind: 'biomeMonsters', biomeId: 'server_room', atLeast: 25 }))
family('floor_cleared_3', 'Cafeteria Cleared', 'Set piece', [['Cafeteria Cleared', 'Twenty-five of each in the Cafeteria Depths.']], () => ({ kind: 'biomeMonsters', biomeId: 'cafeteria_depths', atLeast: 25 }))

// ---------------------------------------------------------------- counter families

counter('elites', 'Elites', 'Lifetime', 'eliteWins', [1, 5, 25, 100], [
  ['The Floor Clapped', 'Took down an elite. Someone whistled.'],
  ['Elite Problem', 'They keep sending senior ones.'],
  ['Senior Exterminator', 'Title confirmed by email.'],
  ['Head of Department', 'Elites report to you now.'],
])
counter('jackpots', 'Jackpots', 'Lifetime', 'jackpots', [1, 5, 25], [
  ['Lucky Break', 'Ten times the gold. Pure luck. Say thank you.'],
  ['Expense Approved', 'No receipts required.'],
  ['Petty Cash Tin', 'You know where it is kept.'],
])
counter('rare_finds', 'Rare finds', 'Lifetime', 'rareFinds', [1, 5, 25, 100], [
  ['Shiny', 'Rare gear. Hold it up to the light.'],
  ['Collector', 'A small, strange and growing pile.'],
  ['Curator', 'Labelled, catalogued, insured.'],
  ['The Vault', 'Nobody else has a drawer like this.'],
])
counter('adventures', 'Adventures', 'Lifetime', 'ticksExplored', [1, 100, 500, 2500, 10000], [
  ['First Day', 'Found the kitchen. Found the desk. Survived.'],
  ['Probation Passed', 'A day and a bit of adventuring.'],
  ['Weekly Standup', 'Roughly a week on the clock.'],
  ['Monthly Report', 'A full month of fifteen-minute quests.'],
  ['Long Service Award', 'A carriage clock would be appropriate.'],
])
counter('finds', 'Finds', 'Lifetime', 'itemsFound', [10, 100, 1000, 5000], [
  ['Finders Keepers', 'Someone left it on their desk.'],
  ['Drawer of Things', 'Everyone has one. Yours is bigger.'],
  ['Supply Cupboard', 'The quartermaster of the open-plan.'],
  ['Lost Property Office', 'It all ends up with you.'],
])
counter('gold', 'Gold earned', 'Lifetime', 'goldEarned', [100, 1000, 10000, 100000], [
  ['Coins in the Couch', 'Lifetime gold, not current balance.'],
  ['Expense Claim', 'Approved, eventually.'],
  ['Bonus Season', 'Discretionary. Very discretionary.'],
  ['Golden Handshake', 'You could retire. You will not.'],
])
family('levels', 'Levels', 'Lifetime', [
  ['Promoted', 'The Server Room is open.'],
  ['Team Lead', 'The Cafeteria Depths are open.'],
  ['Middle Management', 'Rolling Suitcase territory.'],
  ['Director', 'Nobody is quite sure what you do.'],
  ['Corner Office', 'It has a window. The window has a blind.'],
], (i) => ({ kind: 'level', atLeast: [4, 8, 12, 16, 20][i]! }))
counter('knockouts', 'Knock-outs', 'Lifetime', 'deaths', [1, 5, 25, 100], [
  ['Out Cold', 'Back in two hours. Nothing lost but gold and dignity.'],
  ['Sick Note', 'Signed by the first-aider.'],
  ['Regular at HR', 'They have a chair with your name on it.'],
  ['Nine Lives (Expired)', 'And then some.'],
])
counter('rescues', 'Rescues', 'Lifetime', 'rescues', [1, 5, 25], [
  ['Fire Drill', 'Saved by the alarm. Best drill ever.'],
  ["First-Aider's Friend", 'On first-name terms with the green box.'],
  ['Coworker of the Year', 'Not you. The one who keeps saving you.'],
])
counter('retreats', 'Retreats', 'Lifetime', 'retreats', [1, 5, 25, 100], [
  ['Rain Check', 'Fight another day.'],
  ["Night Shift's Problem", 'Left it for them. Twice this week.'],
  ['Strategic Withdrawal', 'Put it in the slide deck.'],
  ['Diary Full', 'Could not possibly fit the fight in.'],
])
counter('potions', 'Potions', 'Lifetime', 'potionsUsed', [1, 10, 100, 500], [
  ['First Aid', 'Tasted of strawberry and regret.'],
  ['Kit Raider', 'The first-aid box has a lock now.'],
  ['Pharmacy', 'Prescriptions on request.'],
  ['Self-Medicated', 'Not medical advice.'],
])
counter('traps', 'Traps avoided', 'Lifetime', 'trapsAvoided', [1, 25, 100, 500], [
  ['Watch Your Step', 'Saw it coming. Not today.'],
  ['Wet Floor Sign', 'You put it there. You step around it.'],
  ['Health and Safety', 'Completed the e-learning. Twice.'],
  ['Risk Assessed', 'Every corridor has a laminated form.'],
])
counter('breaks', 'Breaks', 'Lifetime', 'restTicks', [10, 100, 1000], [
  ['Coffee Break', 'Status set to "out of office".'],
  ['Power Nap', 'Feet up. Eyes closed. Heroic.'],
  ['Out of Office', 'Back on the twelfth. Ish.'],
])
counter('trips', 'Trips', 'Lifetime', 'trips', [1, 10, 100], [
  ['Commuter', 'Took the stairs to another floor.'],
  ['Hot Desker', 'No fixed address.'],
  ['Frequent Flyer', 'Lounge access to the Server Room.'],
])
family('bags', 'Bag ladder', 'Lifetime', [
  ['Tote-ally Prepared', 'The Paper Bag is retired with honours.'],
  ['Backpacker', 'Padded straps. Laptop sleeve. Purpose.'],
  ['Messenger', 'Worn across the body for maximum urgency.'],
  ['Rolling Suitcase', 'Wheels. The dream.'],
], (i) => ({ kind: 'bag', atLeast: [10, 13, 16, 20][i]! }))
counter('sales', 'Sales', 'Lifetime', 'itemsSold', [1, 25, 250, 1000], [
  ['Car Boot Sale', 'One careful owner.'],
  ['Declutter', 'Does it spark joy? It sparks gold.'],
  ['Procurement', 'A spreadsheet is involved.'],
  ['Liquidation', 'Everything must go. Everything went.'],
])
family('keepsakes', 'Keepsakes', 'Lifetime', [
  ['Desk Ornament', 'A small thing in the corner of the desk.'],
  ['Shelf Life', 'Half a shelf and counting.'],
  ['Full Set', 'Every design, once.'],
  ['Second Shelf', 'Facilities have been informed.'],
], (i) => ({ kind: 'keepsakes', atLeast: [1, 6, 12, 24][i]! }))

// ---------------------------------------------------------------- v1.1 Decisions (catalog version 2; appended, never edited)

counter('purchases', 'Purchases', 'Decisions', 'purchases', [1, 5, 25], [
  ['Impulse Buy', 'The merchant had a nice smile.'],
  ['Loyalty Card', 'Fifth stamp. The sixth is not free.'],
  ['Preferred Customer', 'The merchant waves from across the floor.'],
])
counter('merchants', 'Merchants met', 'Decisions', 'merchantVisits', [1, 10, 50], [
  ['Trestle Table', 'A cart, a cloth and a price list.'],
  ['Market Day', 'Ten visits and counting.'],
  ['Trade Route', 'The merchant plans the rounds around you.'],
])
counter('stances', 'Stance changes', 'Decisions', 'stanceChanges', [1, 5, 25], [
  ['New Posture', 'Tried a different approach.'],
  ['Mood Board', 'Five changes of heart.'],
  ['Agile', 'Pivots weekly. Sometimes daily.'],
])
counter('choices', 'Decisions made', 'Decisions', 'choicesMade', [1, 5, 25, 100], [
  ['Decider', 'Made one call. It counts.'],
  ['Executive Function', 'Five decisions, all on time.'],
  ['Steering Committee', 'Twenty-five decisions and a slide deck.'],
  ['Chief Decision Officer', 'The role exists now. It is you.'],
])
counter('epics', 'Epic finds', 'Lifetime', 'epicFinds', [1, 5], [
  ['Legendary Stationery', 'Epic gear. One in a hundred.'],
  ['The Good Drawer', 'Five epics. It locks, obviously.'],
])

/** Families in display order. */
export const ACHIEVEMENT_FAMILIES: readonly AchievementFamily[] = families
/** Every achievement in catalog order: by family, then tier. */
export const ACHIEVEMENTS: readonly AchievementDef[] = defs
export const ACHIEVEMENT_BY_ID: ReadonlyMap<string, AchievementDef> = new Map(defs.map((def) => [def.id, def]))

export const ROMAN = ['I', 'II', 'III', 'IV', 'V'] as const
export const tierLabel = (tier: number): string => ROMAN[tier - 1] ?? String(tier)

/** Rarity bands over the share of ranked heroes holding an achievement (achievements.md "Player experience"). */
export type RarityBand = 'common' | 'uncommon' | 'rare' | 'legendary'
export function rarityBand(share: number): RarityBand {
  if (share >= 0.5) return 'common'
  if (share >= 0.1) return 'uncommon'
  if (share >= 0.01) return 'rare'
  return 'legendary'
}

/** Below this many ranked heroes the companion shows "3 of 11 heroes" instead of a percentage. */
export const RARITY_PERCENT_MIN_POPULATION = 20
