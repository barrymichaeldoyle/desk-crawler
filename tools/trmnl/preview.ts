/**
 * Local TRMNL layout preview: renders the real templates with real payloads
 * (buildPayload) through Liquid inside the pinned framework 3.4.0 CSS/JS, one
 * HTML page per state with all four sizes. Screenshot the pages for the layout
 * matrix. This approximates TRMNL's renderer; real-device renders stay the
 * acceptance gate.  Usage: pnpm tsx tools/trmnl/preview.ts [artBaseUrl]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { Liquid } from 'liquidjs'
import { contentV2 } from '@trmnl-games/desk-crawler/content/v2'
import { buildPayload, type PayloadInput } from '@trmnl-games/desk-crawler/payload'
import { screenMarkup } from '@trmnl-games/desk-crawler/templates/screen'
import { PREVIEW_DEVICES, PREVIEW_LAYOUTS, previewDocument, type PreviewDevice, type PreviewLayout } from '@trmnl-games/desk-crawler/templates/preview'

const artBaseUrl = process.argv[2] ?? 'https://superb-bobcat-74.convex.site'
const NOW = Date.UTC(2026, 9, 4, 8, 20)
/** TRMNL renders Liquid in UTC; the sample owner is in Johannesburg (UTC+2). */
const liquid = new Liquid({ timezoneOffset: 0 })
/** The screen route adds `utc_offset` from TRMNL's request; markup gets no `trmnl` object, so the preview passes none. */
const utcOffset = 2 * 3600

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
    { at: NOW - 7 * 60_000, kind: 'combat', summary: 'Unplugged a Cable Serpent. +14 XP, +5 gold.' },
    { at: NOW - 22 * 60_000, kind: 'loot', summary: 'Found a Rare Keyboard Mace.' },
    { at: NOW - 37 * 60_000, kind: 'rest', summary: 'Cooled off by the air conditioning. +30 HP.' },
    { at: NOW - 52 * 60_000, kind: 'combat', summary: 'Rebooted an Overheated Rack. +11 XP, +4 gold.' },
    { at: NOW - 67 * 60_000, kind: 'loot', summary: 'Found 22 gold under a raised floor tile.' },
    { at: NOW - 82 * 60_000, kind: 'combat', summary: 'Unplugged a Cable Serpent. +9 XP, +3 gold.' },
  ],
  instanceName: 'Desk Crawler',
  content: contentV2,
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
const states: Record<string, PayloadInput> = {
  normal: base,
  elite: { ...base, latestEvent: { kind: 'combat', outcome: { variant: 'combat', monsterId: 'legacy_mainframe', elite: true } }, logs: [{ at: NOW - 7 * 60_000, kind: 'combat', summary: 'An elite Legacy Mainframe went offline for good. +64 XP, +15 gold.' }, ...base.logs] },
  dead: { ...base, hero: hero({ status: 'dead', hp: 0, reviveAtTick: 125 }), latestEvent: { kind: 'death', outcome: { variant: 'combat', monsterId: 'firewall_gremlin', elite: false } }, logs: [{ at: NOW - 7 * 60_000, kind: 'death', summary: 'Fell to a Firewall Gremlin. Revives in the Office in 8 ticks. Lost 64 gold.' }, ...base.logs] },
  travelling: { ...base, hero: hero({ status: 'travelling', targetBiomeId: 'cafeteria_depths', arriveAtTick: 121 }), latestEvent: { kind: 'system' } },
  sleeping: { ...base, hero: hero({ status: 'sleeping' }), heldItemName: 'Rare Spork Halberd', bagUsed: 30, latestEvent: { kind: 'loot', outcome: { variant: 'loot', found: 'gear' } }, logs: [{ at: NOW - 7 * 60_000, kind: 'loot', summary: 'Found a Rare Spork Halberd. Bag full. Holding it until you make room.' }, ...base.logs] },
  paused: { ...base, hero: hero({ status: 'paused' }), ranking: { ...base.ranking!, rank: null, rankDelta: null, status: 'dormant', score: null } },
  quarantined: { ...base, hero: hero({ quarantined: true }) },
  stale: { ...base, world: { ...base.world!, lastCompletedAt: NOW - 3 * 3_600_000 } },
  longText: {
    ...base,
    hero: hero({ name: 'Sir Staplington' }),
    ownerAlias: 'A_Very_Long_Alias__',
    // Widest case for the unclamped rank rows: a 20-character public name with a five-digit score.
    ranking: { ...base.ranking!, rank: 1, score: 12840, top5: [{ rank: 1, name: 'Maximilian_Wolfgangs', hero_name: 'Sir Staplington', level: 12, score: 12840 }, ...base.ranking!.top5.slice(1)] },
    logs: [{ at: NOW - 7 * 60_000, kind: 'combat', summary: 'Sent an elite Microwave Wraith back to the kitchen. +188 XP, +57 gold. Reached level 12! Found a Rare Ladle of Ruin.' }, ...base.logs],
  },
  unlinked: { ...base, hero: null, ranking: null, logs: [], latestEvent: null },
  firstRun: { ...base, hero: hero({ level: 1, xp: 0, hp: 60, gold: 0, biomeId: 'office_cubicles', lastTick: 0 }), logs: [], latestEvent: null, ranking: { ...base.ranking!, rank: null, rankDelta: null, status: 'awaiting', score: null, top5: [] } },
}

mkdirSync('.previews', { recursive: true })
let written = 0
for (const [name, input] of Object.entries(states)) {
  const payload = buildPayload(input) as unknown as Record<string, unknown>
  for (const layout of Object.keys(PREVIEW_LAYOUTS) as PreviewLayout[]) {
    const inner = await liquid.parseAndRender(screenMarkup[layout], { ...payload, utc_offset: utcOffset })
    for (const device of Object.keys(PREVIEW_DEVICES) as PreviewDevice[]) {
      writeFileSync(`.previews/${name}--${device}--${layout}.html`, previewDocument(inner, device, layout, `${name} · ${device} · ${PREVIEW_LAYOUTS[layout].label}`))
      written++
    }
  }
}
console.log(`wrote ${written} previews to .previews/`)
