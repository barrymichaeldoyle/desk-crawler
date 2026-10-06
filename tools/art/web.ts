/** Render the platform's and Desk Crawler's favicons, app icons and social cards into public/. pnpm tsx tools/art/web.ts */
import { mkdirSync, writeFileSync } from 'node:fs'
import type { Canvas } from '@trmnl-games/desk-crawler/art/canvas'
import { composeScene, STAGE_WIDTH } from '@trmnl-games/desk-crawler/art/scene'
import { BRAND, Image, colourMark, inkImage, markSvg, pixelText, pixelTextWidth } from './colour'
import { faviconCanvas, iconCanvas } from './iconArt'
import { platformFaviconCanvas, platformIconCanvas } from './platformArt'

/** The 6x6 menu-window frame from styles.css: notched night outline, cream line. */
function windowFrame(image: Image, left: number, top: number, width: number, height: number): void {
  image.rect(left + 1, top, width - 2, 1, BRAND.night)
  image.rect(left + 1, top + height - 1, width - 2, 1, BRAND.night)
  image.rect(left, top + 1, 1, height - 2, BRAND.night)
  image.rect(left + width - 1, top + 1, 1, height - 2, BRAND.night)
  image.rect(left + 1, top + 1, width - 2, height - 2, BRAND.cream)
  image.rect(left + 2, top + 2, width - 4, height - 4, BRAND.navy)
}

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

  // Social card, 1200x630 = 240x126 x 5: a navy menu window with the mark and gold pixel wordmark above the device's own 1-bit fight scene.
  const card = new Image(240, 126, BRAND.ground)
  windowFrame(card, 3, 3, 234, 120)
  const wordWidth = pixelTextWidth(title, 2)
  const rowLeft = Math.round((240 - (32 + 8 + wordWidth)) / 2)
  card.blit(icon, rowLeft, 14)
  pixelText(card, title, rowLeft + 40, 23, 2, BRAND.gold)
  const scene = inkImage(composeScene('server_room', 'fight', { kind: 'monster', id: 'legacy_mainframe', elite: true }))
  card.rect((240 - STAGE_WIDTH) / 2 - 3, 57, STAGE_WIDTH + 6, scene.height + 6, BRAND.night)
  card.blit(scene, (240 - STAGE_WIDTH) / 2, 60)
  png('og.png', card, 5)
}

// The platform mark at the site root; Desk Crawler's Warrior under its game path.
writeIconSet('apps/web/public', 'TRMNL Games', platformIconCanvas(), platformFaviconCanvas())
writeIconSet('apps/web/public/games/desk-crawler', 'Desk Crawler', iconCanvas(), faviconCanvas())
