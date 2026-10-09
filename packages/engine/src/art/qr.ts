import qrcode from 'qrcode-generator'

/** Two-module quiet zone (Desk Crawler QR v3): compact codes that still scan, since layouts leave white space around them. */
export const QUIET_MODULES = 2

/** Square 1-bit bitmap (1 = black) with a two-module quiet zone, or on the left and bottom only for a `corner` code. */
export function qrInk(text: string, scale: number, corner = false): { size: number; ink: Uint8Array } {
  const qr = qrcode(0, 'L')
  qr.addData(text)
  qr.make()
  const modules = qr.getModuleCount() + QUIET_MODULES * (corner ? 1 : 2)
  const size = modules * scale
  const ink = new Uint8Array(size * size)
  for (let y = 0; y < size; y += 1) {
    const my = Math.floor(y / scale) - (corner ? 0 : QUIET_MODULES)
    for (let x = 0; x < size; x += 1) {
      const mx = Math.floor(x / scale) - QUIET_MODULES
      const inside = my >= 0 && mx >= 0 && my < qr.getModuleCount() && mx < qr.getModuleCount()
      if (inside && qr.isDark(my, mx)) ink[y * size + x] = 1
    }
  }
  return { size, ink }
}
