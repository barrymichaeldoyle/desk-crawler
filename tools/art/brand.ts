/** Render square TRMNL Games logos for sign-in providers (Clerk, Google, GitHub) into docs/assets/brand/. pnpm tsx tools/art/brand.ts */
import { mkdirSync, writeFileSync } from 'node:fs'
import { BRAND, Image, colourMark } from './colour'
import { platformIconCanvas } from './platformArt'

const OUT = 'docs/assets/brand'
mkdirSync(OUT, { recursive: true })

// Four pixels of gold tile around the 32px mark keep the display clear of circular avatar crops.
const padded = new Image(40, 40, BRAND.gold)
padded.blit(colourMark(platformIconCanvas()), 4, 4)

for (const factor of [3, 5, 10, 25]) {
  const image = padded.scaled(factor)
  writeFileSync(`${OUT}/logo-${image.width}.png`, image.png())
  console.log(`wrote ${OUT}/logo-${image.width}.png ${image.width}x${image.height}`)
}
