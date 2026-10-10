/**
 * The games' colour app icons (2026-10-10): 64x64 pixel art, drawn in the companion's palette with a one-pixel night
 * outline round every subject, plus a separate 16px drawing of each for browser tabs. Node-only (tools/art/web.ts).
 */
import { Image, type Rgb } from './colour'

const hex = (value: string): Rgb => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16)) as unknown as Rgb

/** A layer of optional colours; empty cells let the layers below show. */
class Layer {
  readonly cells: Array<string | null>
  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.cells = new Array<string | null>(width * height).fill(null)
  }

  get(x: number, y: number): string | null {
    return x < 0 || y < 0 || x >= this.width || y >= this.height ? null : this.cells[y * this.width + x]!
  }

  set(x: number, y: number, colour: string | null): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
    this.cells[y * this.width + x] = colour
  }

  /** An ASCII drawing: each character names a colour in `key`; anything else is left empty. */
  draw(art: string, key: Record<string, string>, left: number, top: number): void {
    art.replace(/^\n/, '').split('\n').forEach((row, y) => [...row].forEach((ch, x) => key[ch] && this.set(left + x, top + y, key[ch])))
  }

  /** Give every empty cell beside a filled one (4-connected) the outline colour. */
  outline(colour: string): void {
    const edge: number[] = []
    for (let y = 0; y < this.height; y += 1) for (let x = 0; x < this.width; x += 1) {
      if (this.get(x, y) !== null) continue
      if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) edge.push(y * this.width + x)
    }
    for (const i of edge) this.cells[i] = colour
  }
}

/** Layers composited bottom first. */
function flatten(width: number, height: number, layers: Layer[]): Image {
  const image = new Image(width, height)
  for (const layer of layers) for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const colour = layer.get(x, y)
    if (colour) image.set(x, y, hex(colour))
  }
  return image
}

