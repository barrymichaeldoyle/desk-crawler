import qrcode from 'qrcode-generator'
import { encodePng1Bit } from './png'

/**
 * QR codes that lead from the screen back to the companion. Only allowlisted
 * targets are encoded, so the route can never be used to mint arbitrary codes.
 * Base scale suits the OG (1 logical px = 1 device px); the large scale gives
 * the TRMNL X whole device pixels per module (5 x 1.8 = 9).
 */
export const QR_VERSION = 3
export const QR_SCALE = 3
export const QR_LARGE_SCALE = 5
/** Every served scale: layouts pick one per size and screen (2-5 on the OG, up to 7 on the X). 2 is the full layout's corner code. */
export const QR_SCALES = new Set([2, 3, 4, 5, 7])
/**
 * v3: low error correction and a two-module quiet zone keep the codes compact on the screen (the bag link drops from
 * 33 to 29 modules). The 1-bit render is crisp and the layout leaves white space around every code, so both hold up.
 */
const QUIET_MODULES = 2

export const QR_TARGETS = { app: '/app/desk-crawler', bag: '/app/desk-crawler/inventory' } as const
export type QrTarget = keyof typeof QR_TARGETS

export const DEFAULT_COMPANION_ORIGIN = 'https://trmnlgames.com'

export const qrBasePath = (target: QrTarget) => `/art/qr/v${QR_VERSION}/${target}`
export const qrPath = (target: QrTarget, scale: number) => `${qrBasePath(target)}/${scale}.png`

export function parseQrPath(path: string): { target: QrTarget; scale: number } | null {
  const match = /^\/art\/qr\/v(\d+)\/([a-z]+)\/(\d)\.png$/.exec(path)
  if (!match || Number(match[1]) !== QR_VERSION) return null
  const target = match[2] as QrTarget
  const scale = Number(match[3])
  if (!(target in QR_TARGETS) || !QR_SCALES.has(scale)) return null
  return { target, scale }
}

export function renderQrPng(path: string, origin: string): Uint8Array | null {
  const parsed = parseQrPath(path)
  if (!parsed) return null
  const { size, ink } = qrInk(`${origin}${QR_TARGETS[parsed.target]}`, parsed.scale)
  return encodePng1Bit(size, size, ink)
}

/** Square 1-bit bitmap (1 = black) with a two-module quiet zone. */
export function qrInk(text: string, scale: number): { size: number; ink: Uint8Array } {
  const qr = qrcode(0, 'L')
  qr.addData(text)
  qr.make()
  const modules = qr.getModuleCount() + QUIET_MODULES * 2
  const size = modules * scale
  const ink = new Uint8Array(size * size)
  for (let y = 0; y < size; y += 1) {
    const my = Math.floor(y / scale) - QUIET_MODULES
    for (let x = 0; x < size; x += 1) {
      const mx = Math.floor(x / scale) - QUIET_MODULES
      const inside = my >= 0 && mx >= 0 && my < qr.getModuleCount() && mx < qr.getModuleCount()
      if (inside && qr.isDark(my, mx)) ink[y * size + x] = 1
    }
  }
  return { size, ink }
}
