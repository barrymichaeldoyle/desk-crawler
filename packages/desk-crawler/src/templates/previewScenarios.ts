/**
 * Fictional layout-preview scenarios: canonical payload inputs for every screen
 * state the templates handle. Shared by the local preview CLI
 * (tools/trmnl/preview.ts) and the dev-only preview gallery in the web app, so
 * both render the same cases. Never written to a deployment, and never carries
 * a redeemable keepsake code.
 */
import { ACTIVE_CONTENT, catalogs } from '../content'
import { MAX_LOGS, MAX_RECAP_EVENTS, type ActivityEntry, type PayloadInput } from '../lib/payload'
import type { OutcomeDetail } from '../sim/core/types'

export const PREVIEW_NOW = Date.UTC(2026, 9, 4, 8, 20)
/** The sample owner is in Johannesburg (UTC+2); TRMNL renders Liquid in UTC and the screen route adds `utc_offset`. */
export const PREVIEW_UTC_OFFSET = 2 * 3600
/** The end of the recap period the preview clock falls in: the night recap, which ends at 07:00 in Johannesburg (D75). */
export const PREVIEW_PERIOD_END = Date.UTC(2026, 9, 4, 5, 0)
/** Preview-only sample of the verified device-envelope field; never an actual redeemable code. */
export const PREVIEW_KEEPSAKE_CODE = '482 917'
/** Screens that never show a keepsake code. */
export const KEEPSAKE_FREE_SCENARIOS: ReadonlySet<string> = new Set(['unlinked', 'unlinkedPaused', 'sample'])
/** Scenarios that render without the owner's UTC offset, to prove the fallback. */
export const NO_OFFSET_SCENARIOS: ReadonlySet<string> = new Set(['noMetadata'])

export type PreviewScenarioGroup = 'states' | 'recap' | 'potionFinds' | 'noEffect' | 'marketing'
export const PREVIEW_SCENARIO_GROUP_LABELS: Record<PreviewScenarioGroup, string> = {
  states: 'Screen states',
  recap: 'Recap and density',
  potionFinds: 'Potion finds',
  noEffect: 'No effect',
  marketing: 'Marketing sample',
}

export interface PreviewScenarios {
  groups: Record<PreviewScenarioGroup, Record<string, PayloadInput>>
  /** Recap entries the CLI's `--recap` run adds to states that have no activity of their own. */
  overnightEntries: ActivityEntry[]
  base: PayloadInput
}

const NOW = PREVIEW_NOW

/** Gives a scenario the overnight recap when it has no activity of its own, shifted to its clock. */
export function withOvernightRecap(input: PayloadInput, overnightEntries: ActivityEntry[]): PayloadInput {
  return input.activity ? input : { ...input, activity: { entries: overnightEntries.map(entry => ({ ...entry, at: entry.at - NOW + input.now })), truncated: false } }
}

/** Fourteen older adventures, so the base log carries the full `MAX_LOGS` the device receives. */
const olderLogs: PayloadInput['logs'] = Array.from({ length: 14 }, (_, i) => {
  const at = NOW - (97 + i * 15) * 60_000
  return [
    { at, kind: 'combat', summary: 'Filed a [[Paper Imp]] under defeated. +6 XP, +2 gold.', deltas: { xpEarned: 6, gold: 2, hp: -4 } },
    { at, kind: 'rest', summary: 'Took a coffee break. +12 HP.', deltas: { xpEarned: 0, gold: 0, hp: 12 } },
    { at, kind: 'loot', summary: 'Found 8 gold in a desk drawer.', deltas: { xpEarned: 0, gold: 8, hp: 0 } },
    { at, kind: 'combat', summary: 'Out-argued a [[Stapler Mimic]]. +10 XP, +4 gold.', deltas: { xpEarned: 10, gold: 4, hp: -7 } },
  ][i % 4]!
})