/** A tiny repeatable hash for scattering sparkles and spots. */
const hash = (x: number, y: number, seed = 0) => {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Horizontal bands from `stops` ([firstRow, colour]), with a one-row checker blend at each change. */
function bands(layer: Layer, stops: Array<[number, string]>, bottom: number): void {
  for (let y = stops[0]![0]; y < bottom; y += 1) {
    let index = 0
    while (index + 1 < stops.length && stops[index + 1]![0] <= y) index += 1
    const next = stops[index + 1]
    for (let x = 0; x < layer.width; x += 1) {
      const blend = next !== undefined && y === next[0] - 1 && (x + y) % 2 === 0
      layer.set(x, y, blend ? next[1] : stops[index]![1])
    }
  }
}

// The companion's palette (apps/web/src/styles.css) and the painted scenes' colours (sceneColour.ts).
const NIGHT = '#0c0a1c'
const CREAM = '#f4f1ff'
const GOLD = '#ffd166'
const GOLD_HI = '#ffe08f'
const GOLD_LO = '#b07a00'

/* ---------------------------------------------------------------- Slow Cast */

/**
 * A rainbow trout leaping on the line out of a dusk lake: sky in bands from night purple to sunset gold, the sun half
 * down behind the far shore, its road of light on the water, and the splash where the fish broke the surface.
 */
export function slowCastIcon(): Image {
  const W = 64
  const HORIZON = 39
  const sky = new Layer(W, W)
  bands(sky, [[0, '#221d44'], [7, '#3b2d6b'], [14, '#6a3f8f'], [20, '#a8508f'], [25, '#e0607a'], [30, '#f5895f'], [34, '#ffb35c']], HORIZON)
  for (const [x, y] of [[5, 3], [17, 6], [29, 2], [40, 9], [55, 4], [60, 12], [49, 15], [10, 13]] as const) sky.set(x, y, hash(x, y) > 0.5 ? CREAM : GOLD_HI)
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) sky.set(22 + dx, 11 + dy, dx === 0 && dy === 0 ? CREAM : '#c9b8ff')

  // The sun, half set: a pale core in a warm rim.
  const sun = new Layer(W, W)
  for (let y = 0; y < HORIZON; y += 1) for (let x = 0; x < W; x += 1) {
    const d = Math.hypot(x - 46.5, y - (HORIZON + 0.5))
    if (d <= 10.2) sun.set(x, y, d <= 8.4 ? GOLD_HI : GOLD)
  }

  // The far shore: a dark pine bank on the left, a low hill on the right.
  const shore = new Layer(W, W)
  for (let x = 0; x < W; x += 1) {
    const bank = x < 30 ? 34 - Math.round(1.5 * Math.sin(x / 4)) : x > 56 ? HORIZON - 1 - Math.round((x - 56) / 3) : HORIZON - 1
    for (let y = bank; y < HORIZON; y += 1) shore.set(x, y, '#2a2150')
  }
  for (const [px, height] of [[2, 9], [7, 12], [12, 8], [17, 11], [23, 7], [27, 9]] as const) {
    for (let row = 0; row < height; row += 1) {
      const half = Math.floor((row % 4) / 1.5 + row / 3.2)
      for (let dx = -half; dx <= half; dx += 1) shore.set(px + dx, 34 - height + row, '#2a2150')
    }
  }

  // The lake: the sky's colours deepening toward the viewer, waves, and the sun's road.
  const water = new Layer(W, W)
  bands(water, [[HORIZON, '#7a4f9a'], [42, '#4f4a96'], [47, '#36418a'], [54, '#28336f'], [60, '#1d2659']], W)
  for (let y = HORIZON + 1; y < W; y += 2) {
    const depth = (y - HORIZON) / (W - HORIZON)
    for (let x = 0; x < W; x += 1) {
      const fromSun = Math.abs(x - 46.5)
      const road = 7 + depth * 5
      if (fromSun < road && hash(Math.floor(x / 2), y, 3) > 0.25 + fromSun / road / 1.6) water.set(x, y, fromSun < road * 0.45 ? GOLD_HI : depth < 0.4 ? GOLD : '#f5895f')
      else if (hash(Math.floor(x / 3), y, 7) > 0.86) water.set(x, y, depth < 0.5 ? '#9a7fd0' : '#5d8fd6')
    }
  }

  // The splash rings where the fish left the water.
  const rings = new Layer(W, W)
  for (const [rx, ry] of [[6.5, 1.6], [11, 2.8]] as const) {
    for (let a = 0; a < Math.PI * 2; a += 0.02) {
      const x = Math.round(12 + rx * Math.cos(a))
      const y = Math.round(45 + ry * Math.sin(a))
      if (Math.sin(a) > -0.2 || rx < 8) rings.set(x, y, rx < 8 ? CREAM : '#a9c8f5')
    }
  }

  // The trout, on a curved spine from tail (low left) to snout (high right).
  const fish = new Layer(W, W)
  const P0: [number, number] = [10.5, 37.5]
  const P1: [number, number] = [13, 17]
  const P2: [number, number] = [37, 17.5]
  const spine = (t: number) => [0, 1].map((i) => (1 - t) ** 2 * P0[i]! + 2 * (1 - t) * t * P1[i]! + t * t * P2[i]!) as [number, number]
  const samples = Array.from({ length: 241 }, (_, i) => i / 240).map((t) => ({ t, p: spine(t) }))
  const thickness = (t: number) => (t < 0.62 ? 1.4 + 4.6 * Math.sin((t / 0.62) * (Math.PI / 2)) : 6 - 3.6 * ((t - 0.62) / 0.38) ** 1.6)
  for (let y = 0; y < W; y += 1) for (let x = 0; x < W; x += 1) {
    let best = { d: Infinity, t: 0, side: 0 }
    for (let i = 0; i < samples.length; i += 1) {
      const { t, p } = samples[i]!
      const d = Math.hypot(x - p[0], y - p[1])
      if (d < best.d) {
        const q = spine(Math.min(1, t + 0.01))
        const r = spine(Math.max(0, t - 0.01))
        const [tx, ty] = [q[0] - r[0], q[1] - r[1]]
        // Positive side is the back: left of the direction of travel, which faces up and over.
        best = { d, t, side: Math.sign(tx * (y - p[1]) - ty * (x - p[0])) }
      }
    }
    const h = thickness(best.t)
    if (best.t <= 0.002 || best.t >= 0.998 ? best.d > h * 0.98 : best.d > h) continue
    const v = -best.side * (best.d / h) // +1 at the back, -1 at the belly
    let colour = v > 0.55 ? '#3f6b3a' : v > 0.15 ? '#6f9a4a' : v > -0.2 ? '#ef6f8e' : v > -0.6 ? '#c9d8c0' : CREAM
    if (v > 0.15 && best.t > 0.1 && best.t < 0.85 && hash(x, y, 11) > 0.72) colour = '#22371e'
    if (v > -0.2 && v <= 0.15 && hash(x, y, 5) > 0.8) colour = '#f7a3b6'
    fish.set(x, y, colour)
  }
  // Tail: a forked fan behind the tail end, pointing down into the splash.
  const back = [P0[0] - P1[0], P0[1] - P1[1]]
  const angle = Math.atan2(back[1]!, back[0]!)
  for (let y = 0; y < W; y += 1) for (let x = 0; x < W; x += 1) {
    const d = Math.hypot(x - P0[0]!, y - P0[1]!)
    const off = Math.atan2(y - P0[1]!, x - P0[0]!) - angle
    const a = Math.atan2(Math.sin(off), Math.cos(off))
    if (d > 0.5 && d < 7.2 && Math.abs(a) < 0.62 && !(Math.abs(a) < 0.2 && d > 4.2)) fish.set(x, y, d > 4.8 ? '#5a7f3a' : '#6f9a4a')
  }
  // Fins: dorsal on the back, pectoral and anal on the belly.
  const fin = (t: number, side: 1 | -1, reach: number, colour: string) => {
    const p = spine(t)
    const q = spine(t + 0.02)
    const [tx, ty] = [q[0] - p[0], q[1] - p[1]]
    const len = Math.hypot(tx, ty)
    const [nx, ny] = [(side * ty) / len, (-side * tx) / len]
    for (let s = 0; s <= reach; s += 0.25) for (let w = -1.2 + s * 0.3; w <= 1.2 - s * 0.3; w += 0.25) {
      fish.set(Math.round(p[0] + nx * (thickness(t) + s) + (tx / len) * (w - s * 0.6)), Math.round(p[1] + ny * (thickness(t) + s) + (ty / len) * (w - s * 0.6)), colour)
    }
  }
  fin(0.5, 1, 3.2, '#5a7f3a')
  fin(0.74, -1, 2.4, '#e0a07a')
  fin(0.3, -1, 2, '#e0a07a')
  // Eye, gill and mouth near the snout.
  const eye = spine(0.9)
  fish.draw(`
##
#w`, { '#': NIGHT, w: CREAM }, Math.round(eye[0]) - 1, Math.round(eye[1]) - 2)
  const gill = spine(0.8)
  for (let dy = -2; dy <= 2; dy += 1) fish.set(Math.round(gill[0]) + (Math.abs(dy) === 2 ? 1 : 0), Math.round(gill[1]) + dy, '#b84a6a')
  fish.outline(NIGHT)
  // The hook and line: from the corner of the mouth up to the rod tip beyond the frame.
  const line = new Layer(W, W)
  const mouth = [P2[0] + 2.4, P2[1] - 0.4]
  for (let s = 0; s <= 1; s += 0.004) line.set(Math.round(mouth[0]! + s * (61 - mouth[0]!)), Math.round(mouth[1]! - s * (mouth[1]! + 1)), '#e6dcff')
  // Drops thrown off the fish.
  const drops = new Layer(W, W)
  for (const [x, y] of [[4, 30], [6, 26], [3, 36], [18, 38], [21, 35], [16, 41], [8, 22], [24, 31]] as const) {
    drops.set(x, y, CREAM)
    drops.set(x, y + 1, '#a9c8f5')
  }
  for (const [x, y, height] of [[9, 41, 3], [12, 40, 4], [15, 41, 3], [7, 42, 2], [17, 42, 2]] as const) for (let dy = 0; dy < height; dy += 1) drops.set(x, y - dy, dy === height - 1 ? CREAM : '#a9c8f5')

  return flatten(W, W, [sky, sun, shore, water, rings, drops, line, fish])
}

