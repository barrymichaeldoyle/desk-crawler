import { Canvas, inked, type Sprite } from './canvas'
import type { HeroPose } from './hero'
import type { monsterArt } from './monsters'
import { encodePngIndexed } from './png'
import type { PropId } from './props'
import { parseScenePath } from './route'
import { composeScene, scenePlacements, STAGE_HEIGHT, STAGE_WIDTH, type BiomeArt, type Placement, type Subject } from './scene'
import type { SceneTime } from './sceneTime'

/**
 * One flat fill per sprite (D87), which the four-ink panels reduce to red, yellow or paper (D94). Each sprite fills
 * everything its outline encloses (a 4-connected flood from its edge through transparent cells marks the outside), so
 * open-bodied monsters read as solid creatures rather than showing the backdrop through. The hero page paints the
 * whole stage instead (`paintedSceneUri`, D96).
 */
const HERO = { skin: '#f2c39b', steel: '#c9d3e0', cardigan: '#e0604f' }
const CLOAK = '#7a5cc8'
const CROWN = '#f2c14e'

const MONSTER: Record<keyof typeof monsterArt, string> = {
  paper_imp: '#e9dfc0',
  rogue_roomba: '#8a8fa3',
  stapler_mimic: '#d4473f',
  dust_daemon: '#9c8f7a',
  cable_serpent: '#5fb35a',
  overheated_rack: '#e8743b',
  firewall_gremlin: '#f0a03a',
  legacy_mainframe: '#c9b88f',
  coffee_slime: '#8a5a3c',
  crumb_golem: '#d9a75e',
  microwave_wraith: '#9fd8e0',
  leftovers_hydra: '#7fae4a',
}

const PROP: Record<PropId, string> = {
  chest: '#b5793f',
  gold: '#f2c14e',
  potion: '#e0505a',
  gear: '#a9b4c6',
  trap: '#9a9a9a',
  campfire: '#f08a3b',
  level_up: '#f2c14e',
  full_bag: '#b5793f',
  signpost: '#b5793f',
}

/** The hero's white cells are skin, except the blade, which each pose holds in a different place. */
const HERO_STEEL: Record<HeroPose, (x: number, y: number) => boolean> = {
  idle: (x) => x >= 17,
  fight: (x) => x >= 17,
  walk: (x) => x >= 17,
  rest: () => false,
  sleep: () => false,
  knocked_out: (_x, y) => y >= 13,
}

/** Cells a sprite's outline encloses: not reachable from outside its box through transparent cells. */
function enclosed(rows: readonly string[], width: number): boolean[][] {
  const height = rows.length
  const outside = rows.map(() => new Array<boolean>(width).fill(false))
  const queue: Array<[number, number]> = []
  const visit = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height || outside[y]![x] || rows[y]![x] !== ' ') return
    outside[y]![x] = true
    queue.push([x, y])
  }
  for (let x = 0; x < width; x += 1) (visit(x, 0), visit(x, height - 1))
  for (let y = 0; y < height; y += 1) (visit(0, y), visit(width - 1, y))
  while (queue.length > 0) {
    const [x, y] = queue.pop()!
    visit(x + 1, y), visit(x - 1, y), visit(x, y + 1), visit(x, y - 1)
  }
  return outside.map((row) => row.map((out) => !out))
}

function fillFor(placement: Placement, pose: HeroPose): (ch: string, x: number, y: number) => string {
  switch (placement.role) {
    case 'hero':
      return (ch, x, y) => (ch === 'w' ? (HERO_STEEL[pose](x, y) ? HERO.steel : HERO.skin) : HERO.cardigan)
    case 'cloak':
      return () => CLOAK
    case 'crown':
      return () => CROWN
    // Monsters and props draw their bodies in white, so the body colour fills them whole; their shading stays in the art.
    case 'monster':
      return () => MONSTER[placement.id]
    case 'prop':
      return () => PROP[placement.id]
  }
}

