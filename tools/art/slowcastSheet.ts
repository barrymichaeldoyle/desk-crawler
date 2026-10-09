/** Draws every Slow Cast fish at both sizes onto one sheet for review: `pnpm tsx tools/art/slowcastSheet.ts <out.png> [scale]`. */
import { writeFileSync } from 'node:fs'
import { Canvas } from '@trmnl-games/engine/art/canvas'
import { encodePng1Bit } from '@trmnl-games/engine/art/png'
import { contentV1 } from '@trmnl-games/slow-cast/content'
import { FISH_LARGE, FISH_SMALL, fishSprite } from '@trmnl-games/slow-cast/art/fish'

const out = process.argv[2] ?? 'fish-sheet.png'
const scale = Number(process.argv[3] ?? 4)
const cols = 5
const cellW = FISH_LARGE.width + FISH_SMALL.width + 8
const cellH = FISH_LARGE.height + 6
const canvas = new Canvas(cols * cellW + 4, Math.ceil(contentV1.species.length / cols) * cellH + 4)
contentV1.species.forEach((s, i) => {
  const x = 4 + (i % cols) * cellW
  const y = 4 + Math.floor(i / cols) * cellH
  canvas.draw(fishSprite(s.id, FISH_LARGE.width, FISH_LARGE.height), x, y)
  canvas.draw(fishSprite(s.id, FISH_SMALL.width, FISH_SMALL.height), x + FISH_LARGE.width + 3, y + 2)
})
const { width, height, ink } = canvas.scaled(scale)
writeFileSync(out, encodePng1Bit(width, height, ink))
console.log(`wrote ${out} (${width}x${height})`)
