import { Link, createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { buildPayload, type PayloadInput } from '@trmnl-games/desk-crawler/payload'
import { sceneUrlsAt } from '@trmnl-games/desk-crawler/art/sceneTime'
import { renderScenePng } from '@trmnl-games/desk-crawler/art/route'
import { DEFAULT_COMPANION_ORIGIN, renderQrPng } from '@trmnl-games/desk-crawler/art/qr'
import { screenMarkup } from '@trmnl-games/desk-crawler/templates/screen'
import { PREVIEW_DEVICES, PREVIEW_LAYOUTS, previewDocument, previewSize, type PreviewDevice, type PreviewLayout } from '@trmnl-games/desk-crawler/templates/preview'
import {
  KEEPSAKE_FREE_SCENARIOS,
  NO_OFFSET_SCENARIOS,
  PREVIEW_KEEPSAKE_CODE,
  PREVIEW_SCENARIO_GROUP_LABELS,
  PREVIEW_UTC_OFFSET,
  previewScenarios,
  withOvernightRecap,
  type PreviewScenarioGroup,
} from '@trmnl-games/desk-crawler/templates/previewScenarios'
import { seo } from '../../lib/seo'

/**
 * Dev-only layout gallery: every fictional preview scenario rendered through the
 * real payload builder and Liquid templates in the pinned framework, on any
 * device, layout and orientation. Template edits hot-reload. Same approximation
 * of TRMNL's renderer as tools/trmnl/preview.ts; real-device renders stay the
 * acceptance gate.
 */
const LAYOUTS = Object.keys(PREVIEW_LAYOUTS) as PreviewLayout[]
const DEVICES = Object.keys(PREVIEW_DEVICES) as PreviewDevice[]
const ORIENTATIONS = ['landscape', 'portrait'] as const
type Orientation = (typeof ORIENTATIONS)[number]
const VIEWS = { screen: 'One screen', layouts: 'Every layout', scenarios: 'Every scenario' } as const
type View = keyof typeof VIEWS

/**
 * Art is drawn here from the same pure renderers the Convex /art/ route serves, then inlined as data URIs: no network,
 * nothing for a deployment to drop when dozens of screens load at once, and art edits hot-reload like templates.
 */
const LOCAL_ART_ORIGIN = 'https://local-art.invalid'
const ART_URL = new RegExp(`${LOCAL_ART_ORIGIN.replaceAll('.', '\\.')}(/art/[^"'\\s)]+\\.png)`, 'g')
const artCache = new Map<string, string>()
function artDataUri(path: string): string {
  let uri = artCache.get(path)
  if (uri === undefined) {
    const png = path.startsWith('/art/qr/') ? renderQrPng(path, DEFAULT_COMPANION_ORIGIN) : renderScenePng(path)
    uri = png ? `data:image/png;base64,${btoa(Array.from(png, (byte) => String.fromCharCode(byte)).join(''))}` : `${LOCAL_ART_ORIGIN}${path}`
    artCache.set(path, uri)
  }
  return uri
}
const inlineArt = (html: string) => html.replace(ART_URL, (_match, path: string) => artDataUri(path))

const { groups, overnightEntries } = previewScenarios(LOCAL_ART_ORIGIN)
const SCENARIOS: Array<{ group: PreviewScenarioGroup; name: string; input: PayloadInput }> = (Object.keys(groups) as PreviewScenarioGroup[]).flatMap((group) =>
  Object.entries(groups[group]).map(([name, input]) => ({ group, name, input })),
)

/**
 * A real hero's payload from `pnpm pull:trmnl` (tools/trmnl/pull-live.mjs), shown as the "live" scenario when the
 * file exists. Re-pulling hot-reloads it. Its art URLs point at the pulled deployment and are redrawn locally.
 */
interface LivePull { alias: string; deployment: string; now: number; utcOffset: number; payload: Record<string, unknown> }
const LIVE_FILES: Record<string, LivePull> = import.meta.env.DEV ? import.meta.glob('../../../../../.previews/live-payload.json', { eager: true, import: 'default' }) : {}
const LIVE = Object.values(LIVE_FILES)[0] ?? null
const LIVE_SCENARIO = 'live'
const SCENARIO_NAMES = [...SCENARIOS.map((scenario) => scenario.name), ...(LIVE ? [LIVE_SCENARIO] : [])]

interface PreviewSearch {
  view: View
  scenario: string
  device: PreviewDevice | 'all'
  layout: PreviewLayout
  orientation: Orientation | 'both'
  recap: boolean
  keepsake: boolean
}

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(value as T) ? (value as T) : fallback)
const flag = (value: unknown) => value === true || value === 'true' || value === 1 || value === '1'

