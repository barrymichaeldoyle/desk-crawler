/**
 * Headless sweep of the local TRMNL previews, the layout evidence behind docs/evidence/*-results.json. Run
 * `pnpm tsx tools/trmnl/preview.ts [--recap] --portrait` first; this serves `.previews` over localhost, loads every
 * `*--*.html` page in the pinned framework at its device's layout box with the Chromium that Playwright has cached
 * (`~/Library/Caches/ms-playwright`, installed by the Playwright MCP or `npx playwright install chromium`), waits for
 * the framework to settle, then records layout checks and optional screenshots. It approximates TRMNL's renderer;
 * real-device renders stay the acceptance gate.
 * Usage: pnpm sweep:trmnl <outJson> [--shots <dir>] [--filter <substring>]   (run from the repository root)
 */
import { chromium } from 'playwright-core'
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'

const [outJson] = process.argv.slice(2)
if (!outJson || outJson.startsWith('--')) throw new Error('Usage: pnpm sweep:trmnl <outJson> [--shots <dir>] [--filter <substring>]')
const shotsIndex = process.argv.indexOf('--shots')
const shotsDir = shotsIndex >= 0 ? process.argv[shotsIndex + 1] : null
const filterIndex = process.argv.indexOf('--filter')
const filter = filterIndex >= 0 ? process.argv[filterIndex + 1] : null
const previews = join(process.cwd(), '.previews')
const SIZES = {
  og: { markup: [800, 480], markup_half_horizontal: [800, 240], markup_half_vertical: [400, 480], markup_quadrant: [400, 240] },
  bwry: { markup: [800, 480], markup_half_horizontal: [800, 240], markup_half_vertical: [400, 480], markup_quadrant: [400, 240] },
  x: { markup: [1872, 1404], markup_half_horizontal: [1872, 702], markup_half_vertical: [936, 1404], markup_quadrant: [936, 702] },
}

const server = createServer(async (req, res) => {
  try {
    const file = decodeURIComponent(new URL(req.url, 'http://x').pathname.slice(1))
    const body = await readFile(join(previews, file))
    res.setHeader('content-type', 'text/html; charset=utf-8')
    res.end(body)
  } catch {
    res.statusCode = 404
    res.end()
  }
})
await new Promise((resolve) => server.listen(0, resolve))
const port = server.address().port

