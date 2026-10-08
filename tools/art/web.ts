/** Render the platform's and Desk Crawler's favicons and app icons into public/. pnpm tsx tools/art/web.ts (social cards: tools/art/og.mjs) */
import { mkdirSync, writeFileSync } from 'node:fs'
import type { Canvas } from '@trmnl-games/desk-crawler/art/canvas'
import { BRAND, Image, colourMark, markSvg } from './colour'
import { faviconCanvas, iconCanvas } from './iconArt'
import { platformFaviconCanvas, platformIconCanvas } from './platformArt'

function writeIconSet(out: string, iconArt: Canvas, faviconArt: Canvas): void {
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
}

// The platform mark at the site root; Desk Crawler's Warrior under its game path.
writeIconSet('apps/web/public', platformIconCanvas(), platformFaviconCanvas())
writeIconSet('apps/web/public/games/desk-crawler', iconCanvas(), faviconCanvas())