export const Route = createFileRoute('/dev/desk-crawler')({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  head: () => seo({ title: 'Desk Crawler previews', index: false }),
  validateSearch: (search: Record<string, unknown>): PreviewSearch => ({
    view: pick(search.view, Object.keys(VIEWS) as View[], 'layouts'),
    scenario: pick(search.scenario, SCENARIO_NAMES, 'normal'),
    device: pick(search.device, [...DEVICES, 'all'] as const, 'all'),
    layout: pick(search.layout, LAYOUTS, 'markup'),
    orientation: pick(search.orientation, [...ORIENTATIONS, 'both'] as const, 'landscape'),
    recap: flag(search.recap),
    keepsake: flag(search.keepsake),
  }),
  component: PreviewGallery,
})

let renderer: Promise<{ engine: import('liquidjs').Liquid; templates: Record<PreviewLayout, import('liquidjs').Template[]> }> | undefined
const getRenderer = () =>
  (renderer ??= import('liquidjs').then(({ Liquid }) => {
    const engine = new Liquid({ timezoneOffset: 0 })
    const templates = Object.fromEntries(LAYOUTS.map((layout) => [layout, engine.parse(screenMarkup[layout])])) as Record<PreviewLayout, import('liquidjs').Template[]>
    return { engine, templates }
  }))

interface Shot {
  scenario: string
  device: PreviewDevice
  layout: PreviewLayout
  portrait: boolean
}

/** The same envelope tools/trmnl/preview.ts renders: payload, owner offset and optional keepsake code. */
async function renderShot(shot: Shot, options: { recap: boolean; keepsake: boolean }): Promise<string> {
  const { engine, templates } = await getRenderer()
  const inner = await engine.render(templates[shot.layout], {
    ...shotPayload(shot.scenario, options.recap),
    desk_keepsake_code: options.keepsake && !KEEPSAKE_FREE_SCENARIOS.has(shot.scenario) ? PREVIEW_KEEPSAKE_CODE : null,
  })
  const orientation = shot.portrait ? ' portrait' : ''
  return previewDocument(inlineArt(inner), shot.device, shot.layout, `${shot.scenario} · ${PREVIEW_DEVICES[shot.device].label}${orientation} · ${PREVIEW_LAYOUTS[shot.layout].label}`, { shadeOtherSlots: true, portrait: shot.portrait })
}

