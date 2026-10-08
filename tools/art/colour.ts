/** Party Menu colouring for the 1-bit brand marks, and an RGB PNG encoder for the results. Node-only (tools). */
import { deflateSync } from 'node:zlib'
import type { Canvas } from '@trmnl-games/desk-crawler/art/canvas'

export type Rgb = readonly [number, number, number]

/** The brand palette shared with apps/web/src/styles.css. */
export const BRAND = {
  gold: [0xf2, 0xc1, 0x4e],
  cream: [0xf6, 0xf1, 0xde],
  night: [0x0a, 0x0f, 0x2c],
  navy: [0x22, 0x1d, 0x44],
  ground: [0x15, 0x12, 0x2b],
  white: [0xff, 0xff, 0xff],
} as const

/** An RGB raster. */
export class Image {
  readonly rgb: Uint8Array
  constructor(
    readonly width: number,
    readonly height: number,
    fill: Rgb = BRAND.white,
  ) {
    this.rgb = new Uint8Array(width * height * 3)
    this.rect(0, 0, width, height, fill)
  }

  set(x: number, y: number, colour: Rgb): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
    this.rgb.set(colour, (y * this.width + x) * 3)
  }

  get(x: number, y: number): Rgb {
    const i = (y * this.width + x) * 3
    return [this.rgb[i]!, this.rgb[i + 1]!, this.rgb[i + 2]!]
  }

  rect(left: number, top: number, width: number, height: number, colour: Rgb): void {
    for (let y = top; y < top + height; y += 1) for (let x = left; x < left + width; x += 1) this.set(x, y, colour)
  }

  blit(source: Image, left: number, top: number): void {
    for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) this.set(left + x, top + y, source.get(x, y))
  }

  scaled(factor: number): Image {
    const out = new Image(this.width * factor, this.height * factor)
    for (let y = 0; y < out.height; y += 1) for (let x = 0; x < out.width; x += 1) out.set(x, y, this.get(Math.floor(x / factor), Math.floor(y / factor)))
    return out
  }

  png(): Uint8Array {
    const raw = new Uint8Array((this.width * 3 + 1) * this.height)
    for (let y = 0; y < this.height; y += 1) raw.set(this.rgb.subarray(y * this.width * 3, (y + 1) * this.width * 3), y * (this.width * 3 + 1) + 1)
    const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
    const chunk = (type: string, data: Uint8Array) => {
      const typed = Buffer.concat([Buffer.from(type, 'ascii'), data])
      return Buffer.concat([Buffer.from(u32(data.length)), typed, Buffer.from(u32(crc32(typed)))])
    }
    return Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', Uint8Array.from([...u32(this.width), ...u32(this.height), 8, 2, 0, 0, 0])),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', new Uint8Array()),
    ])
  }
}

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const b of bytes) {
    c ^= b
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  return (c ^ 0xffffffff) >>> 0
}

/**
 * Colour a 1-bit mark: ink becomes night, paper enclosed by ink becomes cream,
 * and paper reachable from the edge becomes the tile colour.
 */
export function colourMark(canvas: Canvas, tile: Rgb = BRAND.gold): Image {
  const { width, height, ink } = canvas
  const outside = new Uint8Array(width * height)
  const stack: number[] = []
  for (let x = 0; x < width; x += 1) stack.push(x, (height - 1) * width + x)
  for (let y = 0; y < height; y += 1) stack.push(y * width, y * width + width - 1)
  while (stack.length > 0) {
    const i = stack.pop()!
    if (outside[i] || ink[i]) continue
    outside[i] = 1
    const x = i % width
    if (x > 0) stack.push(i - 1)
    if (x < width - 1) stack.push(i + 1)
    if (i >= width) stack.push(i - width)
    if (i < width * (height - 1)) stack.push(i + width)
  }
  const image = new Image(width, height)
  for (let i = 0; i < width * height; i += 1) image.set(i % width, Math.floor(i / width), ink[i] ? BRAND.night : outside[i] ? tile : BRAND.cream)
  return image
}

/** A 1-bit canvas as night ink on white, for the device scene. */
export function inkImage(canvas: Canvas): Image {
  const image = new Image(canvas.width, canvas.height)
  for (let i = 0; i < canvas.width * canvas.height; i += 1) if (canvas.ink[i]) image.set(i % canvas.width, Math.floor(i / canvas.width), BRAND.night)
  return image
}

/** Crisp vector version of a coloured mark: one path per colour, one 1x1 run per horizontal stretch. */
export function markSvg(image: Image): string {
  const byColour = new Map<string, string[]>()
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const key = image.get(x, y).map((v) => v.toString(16).padStart(2, '0')).join('')
      let end = x
      while (end + 1 < image.width && image.get(end + 1, y).map((v) => v.toString(16).padStart(2, '0')).join('') === key) end += 1
      const runs = byColour.get(key) ?? []
      runs.push(`M${x} ${y}h${end - x + 1}v1h-${end - x + 1}z`)
      byColour.set(key, runs)
      x = end
    }
  }
  const paths = [...byColour].map(([colour, runs]) => `<path fill="#${colour}" d="${runs.join('')}"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${image.width} ${image.height}" shape-rendering="crispEdges">${paths}</svg>\n`
}
