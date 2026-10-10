/** Render the platform's and each game's favicons and app icons into public/, and the games' TRMNL plugin icons into docs/assets/. pnpm tsx tools/art/web.ts (social cards: tools/art/og.mjs) */
import { mkdirSync, writeFileSync } from 'node:fs'
import type { Canvas } from '@trmnl-games/desk-crawler/art/canvas'
import { BRAND, Image, colourMark, markSvg } from './colour'
import { deskCrawlerFavicon, deskCrawlerIcon, slowCastFavicon, slowCastIcon } from './gameIcons'
import { platformFaviconCanvas, platformIconCanvas } from './platformArt'

function writeIconSet(out: string, iconArt: Canvas, faviconArt: Canvas): void {
  const icon = colourMark(iconArt)
  const touch = new Image(36, 36, BRAND.gold)
  // Apple touch icon: 180 = 36 x 5, so pad the 32px art by two tile pixels each side.
  touch.blit(icon, 2, 2)
  writeImages(out, colourMark(faviconArt), [['apple-touch-icon.png', touch, 5], ['icon-192.png', icon, 6], ['icon-512.png', icon, 16]])
}

/** A game's colour icon (64px art) and its hand-drawn 16px tab icon (gameIcons.ts). */
function writeGameIconSet(out: string, icon: Image, favicon: Image, pluginIcon: string): void {
  // 64 x 3 = 192 for the touch icon too: iOS scales it, and whole-pixel steps keep the art crisp.
  writeImages(out, favicon, [['apple-touch-icon.png', icon, 3], ['icon-192.png', icon, 3], ['icon-512.png', icon, 8]])
  writeFileSync(pluginIcon, icon.scaled(8).png())
  console.log(`wrote ${pluginIcon} 512x512`)
}

function writeImages(out: string, favicon: Image, sizes: Array<[string, Image, number]>): void {
  mkdirSync(out, { recursive: true })

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

  for (const [name, image, factor] of sizes) png(name, image, factor)
}

// The platform mark at the site root; each game's colour icon under its game path.
writeIconSet('apps/web/public', platformIconCanvas(), platformFaviconCanvas())
writeGameIconSet('apps/web/public/games/desk-crawler', deskCrawlerIcon(), deskCrawlerFavicon(), 'docs/assets/plugin-icon.png')
writeGameIconSet('apps/web/public/games/slow-cast', slowCastIcon(), slowCastFavicon(), 'docs/assets/slow-cast-plugin-icon.png')