/** The 16px tab icon: the trout leaping on the line over a sunset, drawn by hand at tab size. */
export function slowCastFavicon(): Image {
  const layer = new Layer(16, 16)
  layer.draw(`
aaaaaaaaaaaaaaal
aaaaaaaaaaaaaaal
aaaaaaNNNNNNaaal
aaaaNNGGGGGGNNal
bbbNGGGGGGGGGgNl
bbNGGgggggggNCgN
bNGgpppppppppggN
cNGpCCCCCCCCCCNc
cNgCCCCCCNNNNNcu
oNgCCCNNNoooouuu
oNgCNNoooooouuuu
NgNNwwwwwwwwwwww
NggNvwwwwwuuuwww
wNNwCvwwwwwuwwww
wCwwwwCwwvwwwwvw
wwwwwwwwwwwwwwww`, { a: '#3b2d6b', b: '#a8508f', c: '#f5895f', o: '#ffb35c', u: GOLD_HI, w: '#36418a', v: '#5d8fd6', N: NIGHT, g: '#6f9a4a', G: '#3f6b3a', p: '#ef6f8e', C: CREAM, l: '#e6dcff' }, 0, 0)
  return flatten(16, 16, [layer])
}

/* ------------------------------------------------------------ Desk Crawler */

/**
 * The Warrior from the companion's painted scenes, brought close: brown hair, red cardigan with lanyard badge, and the
 * letter-opener raised. Behind them a torch-gold burst on dungeon purple, with coins catching the light.
 */
