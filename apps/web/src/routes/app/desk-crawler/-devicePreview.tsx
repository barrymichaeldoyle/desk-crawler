import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { api } from '@trmnl-games/backend/api'
import { screenMarkup } from '@trmnl-games/desk-crawler/templates/screen'
import { PREVIEW_DEVICES, PREVIEW_LAYOUTS, previewDocument, type PreviewDevice, type PreviewLayout } from '@trmnl-games/desk-crawler/templates/preview'

const STORAGE_KEY = 'desk-crawler.preview'
const LAYOUTS = Object.keys(PREVIEW_LAYOUTS) as PreviewLayout[]
const DEVICES = Object.keys(PREVIEW_DEVICES) as PreviewDevice[]

/** Per-viewer convenience only: the remembered device and layout. Storage can be unavailable. */
function remembered(): { device: PreviewDevice; layout: PreviewLayout } {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as { device?: string; layout?: string } | null
    return {
      device: DEVICES.includes(saved?.device as PreviewDevice) ? (saved!.device as PreviewDevice) : 'x',
      layout: LAYOUTS.includes(saved?.layout as PreviewLayout) ? (saved!.layout as PreviewLayout) : 'markup',
    }
  } catch {
    return { device: 'x', layout: 'markup' }
  }
}

/** Minute-rounded clock so the preview query stays cacheable and refreshes like the device's labels. */
function useMinute(): number {
  const [minute, setMinute] = useState(() => Math.floor(Date.now() / 60_000) * 60_000)
  useEffect(() => {
    const timer = window.setInterval(() => setMinute(Math.floor(Date.now() / 60_000) * 60_000), 15_000)
    return () => window.clearInterval(timer)
  }, [])
  return minute
}

/**
 * What the owner's TRMNL is showing: the same canonical payload and Liquid
 * templates the plugin serves, rendered in the pinned framework inside a
 * drawn bezel. Until it renders, the bezel shows the hero's scene.
 */
export function DevicePreview({ sceneUrl, heroName }: { sceneUrl: string; heroName: string }) {
  const now = useMinute()
  const { data: payload } = useQuery(convexQuery(api.trmnlPayload.mine, { now }))
  const [choice, setChoice] = useState<{ device: PreviewDevice; layout: PreviewLayout }>({ device: 'x', layout: 'markup' })
  const [html, setHtml] = useState<string | null>(null)
  const [scale, setScale] = useState(0)
  const [loaded, setLoaded] = useState<string | null>(null)
  const frame = useRef<HTMLDivElement>(null)
  const device = PREVIEW_DEVICES[choice.device]

  useEffect(() => setChoice(remembered()), [])

  const choose = (next: Partial<typeof choice>) => {
    const value = { ...choice, ...next }
    setChoice(value)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      // Private mode or blocked storage: the choice simply isn't remembered.
    }
  }

  useEffect(() => {
    if (!payload) return
    let cancelled = false
    void (async () => {
      const { Liquid } = await import('liquidjs')
      // TRMNL renders in UTC and supplies the owner's offset; the browser's offset stands in for the TRMNL setting here.
      const trmnl = { user: { utc_offset: -new Date().getTimezoneOffset() * 60 } }
      const inner = await new Liquid({ timezoneOffset: 0 }).parseAndRender(screenMarkup[choice.layout], { ...(payload as Record<string, unknown>), trmnl })
      if (!cancelled) setHtml(previewDocument(inner, choice.device, choice.layout, `${heroName} on ${device.label}`, { shadeOtherSlots: true }))
    })()
    return () => {
      cancelled = true
    }
  }, [payload, choice, heroName, device.label])

  useEffect(() => {
    const element = frame.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setScale(entry!.contentRect.width / device.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [device.width])

  return (
    <figure className="flex flex-col gap-3">
      <div className="rounded-[1.4rem] bg-stone-900 p-[clamp(0.5rem,2.5vw,1rem)] dark:bg-stone-700">
        <div ref={frame} className="relative overflow-hidden rounded-md bg-white" style={{ aspectRatio: `${device.width} / ${device.height}` }}>
          {/* Scene stand-in: also what screen readers get, since the iframe is decorative duplication of the page. */}
          <img src={sceneUrl} alt={`${heroName}'s current scene`} className={`absolute inset-0 m-auto w-full [image-rendering:pixelated] transition-opacity duration-500 ${html && scale && loaded === html ? 'opacity-0' : 'opacity-100'}`} />
          {html && scale ? (
            <iframe
              title={`TRMNL preview: ${PREVIEW_LAYOUTS[choice.layout].label} layout on ${device.label}`}
              srcDoc={html}
              onLoad={() => setLoaded(html)}
              sandbox="allow-scripts"
              tabIndex={-1}
              aria-hidden="true"
              className="pointer-events-none absolute top-0 left-0 origin-top-left border-0"
              style={{ width: device.width, height: device.height, transform: `scale(${scale})` }}
            />
          ) : null}
          {/* E-ink refresh: replays whenever a new screen finishes loading. */}
          {loaded && loaded === html ? <div key={loaded} aria-hidden="true" className="pointer-events-none absolute inset-0 animate-[eink-refresh_420ms_steps(6,end)_both]" /> : null}
        </div>
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div role="group" aria-label="Layout" className="flex border border-stone-900 dark:border-stone-300">
          {LAYOUTS.map((layout) => (
            <button
              key={layout}
              type="button"
              aria-pressed={choice.layout === layout}
              onClick={() => choose({ layout })}
              className="min-h-10 px-3 text-sm font-semibold text-stone-700 not-last:border-r not-last:border-stone-900 aria-pressed:bg-stone-900 aria-pressed:text-white dark:text-stone-300 dark:not-last:border-stone-300 dark:aria-pressed:bg-stone-100 dark:aria-pressed:text-stone-900"
            >
              {PREVIEW_LAYOUTS[layout].label}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Device" className="flex gap-3 text-sm">
          {DEVICES.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={choice.device === key}
              onClick={() => choose({ device: key })}
              className="min-h-10 text-stone-600 underline-offset-4 aria-pressed:font-semibold aria-pressed:text-stone-900 aria-pressed:underline dark:text-stone-400 dark:aria-pressed:text-stone-100"
            >
              {PREVIEW_DEVICES[key].label}
            </button>
          ))}
        </div>
      </figcaption>
      <p className="text-xs text-stone-600 dark:text-stone-400">
        This is what your TRMNL shows now. The device itself refreshes on its own schedule.
        {choice.layout === 'markup' ? null : ' Shaded areas are your other plugins.'}
      </p>
    </figure>
  )
}
