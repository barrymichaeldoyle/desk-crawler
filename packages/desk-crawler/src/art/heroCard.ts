import { zlibSync } from 'fflate'
import { drawText, FONT_HEIGHT, textWidth } from './font'
import { encodePngIndexedFromIdat } from './png'
import { parseScenePath } from './route'
import { STAGE_HEIGHT, STAGE_WIDTH, type BiomeArt } from './scene'
import { paintedScene } from './sceneColour'

/**
 * The social card for a public hero page (D109): 1200x630, drawn as pixel art at one sixth of that and scaled up.
 * The hero's painted scene on its biome's bands, then the hero name, level and all-time rank, whose hero it is and
 * the game. Only what the public page already shows; the caller checks the hero is public.
 */
export interface HeroCard {
  readonly heroName: string
  readonly alias: string
  readonly level: number
  readonly rank: { readonly rank: number; readonly totalPlayers: number } | null
  /** The public page's scene path (`/art/scene/v…/…png`). */
  readonly scenePath: string
}

export const CARD_WIDTH = 1200
export const CARD_HEIGHT = 630
const SCALE = 6
const W = CARD_WIDTH / SCALE
const H = CARD_HEIGHT / SCALE

/** The site's colours (apps/web/src/styles.css). */
const NIGHT = '#0c0a1c'
const PANEL = '#221d44'
const CREAM = '#f4f1ff'
const GOLD = '#ffd166'
const MUTED = '#b7aee0'

/** The companion's biome bands behind the stage (ceiling, upper wall, wall, floor; apps/web/src/lib/palette.ts). */
const BANDS: Record<BiomeArt, readonly [string, string, string, string]> = {
  office_cubicles: ['#e7b96f', '#f3d394', '#fbe9c2', '#c98f5a'],
  server_room: ['#5d8fd6', '#78a9e4', '#9fd0f0', '#ffd166'],
  cafeteria_depths: ['#f08a6b', '#f9b394', '#ffd9c2', '#d9534f'],
}
/** Band rows on the 40-row stage, at the companion's 18 / 14 / 40 / 28% split. */
const band = (y: number) => (y < 7 ? 0 : y < 13 ? 1 : y < 29 ? 2 : 3)

const ordinalRank = (rank: HeroCard['rank']) => (rank ? ` · #${rank.rank} OF ${rank.totalPlayers}` : '')

/** The card as a PNG, or null when the scene path is not one the art route knows. */
export function renderHeroCardPng(card: HeroCard): Uint8Array | null {
  const scene = parseScenePath(card.scenePath.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, ''))
  if (!scene) return null
  const colours = new Map<string, number>()
  const indexOf = (hex: string) => {
    if (!colours.has(hex)) colours.set(hex, colours.size)
    return colours.get(hex)!
  }
  const grid = new Uint8Array(W * H).fill(indexOf(NIGHT))
  const put = (x: number, y: number, hex: string) => {
    if (x >= 0 && y >= 0 && x < W && y < H) grid[y * W + x] = indexOf(hex)
  }

  // The stage, centred near the top in a one-cell panel frame.
  const left = (W - STAGE_WIDTH) / 2
  const top = 7
  for (let x = left - 1; x <= left + STAGE_WIDTH; x += 1) for (const y of [top - 1, top + STAGE_HEIGHT]) put(x, y, PANEL)
  for (let y = top - 1; y <= top + STAGE_HEIGHT; y += 1) for (const x of [left - 1, left + STAGE_WIDTH]) put(x, y, PANEL)
  const painted = paintedScene(scene.biome, scene.pose, scene.subject, scene.time)
  const bands = BANDS[scene.biome]
  painted.forEach((row, y) => row.forEach((colour, x) => put(left + x, top + y, colour ?? bands[band(y)])))

  // The words: the hero name large (smaller when long), then level and rank, whose hero, and the game.
  const text = (value: string, y: number, scale: number, hex: string) => drawText(value, Math.floor((W - textWidth(value, scale)) / 2), y, scale, (x, py) => put(x, py, hex))
  const name = card.heroName.toUpperCase()
  const nameScale = textWidth(name, 2) <= W - 12 ? 2 : 1
  const nameTop = top + STAGE_HEIGHT + 6
  text(name, nameTop + (nameScale === 2 ? 0 : FONT_HEIGHT / 2), nameScale, CREAM)
  const linesTop = nameTop + FONT_HEIGHT * 2 + 5
  text(`LEVEL ${card.level}${ordinalRank(card.rank)}`, linesTop, 1, GOLD)
  text(`${card.alias.toUpperCase()}'S HERO`, linesTop + FONT_HEIGHT + 4, 1, MUTED)
  text('DESK CRAWLER ON TRMNL', linesTop + (FONT_HEIGHT + 4) * 2, 1, CREAM)

  // Scale each cell to 6x6 pixels in an 8-bit indexed PNG; scaled pixel art compresses to a few kilobytes.
  const rowBytes = CARD_WIDTH + 1
  const raw = new Uint8Array(rowBytes * CARD_HEIGHT)
  for (let y = 0; y < CARD_HEIGHT; y += 1) {
    const source = Math.floor(y / SCALE) * W
    for (let x = 0; x < CARD_WIDTH; x += 1) raw[y * rowBytes + 1 + x] = grid[source + Math.floor(x / SCALE)]!
  }
  const palette = [...colours.keys()].map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)))
  return encodePngIndexedFromIdat(CARD_WIDTH, CARD_HEIGHT, palette, zlibSync(raw, { level: 9 }))
}
