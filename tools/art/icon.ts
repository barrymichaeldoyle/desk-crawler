/** Render the 512x512 marketplace icon: the Warrior's head and blade in a rune circle. pnpm tsx tools/art/icon.ts <out.png> */
import { writeFileSync } from 'node:fs'
import { encodePng1Bit } from '@trmnl-games/desk-crawler/art/png'
import { iconCanvas } from './iconArt'

const out = process.argv[2] ?? 'icon.png'
const { width, height, ink } = iconCanvas().scaled(16)
writeFileSync(out, encodePng1Bit(width, height, ink))
console.log(`wrote ${out} ${width}x${height}`)