/** The colour layer as stage-sized rows of colours (null for no fill), later sprites over earlier ones like the art. */
export function sceneColours(pose: HeroPose, placements: readonly Placement[]): Array<Array<string | null>> {
  const grid = Array.from({ length: STAGE_HEIGHT }, () => new Array<string | null>(STAGE_WIDTH).fill(null))
  for (const placement of placements) {
    const { sprite, left, top } = placement
    const inside = enclosed(sprite.rows, sprite.width)
    const fill = fillFor(placement, pose)
    sprite.rows.forEach((row, dy) =>
      [...row].forEach((ch, dx) => {
        const x = left + dx
        const y = top + dy
        if (inside[dy]![dx] && x >= 0 && y >= 0 && x < STAGE_WIDTH && y < STAGE_HEIGHT) grid[y]![x] = fill(ch, dx, dy)
      }),
    )
  }
  return grid
}

/** The four-ink panels' palette (D94), in index order: ink, paper, red, yellow. */
export const BWRY_PALETTE = [[0, 0, 0], [255, 255, 255], [255, 0, 0], [255, 255, 0]] as const
export const BwryInk = { Black: 0, White: 1, Red: 2, Yellow: 3 } as const
export type BwryInk = (typeof BwryInk)[keyof typeof BwryInk]

/**
 * A companion fill reduced to a four-ink panel (D94): pale and grey fills (skin, paper, steel) stay paper, so the ink
 * outlines carry them; warm golds, ambers and greens print yellow; reds, browns and purples print red; blues stay paper.
 */
export function bwryInk(hex: string): BwryInk {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === 0 || (max - min) / max < 0.4) return BwryInk.White
  const d = max - min
  const hue = (max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60
  if (hue >= 30 && hue < 170) return BwryInk.Yellow
  if (hue >= 170 && hue < 250) return BwryInk.White
  return BwryInk.Red
}

// ---------------------------------------------------------------- the companion's painted scene (D96)

/**
 * How a region paints: its outline ink, its paper and its shade. A shade paints two close tones on the art's checker
 * (dark where the device inks, light where it leaves paper), so shading reads as texture rather than black noise.
 * Missing paper is clear, so the biome bands show through.
 */
type Tones = { readonly ink?: string; readonly paper?: string; readonly shade?: readonly [string, string] }

/** Foreground ink: the hero, their foe and props outline in the page's night rather than flat black. */
const INK = '#1b1530'

const OFFICE: Record<string, Tones> = {
  frame: { ink: '#8a5a3c' },
  sky: { paper: '#a8d8f0' },
  sun: { ink: '#f0a03a', paper: '#ffe08f' },
  cloud: { ink: '#9cc0e0', paper: '#ffffff' },
  partition: { ink: '#5c6b80', shade: ['#8e9db3', '#a3b1c6'] },
  monitor: { ink: '#3b3f4a', paper: '#d9dde3', shade: ['#3f8fb0', '#6fc0dd'] },
  leaves: { ink: '#2f6b3a', paper: '#6fbf5e' },
  pot: { ink: '#7a3b22', shade: ['#b5562f', '#d9743f'] },
  lamp: { ink: '#6b5a48', shade: ['#fff3c4', '#ffe08f'] },
  ground: { ink: '#6b4a33' },
}
const OFFICE_NIGHT: Record<string, Tones> = { ...OFFICE, sky: { paper: '#2b3266' }, moon: { ink: '#f4e7b0', paper: '#2b3266' }, star: { ink: '#ffe08f' } }

const BACKDROP: Record<BiomeArt, Record<SceneTime, Record<string, Tones>>> = {
  office_cubicles: { day: OFFICE, night: OFFICE_NIGHT },
  server_room: (() => {
    const tones: Record<string, Tones> = {
      rack: { ink: '#2b3550', paper: '#c9d3e0' },
      slot: { ink: '#5a6680' },
      led: { ink: '#2fbf6f' },
      'led-amber': { ink: '#f0a03a' },
      cable: { ink: '#3a3f5c' },
      tile: { shade: ['#c99a2e', '#e6b84f'] },
      ground: { ink: '#8a6a1f' },
    }
    return { day: tones, night: tones }
  })(),
  cafeteria_depths: (() => {
    const tones: Record<string, Tones> = {
      arch: { ink: '#8a4a3a' },
      torch: { ink: '#5a3a2a', paper: '#ffd166' },
      brick: { ink: '#d98a6e' },
      counter: { ink: '#6b3a2a', shade: ['#9c5a3f', '#b8714f'] },
      pot: { ink: '#3b3f4a', shade: ['#6f7787', '#8a93a3'] },
      steam: { ink: '#ffffff' },
      ground: { ink: '#7a2e2a' },
    }
    return { day: tones, night: tones }
  })(),
}