export function deskCrawlerIcon(): Image {
  const W = 64
  const back = new Layer(W, W)
  const cx = 30
  const cy = 31
  for (let y = 0; y < W; y += 1) for (let x = 0; x < W; x += 1) {
    const a = Math.atan2(y - cy, x - cx)
    const d = Math.hypot(x - cx, y - cy)
    const ray = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 16) % 2 === 0
    back.set(x, y, d < 13 ? (d < 10 ? '#ffd98a' : '#ffc45e') : d < 22 ? (ray ? '#f0a03a' : '#e0803a') : d < 32 ? (ray ? '#8a4f9a' : '#6a3f8f') : ray ? '#3b2d6b' : '#2c2650')
    // A dither ring between each band so the light falls off softly.
    if ((Math.abs(d - 13) < 0.7 || Math.abs(d - 22) < 0.7 || Math.abs(d - 32) < 0.7) && (x + y) % 2 === 0) back.set(x, y, d < 20 ? '#ffc45e' : d < 30 ? '#c06a5a' : '#4a3a7a')
  }

  const hero = new Layer(W, W)
  /** How far the whole figure sits below the top of the frame. */
  const DROP = 5
  const key: Record<string, string> = {
    K: '#3a2416', H: '#6b4226', h: '#9a6338', S: '#f2c39b', s: '#d99a74', E: NIGHT, W: CREAM, P: '#ee9a8a', m: '#8a3a3a',
    R: '#e0604f', r: '#b8443a', d: '#8f2f2a', L: CREAM, B: '#5d8fd6', b: '#2f5f9e', T: '#fbe9c2', N: '#2c2650', n: '#1a1636',
  }
  hero.draw(`
.........KKKKKK.........
......KKKHHHHhhKKK......
....KKHHHhhhhHHHHHKK....
...KHHHHhhHHHHHHHHHHK...
..KHHHhhHHHHHHHHHHHHHK..
..KHHhHHHHHHHHHHHHHHHHK.
.KHHHHHHHHHHHHHSHHHHHHK.
.KHHHHHHHSSHHHSSSHHHHHHK
.KHHHHHSSSSSSSSSSSSHHHHK
.KHHHSSSSSSSSSSSSSSSHHHK
.KHHSSSKKKSSSSSSKKKSSHHK
.KHSSSSSSSSSSSSSSSSSSShK
KsSSSSSEEWSSSSSSEEWSSSsK
KsSSSSSEEESSSSSSEEESSSsK
KsSSSSSEEESSSSSSEEESSSsK
.KsSSSSSSSSSSSSSSSSSSsK.
.KsSPPSSSSSSSSSSSSPPSsK.
..KsSSSSSSSmmmmSSSSSsK..
...KsSSSSSSSSSSSSSSsK...
....KKsssSSSSSSsssKK....
......KKKsssssKKK.......
........KsSSSSsK........`, key, 20, DROP + 9)
  // The cardigan: collar and lanyard at the neck, shoulders flaring to the frame's foot, a placket with buttons.
  const BODY_TOP = DROP + 30
  for (let y = BODY_TOP; y < W; y += 1) {
    const row = y - BODY_TOP
    const half = row < 2 ? 6 : 6 + 12 * Math.sqrt(Math.min(1, (row - 1) / 7))
    for (let x = Math.ceil(31.5 - half); x <= Math.floor(31.5 + half); x += 1) {
      const fromEdge = Math.min(x - (31.5 - half), 31.5 + half - x)
      const collar = row < 3 && Math.abs(x - 31.5) < 6 - row
      let colour = collar ? key.T! : fromEdge < 1.5 && row > 3 ? key.r! : key.R!
      if (row >= 3 && Math.abs(x - 23.5) < 0.6) colour = key.r!
      if (row >= 3 && Math.abs(x - 39.5) < 0.6) colour = key.r!
      if (row >= 1 && row < 6 && Math.abs(x - 31.5) < (row < 3 ? 1.6 : 0.6)) colour = key.L!
      if (row >= 6 && row < 10 && Math.abs(x - 31.5) < 2.6) colour = row === 6 || row === 9 || Math.abs(x - 31.5) > 1.6 ? key.B! : row === 7 ? key.W! : key.b!
      if (row >= 10 && Math.abs(x - 31.5) < 0.6) colour = (row - 12) % 5 === 0 ? key.W! : key.d!
      hero.set(x, y, colour)
    }
  }
  // The sword arm: the right sleeve rising to a fist at shoulder height.
  hero.draw(`
.......SSSS
......SSSSSs
......SSSSss
.....RRssss.
....RRRRRR..
...RRRRRrR..
..RRRRRrRR..
.RRRRRrRR...
RRRRRrRR....
RRRRrRR.....
RRRrRR......`, key, 40, DROP + 22)
  hero.outline(NIGHT)
  // Hair and face lines drawn inside the outline.

  // The letter-opener: a long steel blade with a gold guard, held upright in the fist.
  const sword = new Layer(W, W)
  sword.draw(`
..#..
.#M#.
.#Mn.
.#Mn.
.#Mn.
.#Mn.
.#Mn.
.#Mn.
.#Mn.
.#Mn.
.#Mn.
.#Mn.
.#Mn.
.#Mn.
.#Mn.
YYYYY
yYYYy
..G..
..G..
..Y..`, { M: '#eef3fb', n: '#9aa6bb', '#': '#c9d3e0', Y: GOLD, y: GOLD_LO, G: '#6b4226' }, 47, 6)
  sword.outline(NIGHT)

  // Coins and glints in the light.
  const coins = new Layer(W, W)
  const coin = `
.YYY.
YYhYY
YhYYy
YYYyy
.yyy.`
  coins.draw(coin, { Y: GOLD, h: GOLD_HI, y: GOLD_LO }, 2, 57)
  coins.draw(coin, { Y: GOLD, h: GOLD_HI, y: GOLD_LO }, 6, 50)
  coins.draw(coin, { Y: GOLD, h: GOLD_HI, y: GOLD_LO }, 56, 57)
  coins.outline(NIGHT)
  const glints = new Layer(W, W)
  for (const [x, y] of [[8, 10], [14, 4], [57, 33], [5, 28]] as const) {
    glints.set(x, y, CREAM)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) glints.set(x + dx, y + dy, GOLD_HI)
  }

  return flatten(W, W, [back, glints, hero, sword, coins])
}