/** The merge variables before the keepsake code: a fictional scenario's built payload, or the pulled live one as the screen route sends it. */
function shotPayload(name: string, recap: boolean): Record<string, unknown> {
  if (name === LIVE_SCENARIO && LIVE) {
    const local = JSON.parse(JSON.stringify(LIVE.payload).replace(/https:\/\/[\w.-]+\/art\//g, `${LOCAL_ART_ORIGIN}/art/`)) as ReturnType<typeof buildPayload>
    return { ...sceneUrlsAt(local, LIVE.now, LIVE.utcOffset), utc_offset: LIVE.utcOffset }
  }
  const scenario = SCENARIOS.find((entry) => entry.name === name)!
  const input = recap ? withOvernightRecap(scenario.input, overnightEntries) : scenario.input
  return { ...sceneUrlsAt(buildPayload(input), input.now, PREVIEW_UTC_OFFSET), utc_offset: NO_OFFSET_SCENARIOS.has(name) ? null : PREVIEW_UTC_OFFSET }
}

function shotsFor(search: PreviewSearch): Shot[] {
  const devices = search.device === 'all' ? DEVICES : [search.device]
  const orientations = search.orientation === 'both' ? [false, true] : [search.orientation === 'portrait']
  if (search.view === 'screen') return [{ scenario: search.scenario, device: devices[0]!, layout: search.layout, portrait: orientations[0]! }]
  if (search.view === 'scenarios') return SCENARIO_NAMES.flatMap((scenario) => devices.flatMap((device) => orientations.map((portrait) => ({ scenario, device, layout: search.layout, portrait }))))
  return devices.flatMap((device) => orientations.flatMap((portrait) => LAYOUTS.map((layout) => ({ scenario: search.scenario, device, layout, portrait }))))
}

function PreviewGallery() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const set = (patch: Partial<PreviewSearch>) => void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true })
  const shots = shotsFor(search)
  const single = search.view === 'screen'

  return (
    <main id="main" className="mx-auto flex w-full max-w-[110rem] flex-col gap-5 px-4 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">TRMNL previews</h1>
        <p className="text-sm text-muted">
          Fictional scenarios through the real payload and templates in framework 3.4, plus a real hero as “live” after <code>pnpm pull:trmnl</code>. Template edits and re-pulls reload here. This approximates TRMNL's renderer, so check a live device before you ship lifecycle changes. Shaded slots stand in for other plugins.
        </p>
      </header>

      <section aria-label="Preview options" className="window flex flex-col gap-4 px-4 py-4">
        <Segmented label="View" value={search.view} options={VIEWS} onChange={(view) => set({ view })} />
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="label-px text-muted">Scenario</span>
            <select
              value={search.scenario}
              disabled={search.view === 'scenarios'}
              onChange={(event) => set({ scenario: event.target.value })}
              className="min-h-11 border-2 border-edge bg-night px-2 text-ink disabled:opacity-50"
            >
              {LIVE ? (
                <optgroup label={`Live (${LIVE.deployment})`}>
                  <option value={LIVE_SCENARIO}>{`${LIVE_SCENARIO} · ${LIVE.alias} · pulled ${new Date(LIVE.now + LIVE.utcOffset * 1000).toISOString().slice(11, 16)}`}</option>
                </optgroup>
              ) : null}
              {(Object.keys(groups) as PreviewScenarioGroup[]).map((group) => (
                <optgroup key={group} label={PREVIEW_SCENARIO_GROUP_LABELS[group]}>
                  {Object.keys(groups[group]).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <Segmented
            label="Device"
            value={single && search.device === 'all' ? DEVICES[0]! : search.device}
            options={{ ...Object.fromEntries(DEVICES.map((device) => [device, PREVIEW_DEVICES[device].label])), ...(single ? {} : { all: 'All' }) } as Record<PreviewDevice | 'all', string>}
            onChange={(device) => set({ device })}
          />
          <Segmented
            label="Layout"
            value={search.layout}
            disabled={search.view === 'layouts'}
            options={Object.fromEntries(LAYOUTS.map((layout) => [layout, PREVIEW_LAYOUTS[layout].label])) as Record<PreviewLayout, string>}
            onChange={(layout) => set({ layout })}
          />
          <Segmented
            label="Orientation"
            value={single && search.orientation === 'both' ? 'landscape' : search.orientation}
            options={{ landscape: 'Landscape', portrait: 'Portrait', ...(single ? {} : { both: 'Both' }) } as Record<Orientation | 'both', string>}
            onChange={(orientation) => set({ orientation })}
          />
          <div className="flex flex-col gap-1 text-sm">
            <span className="label-px text-muted">Extras</span>
            <div className="flex min-h-11 items-center gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={search.recap} onChange={(event) => set({ recap: event.target.checked })} />
                Overnight recap
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={search.keepsake} onChange={(event) => set({ keepsake: event.target.checked })} />
                Keepsake code
              </label>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted" role="status">
          {shots.length === 1 ? '1 screen' : `${shots.length} screens`}
        </p>
      </section>

      <div className={single ? 'flex flex-col items-center' : 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,22rem),1fr))] items-start gap-5'}>
        {shots.map((shot) => (
          <ShotTile key={`${shot.scenario}-${shot.device}-${shot.layout}-${shot.portrait}`} shot={shot} recap={search.recap} keepsake={search.keepsake} single={single} />
        ))}
      </div>
    </main>
  )
}

