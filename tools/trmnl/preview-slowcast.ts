/**
 * Slow Cast layout previews (slow-cast.md "Device", S3): every device state through the real payload builder and
 * templates, in the pinned framework shell, for OG, X and BWRY in both orientations. `--inline-art` draws scenes and
 * codes locally. Files are written as `.previews/sc-<state>--<device>[-portrait]--<layout>.html` for `pnpm sweep:trmnl`.
 *   pnpm tsx tools/trmnl/preview-slowcast.ts --inline-art
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { Liquid } from 'liquidjs'
import { buildPayload } from '@trmnl-games/slow-cast/payload'
import { renderSlowCastArt } from '@trmnl-games/slow-cast/art/route'
import { screenMarkup } from '@trmnl-games/slow-cast/templates/screen'
import { previewScenarios } from '@trmnl-games/slow-cast/templates/previewScenarios'
import { PREVIEW_DEVICES, PREVIEW_LAYOUTS, previewDocument, type PreviewDevice, type PreviewLayout } from '@trmnl-games/desk-crawler/templates/preview'

const LOCAL = 'https://local-art.invalid'
const inline = process.argv.includes('--inline-art')
const cache = new Map<string, string>()
const withArt = (html: string) =>
  inline
    ? html.replace(/https:\/\/local-art\.invalid(\/art\/sc\/[^"'\s)]+\.png)/g, (_m, path: string) => {
        let uri = cache.get(path)
        if (uri === undefined) {
          const art = renderSlowCastArt(path, 'https://trmnlgames.com')
          uri = art ? `data:image/png;base64,${Buffer.from(art.png).toString('base64')}` : `${LOCAL}${path}`
          cache.set(path, uri)
        }
        return uri
      })
    : html
const liquid = new Liquid({ timezoneOffset: 0 })
mkdirSync('.previews', { recursive: true })
let written = 0
const filter = process.argv.includes('--filter') ? process.argv[process.argv.indexOf('--filter') + 1] : null
for (const [name, input] of Object.entries(previewScenarios(LOCAL))) {
  if (filter && !name.includes(filter)) continue
  const payload = buildPayload(input)
  for (const layout of Object.keys(PREVIEW_LAYOUTS) as PreviewLayout[]) {
    const inner = withArt(await liquid.parseAndRender(screenMarkup[layout], { ...payload, fly_code: null }))
    for (const device of Object.keys(PREVIEW_DEVICES) as PreviewDevice[]) {
      for (const portrait of [false, true]) {
        const file = `.previews/sc-${name}--${device}${portrait ? '-portrait' : ''}--${layout}.html`
        writeFileSync(file, previewDocument(inner, device, layout, `Slow Cast · ${name} · ${device}${portrait ? ' portrait' : ''} · ${PREVIEW_LAYOUTS[layout].label}`, { portrait }))
        written += 1
      }
    }
  }
}
console.log(`wrote ${written} Slow Cast previews to .previews/`)
