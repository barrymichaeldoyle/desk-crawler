/** Draws Slow Cast scenes for review: `pnpm tsx tools/art/slowcastScenes.ts <out.png>`. One row per water, columns across poses, bands and weather. */
import { writeFileSync } from 'node:fs'
import { Canvas } from '@trmnl-games/engine/art/canvas'
import { encodePng1Bit } from '@trmnl-games/engine/art/png'
import { composeScene, STAGE_HEIGHT, STAGE_WIDTH, type SceneKey } from '@trmnl-games/slow-cast/art/scene'

const out = process.argv[2] ?? 'scenes.png'
const scale = Number(process.argv[3] ?? 2)
const cells: SceneKey[][] = [
  [{ water: 'millpond', band: 'day', weather: 'clear', pose: 'waiting', fish: null }, { water: 'millpond', band: 'dawn', weather: 'clear', pose: 'holding', fish: 'golden_carp' }, { water: 'millpond', band: 'night', weather: 'fog', pose: 'reeling', fish: null }],
  [{ water: 'river_bend', band: 'dusk', weather: 'rain', pose: 'holding', fish: 'salmon' }, { water: 'river_bend', band: 'day', weather: 'overcast', pose: 'casting', fish: null }, { water: 'river_bend', band: 'night', weather: 'clear', pose: 'paused', fish: null }],
  [{ water: 'harbour_pier', band: 'day', weather: 'wind', pose: 'waiting', fish: null }, { water: 'harbour_pier', band: 'night', weather: 'overcast', pose: 'holding', fish: 'thornback_ray' }, { water: 'harbour_pier', band: 'dawn', weather: 'fog', pose: 'holding', fish: 'mackerel' }],
]
const pad = 4
const sheet = new Canvas(cells[0]!.length * (STAGE_WIDTH + pad) + pad, cells.length * (STAGE_HEIGHT + pad) + pad)
cells.forEach((row, r) =>
  row.forEach((key, i) => {
    const scene = composeScene(key)
    const left = pad + i * (STAGE_WIDTH + pad)
    const top = pad + r * (STAGE_HEIGHT + pad)
    for (let y = 0; y < STAGE_HEIGHT; y += 1) for (let x = 0; x < STAGE_WIDTH; x += 1) sheet.set(left + x, top + y, scene.ink[y * STAGE_WIDTH + x] === 1)
    sheet.rect(left - 1, top - 1, STAGE_WIDTH + 2, 1, '#')
    sheet.rect(left - 1, top + STAGE_HEIGHT, STAGE_WIDTH + 2, 1, '#')
  }),
)
const { width, height, ink } = sheet.scaled(scale)
writeFileSync(out, encodePng1Bit(width, height, ink))
console.log(`wrote ${out} (${width}x${height})`)
