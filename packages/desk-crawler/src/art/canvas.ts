/**
 * Pixel canvas and sprite grids for hand-authored 1-bit art.
 *
 * Sprite grid characters:
 *   ' '  transparent        '#'  black
 *   'w'  white (opaque)     ':'  50% checker shade
 *   '.'  sparse 25% shade   '='  horizontal hatch (every other row)
 */
export interface Sprite {
  readonly width: number
  readonly height: number
  readonly rows: readonly string[]
}

export function sprite(text: string): Sprite {
  const lines = text.replace(/^\n/, '').replace(/\n\s*$/, '').split('\n')
  const width = Math.max(...lines.map((l) => l.length))
  return { width, height: lines.length, rows: lines.map((l) => l.padEnd(width, ' ')) }
}

export function mirror(s: Sprite): Sprite {
  return { ...s, rows: s.rows.map((r) => [...r].reverse().join('')) }
}

export class Canvas {
  readonly ink: Uint8Array
  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.ink = new Uint8Array(width * height)
  }

  set(x: number, y: number, black: boolean): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
    this.ink[y * this.width + x] = black ? 1 : 0
  }

  /** Paint a shade character at absolute (x, y); shades align to the canvas grid so patterns tile seamlessly. */
  paint(x: number, y: number, ch: string): void {
    switch (ch) {
      case '#':
        return this.set(x, y, true)
      case 'w':
        return this.set(x, y, false)
      case ':':
        return this.set(x, y, (x + y) % 2 === 0)
      case '.':
        return this.set(x, y, x % 2 === 0 && y % 2 === 0 && (x + y) % 4 === 0)
      case '=':
        return this.set(x, y, y % 2 === 0)
      default:
        return
    }
  }

  draw(s: Sprite, left: number, top: number): void {
    s.rows.forEach((row, dy) => [...row].forEach((ch, dx) => this.paint(left + dx, top + dy, ch)))
  }

  rect(left: number, top: number, w: number, h: number, ch: string): void {
    for (let y = top; y < top + h; y += 1) for (let x = left; x < left + w; x += 1) this.paint(x, y, ch)
  }

  hline(left: number, right: number, y: number, ch = '#'): void {
    for (let x = left; x <= right; x += 1) this.paint(x, y, ch)
  }

  vline(x: number, top: number, bottom: number, ch = '#'): void {
    for (let y = top; y <= bottom; y += 1) this.paint(x, y, ch)
  }

  /** Nearest-neighbour upscale for crisp pixels. */
  scaled(factor: number): { width: number; height: number; ink: Uint8Array } {
    const width = this.width * factor
    const height = this.height * factor
    const ink = new Uint8Array(width * height)
    for (let y = 0; y < height; y += 1) {
      const src = Math.floor(y / factor) * this.width
      for (let x = 0; x < width; x += 1) ink[y * width + x] = this.ink[src + Math.floor(x / factor)]!
    }
    return { width, height, ink }
  }
}