const FOE: Record<string, Tones> = {
  'monster:paper_imp': { paper: '#fbf6e6', shade: ['#b8a878', '#e9dfc0'] },
  'monster:rogue_roomba': { paper: '#c9ced9', shade: ['#4f5466', '#6c7287'] },
  'monster:stapler_mimic': { paper: '#d0d6de', shade: ['#a8302b', '#d4473f'] },
  'monster:dust_daemon': { paper: '#f4ede0', shade: ['#7a6f5e', '#9c8f7a'] },
  'monster:cable_serpent': { paper: '#7fd17a' },
  'monster:overheated_rack': { paper: '#f2a65a', shade: ['#c0392b', '#e8743b'] },
  'monster:firewall_gremlin': { paper: '#f0a03a' },
  'monster:legacy_mainframe': { paper: '#d9cba0', shade: ['#8a7a55', '#c9b88f'] },
  'monster:coffee_slime': { paper: '#e6c9a8', shade: ['#5a3a24', '#8a5a3c'] },
  'monster:crumb_golem': { paper: '#fff3d6', shade: ['#b07a3a', '#e0b46e'] },
  'monster:microwave_wraith': { paper: '#e6eaef', shade: ['#4fa8b8', '#9fd8e0'] },
  'monster:leftovers_hydra': { paper: '#9fcf6a', shade: ['#5d8a35', '#7fae4a'] },
  'prop:chest': { paper: '#d9a066', shade: ['#8a5a2c', '#b5793f'] },
  'prop:gold': { paper: '#f2c14e' },
  'prop:potion': { paper: '#e6eef5', shade: ['#b8303a', '#e0505a'] },
  'prop:gear': { paper: '#c9d3e0', shade: ['#6f7b8f', '#a9b4c6'] },
  'prop:trap': { paper: '#d0d6de', shade: ['#5a5a5a', '#8a8a8a'] },
  'prop:campfire': { paper: '#ffd166', shade: ['#e0503a', '#f08a3b'] },
  'prop:level_up': { paper: '#ffd166' },
  'prop:full_bag': { paper: '#ffd166', shade: ['#8a5a2c', '#b5793f'] },
  'prop:signpost': { paper: '#d9a066' },
  cloak: { ink: '#2e2160', shade: ['#6750b8', '#7a5cc8'] },
  crown: { ink: '#8a5a00', paper: '#ffd166' },
}

const WARRIOR = {
  hair: '#5a3a24',
  skin: '#f2c39b',
  shirt: '#f4f1ff',
  steel: '#c9d3e0',
  trousers: '#2f3a5c',
  bench: '#7a4f2e',
  cardigan: ['#c94f42', '#e0604f'],
  blanket: ['#3f6fb0', '#5d8fd6'],
} as const

/** Rows the face drops by when the hero sits; the standing poses' hair, shirt and legs rules then hold. */
const SITTING_DROP: Partial<Record<HeroPose, number>> = { idle: 0, fight: 0, walk: 0, rest: 5 }

/** The warrior's parts, by where they sit in each pose's grid (hero.ts): the art draws them all in the same few inks. */
function warriorTone(pose: HeroPose, ch: string, x: number, y: number, height: number): string {
  const drop = SITTING_DROP[pose]
  const shade = ch === ':' || ch === '.' || ch === '='
  if (drop === undefined) {
    // Lying down: the head is on the left, the body or blanket to its right and, knocked out, the blade below.
    const hairRow = pose === 'sleep' ? 8 : 6
    if (shade) return (pose === 'sleep' ? WARRIOR.blanket : WARRIOR.cardigan)[inked(ch, x, y) ? 0 : 1]
    if (ch === '#') return y === hairRow ? WARRIOR.hair : INK
    if (pose === 'knocked_out' && y >= 13) return WARRIOR.steel
    return x >= 9 ? WARRIOR.shirt : WARRIOR.skin
  }
  const row = y - drop
  if (shade) return WARRIOR.cardigan[inked(ch, x, y) ? 0 : 1]
  if (ch === '#') {
    if (x < 17 && (row <= 2 || (row <= 4 && x <= 8) || (row === 3 && x >= 14))) return WARRIOR.hair
    if (pose === 'rest' && y >= height - 3) return WARRIOR.bench
    if (pose !== 'rest' && row >= 18 && y < height - 2 && x < 17) return WARRIOR.trousers
    return INK
  }
  if (pose !== 'walk' && x >= 17 && row <= 13) return WARRIOR.steel
  return row >= 9 && x >= 8 && x <= 13 ? WARRIOR.shirt : WARRIOR.skin
}

