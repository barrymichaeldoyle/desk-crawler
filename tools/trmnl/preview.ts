/**
 * Local TRMNL layout preview: renders the real templates with real payloads
 * (buildPayload) through Liquid inside the pinned framework 3.4.0 CSS/JS, one
 * HTML page per state with all four sizes. Screenshot the pages for the layout
 * matrix. This approximates TRMNL's renderer; real-device renders stay the
 * acceptance gate.  Usage: pnpm tsx tools/trmnl/preview.ts [artBaseUrl]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { Liquid } from 'liquidjs'
import { contentV4 } from '@trmnl-games/desk-crawler/content/v4'
import { buildPayload, MAX_RECAP_EVENTS, type ActivityEntry, type PayloadInput } from '@trmnl-games/desk-crawler/payload'
import type { OutcomeDetail } from '@trmnl-games/desk-crawler/sim/core/types'
import { displayLogDeltas } from '@trmnl-games/desk-crawler/log'
import { sceneUrlsAt } from '@trmnl-games/desk-crawler/art/sceneTime'
import { screenMarkup } from '@trmnl-games/desk-crawler/templates/screen'
import { PREVIEW_DEVICES, PREVIEW_LAYOUTS, previewDocument, type PreviewDevice, type PreviewLayout } from '@trmnl-games/desk-crawler/templates/preview'

const artBaseUrl = process.argv[2] ?? 'https://superb-bobcat-74.convex.site'
const NOW = Date.UTC(2026, 9, 4, 8, 20)
/** TRMNL renders Liquid in UTC; the sample owner is in Johannesburg (UTC+2). */
const liquid = new Liquid({ timezoneOffset: 0 })
/** The screen route adds `utc_offset` from TRMNL's request; markup gets no `trmnl` object, so the preview passes none. */
const utcOffset = 2 * 3600
/** Preview-only sample of the verified device-envelope field; never an actual redeemable code. */
const deskKeepsakeCode = process.argv.includes('--keepsakes') ? 'ABCD-EFGH' : null