/** The 16px tab icon: the Warrior's face and raised blade in torch light, drawn by hand at tab size. */
export function deskCrawlerFavicon(): Image {
  const layer = new Layer(16, 16)
  for (let y = 0; y < 16; y += 1) for (let x = 0; x < 16; x += 1) layer.set(x, y, Math.hypot(x - 6.5, y - 6.5) < 8 ? '#f0a03a' : '#3b2d6b')
  layer.draw(`
....NNNNNN...N..
..NNHHHHhHNN.NMN
.NHHHHhHHHHN.NMN
.NHHHHHHHHHHNNMN
NHHHSSSSSSHHNNMN
NHHSSSSSSSSHNNMN
NHSSEESSEESSNNMN
NsSSEESSEESsNNMN
NsPSSSSSSSPsNNMN
.NsSSSmmSSsNNYYY
..NNsssssNNSNGN.
.NNRRTLTRRNSSN..
NRRRRRLRRRRNSN..
NRRRRBBRRRRRN...
NRRRRBBRRRRRN...
NRRRRRdRRRRRN...`, { N: NIGHT, H: '#6b4226', h: '#9a6338', S: '#f2c39b', s: '#d99a74', E: NIGHT, P: '#ee9a8a', m: '#8a3a3a', R: '#e0604f', d: '#8f2f2a', T: '#fbe9c2', L: CREAM, B: '#5d8fd6', M: '#eef3fb', Y: GOLD, G: '#6b4226' }, 0, 0)
  return flatten(16, 16, [layer])
}
