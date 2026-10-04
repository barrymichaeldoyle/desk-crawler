/** Render the companion's favicons, app icons and social card into public/. pnpm tsx tools/art/web.ts */
import { mkdirSync, writeFileSync } from 'node:fs'
import { Canvas } from '../../convex/art/canvas'
import { encodePng1Bit } from '../../convex/art/png'
import { composeScene, STAGE_WIDTH } from '../../convex/art/scene'
import { iconCanvas } from './iconArt'

const OUT = 'public'
mkdirSync(OUT, { recursive: true })

function blit(target: Canvas, source: Canvas, left: number, top: number): void {
  for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) target.set(left + x, top + y, source.ink[y * source.width + x] === 1)
}

function png(name: string, canvas: Canvas, factor: number): Uint8Array {
  const { width, height, ink } = canvas.scaled(factor)
  const bytes = encodePng1Bit(width, height, ink)
  writeFileSync(`${OUT}/${name}`, bytes)
  console.log(`wrote ${OUT}/${name} ${width}x${height}`)
  return bytes
}

const icon = iconCanvas()

// Crisp vector favicon: one 1x1 run per horizontal stretch of ink on a white tile.
const runs: string[] = []
for (let y = 0; y < icon.height; y += 1) {
  for (let x = 0; x < icon.width; x += 1) {
    if (!icon.ink[y * icon.width + x]) continue
    let end = x
    while (end + 1 < icon.width && icon.ink[y * icon.width + end + 1]) end += 1
    runs.push(`M${x} ${y}h${end - x + 1}v1h-${end - x + 1}z`)
    x = end
  }
}
writeFileSync(
  `${OUT}/favicon.svg`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges"><rect width="32" height="32" fill="#fff"/><path d="${runs.join('')}"/></svg>\n`,
)
console.log(`wrote ${OUT}/favicon.svg`)

// favicon.ico for clients that ignore <link rel="icon">: one embedded 32x32 PNG.
const ico32 = encodePng1Bit(32, 32, icon.ink)
const header = new DataView(new ArrayBuffer(22))
header.setUint16(2, 1, true) // type: icon
header.setUint16(4, 1, true) // one image
header.setUint8(6, 32)
header.setUint8(7, 32)
header.setUint16(10, 1, true) // colour planes
header.setUint16(12, 32, true) // bits per pixel
header.setUint32(14, ico32.length, true)
header.setUint32(18, 22, true) // image offset
writeFileSync(`${OUT}/favicon.ico`, Buffer.concat([new Uint8Array(header.buffer), ico32]))
console.log(`wrote ${OUT}/favicon.ico 32x32`)

// Apple touch icon: 180 = 36 x 5, so pad the 32px art by two pixels each side.
const touch = new Canvas(36, 36)
blit(touch, icon, 2, 2)
png('apple-touch-icon.png', touch, 5)
png('icon-192.png', icon, 6)
png('icon-512.png', icon, 16)

// Social card, 1200x630 = 240x126 x 5: icon above the sample fight scene, inside a frame.
const card = new Canvas(240, 126)
card.rect(0, 0, 240, 126, 'w')
card.rect(3, 3, 234, 120, '#')
card.rect(5, 5, 230, 116, 'w')
blit(card, icon, (240 - 32) / 2, 18)
blit(card, composeScene('server_room', 'fight', { kind: 'monster', id: 'legacy_mainframe', elite: true }), (240 - STAGE_WIDTH) / 2, 60)
png('og.png', card, 5)
