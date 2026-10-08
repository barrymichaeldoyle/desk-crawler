/**
 * Local TRMNL layout preview: renders the real templates with real payloads
 * (buildPayload) through Liquid inside the pinned framework 3.4.0 CSS/JS, one
 * HTML page per state with all four sizes. Screenshot the pages for the layout
 * matrix. This approximates TRMNL's renderer; real-device renders stay the
 * acceptance gate. Scenarios live in the shared previewScenarios module; for an
 * interactive gallery run `pnpm dev` and open /dev/desk-crawler.  Usage: pnpm tsx tools/trmnl/preview.ts [artBaseUrl] [--recap] [--portrait]
 * `--dump-contexts <file>` also writes each Liquid render context, for tools/trmnl/crosscheck.ts.
 * `--inline-art` draws scenes and codes locally and inlines them, so art changes preview before any deployment serves them.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { Liquid } from 'liquidjs'
import { buildPayload, MAX_RECAP_EVENTS, type ActivityEntry, type PayloadInput } from '@trmnl-games/desk-crawler/payload'
import { displayLogDeltas } from '@trmnl-games/desk-crawler/log'
import { sceneUrlsAt } from '@trmnl-games/desk-crawler/art/sceneTime'
import { screenMarkup } from '@trmnl-games/desk-crawler/templates/screen'
import { renderScenePng } from '@trmnl-games/desk-crawler/art/route'
import { DEFAULT_COMPANION_ORIGIN, renderQrPng } from '@trmnl-games/desk-crawler/art/qr'
import { PREVIEW_DEVICES, PREVIEW_LAYOUTS, previewDocument, type PreviewDevice, type PreviewLayout } from '@trmnl-games/desk-crawler/templates/preview'
import { KEEPSAKE_FREE_SCENARIOS, NO_OFFSET_SCENARIOS, PREVIEW_KEEPSAKE_CODE, PREVIEW_NOW, PREVIEW_UTC_OFFSET, previewScenarios, withOvernightRecap } from '@trmnl-games/desk-crawler/templates/previewScenarios'

const LOCAL_ART_ORIGIN = 'https://local-art.invalid'
const inlineArt = process.argv.includes('--inline-art')
const artBaseUrl = inlineArt ? LOCAL_ART_ORIGIN : process.argv[2]?.startsWith('http') ? process.argv[2] : 'https://superb-bobcat-74.convex.site'
const artCache = new Map<string, string>()
/** The dev gallery's local art: each `/art/` path drawn by the same renderers the Convex route serves. */
const withLocalArt = (html: string) =>
  inlineArt
    ? html.replace(/https:\/\/local-art\.invalid(\/art\/[^"'\s)]+\.png)/g, (_match, path: string) => {
        let uri = artCache.get(path)
        if (uri === undefined) {
          const png = path.startsWith('/art/qr/') ? renderQrPng(path, DEFAULT_COMPANION_ORIGIN) : renderScenePng(path)
          uri = png ? `data:image/png;base64,${Buffer.from(png).toString('base64')}` : `${LOCAL_ART_ORIGIN}${path}`
          artCache.set(path, uri)
        }
        return uri
      })
    : html
const NOW = PREVIEW_NOW
/** TRMNL renders Liquid in UTC; the sample owner is in Johannesburg (UTC+2). */
const liquid = new Liquid({ timezoneOffset: 0 })
/** The screen route adds `utc_offset` from TRMNL's request; markup gets no `trmnl` object, so the preview passes none. */
const utcOffset = PREVIEW_UTC_OFFSET
const deskKeepsakeCode = process.argv.includes('--keepsakes') ? PREVIEW_KEEPSAKE_CODE : null

const { groups, overnightEntries, base } = previewScenarios(artBaseUrl)
const states = groups.states
const recapStates: Record<string, PayloadInput> = { ...groups.recap }
const sourceIndex = process.argv.indexOf('--recap-source')
if (sourceIndex >= 0) {
  const source = JSON.parse(readFileSync(process.argv[sourceIndex + 1]!, 'utf8')) as { now: number; entries: Array<ActivityEntry & { kind: string; summary: string }> }
  recapStates.recordedHistory = { ...base, logs: source.entries.slice(0, 10).map(log => ({ ...log, deltas: displayLogDeltas(log), at: log.at - source.now + NOW })), activity: { entries: source.entries.map(entry => ({ ...entry, at: entry.at - source.now + NOW })), truncated: source.entries.length > MAX_RECAP_EVENTS } }
}
const previewStates = process.argv.includes('--recap') ? { ...states, ...recapStates } : process.argv.includes('--no-effect') ? groups.noEffect : process.argv.includes('--potion-finds') ? groups.potionFinds : process.argv.includes('--marketing') ? groups.marketing : states

mkdirSync('.previews', { recursive: true })
let written = 0
const contextsIndex = process.argv.indexOf('--dump-contexts')
const contexts: Array<{ name: string; layout: PreviewLayout; context: Record<string, unknown> }> = []
for (const [name, input] of Object.entries(previewStates)) {
  const withRecap = process.argv.includes('--recap') ? withOvernightRecap(input, overnightEntries) : input
  const payload = sceneUrlsAt(buildPayload(withRecap), input.now, utcOffset)
  if (process.argv.includes('--recap')) writeFileSync(`.previews/${name}--payload.json`, JSON.stringify(payload, null, 2))
  for (const layout of Object.keys(PREVIEW_LAYOUTS) as PreviewLayout[]) {
    const context = { ...payload, desk_keepsake_code: KEEPSAKE_FREE_SCENARIOS.has(name) ? null : deskKeepsakeCode, utc_offset: NO_OFFSET_SCENARIOS.has(name) ? null : utcOffset }
    if (contextsIndex >= 0) contexts.push({ name, layout, context })
    const inner = withLocalArt(await liquid.parseAndRender(screenMarkup[layout], context))
    for (const device of Object.keys(PREVIEW_DEVICES) as PreviewDevice[]) {
      writeFileSync(`.previews/${name}--${device}--${layout}.html`, previewDocument(inner, device, layout, `${name} · ${device} · ${PREVIEW_LAYOUTS[layout].label}`))
      written++
      if (process.argv.includes('--portrait')) {
        writeFileSync(`.previews/${name}--${device}-portrait--${layout}.html`, previewDocument(inner, device, layout, `${name} · ${device} portrait · ${PREVIEW_LAYOUTS[layout].label}`, { portrait: true }))
        written++
      }
    }
  }
}
if (contextsIndex >= 0) writeFileSync(process.argv[contextsIndex + 1]!, JSON.stringify(contexts))
console.log(`wrote ${written} previews to .previews/`)
