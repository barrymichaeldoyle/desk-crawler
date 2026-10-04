/** Render sprite contact sheets for review: pnpm tsx tools/art/sheet.ts <module> <out.png> [scale] */
import { writeFileSync } from 'node:fs'
import { Canvas, type Sprite } from '@trmnl-games/desk-crawler/art/canvas'
import { encodePng1Bit } from '@trmnl-games/desk-crawler/art/png'

const [, , moduleName = 'hero', out = 'sheet.png', scaleArg = '6'] = process.argv
const scale = Number(scaleArg)
const mod = (await import(`../../packages/desk-crawler/src/art/${moduleName}.ts`)) as Record<string, unknown>
const sprites = Object.entries(mod).filter((e): e is [string, Sprite] => typeof e[1] === 'object' && e[1] !== null && 'rows' in e[1])
const cell = Math.max(...sprites.map(([, s]) => Math.max(s.width, s.height))) + 6
const cols = Math.min(6, sprites.length)
const rows = Math.ceil(sprites.length / cols)
const canvas = new Canvas(cols * cell, rows * cell)
sprites.forEach(([, s], i) => {
  const x = (i % cols) * cell + 3
  const y = Math.floor(i / cols) * cell + 3
  canvas.draw(s, x, y + (cell - 6 - s.height))
  canvas.hline(x - 2, x + cell - 5, y + cell - 3, ':')
})
const { width, height, ink } = canvas.scaled(scale)
writeFileSync(out, encodePng1Bit(width, height, ink))
console.log(sprites.map(([n]) => n).join(', '), `-> ${out} ${width}x${height}`)
