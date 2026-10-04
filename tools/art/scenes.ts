/** Render sample scenes for review: pnpm tsx tools/art/scenes.ts <outDir> */
import { mkdirSync, writeFileSync } from 'node:fs'
import { encodePng1Bit } from '@trmnl-games/desk-crawler/art/png'
import { composeScene, FULL_SCALE, type Subject } from '@trmnl-games/desk-crawler/art/scene'

const out = process.argv[2] ?? 'scenes'
mkdirSync(out, { recursive: true })
const samples: Array<[string, Parameters<typeof composeScene>[0], Parameters<typeof composeScene>[1], Subject]> = [
  ['office-fight', 'office_cubicles', 'fight', { kind: 'monster', id: 'paper_imp', elite: false }],
  ['server-elite', 'server_room', 'fight', { kind: 'monster', id: 'cable_serpent', elite: true }],
  ['cafe-chest', 'cafeteria_depths', 'idle', { kind: 'prop', id: 'gold' }],
  ['office-rest', 'office_cubicles', 'rest', { kind: 'prop', id: 'campfire' }],
  ['server-ko', 'server_room', 'knocked_out', { kind: 'monster', id: 'legacy_mainframe', elite: false }],
  ['cafe-sleep', 'cafeteria_depths', 'sleep', { kind: 'prop', id: 'full_bag' }],
]
for (const [name, biome, pose, subject] of samples) {
  const { width, height, ink } = composeScene(biome, pose, subject).scaled(FULL_SCALE)
  writeFileSync(`${out}/${name}.png`, encodePng1Bit(width, height, ink))
}
console.log(`wrote ${samples.length} scenes to ${out}`)