const files = readdirSync(previews).filter((f) => f.endsWith('.html') && f.includes('--') && !f.startsWith('review--') && (!filter || f.includes(filter)))
if (shotsDir) mkdirSync(shotsDir, { recursive: true })
const browser = await chromium.launch()
const results = []
let failures = 0
const context = await browser.newContext({ deviceScaleFactor: 1 })
const page = await context.newPage()
for (const file of files.sort()) {
  const [state, deviceOrient, layoutExt] = file.split('--')
  const layout = layoutExt.replace('.html', '')
  const portrait = deviceOrient.endsWith('-portrait')
  const device = deviceOrient.replace('-portrait', '')
  // The whole screen, so every mashup slot is on the page in either orientation; checks measure the plugin's view.
  const [w, h] = SIZES[device].markup
  const size = portrait ? { width: h, height: w } : { width: w, height: h }
  await page.setViewportSize(size)
  // The framework loads from trmnl.com, so a stalled request could hold a page forever: bound each load and retry once.
  const settle = async () => {
    await page.goto(`http://127.0.0.1:${port}/${file}`, { waitUntil: 'load', timeout: 60000 })
    await page.waitForFunction(() => window.TRMNL_PLUGINS_READY === true, null, { timeout: 20000 }).catch(() => {})
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(400); await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  }
  const bounded = () => Promise.race([settle(), new Promise((_, reject) => setTimeout(() => reject(new Error(`timed out loading ${file}`)), 90000))])
  await bounded().catch(async (error) => {
    process.stdout.write(`retry ${file}: ${error.message}\n`)
    await bounded()
  })
  const result = await page.evaluate(() => {
    const view = document.querySelector('.view')
    const footer = Array.from(document.querySelectorAll('.title_bar')).find((el) => el.getClientRects().length > 0)
    const layoutEl = Array.from(document.querySelectorAll('.layout')).find((el) => el.getClientRects().length > 0)
    if (!view || !footer || !layoutEl) return { error: 'missing view, layout or footer' }
    const v = view.getBoundingClientRect()
    const bound = Math.min(footer.getBoundingClientRect().top, v.bottom)
    const visible = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'
    const overflow = Array.from(layoutEl.querySelectorAll('span,img,div')).filter(visible).filter((e) => {
      const r = e.getBoundingClientRect()
      return r.height > 0 && (r.bottom > bound + 2 || r.right > v.right + 2 || r.left < v.left - 2)
    }).map((e) => ({ tag: e.tagName, cls: e.className, text: (e.innerText || e.getAttribute('src') || '').slice(0, 60), bottom: e.getBoundingClientRect().bottom, right: e.getBoundingClientRect().right, bound, viewRight: v.right }))
    const broken = Array.from(layoutEl.querySelectorAll('img')).filter(visible).filter((e) => e.complete && e.naturalWidth === 0).map((e) => e.src.slice(0, 80))
    const textOverflow = Array.from(layoutEl.querySelectorAll('span')).filter(visible).filter((e) => !e.querySelector('span') && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'hidden' && !e.closest('[data-clamp]')).map((e) => ({ text: e.innerText.slice(0, 60), scroll: e.scrollWidth, client: e.clientWidth }))
    const lists = Array.from(layoutEl.querySelectorAll('[data-story-list]')).filter(visible).map((e) => ({ fit: e.dataset.storyFit, count: Number(e.dataset.storyCount), candidates: e.querySelectorAll(':scope > .block').length }))
    const hearts = Array.from(layoutEl.querySelectorAll('[data-hearts]')).filter(visible).map((e) => ({ halves: Number(e.dataset.hearts), images: e.firstElementChild.querySelectorAll('img').length, width: e.getBoundingClientRect().width, wrappedRows: new Set(Array.from(e.firstElementChild.querySelectorAll('img')).map((i) => Math.round(i.getBoundingClientRect().top))).size, rows: ((boxes) => (Math.max(...boxes.map((b) => b.top)) >= Math.min(...boxes.map((b) => b.bottom)) ? 2 : 1))(Array.from(e.children).filter(visible).map((i) => i.getBoundingClientRect())) }))
    const ticks = Array.from(layoutEl.querySelectorAll('[data-xp-ticks]')).filter(visible).map((e) => ({ halves: Number(e.dataset.xpTicks), images: e.firstElementChild.querySelectorAll('img').length, rows: new Set(Array.from(e.children).map((i) => Math.round(i.getBoundingClientRect().top))).size, tickRows: new Set(Array.from(e.firstElementChild.querySelectorAll('img')).map((i) => Math.round(i.getBoundingClientRect().top))).size }))
    const counters = Array.from(layoutEl.querySelectorAll('[data-counters]')).filter(visible).map((e) => ({ items: e.children.length, rows: new Set(Array.from(e.children).map((i) => Math.round(i.getBoundingClientRect().top))).size, text: e.innerText.replace(/\s+/g, ' ').trim() }))
    const rankRows = Array.from(layoutEl.querySelectorAll('[data-rank-row]')).filter(visible).map((e) => ({ rank: e.dataset.rankRow, own: e.classList.contains('label--inverted'), text: e.innerText.replace(/\s+/g, ' ').trim(), color: getComputedStyle(e.querySelector('span')).color, bg: getComputedStyle(e).backgroundColor, height: e.getBoundingClientRect().height }))
    const scene = Array.from(layoutEl.querySelectorAll('img')).filter(visible).find((e) => e.naturalWidth > 200)
    const recaps = Array.from(layoutEl.querySelectorAll('[data-recap-items]')).filter(visible).map((e) => ({ lines: Number(e.dataset.recapItems), fit: e.dataset.recapFit, shown: Number(e.dataset.recapCount), items: e.querySelectorAll('[data-recap-item]').length, marks: Array.from(e.querySelectorAll('[data-recap-item]')).filter(visible).filter((i) => i.querySelector('img')).length, text: e.innerText.replace(/\s+/g, ' ').trim() }))
    const chips = Array.from(layoutEl.querySelectorAll('.label--outline')).filter(visible).length
    // The title bar sits outside the layout: its title, instance text and icon must stay inside the view (D115 found a
    // fly code running off a narrow portrait bar that the layout checks could not see).
    const titleOverflow = Array.from(footer.querySelectorAll('span,img')).filter(visible).filter((e) => {
      const r = e.getBoundingClientRect()
      // The framework ellipsizes `.instance` text, which hides a code's last digits, so any truncated instance fails.
      const truncated = e.tagName === 'SPAN' && e.scrollWidth > e.clientWidth + 2 && (e.classList.contains('instance') || getComputedStyle(e).textOverflow !== 'ellipsis')
      return r.width > 0 && (r.right > v.right + 2 || r.left < v.left - 2 || truncated)
    }).map((e) => ({ tag: e.tagName, text: (e.innerText || '').slice(0, 40), right: e.getBoundingClientRect().right, viewRight: v.right }))
    // Nothing above the recap ribbon may run into it: every visible text or image outside it ends above its top.
    const ribbon = Array.from(layoutEl.querySelectorAll('[data-recap-ribbon]')).find(visible)
    const ribbonTop = ribbon ? ribbon.getBoundingClientRect().top : null
    const underRibbon = ribbon ? Array.from(layoutEl.querySelectorAll('span,img')).filter(visible).filter((e) => !ribbon.contains(e) && e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().bottom > ribbonTop + 1).map((e) => ({ tag: e.tagName, text: (e.innerText || '').slice(0, 40), bottom: e.getBoundingClientRect().bottom, ribbonTop })) : []
    return { bound, overflow, broken, textOverflow, titleOverflow, underRibbon, lists, recaps, hearts, ticks, counters, rankRows, chips, sceneTop: scene ? scene.getBoundingClientRect().top : null, storyTop: lists.length ? layoutEl.querySelector('[data-story-list]').getBoundingClientRect().top : null }
  })
  const ok = !result.error && result.overflow.length === 0 && result.titleOverflow.length === 0 && result.underRibbon.length === 0 && result.broken.length === 0 && result.textOverflow.length === 0 && result.lists.every((l) => l.fit === 'complete') && result.recaps.every((r) => r.fit === 'complete') && result.hearts.every((h) => h.images === 10 && h.wrappedRows === 1 && h.rows === 1) && result.ticks.every((t) => t.images === 10 && t.tickRows === 1)
  if (!ok) failures++
  results.push({ file, state, device, portrait, layout, ok, ...result })
  // The plugin's own view: in portrait the mashup slots are not the landscape box turned on its side.
  if (shotsDir) await page.locator('.view').first().screenshot({ path: join(shotsDir, file.replace('.html', '.png')) })
  process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${file}\n`)
}
await browser.close()
server.close()
writeFileSync(outJson, JSON.stringify({ total: results.length, failures, results }, null, 1))
console.log(`${results.length} previews, ${failures} failures → ${outJson}`)