function Segmented<T extends string>({ label, value, options, onChange, disabled = false }: { label: string; value: T; options: Record<T, string>; onChange: (value: T) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="label-px text-muted">{label}</span>
      <div role="group" aria-label={label} className={`flex flex-wrap border-2 border-edge ${disabled ? 'opacity-50' : ''}`}>
        {(Object.keys(options) as T[]).map((key) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            aria-pressed={!disabled && value === key}
            onClick={() => onChange(key)}
            className="menu-cursor flex min-h-11 items-center px-3 font-semibold text-muted not-last:border-r-2 not-last:border-edge hover:text-ink disabled:cursor-not-allowed aria-pressed:bg-navy aria-pressed:text-gold"
          >
            {options[key]}
          </button>
        ))}
      </div>
    </div>
  )
}

function ShotTile({ shot, recap, keepsake, single }: { shot: Shot; recap: boolean; keepsake: boolean; single: boolean }) {
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(0)
  const frame = useRef<HTMLDivElement>(null)
  const { width, height } = previewSize(shot.device, shot.portrait)
  const caption = `${shot.scenario} · ${PREVIEW_DEVICES[shot.device].label} · ${PREVIEW_LAYOUTS[shot.layout].label} · ${shot.portrait ? 'portrait' : 'landscape'}`

  useEffect(() => {
    let cancelled = false
    renderShot(shot, { recap, keepsake }).then(
      (document) => { if (!cancelled) { setHtml(document); setError(null) } },
      (failure: unknown) => { if (!cancelled) setError(failure instanceof Error ? failure.message : String(failure)) },
    )
    return () => { cancelled = true }
  }, [shot.scenario, shot.device, shot.layout, shot.portrait, recap, keepsake])

  useEffect(() => {
    const element = frame.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setScale(entry!.contentRect.width / width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [width])

  /** The screen at its native CSS size in a new tab, for screenshots and devtools. */
  const openNative = () => {
    if (!html) return
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    window.open(url, '_blank', 'noopener')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  // A single landscape screen fills the column; portrait is capped by viewport height instead.
  const maxWidth = single ? `min(100%, calc(80vh * ${width} / ${height}))` : undefined
  return (
    <figure className="flex w-full flex-col gap-2" style={{ maxWidth }}>
      <div className="rounded-xl bg-[#3a3566] p-2">
        <div ref={frame} className="relative overflow-hidden rounded-sm bg-white" style={{ aspectRatio: `${width} / ${height}` }}>
          {html && scale ? (
            <iframe
              title={caption}
              srcDoc={html}
              sandbox="allow-scripts"
              loading={single ? 'eager' : 'lazy'}
              className="pointer-events-none absolute top-0 left-0 origin-top-left border-0"
              style={{ width, height, transform: `scale(${scale})` }}
            />
          ) : null}
          {error ? <p role="alert" className="absolute inset-0 p-3 text-sm font-semibold text-black">{error}</p> : null}
        </div>
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-3 text-sm">
        <span className="text-muted">{caption}</span>
        <span className="flex gap-3">
          {single ? null : (
            <Link
              from={Route.fullPath}
              search={(previous) => ({ ...previous, view: 'screen' as const, scenario: shot.scenario, device: shot.device, layout: shot.layout, orientation: shot.portrait ? ('portrait' as const) : ('landscape' as const) })}
              className="underline underline-offset-4 hover:text-ink"
            >
              Enlarge
            </Link>
          )}
          <button type="button" onClick={openNative} disabled={!html} className="underline underline-offset-4 hover:text-ink disabled:opacity-50">
            Native size
          </button>
        </span>
      </figcaption>
    </figure>
  )
}
