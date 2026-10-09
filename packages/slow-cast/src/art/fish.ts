import type { Sprite } from '@trmnl-games/engine/art/canvas'

/**
 * Fish sprites (slow-cast.md "Art"). Thirty species are drawn from one trait row each rather than thirty hand
 * grids, so every fish shares one drawing language and a new species is one line. Sprites face right, use the
 * engine's grid characters ('#' ink, 'w' paper, ':' half shade, '.' light shade, '=' hatch) and are deterministic.
 */
export type FishBody = 'deep' | 'round' | 'torpedo' | 'slim' | 'eel' | 'flat' | 'ray' | 'shark'
export type FishTail = 'fork' | 'fan' | 'square' | 'none' | 'whip'
export type FishFin = 'spiky' | 'single' | 'rear' | 'none' | 'sail'
export type FishMark = 'plain' | 'bars' | 'spots' | 'scales' | 'dark' | 'mottled' | 'wavy' | 'shine' | 'belly'

export interface FishTraits {
  readonly body: FishBody
  /** Depth as a share of the sprite height (deep fish 1.0, slim ones less). */
  readonly depth: number
  readonly tail: FishTail
  readonly fin: FishFin
  readonly mark: FishMark
  readonly whiskers?: true
}

export const FISH_TRAITS: Readonly<Record<string, FishTraits>> = {
  minnow: { body: 'slim', depth: 0.55, tail: 'fork', fin: 'single', mark: 'belly' },
  roach: { body: 'deep', depth: 0.8, tail: 'fork', fin: 'single', mark: 'shine' },
  rudd: { body: 'deep', depth: 0.85, tail: 'fork', fin: 'rear', mark: 'shine' },
  perch: { body: 'deep', depth: 0.85, tail: 'fork', fin: 'spiky', mark: 'bars' },
  bream: { body: 'deep', depth: 1, tail: 'fork', fin: 'single', mark: 'plain' },
  crucian_carp: { body: 'round', depth: 0.95, tail: 'square', fin: 'single', mark: 'scales' },
  tench: { body: 'round', depth: 0.8, tail: 'fan', fin: 'single', mark: 'dark' },
  eel: { body: 'eel', depth: 0.45, tail: 'whip', fin: 'none', mark: 'dark' },
  common_carp: { body: 'round', depth: 0.95, tail: 'fork', fin: 'single', mark: 'scales', whiskers: true },
  golden_carp: { body: 'round', depth: 0.95, tail: 'fork', fin: 'sail', mark: 'shine', whiskers: true },
  gudgeon: { body: 'slim', depth: 0.6, tail: 'fork', fin: 'single', mark: 'spots', whiskers: true },
  dace: { body: 'slim', depth: 0.6, tail: 'fork', fin: 'single', mark: 'shine' },
  chub: { body: 'torpedo', depth: 0.75, tail: 'square', fin: 'single', mark: 'scales' },
  grayling: { body: 'torpedo', depth: 0.75, tail: 'fork', fin: 'sail', mark: 'spots' },
  brown_trout: { body: 'torpedo', depth: 0.75, tail: 'square', fin: 'single', mark: 'spots' },
  barbel: { body: 'torpedo', depth: 0.7, tail: 'fork', fin: 'single', mark: 'belly', whiskers: true },
  rainbow_trout: { body: 'torpedo', depth: 0.75, tail: 'square', fin: 'single', mark: 'wavy' },
  pike: { body: 'torpedo', depth: 0.6, tail: 'fan', fin: 'rear', mark: 'mottled' },
  zander: { body: 'torpedo', depth: 0.7, tail: 'fork', fin: 'spiky', mark: 'bars' },
  salmon: { body: 'torpedo', depth: 0.75, tail: 'square', fin: 'single', mark: 'shine' },
  sand_eel: { body: 'eel', depth: 0.35, tail: 'fork', fin: 'none', mark: 'shine' },
  whiting: { body: 'slim', depth: 0.65, tail: 'square', fin: 'single', mark: 'belly' },
  mackerel: { body: 'torpedo', depth: 0.65, tail: 'fork', fin: 'single', mark: 'wavy' },
  pollock: { body: 'torpedo', depth: 0.75, tail: 'square', fin: 'single', mark: 'dark' },
  flounder: { body: 'flat', depth: 0.9, tail: 'fan', fin: 'none', mark: 'spots' },
  wrasse: { body: 'deep', depth: 0.8, tail: 'fan', fin: 'spiky', mark: 'mottled' },
  sea_bass: { body: 'torpedo', depth: 0.8, tail: 'fork', fin: 'spiky', mark: 'shine' },
  conger_eel: { body: 'eel', depth: 0.5, tail: 'whip', fin: 'none', mark: 'dark' },
  smoothhound: { body: 'shark', depth: 0.6, tail: 'fork', fin: 'single', mark: 'spots' },
  thornback_ray: { body: 'ray', depth: 1, tail: 'whip', fin: 'none', mark: 'spots' },
}

