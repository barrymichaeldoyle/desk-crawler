/** Render the platform's and Desk Crawler's favicons, app icons and social cards into public/. pnpm tsx tools/art/web.ts */
import { mkdirSync, writeFileSync } from 'node:fs'
import type { Canvas } from '@trmnl-games/desk-crawler/art/canvas'
import { composeScene, STAGE_WIDTH } from '@trmnl-games/desk-crawler/art/scene'
import { BRAND, Image, bandedScene, colourMark, markSvg, pixelText, pixelTextWidth } from './colour'
import { faviconCanvas, iconCanvas } from './iconArt'
import { platformFaviconCanvas, platformIconCanvas } from './platformArt'

function writeIconSet(out: string, title: string, iconArt: Canvas, faviconArt: Canvas): void {
  mkdirSync(out, { recursive: true })
  const icon = colourMark(iconArt)
  const favicon = colourMark(faviconArt)

  function png(name: string, image: Image, factor: number): Uint8Array {
    const scaled = image.scaled(factor)
    const bytes = scaled.png()
    writeFileSync(`${out}/${name}`, bytes)
    console.log(`wrote ${out}/${name} ${scaled.width}x${scaled.height}`)
    return bytes
  }

  writeFileSync(`${out}/favicon.svg`, markSvg(favicon))
  console.log(`wrote ${out}/favicon.svg`)

  // Native 16px and doubled 32px drawings for clients that use favicon.ico.
  const ico16 = favicon.png()
  const ico32 = favicon.scaled(2).png()
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

  // Apple touch icon: 180 = 36 x 5, so pad the 32px art by two tile pixels each side.
  const touch = new Image(36, 36, BRAND.gold)
  touch.blit(icon, 2, 2)
  png('apple-touch-icon.png', touch, 5)
  png('icon-192.png', icon, 6)
  png('icon-512.png', icon, 16)

  // Social card, 1200x630 = 240x126 x 5: the mark and gold pixel wordmark over the game screen, the fight scene in Server Room colours.
  const card = new Image(240, 126, BRAND.ground)
  const wordWidth = pixelTextWidth(title, 2)
  const rowLeft = Math.round((240 - (32 + 8 + wordWidth)) / 2)
  card.blit(icon, rowLeft, 12)
  pixelText(card, title, rowLeft + 40, 21, 2, BRAND.gold)
  const scene = bandedScene(composeScene('server_room', 'fight', { kind: 'monster', id: 'legacy_mainframe', elite: true }), BRAND.serverBands)
  card.rect((240 - STAGE_WIDTH) / 2 - 3, 55, STAGE_WIDTH + 6, scene.height + 6, BRAND.night)
  card.blit(scene, (240 - STAGE_WIDTH) / 2, 58)
  png('og.png', card, 5)
}

// The platform mark at the site root; Desk Crawler's Warrior under its game path.
writeIconSet('apps/web/public', 'TRMNL Games', platformIconCanvas(), platformFaviconCanvas())
writeIconSet('apps/web/public/games/desk-crawler', 'Desk Crawler', iconCanvas(), faviconCanvas())
