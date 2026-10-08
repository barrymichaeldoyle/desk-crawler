/**
 * Screenshot the dev-only /dev/og cards into the social images. Needs `pnpm dev` running.
 * Usage: node tools/art/og.mjs [origin]   (default http://localhost:3000)
 */
import { chromium } from 'playwright-core'

const origin = process.argv[2] ?? 'http://localhost:3000'
const CARDS = { platform: 'apps/web/public/og.png', 'desk-crawler': 'apps/web/public/games/desk-crawler/og.png' }

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
for (const [card, out] of Object.entries(CARDS)) {
  await page.goto(`${origin}/dev/og?card=${card}`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.locator('#og-card').screenshot({ path: out })
  console.log(`wrote ${out}`)
}
await browser.close()