const UNKNOWN: FishTraits = { body: 'deep', depth: 0.8, tail: 'fork', fin: 'single', mark: 'plain' }

/** Body fill for the mark at (x, y) within the body; '#' for outline is handled by the caller. */
function fill(mark: FishMark, x: number, y: number, top: number, bottom: number, length: number): string {
  const belly = y >= top + Math.ceil(((bottom - top) * 2) / 3)
  switch (mark) {
    case 'plain':
      return belly ? 'w' : '.'
    case 'shine':
      return y === top + 1 ? ':' : 'w'
    case 'belly':
      return belly ? 'w' : ':'
    case 'dark':
      return belly ? '.' : ':'
    case 'scales':
      return (x + y) % 3 === 0 ? '#' : belly ? 'w' : '.'
    case 'spots':
      return x % 4 === 1 && y % 3 === (x % 8 === 1 ? 1 : 2) && !belly ? '#' : belly ? 'w' : '.'
    case 'bars':
      return x % 4 === 2 && !belly && x > 2 && x < length - 3 ? '#' : 'w'
    case 'mottled':
      return (x * 7 + y * 3) % 5 === 0 ? 'w' : belly ? 'w' : ':'
    case 'wavy':
      return !belly && (x + (y % 2) * 2) % 4 === 0 ? '#' : belly ? 'w' : '.'
  }
}

/** Where each body is deepest (share of length from the nose), how blunt its nose is and how thin its tail root. */
const SHAPE: Readonly<Record<FishBody, { peak: number; nose: number; wrist: number }>> = {
  deep: { peak: 0.4, nose: 0.12, wrist: 0.22 },
  round: { peak: 0.45, nose: 0.25, wrist: 0.3 },
  torpedo: { peak: 0.38, nose: 0.15, wrist: 0.25 },
  slim: { peak: 0.36, nose: 0.12, wrist: 0.25 },
  shark: { peak: 0.32, nose: 0.1, wrist: 0.18 },
  eel: { peak: 0.5, nose: 1, wrist: 1 },
  flat: { peak: 0.5, nose: 1, wrist: 1 },
  ray: { peak: 0.5, nose: 1, wrist: 1 },
}

/** Half-height of the body at column i (0 at the nose, length - 1 at the tail root), for an ordinary fish. */
function profile(body: FishBody, i: number, length: number, half: number): number {
  const { peak, nose, wrist } = SHAPE[body]
  const t = i / Math.max(1, length - 1)
  if (t <= peak) return half * Math.max(nose, Math.sqrt(Math.max(0, 1 - ((peak - t) / peak) ** 2)) ** 1.4)
  return half * (1 - (1 - wrist) * ((t - peak) / (1 - peak)) ** 0.9)
}

/** Outline pass: any drawn cell beside empty space or the sprite edge becomes ink, so every shape closes. */
function outline(grid: string[][]): string[] {
  const h = grid.length
  const w = grid[0]!.length
  const empty = (x: number, y: number) => x < 0 || y < 0 || x >= w || y >= h || grid[y]![x] === ' '
  return grid.map((row, y) => row.map((ch, x) => (ch !== ' ' && ch !== 'w' && (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1)) ? '#' : ch)).join(''))
}