const base: PayloadInput = {
  now: NOW,
  world: { currentTick: 120, lastCompletedTick: 120, lastCompletedAt: NOW - 7 * 60_000, createdAt: NOW - 86_400_000, ticksPaused: false, maintenanceMode: false },
  ownerAlias: 'barrymichaeldoyle',
  timezone: 'Africa/Johannesburg',
  hero: { name: 'Baz', level: 5, xp: 210, hp: 118, gold: 640, status: 'exploring', biomeId: 'server_room', lastTick: 120, lastAdvancedAt: NOW - 7 * 60_000, quarantined: false },
  weaponName: 'Uncommon Cable Cutter',
  armorName: 'Insulated Cardigan',
  potions: 4,
  bagUsed: 17,
  bagCapacity: 30,
  heldItemName: null,
  logs: [
    { at: NOW - 7 * 60_000, kind: 'combat', summary: 'Untangled a [[Cable Serpent]] and zip-tied it. +14 XP, +5 gold.', deltas: { xpEarned: 14, gold: 5, hp: -12 } },
    { at: NOW - 22 * 60_000, kind: 'loot', summary: 'Pulled a [[Rare Keyboard Mace]] out of a cable tray.' },
    { at: NOW - 37 * 60_000, kind: 'rest', summary: 'Cooled off by the air conditioning. +30 HP.', deltas: { xpEarned: 0, gold: 0, hp: 30 } },
    { at: NOW - 52 * 60_000, kind: 'combat', summary: 'Rebooted an [[Overheated Rack]] for good. +11 XP, +4 gold.', deltas: { xpEarned: 11, gold: 4, hp: -9 } },
    { at: NOW - 67 * 60_000, kind: 'loot', summary: 'Found 22 gold under a raised floor tile.', deltas: { xpEarned: 0, gold: 22, hp: 0 } },
    { at: NOW - 82 * 60_000, kind: 'combat', summary: 'Unplugged a [[Cable Serpent]]. +9 XP, +3 gold.', deltas: { xpEarned: 9, gold: 3, hp: -15 } },
  ],
  instanceName: 'Desk Crawler',
  content: contentV4,
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
    top5: [
      { rank: 1, name: 'Ana', hero_name: 'Pip', level: 7, score: 2410 },
      { rank: 2, name: 'Bo', hero_name: 'Staple', level: 6, score: 1990 },
      { rank: 3, name: 'barrymichaeldoyle', hero_name: 'Baz', level: 5, score: 1840 },
      { rank: 4, name: 'Cy', hero_name: 'Mug', level: 5, score: 1700 },
      { rank: 5, name: 'Dee', hero_name: 'Clip', level: 4, score: 1515 },
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
  travelling: { ...base, hero: hero({ status: 'travelling', targetBiomeId: 'cafeteria_depths', arriveAtTick: 121 }), latestEvent: { kind: 'system' } },
  sleeping: { ...base, hero: hero({ status: 'sleeping' }), heldItemName: 'Rare Spork Halberd', bagUsed: 30, latestEvent: { kind: 'loot', outcome: { variant: 'loot', found: 'gear' } }, logs: [{ at: NOW - 7 * 60_000, kind: 'loot', summary: 'Found a [[Rare Spork Halberd]]. Bag full. Holding it until you make room.' }, ...base.logs] },
  paused: { ...base, hero: hero({ status: 'paused' }), ranking: { ...base.ranking!, rank: null, rankDelta: null, status: 'dormant', score: null } },
  quarantined: { ...base, hero: hero({ quarantined: true }) },
  stale: { ...base, world: { ...base.world!, lastCompletedAt: NOW - 3 * 3_600_000 } },
  longText: {
    ...base,
    hero: hero({ name: 'Sir Staplington' }),
    ownerAlias: 'A_Very_Long_Alias__',
    // Widest case for the unclamped rank rows: a 20-character public name with a five-digit score.
    ranking: { ...base.ranking!, rank: 1, score: 12840, top5: [{ rank: 1, name: 'Maximilian_Wolfgangs', hero_name: 'Sir Staplington', level: 12, score: 12840 }, ...base.ranking!.top5.slice(1)] },
    logs: [{ at: NOW - 7 * 60_000, kind: 'combat', summary: 'Sent an elite [[Microwave Wraith]] back to the kitchen. +188 XP, +57 gold. Reached level 12! Found a [[Rare Ladle of Ruin]].', deltas: { xpEarned: 188, gold: 57, hp: -48 } }, ...base.logs],
  },
  unlinked: { ...base, hero: null, ranking: null, logs: [], latestEvent: null },
  firstRun: { ...base, hero: hero({ level: 1, xp: 0, hp: 60, gold: 0, biomeId: 'office_cubicles', lastTick: 0 }), logs: [], latestEvent: null, ranking: { ...base.ranking!, rank: null, rankDelta: null, status: 'awaiting', score: null, top5: [] } },
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
const activityEntry = (outcome: OutcomeDetail, index: number, patch: Partial<ActivityEntry> = {}): ActivityEntry => ({ at: NOW - (index + 1) * 900_000, deltas: { xpEarned: 0, gold: 0, hp: 0 }, detail: { outcome, levelsGained: 0, heldFind: false }, ...patch })
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
  partial: { ...base, activity: { entries: Array.from({ length: MAX_RECAP_EVENTS }, (_, i) => activityEntry(fixtureFight, i, { at: NOW - (i + 1) * 60_000, deltas: { xpEarned: 999, gold: 999, hp: 0 } })), truncated: true } },
  fullBagRecap: { ...states.sleeping!, activity: { entries: [activityEntry(fixtureGear, 0, { detail: { outcome: fixtureGear, levelsGained: 0, heldFind: true } }), ...overnightEntries], truncated: false } },
  knockoutRecap: { ...states.dead!, activity: { entries: [activityEntry({ ...fixtureFight, outcome: 'death', goldGranted: 0, gearDropped: false }, 0), ...overnightEntries], truncated: false } },
  recoveredRecap: { ...base, activity: { entries: [activityEntry({ variant: 'revival', previousBiomeId: 'server_room', safeBiomeId: 'office_cubicles', hpGranted: 30, reviveAtTick: 119 }, 0), activityEntry({ ...fixtureFight, outcome: 'death', goldGranted: 0, gearDropped: false }, 8), ...overnightEntries], truncated: false } },
  arrivalRecap: { ...base, activity: { entries: [activityEntry({ variant: 'travel', phase: 'arrive', fromBiomeId: 'office_cubicles', toBiomeId: 'server_room', arrivalTick: 120 }, 0), ...overnightEntries], truncated: false } },
}
// Saturated histories prove layout capacity is measured instead of capped at three stories.
const denseLogs = (summary: string): PayloadInput['logs'] => Array.from({ length: 10 }, (_, i) => ({ at: NOW - (i + 1) * 900_000, kind: 'rest', summary, deltas: { xpEarned: 0, gold: 0, hp: 0 } }))
Object.assign(recapStates, {
  denseShort: { ...base, logs: denseLogs('Took a coffee break anyway.') },
  emptyHistory: { ...base, logs: [] },
  missingQr: { ...base, artBaseUrl: null, logs: denseLogs('Took a coffee break anyway.') },
  denseLong: { ...states.longText!, logs: denseLogs('Sent an elite [[Microwave Wraith]] back to the kitchen. Reached level 12! Found a [[Rare Ladle of Ruin]].') },
  longHero: { ...base, hero: hero({ name: 'W'.repeat(16) }), logs: denseLogs('Filed a [[Paper Imp]] under defeated.') },
  noMetadata: { ...base, logs: denseLogs('A quiet moment.').map(({ deltas: _deltas, ...entry }) => entry) },
  largeRanking: { ...base, logs: denseLogs('Filed a [[Paper Imp]] under defeated.'), ranking: { ...base.ranking!, rank: 12345, totalPlayers: 999999, top5: base.ranking!.top5.map(row => ({ ...row, score: 999999 })) } },
})
const sourceIndex = process.argv.indexOf('--recap-source')
if (sourceIndex >= 0) {
  const source = JSON.parse(readFileSync(process.argv[sourceIndex + 1]!, 'utf8')) as { now: number; entries: Array<ActivityEntry & { kind: string; summary: string }> }
  recapStates.recordedHistory = { ...base, logs: source.entries.slice(0, 10).map(log => ({ ...log, deltas: displayLogDeltas(log), at: log.at - source.now + NOW })), activity: { entries: source.entries.map(entry => ({ ...entry, at: entry.at - source.now + NOW })), truncated: source.entries.length > MAX_RECAP_EVENTS } }
}
const previewStates = process.argv.includes('--recap') ? { ...states, ...recapStates } : process.argv.includes('--no-effect') ? noEffectStates : process.argv.includes('--potion-finds') ? potionStates : process.argv.includes('--marketing') ? {
  sample: { ...base, ownerAlias: 'Steve', hero: hero({ name: 'Pip' }), ranking: { ...base.ranking!, top5: base.ranking!.top5.map(row => row.rank === 3 ? { ...row, name: 'Steve', hero_name: 'Pip' } : row) } },
} : states

mkdirSync('.previews', { recursive: true })
let written = 0
for (const [name, input] of Object.entries(previewStates)) {
  const withRecap = process.argv.includes('--recap') && !input.activity ? { ...input, activity: { entries: overnightEntries.map(entry => ({ ...entry, at: entry.at - NOW + input.now })), truncated: false } } : input
  const payload = sceneUrlsAt(buildPayload(withRecap), input.now, utcOffset)
  if (process.argv.includes('--recap')) writeFileSync(`.previews/${name}--payload.json`, JSON.stringify(payload, null, 2))
  for (const layout of Object.keys(PREVIEW_LAYOUTS) as PreviewLayout[]) {
    const inner = await liquid.parseAndRender(screenMarkup[layout], { ...payload, desk_keepsake_code: name === 'unlinked' || name === 'sample' ? null : deskKeepsakeCode, utc_offset: name === 'noMetadata' ? null : utcOffset })
    for (const device of Object.keys(PREVIEW_DEVICES) as PreviewDevice[]) {
      writeFileSync(`.previews/${name}--${device}--${layout}.html`, previewDocument(inner, device, layout, `${name} · ${device} · ${PREVIEW_LAYOUTS[layout].label}`))
      written++
    }
  }
}
console.log(`wrote ${written} previews to .previews/`)
