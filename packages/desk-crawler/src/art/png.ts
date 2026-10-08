/**
 * Minimal 1-bit grayscale PNG encoder. Pure TypeScript using stored (uncompressed)
 * deflate blocks, so it runs in the Convex default runtime without zlib.
 * 1-bit art stays small: a 760x200 image is about 19 KB.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function adler32(bytes: Uint8Array): number {
  let a = 1
  let b = 0
  for (const byte of bytes) {
    a = (a + byte) % 65521
    b = (b + a) % 65521
  }
  return ((b << 16) | a) >>> 0
}

const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typed = new Uint8Array(4 + data.length)
  typed.set([...type].map((ch) => ch.charCodeAt(0)), 0)
  typed.set(data, 4)
  const out = new Uint8Array(12 + data.length)
  out.set(u32(data.length), 0)
  out.set(typed, 4)
  out.set(u32(crc32(typed)), 8 + data.length)
  return out
}

/** Wrap raw bytes in a zlib stream of stored deflate blocks. */
function zlibStored(raw: Uint8Array): Uint8Array {
  const blocks: number[] = [0x78, 0x01]
  for (let offset = 0; offset < raw.length || offset === 0; offset += 65535) {
    const end = Math.min(raw.length, offset + 65535)
    const len = end - offset
    blocks.push(end === raw.length ? 1 : 0, len & 255, len >>> 8, ~len & 255, (~len >>> 8) & 255)
    for (let i = offset; i < end; i += 1) blocks.push(raw[i]!)
    if (raw.length === 0) break
  }
  blocks.push(...u32(adler32(raw)))
  return Uint8Array.from(blocks)
}

/** `ink[y * width + x]` is 1 for black, 0 for white. */
export function encodePng1Bit(width: number, height: number, ink: Uint8Array): Uint8Array {
  const rowBytes = Math.ceil(width / 8)
  const raw = new Uint8Array((rowBytes + 1) * height)
  for (let y = 0; y < height; y += 1) {
    const row = y * (rowBytes + 1)
    raw[row] = 0 // filter: none
    for (let x = 0; x < width; x += 1) {
      // Grayscale 1-bit: bit 1 = white.
      if (!ink[y * width + x]) raw[row + 1 + (x >> 3)]! |= 0x80 >> (x & 7)
    }
  }
  const ihdr = new Uint8Array([...u32(width), ...u32(height), 1, 0, 0, 0, 0])
  const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])
  const parts = [signature, chunk('IHDR', ihdr), chunk('IDAT', zlibStored(raw)), chunk('IEND', new Uint8Array())]
  const total = parts.reduce((sum, p) => sum + p.length, 0)
  const out = new Uint8Array(total)
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }
  return out
}

/**
 * Indexed 2-bit PNG for the four-ink panels (D94): `index[y * width + x]` picks one of up to four `palette` colours.
 * The palette holds the panel's exact inks, so TRMNL's renderer maps every pixel to an ink without dithering; the
 * `transparent` entry lets the screen's own paper show through.
 */
export function encodePngPalette(width: number, height: number, index: Uint8Array, palette: ReadonlyArray<readonly [number, number, number]>, transparent?: number): Uint8Array {
  const rowBytes = Math.ceil(width / 4)
  const raw = new Uint8Array((rowBytes + 1) * height)
  for (let y = 0; y < height; y += 1) {
    const row = y * (rowBytes + 1)
    for (let x = 0; x < width; x += 1) raw[row + 1 + (x >> 2)]! |= (index[y * width + x]! & 3) << (6 - 2 * (x & 3))
  }
  const ihdr = new Uint8Array([...u32(width), ...u32(height), 2, 3, 0, 0, 0])
  const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])
  const parts = [signature, chunk('IHDR', ihdr), chunk('PLTE', Uint8Array.from(palette.flat())), ...(transparent === undefined ? [] : [chunk('tRNS', Uint8Array.from(palette.map((_, i) => (i === transparent ? 0 : 255))))]), chunk('IDAT', zlibStored(raw)), chunk('IEND', new Uint8Array())]
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0))
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }
  return out
}

/** Indexed 8-bit PNG for the companion's colour scene: up to 256 `palette` colours, the `transparent` entry see-through. */
export function encodePngIndexed(width: number, height: number, index: Uint8Array, palette: ReadonlyArray<readonly [number, number, number]>, transparent?: number): Uint8Array {
  const raw = new Uint8Array((width + 1) * height)
  for (let y = 0; y < height; y += 1) raw.set(index.subarray(y * width, (y + 1) * width), y * (width + 1) + 1)
  const ihdr = new Uint8Array([...u32(width), ...u32(height), 8, 3, 0, 0, 0])
  const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])
  const parts = [signature, chunk('IHDR', ihdr), chunk('PLTE', Uint8Array.from(palette.flat())), ...(transparent === undefined ? [] : [chunk('tRNS', Uint8Array.from(palette.map((_, i) => (i === transparent ? 0 : 255))))]), chunk('IDAT', zlibStored(raw)), chunk('IEND', new Uint8Array())]
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0))
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }
  return out
}