/** One species' sprite at a size; heads face right. */
export function fishSprite(speciesId: string, width: number, height: number): Sprite {
  const traits = FISH_TRAITS[speciesId] ?? UNKNOWN
  const grid: string[][] = Array.from({ length: height }, () => Array.from({ length: width }, () => ' '))
  const put = (x: number, y: number, ch: string) => {
    if (x >= 0 && y >= 0 && x < width && y < height) grid[y]![x] = ch
  }
  const mid = Math.floor((height - 1) / 2)

  if (traits.body === 'ray') {
    // Top-down diamond with a whip tail to the left.
    const disc = Math.min(height, Math.floor(width * 0.6))
    const left = width - disc
    const rx = (disc - 1) / 2
    const ry = (height - 1) / 2
    for (let y = 0; y < height; y += 1)
      for (let x = 0; x < disc; x += 1) {
        const d = Math.abs(x - rx) / rx + Math.abs(y - ry) / ry
        if (d <= 1) put(left + x, y, d > 0.82 ? '#' : (x + y) % 4 === 0 ? '#' : y > ry ? 'w' : '.')
      }
    for (let x = 0; x < left; x += 1) put(x, Math.round(ry + Math.sin(x / 2) * 0.6), '#')
    put(left + Math.round(rx) + 2, Math.round(ry) - 1, 'w')
    return { width, height, rows: grid.map((r) => r.join('')) }
  }

  if (traits.body === 'eel') {
    // A long wave of body tapering to a whip; the head end is blunt.
    const thick = Math.max(2, Math.round(height * traits.depth))
    for (let x = 0; x < width; x += 1) {
      const t = x / (width - 1)
      const centre = mid + Math.round(Math.sin(t * Math.PI * 2.2) * (height - thick) * 0.35)
      const half = Math.max(1, Math.round((thick / 2) * Math.min(1, 0.4 + t * 1.2)))
      for (let y = centre - half; y <= centre + half; y += 1) put(x, y, y === centre - half || y === centre + half || x === width - 1 ? '#' : fill(traits.mark, x, y, centre - half, centre + half, width))
    }
    put(width - 3, mid + Math.round(Math.sin(Math.PI * 2.2 * ((width - 3) / (width - 1))) * (height - thick) * 0.35) - 1, 'w')
    return { width, height, rows: grid.map((r) => r.join('')) }
  }

  if (traits.body === 'flat') {
    // A flatfish seen from above: an oval disc with a fringe fin and both eyes on top.
    const tailLen = Math.max(2, Math.round(width * 0.18))
    const bodyLen = width - tailLen
    const rx = (bodyLen - 1) / 2
    const ry = (height - 1) / 2
    for (let y = 0; y < height; y += 1)
      for (let x = 0; x < bodyLen; x += 1) {
        const d = ((x - rx) / rx) ** 2 + ((y - ry) / ry) ** 2
        if (d <= 1) put(tailLen + x, y, d > 0.7 ? (d > 0.86 ? '#' : ':') : fill(traits.mark, x, y, 0, height - 1, bodyLen))
      }
    for (let y = Math.round(ry) - 2; y <= Math.round(ry) + 2; y += 1) for (let x = 0; x < tailLen; x += 1) if (Math.abs(y - ry) <= 1 + x / 2) put(x, y, x === 0 || Math.abs(y - ry) > x / 2 ? '#' : ':')
    put(width - Math.round(bodyLen * 0.25), Math.round(ry) - 1, '#')
    put(width - Math.round(bodyLen * 0.25) - 2, Math.round(ry) - 2, '#')
    return { width, height, rows: outline(grid) }
  }

  // Ordinary fish: tail at the left, nose at the right.
  const tailLen = traits.tail === 'none' ? 0 : Math.max(2, Math.round(width * 0.2))
  const bodyLen = width - tailLen
  const half = Math.max(1, ((height - 1) / 2) * traits.depth)
  const top: number[] = []
  const bottom: number[] = []
  for (let i = 0; i < bodyLen; i += 1) {
    // Column i counts from the nose.
    const h = Math.max(0.6, profile(traits.body, i, bodyLen, half))
    top[i] = Math.round(mid - h)
    bottom[i] = Math.round(mid + h + (height % 2 === 0 ? 1 : 0))
  }
  for (let i = 0; i < bodyLen; i += 1) {
    const x = width - 1 - i
    for (let y = top[i]!; y <= bottom[i]!; y += 1) {
      const edge = y === top[i] || y === bottom[i] || i === 0 || i === bodyLen - 1 || y < (top[i - 1] ?? 99) || y < (top[i + 1] ?? 99) || y > (bottom[i - 1] ?? -1) || y > (bottom[i + 1] ?? -1)
      put(x, y, edge ? '#' : fill(traits.mark, i, y, top[i]!, bottom[i]!, bodyLen))
    }
  }
  // Gill line and eye near the nose.
  const gill = Math.max(2, Math.round(bodyLen * 0.22))
  for (let y = top[gill]! + 1; y < bottom[gill]!; y += 1) put(width - 1 - gill, y, '#')
  const eyeX = width - 1 - Math.max(1, Math.round(bodyLen * 0.1))
  const eyeY = Math.max(top[Math.max(1, Math.round(bodyLen * 0.1))]! + 1, mid - Math.round(half * 0.35))
  put(eyeX, eyeY, '#')
  put(eyeX - 1, eyeY, 'w')
  if (traits.whiskers) {
    put(width - 1, mid + 1, '#')
    put(width - 2, Math.min(height - 1, bottom[1]! + 1), '#')
  }
  // Dorsal fin on the back.
  const finStart = Math.round(bodyLen * (traits.fin === 'rear' ? 0.7 : 0.35))
  const finLen = Math.max(2, Math.round(bodyLen * (traits.fin === 'sail' ? 0.4 : traits.fin === 'spiky' ? 0.35 : 0.2)))
  if (traits.fin !== 'none')
    for (let i = finStart; i < Math.min(bodyLen - 1, finStart + finLen); i += 1) {
      const x = width - 1 - i
      const rise = traits.fin === 'sail' ? 2 : 1
      for (let r = 1; r <= rise; r += 1) put(x, top[i]! - r, traits.fin === 'spiky' ? ((i - finStart) % 2 === 0 ? '#' : ' ') : r === rise ? '#' : ':')
    }
  if (traits.body === 'shark') put(width - 1 - Math.round(bodyLen * 0.8), top[Math.round(bodyLen * 0.8)]! - 1, '#')
  // Tail at the left: it flares from the thin root to the tip, forked, fanned, square or a whip.
  const root = Math.max(0.6, half * SHAPE[traits.body].wrist)
  const tip = Math.min((height - 1) / 2, half * (traits.tail === 'fan' ? 1.05 : 0.95))
  for (let x = 0; x < tailLen; x += 1) {
    const fromTip = x / Math.max(1, tailLen - 1)
    if (traits.tail === 'whip') {
      put(x, mid, '#')
      continue
    }
    const spread = tip - (tip - root) * fromTip
    const a = Math.round(mid - spread)
    const b = Math.round(mid + spread + (height % 2 === 0 ? 1 : 0))
    const notch = traits.tail === 'fork' ? spread * (1 - fromTip * 1.6) * 0.75 : 0
    for (let y = a; y <= b; y += 1) {
      const off = Math.abs(y - (mid + (height % 2 === 0 ? 0.5 : 0)))
      if (notch > 0.5 && off < notch) continue
      const edge = y === a || y === b || x === 0 || (notch > 0.5 && off < notch + 1)
      put(x, y, edge ? '#' : traits.tail === 'fan' ? ':' : '.')
    }
  }
  return { width, height, rows: outline(grid) }
}

/** Device sizes: a large fish for the catch moment and the logbook, a small one for story rows. */
export const FISH_LARGE = { width: 30, height: 12 } as const
export const FISH_SMALL = { width: 15, height: 7 } as const
