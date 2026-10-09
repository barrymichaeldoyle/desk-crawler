import { contentV1 } from '../content/v1'
import type { SlowCastPayloadInput, PayloadAngler, PayloadStory } from '../lib/payload'

/**
 * Device states for the layout matrix (slow-cast.md "Device"): every status, the attention lines, the longest text
 * and each water. Shared by the local preview tool and its tests.
 */
export const PREVIEW_NOW = Date.UTC(2026, 10, 2, 17, 50)
const minutes = (n: number) => PREVIEW_NOW - n * 60_000

const angler: PayloadAngler = {
  alias: 'Barry',
  activationState: 'active',
  status: 'fishing',
  quarantined: false,
  level: 6,
  xp: 312,
  gold: 1240,
  waterId: 'river_bend',
  rodTier: 2,
  coolerTier: 3,
  baitOnHook: 'maggots',
  bait: { maggots: 34, worms: 12 },
  speciesLogged: 14,
}

const stories: PayloadStory[] = [
  { kind: 'catch', summary: 'A 1.9 kg Barbel took the maggots at dusk. A new personal best.', at: minutes(5), speciesId: 'barbel', grams: 1900 },
  { kind: 'ambient', summary: 'A kingfisher flashes past, low and blue.', at: minutes(65) },
  { kind: 'catch', summary: 'A 410 g Chub took the maggots in the day.', at: minutes(140), speciesId: 'chub', grams: 410 },
  { kind: 'got_away', summary: 'Something heavy took the maggots and kept going.', at: minutes(200) },
  { kind: 'catch', summary: 'A 230 g Dace took the maggots in the day.', at: minutes(260), speciesId: 'dace', grams: 230 },
]

const base: SlowCastPayloadInput = {
  content: contentV1,
  now: PREVIEW_NOW,
  world: { createdAt: PREVIEW_NOW - 86_400_000, lastCompletedAt: PREVIEW_NOW - 4 * 60_000, paused: false },
  angler,
  coolerUsed: 7,
  weather: 'overcast',
  band: 'dusk',
  stories,
  artBaseUrl: 'https://local-art.invalid',
  board: {
    rank: 3,
    cohortLabel: 'Levels 4-7',
    totalPlayers: 41,
    top: [
      { rank: 1, name: 'Quillfeather_Longname', level: 7, score: 2410, own: false },
      { rank: 2, name: 'Mo', level: 7, score: 2104, own: false },
      { rank: 3, name: 'Barry', level: 6, score: 1980, own: true },
      { rank: 4, name: 'Hidden player', level: 5, score: 1702, own: false },
      { rank: 5, name: 'Bea', level: 6, score: 1660, own: false },
    ],
  },
}

export function previewScenarios(artBaseUrl: string): Record<string, SlowCastPayloadInput> {
  const b = { ...base, artBaseUrl }
  return {
    catch: b,
    waiting: { ...b, stories: [{ kind: 'ambient', summary: 'The float trots down the crease.', at: minutes(3) }, ...stories.slice(1)] },
    gotAway: { ...b, stories: [stories[3]!, ...stories.slice(0, 3)] },
    coolerFull: { ...b, coolerUsed: 18, stories: [{ kind: 'release', summary: 'Cooler full. A 1.2 kg Chub goes back.', at: minutes(4), speciesId: 'chub', grams: 1200 }, ...stories] },
    bareHook: { ...b, angler: { ...angler, bait: { maggots: 0, worms: 12 } } },
    paused: { ...b, angler: { ...angler, status: 'paused' } },
    travelling: { ...b, angler: { ...angler, travelTo: 'harbour_pier' }, stories: [{ kind: 'system', summary: 'Packing up for the Harbour Pier.', at: minutes(2) }, ...stories] },
    pier: { ...b, angler: { ...angler, level: 11, waterId: 'harbour_pier', rodTier: 4, coolerTier: 4, baitOnHook: 'strip', bait: { strip: 48 }, gold: 18450, speciesLogged: 26 }, coolerUsed: 23, band: 'night', weather: 'fog', stories: [{ kind: 'catch', summary: 'An 8.4 kg Thornback Ray took the mackerel strip in the dark. First Thornback Ray in the logbook.', at: minutes(6), speciesId: 'thornback_ray', grams: 8400 }, ...stories] },
    millpondDawn: { ...b, angler: { ...angler, level: 1, xp: 12, gold: 0, waterId: 'millpond', rodTier: 1, coolerTier: 1, baitOnHook: 'worms', bait: { worms: 11 }, speciesLogged: 1 }, coolerUsed: 1, band: 'dawn', weather: 'clear', stories: [{ kind: 'catch', summary: 'A 140 g Roach took the worm at first light. First Roach in the logbook.', at: minutes(1), speciesId: 'roach', grams: 140 }, { kind: 'system', summary: 'You set up on the bank of the Millpond.', at: minutes(30) }] },
    outsideTop: { ...b, board: { ...b.board!, rank: 19, top: b.board!.top.map((row) => ({ ...row, own: false })) } },
    unranked: { ...b, board: { ...b.board!, rank: null, top: b.board!.top.map((row) => ({ ...row, own: false })) } },
    longText: { ...b, angler: { ...angler, alias: 'WWWWWWWWWWWWWWWWWWWW', level: 20, gold: 999999, coolerTier: 4, speciesLogged: 30 }, coolerUsed: 23, stories: stories.map((s) => ({ ...s, summary: 'An 18.0 kg Conger Eel took the mackerel strip in the dark. A new personal best.' })) },
    stale: { ...b, world: { ...b.world!, lastCompletedAt: PREVIEW_NOW - 90 * 60_000 } },
    servicePaused: { ...b, world: { ...b.world!, paused: true } },
    pending: { ...b, angler: { ...angler, activationState: 'pending_trmnl' }, stories: [] },
    unlinked: { ...b, angler: null, stories: [] },
  }
}
