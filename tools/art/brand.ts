/** Render square TRMNL Games logos for sign-in providers (Clerk, Google, GitHub) into docs/assets/brand/. pnpm tsx tools/art/brand.ts */
import { mkdirSync, writeFileSync } from 'node:fs'
import { Canvas } from '@trmnl-games/desk-crawler/art/canvas'
import { encodePng1Bit } from '@trmnl-games/desk-crawler/art/png'
import { platformIconCanvas } from './platformArt'

const OUT = 'docs/assets/brand'
mkdirSync(OUT, { recursive: true })

// Four pixels of white around the 32px mark keep the display clear of circular avatar crops.
const icon = platformIconCanvas()
const padded = new Canvas(40, 40)
for (let y = 0; y < icon.height; y += 1) for (let x = 0; x < icon.width; x += 1) padded.set(x + 4, y + 4, icon.ink[y * icon.width + x] === 1)

for (const factor of [3, 5, 10, 25]) {
  const { width, height, ink } = padded.scaled(factor)
  writeFileSync(`${OUT}/logo-${width}.png`, encodePng1Bit(width, height, ink))
  console.log(`wrote ${OUT}/logo-${width}.png ${width}x${height}`)
}