/** A canvas that also notes, per cell, the region and grid character last painted there; sprite interiors count as paper. */
class PaintedCanvas extends Canvas {
  readonly regions: string[] = new Array<string>(STAGE_WIDTH * STAGE_HEIGHT).fill('')
  readonly chars: string[] = new Array<string>(STAGE_WIDTH * STAGE_HEIGHT).fill('')

  constructor() {
    super(STAGE_WIDTH, STAGE_HEIGHT)
  }

  private note(x: number, y: number, ch: string): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
    this.regions[y * this.width + x] = this.region
    this.chars[y * this.width + x] = ch
  }

  override paint(x: number, y: number, ch: string): void {
    if (inked(ch, x, y) === null) return
    super.paint(x, y, ch)
    this.note(x, y, ch)
  }

  override draw(s: Sprite, left: number, top: number): void {
    super.draw(s, left, top)
    const inside = enclosed(s.rows, s.width)
    s.rows.forEach((row, dy) => [...row].forEach((ch, dx) => { if (ch === ' ' && inside[dy]![dx]) this.note(left + dx, top + dy, 'w') }))
  }
}

/** The stage in full colour as rows of colours (null for clear), painted from the same composition as the device image. */
export function paintedScene(biome: BiomeArt, pose: HeroPose, subject: Subject, time: SceneTime): Array<Array<string | null>> {
  const c = new PaintedCanvas()
  composeScene(biome, pose, subject, time, c)
  const hero = scenePlacements(pose, subject).find((p) => p.role === 'hero')
  const backdrop = BACKDROP[biome][time]
  return Array.from({ length: STAGE_HEIGHT }, (_, y) =>
    Array.from({ length: STAGE_WIDTH }, (_, x) => {
      const ch = c.chars[y * STAGE_WIDTH + x]!
      const region = c.regions[y * STAGE_WIDTH + x]!
      if (!ch || region === 'halo') return null
      if (region === 'hero' && hero) return warriorTone(pose, ch, x - hero.left, y - hero.top, hero.sprite.height)
      const foe = FOE[region]
      const tones = foe ?? backdrop[region] ?? {}
      const fallbackInk = foe ? INK : '#5a4a3a'
      if (ch === '#') return tones.ink ?? fallbackInk
      if (ch === 'w') return tones.paper ?? null
      const black = inked(ch, x, y)
      if (tones.shade) return tones.shade[black ? 0 : 1]
      return black ? (tones.ink ?? fallbackInk) : (tones.paper ?? null)
    }),
  )
}

/** The companion's scene for an image path as a stage-sized PNG data URI, or null for an unknown path. */
export function paintedSceneUri(path: string): string | null {
  const parsed = parseScenePath(path.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, ''))
  if (!parsed) return null
  const grid = paintedScene(parsed.biome, parsed.pose, parsed.subject, parsed.time)
  const colours = new Map<string, number>([['', 0]])
  const index = new Uint8Array(STAGE_WIDTH * STAGE_HEIGHT)
  grid.forEach((row, y) =>
    row.forEach((colour, x) => {
      const key = colour ?? ''
      if (!colours.has(key)) colours.set(key, colours.size)
      index[y * STAGE_WIDTH + x] = colours.get(key)!
    }),
  )
  const palette = [...colours.keys()].map((hex) => (hex ? ([1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]) : ([0, 0, 0] as const)))
  const png = encodePngIndexed(STAGE_WIDTH, STAGE_HEIGHT, index, palette, 0)
  let binary = ''
  for (const byte of png) binary += String.fromCharCode(byte)
  return `data:image/png;base64,${btoa(binary)}`
}
