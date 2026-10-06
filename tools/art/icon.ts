/** Render the 512x512 marketplace icon: the Warrior's head and blade in a rune circle, in the Party Menu colours. pnpm tsx tools/art/icon.ts <out.png> */
import { writeFileSync } from 'node:fs'
import { colourMark } from './colour'
import { iconCanvas } from './iconArt'

const out = process.argv[2] ?? 'icon.png'
const image = colourMark(iconCanvas()).scaled(16)
writeFileSync(out, image.png())
console.log(`wrote ${out} ${image.width}x${image.height}`)