export function previewScenarios(artBaseUrl: string | null): PreviewScenarios {
  const base: PayloadInput = {
    now: NOW,
    world: { currentTick: 120, lastCompletedTick: 120, lastCompletedAt: NOW - 7 * 60_000, createdAt: NOW - 86_400_000, ticksPaused: false, maintenanceMode: false },
    ownerAlias: 'barrymichaeldoyle',
    timezone: 'Africa/Johannesburg',
    utcOffset: PREVIEW_UTC_OFFSET,
    hero: { name: 'Baz', level: 5, xp: 210, hp: 118, gold: 640, status: 'exploring', biomeId: 'server_room', lastTick: 120, lastAdvancedAt: NOW - 7 * 60_000, quarantined: false },
    weaponName: 'Uncommon Cable Cutter',
    armorName: 'Insulated Cardigan',
    weaponAttack: 5,
    armorDefense: 2,
    potions: 4,
    bagUsed: 17,
    bagCapacity: 20,
    heldItemName: null,
    logs: [
      { at: NOW - 7 * 60_000, kind: 'combat', summary: 'Untangled a [[Cable Serpent]] and zip-tied it. +14 XP, +5 gold.', deltas: { xpEarned: 14, gold: 5, hp: -12 } },
      { at: NOW - 22 * 60_000, kind: 'loot', summary: 'Pulled a [[Rare Keyboard Mace]] out of a cable tray.' },
      { at: NOW - 37 * 60_000, kind: 'rest', summary: 'Cooled off by the air conditioning. +30 HP.', deltas: { xpEarned: 0, gold: 0, hp: 30 } },
      { at: NOW - 52 * 60_000, kind: 'combat', summary: 'Rebooted an [[Overheated Rack]] for good. +11 XP, +4 gold.', deltas: { xpEarned: 11, gold: 4, hp: -9 } },
      { at: NOW - 67 * 60_000, kind: 'loot', summary: 'Found 22 gold under a raised floor tile.', deltas: { xpEarned: 0, gold: 22, hp: 0 } },
      { at: NOW - 82 * 60_000, kind: 'combat', summary: 'Unplugged a [[Cable Serpent]]. +9 XP, +3 gold.', deltas: { xpEarned: 9, gold: 3, hp: -15 } },
      ...olderLogs,
    ],
    instanceName: 'Desk Crawler',
    // The live catalog, so the screens show what devices show (its stances name the status line, D103).
    content: catalogs[ACTIVE_CONTENT],
    spriteBaseUrl: null,
    artBaseUrl,
    latestEvent: { kind: 'combat', outcome: { variant: 'combat', monsterId: 'cable_serpent', elite: false } },
    ranking: {
      rank: 3,
      rankDelta: 1,
      status: 'ranked',
      cohortKey: '4-7',
      cohortLabel: 'Levels 4-7',
      score: 1840,
      scoreAt: NOW - 22 * 60_000,
      asOfTick: 118,
      builtAt: NOW - 21 * 60_000,
      windowStart: NOW - 167 * 3_600_000,
      totalPlayers: 41,
      globalTotalPlayers: 212,
      top: [
        { rank: 1, name: 'Ana', hero_name: 'Pip', level: 7, score: 2410 },
        { rank: 2, name: 'Bo', hero_name: 'Staple', level: 6, score: 1990 },
        { rank: 3, name: 'barrymichaeldoyle', hero_name: 'Baz', level: 5, score: 1840 },
        { rank: 4, name: 'Cy', hero_name: 'Mug', level: 5, score: 1700 },
        { rank: 5, name: 'Dee', hero_name: 'Clip', level: 4, score: 1515 },
        { rank: 6, name: 'Eli', hero_name: 'Toner', level: 6, score: 1390 },
        { rank: 7, name: 'Fen', hero_name: 'Lanyard', level: 4, score: 1210 },
        { rank: 8, name: 'Gus', hero_name: 'Memo', level: 5, score: 1085 },
        { rank: 9, name: 'Hal', hero_name: 'Badge', level: 4, score: 940 },
        { rank: 10, name: 'Ivy', hero_name: 'Ream', level: 7, score: 815 },
      ],
    },
  }

  const hero = (patch: Partial<NonNullable<PayloadInput['hero']>>) => ({ ...base.hero!, ...patch })
  const officeLogs: PayloadInput['logs'] = [{ at: NOW - 7 * 60_000, kind: 'combat', summary: 'Filed a [[Paper Imp]] under defeated. +6 XP, +2 gold.', deltas: { xpEarned: 6, gold: 2, hp: -4 } }]
  const states: Record<string, PayloadInput> = {
    normal: base,
    officeDay: { ...base, hero: hero({ biomeId: 'office_cubicles' }), logs: officeLogs, latestEvent: { kind: 'combat', outcome: { variant: 'combat', monsterId: 'paper_imp', elite: false } } },
    officeNight: { ...base, now: NOW + 12 * 3_600_000, world: { ...base.world!, lastCompletedAt: NOW + 12 * 3_600_000 - 7 * 60_000 }, hero: hero({ biomeId: 'office_cubicles' }), logs: officeLogs.map(log => ({ ...log, at: log.at + 12 * 3_600_000 })), latestEvent: { kind: 'combat', outcome: { variant: 'combat', monsterId: 'paper_imp', elite: false } } },
    expense: { ...base, logs: [{ at: NOW - 7 * 60_000, kind: 'loot', summary: 'An old expense claim finally paid out: 2 gold.', deltas: { xpEarned: 0, gold: 2, hp: 0 } }, ...base.logs] },
    elite: { ...base, latestEvent: { kind: 'combat', outcome: { variant: 'combat', monsterId: 'legacy_mainframe', elite: true, outcome: 'victory' } }, logs: [{ at: NOW - 7 * 60_000, kind: 'combat', summary: 'Took down an elite [[Legacy Mainframe]]. The floor heard it. +64 XP, +15 gold.', deltas: { xpEarned: 64, gold: 15, hp: -42 } }, ...base.logs] },
    levelUp: { ...base, hero: hero({ level: 6, xp: 12 }), latestEvent: { kind: 'levelup', outcome: { variant: 'combat', monsterId: 'cable_serpent', elite: false, outcome: 'victory' } }, logs: [{ at: NOW - 7 * 60_000, kind: 'levelup', summary: 'Unplugged a [[Cable Serpent]]. +15 XP, +5 gold. Reached level 6!', deltas: { xpEarned: 15, gold: 5, hp: 8 } }, ...base.logs] },
    dead: { ...base, hero: hero({ status: 'dead', hp: 0, reviveAtTick: 125 }), latestEvent: { kind: 'death', outcome: { variant: 'combat', monsterId: 'firewall_gremlin', elite: false } }, logs: [{ at: NOW - 7 * 60_000, kind: 'death', summary: 'Flattened by a [[Firewall Gremlin]]. Lost 64 gold.', deltas: { xpEarned: 0, gold: -64, hp: -118 } }, ...base.logs] },
    travelling: { ...base, hero: hero({ status: 'travelling', targetBiomeId: 'cafeteria_depths', arriveAtTick: 121 }), latestEvent: { kind: 'system' }, logs: [{ at: NOW - 3 * 60_000, kind: 'system', summary: 'Set off for the Cafeteria Depths.', deltas: { xpEarned: 0, gold: 0, hp: 0 } }, ...base.logs] },
    sleeping: { ...base, hero: hero({ status: 'sleeping' }), heldItemName: 'Rare Spork Halberd', bagUsed: 20, latestEvent: { kind: 'loot', outcome: { variant: 'loot', found: 'gear' } }, logs: [{ at: NOW - 7 * 60_000, kind: 'loot', summary: 'Found a [[Rare Spork Halberd]]. Bag full. Holding it until you make room.' }, ...base.logs] },
    paused: { ...base, hero: hero({ status: 'paused' }), ranking: { ...base.ranking!, rank: null, rankDelta: null, status: 'dormant', score: null } },
    quarantined: { ...base, hero: hero({ quarantined: true }) },
    // D79: a pending choice shows the decision notice; the offer is the newest story.
    choice: { ...base, hero: hero({ choiceExpiresAtTick: 216 }), logs: [{ at: NOW - 7 * 60_000, kind: 'choice', summary: 'A wallet is lying by the lifts, full of gold, with a photo of a cat inside.', deltas: { xpEarned: 0, gold: 0, hp: 0 } }, ...base.logs], latestEvent: { kind: 'choice' } },
    // D78: an open merchant visit shows the inverted notice line beside an ordinary day.
    merchant: { ...base, hero: hero({ merchantExpiresAtTick: 124 }), logs: [{ at: NOW - 7 * 60_000, kind: 'merchant', summary: 'A [[Wandering Merchant]] set up a trestle table. Open for 4 adventures.', deltas: { xpEarned: 0, gold: 0, hp: 0, offers: 3 } }, ...base.logs], latestEvent: { kind: 'merchant' } },
    stale: { ...base, world: { ...base.world!, lastCompletedAt: NOW - 3 * 3_600_000 } },
    longText: {
      ...base,
      // The widest status line too: the longest area under the longest stance name (D103).
      hero: hero({ name: 'Sir Staplington', biomeId: 'cafeteria_depths', stance: 'cautious' }),
      latestEvent: { kind: 'combat', outcome: { variant: 'combat', monsterId: 'microwave_wraith', elite: true, outcome: 'victory' } },
      ownerAlias: 'A_Very_Long_Alias__',
      // Widest case for the unclamped rank rows: a 20-character public name with a five-digit score.
      ranking: { ...base.ranking!, rank: 1, score: 12840, top: [{ rank: 1, name: 'Maximilian_Wolfgangs', hero_name: 'Sir Staplington', level: 12, score: 12840 }, ...base.ranking!.top.slice(1)] },
      logs: [{ at: NOW - 7 * 60_000, kind: 'combat', summary: 'Sent an elite [[Microwave Wraith]] back to the kitchen. +188 XP, +57 gold. Reached level 12! Found a [[Rare Ladle of Ruin]].', deltas: { xpEarned: 188, gold: 57, hp: -48 } }, ...base.logs],
    },
    // D111: the first drawer find, the widest HUD (a full bag, a full drawer, the longest name and stance) and sleep with both full.
    drawerFirst: { ...base, bagUsed: 20, drawerUsed: 1, latestEvent: { kind: 'loot', outcome: { variant: 'loot', found: 'gear' } }, logs: [{ at: NOW - 7 * 60_000, kind: 'drawer', summary: 'Bag full, so the [[Vampiric Rare Spork Halberd]] went in the desk drawer.' }, ...base.logs] },
    drawerWide: { ...base, bagUsed: 20, drawerUsed: 6, hero: hero({ name: 'Sir Staplington', biomeId: 'cafeteria_depths', stance: 'cautious', gold: 99_999 }), latestEvent: { kind: 'loot', outcome: { variant: 'loot', found: 'gear' } }, logs: [{ at: NOW - 7 * 60_000, kind: 'drawer', summary: 'Found an [[Epic Ladle of Ruin]] under a stack of unread memos.' }, ...base.logs] },
    drawerSleeping: { ...base, hero: hero({ status: 'sleeping' }), heldItemName: 'Rare Spork Halberd', bagUsed: 20, drawerUsed: 6, latestEvent: { kind: 'loot', outcome: { variant: 'loot', found: 'gear' } }, logs: [{ at: NOW - 7 * 60_000, kind: 'loot', summary: 'Found a [[Rare Spork Halberd]]. Bag full. Holding it until you make room.' }, ...base.logs] },
    // D110: the longest raid line with a 20-character rival, a raid this hero lost and one it won (the gold scene), and a lethal raid.
    raidLost: { ...base, latestEvent: { kind: 'raid', outcome: { variant: 'raid', role: 'raider', won: false } }, logs: [{ at: NOW - 7 * 60_000, kind: 'raid', summary: "The raid on [[Maximilian_Wolfgangs]]'s desk went badly. Dropped the loot on the way out.", deltas: { xpEarned: 0, gold: -1240, hp: -54 } }, ...base.logs] },
    raidWon: { ...base, latestEvent: { kind: 'raid', outcome: { variant: 'raid', role: 'target', won: true } }, logs: [{ at: NOW - 7 * 60_000, kind: 'raid', summary: 'Caught [[Maximilian_Wolfgangs]] at the drawers. They fled and dropped their loot.', deltas: { xpEarned: 0, gold: 1240, hp: -18 } }, ...base.logs] },
    raidKnockout: { ...base, hero: hero({ status: 'dead', hp: 0, reviveAtTick: 128 }), latestEvent: { kind: 'death', outcome: { variant: 'raid', role: 'target', won: false } }, logs: [{ at: NOW - 7 * 60_000, kind: 'death', summary: 'Came back to find [[Maximilian_Wolfgangs]] had been through the drawers. Knocked out for 8 ticks. Lost 64 gold.', deltas: { xpEarned: 0, gold: -1304, hp: -54 } }, ...base.logs] },
    unlinked: { ...base, hero: null, ranking: null, logs: [], latestEvent: null },
    // Setup screen while the service is paused: no code to scan, so the panel says so instead of asking for a scan.
    unlinkedPaused: { ...base, hero: null, ranking: null, logs: [], latestEvent: null, world: { ...base.world!, maintenanceMode: true } },
    firstRun: { ...base, hero: hero({ level: 1, xp: 0, hp: 60, gold: 0, biomeId: 'office_cubicles', lastTick: 0 }), logs: [], latestEvent: null, ranking: { ...base.ranking!, rank: null, rankDelta: null, status: 'awaiting', score: null, top: [] } },
  }

  // A fictional public sample generated through the same payload and templates.
  // Never include a redeemable keepsake code in a marketplace or landing image.
  const potionStates: Record<string, PayloadInput> = Object.fromEntries([
    ['potionFind', 'Found a healing potion.', 1, 0, 0],
    ['potionFindAndUse', 'Found a healing potion. Drank a potion.', 1, 0, 20],
    ['potionFullFallback', 'Potion pouch full; sold a spare for 5 gold.', 0, 5, 0],
  ].map(([name, summary, potionsFound, gold, hp]) => [name, { ...base, latestEvent: { kind: 'loot', outcome: { variant: 'loot', found: potionsFound ? 'potion' : 'gold' } }, logs: [{ at: NOW - 7 * 60_000, kind: 'loot', summary: String(summary), deltas: { xpEarned: 0, potionsFound: Number(potionsFound), gold: Number(gold), hp: Number(hp) } }, ...base.logs] }]))
  const noEffectStates: Record<string, PayloadInput> = {
    coffeeBreak: { ...base, hero: hero({ biomeId: 'office_cubicles', hp: 148 }), latestEvent: { kind: 'rest' }, logs: [{ at: NOW - 7 * 60_000, kind: 'rest', summary: 'Took a coffee break anyway.', deltas: { xpEarned: 0, gold: 0, hp: 0 } }, ...base.logs] },
  }
  // Explicit recorded-outcome fixtures; these are fictional and never written to a deployment.
  // Recorded outcomes sit inside the period the preview clock shows: at 10:20 Johannesburg that is the night recap, up to 07:00 (05:00 UTC).
  const activityEntry = (outcome: OutcomeDetail, index: number, patch: Partial<ActivityEntry> = {}): ActivityEntry => ({ at: PREVIEW_PERIOD_END - (index + 1) * 900_000, deltas: { xpEarned: 0, gold: 0, hp: 0 }, detail: { outcome, levelsGained: 0, heldFind: false }, ...patch })
  const fixtureFight: OutcomeDetail = { variant: 'combat', monsterId: 'cable_serpent', elite: false, monsterHpStart: 40, monsterHpEnd: 0, rounds: [], outcome: 'victory', xpGranted: 14, goldGranted: 5, gearDropped: false }
  const fixtureGear: OutcomeDetail = { variant: 'loot', found: 'gear', rarity: 'rare', goldGranted: 0, jackpot: false, potionFullFallback: false }
  const fixtureBreak: OutcomeDetail = { variant: 'rest', healing: 0, automatic: false, resultingStatus: 'exploring' }
  const overnightEntries = [
    ...Array.from({ length: 13 }, (_, i) => activityEntry(fixtureFight, i, { deltas: { xpEarned: 14, gold: 5, hp: -4 } })),
    ...Array.from({ length: 3 }, (_, i) => activityEntry(fixtureGear, i + 13)),
    ...Array.from({ length: 4 }, (_, i) => activityEntry({ variant: 'loot', found: 'potion', goldGranted: 0, jackpot: false, potionFullFallback: false }, i + 16)),
    ...Array.from({ length: 17 }, (_, i) => activityEntry(fixtureBreak, i + 20)),
  ]
  const milestoneEntries = [
    activityEntry(fixtureFight, 1, { deltas: { xpEarned: 188, gold: 57, hp: -48 }, detail: { outcome: { ...fixtureFight, elite: true, goldGranted: 57 }, levelsGained: 2, heldFind: false } }),
    activityEntry(fixtureGear, 30),
    ...overnightEntries,
  ]
  const recapStates: Record<string, PayloadInput> = {
    overnight: { ...base, activity: { entries: overnightEntries, truncated: false } },
    milestones: { ...states.longText!, activity: { entries: milestoneEntries, truncated: false } },
    quietMorning: { ...noEffectStates.coffeeBreak!, activity: { entries: Array.from({ length: 17 }, (_, i) => activityEntry(fixtureBreak, i)), truncated: false } },
    emptyWindow: { ...states.paused!, logs: base.logs.map(log => ({ ...log, at: log.at - 13 * 3_600_000 })), activity: { entries: [], truncated: false } },
    partial: { ...base, activity: { entries: Array.from({ length: MAX_RECAP_EVENTS }, (_, i) => activityEntry(fixtureFight, i, { at: PREVIEW_PERIOD_END - (i + 1) * 60_000, deltas: { xpEarned: 999, gold: 999, hp: 0 } })), truncated: true } },
    fullBagRecap: { ...states.sleeping!, activity: { entries: [activityEntry(fixtureGear, 0, { detail: { outcome: fixtureGear, levelsGained: 0, heldFind: true } }), ...overnightEntries], truncated: false } },
    knockoutRecap: { ...states.dead!, activity: { entries: [activityEntry({ ...fixtureFight, outcome: 'death', goldGranted: 0, gearDropped: false }, 0), ...overnightEntries], truncated: false } },
    recoveredRecap: { ...base, activity: { entries: [activityEntry({ variant: 'revival', previousBiomeId: 'server_room', safeBiomeId: 'office_cubicles', hpGranted: 30, reviveAtTick: 119 }, 0), activityEntry({ ...fixtureFight, outcome: 'death', goldGranted: 0, gearDropped: false }, 8), ...overnightEntries], truncated: false } },
    // D110: raids won and lost overnight, one of them lethal.
    raidRecap: { ...base, activity: { entries: [
      activityEntry({ variant: 'raid', role: 'raider', rivalHeroId: 'r1', rivalName: 'Quill', won: true, gold: 14, hpLost: 9, raidTick: 110, outcome: 'survived' }, 0),
      activityEntry({ variant: 'raid', role: 'target', rivalHeroId: 'r2', rivalName: 'Mo', won: false, gold: 22, hpLost: 54, raidTick: 104, outcome: 'death' }, 1),
      activityEntry({ variant: 'raid', role: 'target', rivalHeroId: 'r3', rivalName: 'Bea', won: true, gold: 6, hpLost: 18, raidTick: 100, outcome: 'survived' }, 2),
      ...overnightEntries,
    ], truncated: false } },
    arrivalRecap: { ...base, activity: { entries: [activityEntry({ variant: 'travel', phase: 'arrive', fromBiomeId: 'office_cubicles', toBiomeId: 'server_room', arrivalTick: 120 }, 0), ...overnightEntries], truncated: false } },
  }
  // Saturated histories prove layout capacity is measured instead of capped at three stories.
  const denseLogs = (summary: string): PayloadInput['logs'] => Array.from({ length: MAX_LOGS }, (_, i) => ({ at: NOW - (i + 1) * 900_000, kind: 'rest', summary, deltas: { xpEarned: 0, gold: 0, hp: 0 } }))
  Object.assign(recapStates, {
    denseShort: { ...base, logs: denseLogs('Took a coffee break anyway.') },
    emptyHistory: { ...base, logs: [] },
    missingQr: { ...base, artBaseUrl: null, logs: denseLogs('Took a coffee break anyway.') },
    denseLong: { ...states.longText!, logs: denseLogs('Sent an elite [[Microwave Wraith]] back to the kitchen. Reached level 12! Found a [[Rare Ladle of Ruin]].') },
    longHero: { ...base, hero: hero({ name: 'W'.repeat(16) }), logs: denseLogs('Filed a [[Paper Imp]] under defeated.') },
    denseRaid: { ...base, logs: denseLogs("The raid on [[Maximilian_Wolfgangs]]'s desk went badly. Dropped the loot on the way out.").map(log => ({ ...log, kind: 'raid', deltas: { xpEarned: 0, gold: -1240, hp: -54 } })) },
    noMetadata: { ...base, logs: denseLogs('A quiet moment.').map(({ deltas: _deltas, ...entry }) => entry) },
    largeRanking: { ...base, logs: denseLogs('Filed a [[Paper Imp]] under defeated.'), ranking: { ...base.ranking!, rank: 12345, totalPlayers: 999999, top: base.ranking!.top.map(row => ({ ...row, score: 999999 })) } },
  })

  const marketing: Record<string, PayloadInput> = {
    sample: { ...base, ownerAlias: 'Steve', hero: hero({ name: 'Pip' }), ranking: { ...base.ranking!, top: base.ranking!.top.map(row => row.rank === 3 ? { ...row, name: 'Steve', hero_name: 'Pip' } : row) } },
  }
  return { groups: { states, recap: recapStates, potionFinds: potionStates, noEffect: noEffectStates, marketing }, overnightEntries, base }
}
