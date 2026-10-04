/**
 * Local TRMNL layout preview: renders the real templates with real payloads
 * (buildPayload) through Liquid inside the pinned framework 3.4.0 CSS/JS, one
 * HTML page per state with all four sizes. Screenshot the pages for the layout
 * matrix. This approximates TRMNL's renderer; real-device renders stay the
 * acceptance gate.  Usage: pnpm tsx tools/trmnl/preview.ts [artBaseUrl]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { Liquid } from 'liquidjs'
import { contentV2 } from '../../convex/content/v2'
import { buildPayload, type PayloadInput } from '../../convex/lib/payload'
import { screenMarkup } from '../../convex/templates/screen'

const artBaseUrl = process.argv[2] ?? 'https://superb-bobcat-74.convex.site'
const NOW = Date.UTC(2026, 9, 4, 8, 20)
const liquid = new Liquid()

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
    { at: NOW - 52 * 60_000, kind: 'combat', summary: 'Rebooted a Blinking Router. +11 XP, +4 gold.' },
    { at: NOW - 67 * 60_000, kind: 'loot', summary: 'Found 22 gold under a raised floor tile.' },
    { at: NOW - 82 * 60_000, kind: 'combat', summary: 'Untangled a Patch Cable Knot. +9 XP.' },
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
  elite: { ...base, latestEvent: { kind: 'combat', outcome: { variant: 'combat', monsterId: 'legacy_mainframe', elite: true } }, logs: [{ at: NOW - 7 * 60_000, kind: 'combat', summary: 'An elite Legacy Mainframe went offline! +64 XP, +15 gold.' }, ...base.logs] },
  dead: { ...base, hero: hero({ status: 'dead', hp: 0, reviveAtTick: 125 }), latestEvent: { kind: 'death', outcome: { variant: 'combat', monsterId: 'firewall_gremlin', elite: false } }, logs: [{ at: NOW - 7 * 60_000, kind: 'death', summary: 'Fell to a Firewall Gremlin. Revives in the Office in 8 ticks. Lost 64 gold.' }, ...base.logs] },
  travelling: { ...base, hero: hero({ status: 'travelling', targetBiomeId: 'cafeteria_depths', arriveAtTick: 121 }), latestEvent: { kind: 'system' } },
  sleeping: { ...base, hero: hero({ status: 'sleeping' }), heldItemName: 'Rare Spork Halberd', bagUsed: 30, latestEvent: { kind: 'loot', outcome: { variant: 'loot', found: 'gear' } }, logs: [{ at: NOW - 7 * 60_000, kind: 'loot', summary: 'Found a Rare Spork Halberd. Bag full: find held, taking a break.' }, ...base.logs] },
  paused: { ...base, hero: hero({ status: 'paused' }), ranking: { ...base.ranking!, rank: null, rankDelta: null, status: 'dormant', score: null } },
  quarantined: { ...base, hero: hero({ quarantined: true }) },
  stale: { ...base, world: { ...base.world!, lastCompletedAt: NOW - 3 * 3_600_000 } },
  longText: {
    ...base,
    hero: hero({ name: 'Sir Staplington' }),
    ownerAlias: 'A_Very_Long_Alias__',
    logs: [{ at: NOW - 7 * 60_000, kind: 'combat', summary: 'An elite Microwave Wraith was served justice! +188 XP, +57 gold. Reached level 12! Found a Rare Ladle of Ruin.' }, ...base.logs],
  },
  unlinked: { ...base, hero: null, ranking: null, logs: [], latestEvent: null },
}

/** OG (800x480, 1-bit) and X (1040x780 logical, 4-bit) screen classes from framework 3.4. */
const DEVICES = [
  { key: 'og', classes: 'screen screen--og screen--md screen--1bit screen--landscape' },
  { key: 'x', classes: 'screen screen--v2 screen--lg screen--4bit screen--landscape' },
] as const

const SIZES = [
  { key: 'markup', wrapper: (inner: string) => `<div class="view view--full">${inner}</div>`, label: 'Full' },
  { key: 'markup_half_horizontal', wrapper: (inner: string) => `<div class="mashup mashup--1Tx1B"><div class="view view--half_horizontal">${inner}</div><div class="view view--half_horizontal"></div></div>`, label: 'Half horizontal' },
  { key: 'markup_half_vertical', wrapper: (inner: string) => `<div class="mashup mashup--1Lx1R"><div class="view view--half_vertical">${inner}</div><div class="view view--half_vertical"></div></div>`, label: 'Half vertical' },
  { key: 'markup_quadrant', wrapper: (inner: string) => `<div class="mashup mashup--2x2"><div class="view view--quadrant">${inner}</div><div class="view view--quadrant"></div><div class="view view--quadrant"></div><div class="view view--quadrant"></div></div>`, label: 'Quadrant' },
] as const

mkdirSync('.previews', { recursive: true })
let written = 0
for (const [name, input] of Object.entries(states)) {
  const payload = buildPayload(input) as unknown as Record<string, unknown>
  for (const size of SIZES) {
    const inner = await liquid.parseAndRender(screenMarkup[size.key], payload)
    for (const device of DEVICES) {
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${name} · ${device.key} · ${size.label}</title>
<link rel="stylesheet" href="https://trmnl.com/css/3.4.0/plugins.css"><script src="https://trmnl.com/js/3.4.0/plugins.js"></script>
</head><body class="environment trmnl"><div class="${device.classes}">${size.wrapper(inner)}</div></body></html>`
      writeFileSync(`.previews/${name}--${device.key}--${size.key}.html`, html)
      written++
    }
  }
}
console.log(`wrote ${written} previews to .previews/`)
