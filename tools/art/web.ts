/** Render the platform's and Desk Crawler's favicons, app icons and social cards into public/. pnpm tsx tools/art/web.ts */
import { mkdirSync, writeFileSync } from 'node:fs'
import { Canvas } from '@trmnl-games/desk-crawler/art/canvas'
import { encodePng1Bit } from '@trmnl-games/desk-crawler/art/png'
import { composeScene, STAGE_WIDTH } from '@trmnl-games/desk-crawler/art/scene'
import { faviconCanvas, iconCanvas } from './iconArt'
import { platformFaviconCanvas, platformIconCanvas } from './platformArt'

function blit(target: Canvas, source: Canvas, left: number, top: number): void {
  for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) target.set(left + x, top + y, source.ink[y * source.width + x] === 1)
}

function writeIconSet(out: string, icon: Canvas, favicon: Canvas): void {
  mkdirSync(out, { recursive: true })

  function png(name: string, canvas: Canvas, factor: number): Uint8Array {
    const { width, height, ink } = canvas.scaled(factor)
    const bytes = encodePng1Bit(width, height, ink)
    writeFileSync(`${out}/${name}`, bytes)
    console.log(`wrote ${out}/${name} ${width}x${height}`)
    return bytes
  }

  // Crisp vector favicon: one 1x1 run per horizontal stretch of ink on a white tile.
  const runs: string[] = []
  for (let y = 0; y < favicon.height; y += 1) {
    for (let x = 0; x < favicon.width; x += 1) {
      if (!favicon.ink[y * favicon.width + x]) continue
      let end = x
      while (end + 1 < favicon.width && favicon.ink[y * favicon.width + end + 1]) end += 1
      runs.push(`M${x} ${y}h${end - x + 1}v1h-${end - x + 1}z`)
      x = end
    }
  }
  writeFileSync(
    `${out}/favicon.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect width="16" height="16" fill="#fff"/><path d="${runs.join('')}"/></svg>\n`,
  )
  console.log(`wrote ${out}/favicon.svg`)

  // Native 16px and doubled 32px drawings for clients that use favicon.ico.
  const ico16 = encodePng1Bit(16, 16, favicon.ink)
  const doubled = favicon.scaled(2)
  const ico32 = encodePng1Bit(32, 32, doubled.ink)
  const header = new DataView(new ArrayBuffer(38))
  header.setUint16(2, 1, true) // type: icon
  header.setUint16(4, 2, true)
  header.setUint8(6, 16)
  header.setUint8(7, 16)
  header.setUint16(10, 1, true) // colour planes
  header.setUint16(12, 32, true) // bits per pixel
  header.setUint32(14, ico16.length, true)
  header.setUint32(18, 38, true)
  header.setUint8(22, 32)
  header.setUint8(23, 32)
  header.setUint16(26, 1, true)
  header.setUint16(28, 32, true)
  header.setUint32(30, ico32.length, true)
  header.setUint32(34, 38 + ico16.length, true)
  writeFileSync(`${out}/favicon.ico`, Buffer.concat([new Uint8Array(header.buffer), ico16, ico32]))
  console.log(`wrote ${out}/favicon.ico 16x16, 32x32`)

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
}

// The platform mark at the site root; Desk Crawler's Warrior under its game path.
writeIconSet('apps/web/public', platformIconCanvas(), platformFaviconCanvas())
writeIconSet('apps/web/public/games/desk-crawler', iconCanvas(), faviconCanvas())
