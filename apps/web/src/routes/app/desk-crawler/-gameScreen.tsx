import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { api } from '@trmnl-games/backend/api'
import { paintedSceneUri } from '@trmnl-games/desk-crawler/art/sceneColour'
import { keepUnitsTogether } from '@trmnl-games/desk-crawler/payload'
import { markedRuns } from '@trmnl-games/desk-crawler/sim/core/narrative'
import { logPresentation, type LogDeltas } from '@trmnl-games/desk-crawler/log'
import { artUrl } from '../../../lib/intent'
import { localSceneUrl, useMinute } from '../../../lib/localClock'
import { changeTone } from './-logStory'

import { BIOME_BANDS } from '../../../lib/palette'
import { PixelIcon } from './-pixelIcon'
import { usePulse, type PulseHero } from './-pulse'

/** Gain chips: the stat's colour as a fill, night text on top. */
const CHIP_FILL: Record<string, string> = { 'text-xp-ink': 'bg-xp', 'text-hp-ink': 'bg-hp-ink', 'text-gold-ink': 'bg-gold', 'text-rare-ink': 'bg-rare-ink', 'text-muted': 'bg-muted' }

/** The newest log entry, as one bounded page. Preloaded by the hero route so the dialogue strip is complete in the server render. */
export const latestLogQuery = () => convexQuery(api.heroes.recentLog, { paginationOpts: { numItems: 1, cursor: null } })

const HEARTS = 10
const FALLBACK_BANDS = BIOME_BANDS.office_cubicles!
/** The scene's box at each width. */
const SCENE_BOX = 'block h-[160px] w-full object-cover object-[41%_50%] sm:h-auto sm:pt-[9.5rem] lg:mx-auto lg:w-[1064px] lg:pt-28'

/** One pixel heart; each half fills independently so health reads in half-heart steps. */
function Heart({ left, right }: { left: boolean; right: boolean }) {
  return (
    <svg viewBox="0 0 9 8" width={18} height={16} aria-hidden="true" shapeRendering="crispEdges" className="shrink-0 max-sm:h-3 max-sm:w-3.5">
      <path className="fill-night" d="M1 0h3v1H1zM5 0h3v1H5zM0 1h1v3H0zM8 1h1v3H8zM1 4h1v1H1zM7 4h1v1H7zM2 5h1v1H2zM6 5h1v1H6zM3 6h1v1H3zM5 6h1v1H5zM4 7h1v1H4zM4 1h1v1H4z" />
      <path className={left ? 'fill-hp' : 'fill-raised'} d="M1 1h3v3H1zM2 4h2v1H2zM3 5h1v1H3z" />
      <path className={right ? 'fill-hp' : 'fill-raised'} d="M5 1h3v3H5zM5 4h2v1H5zM5 5h1v1H5zM4 2h1v5H4z" />
    </svg>
  )
}

export function Hearts({ hp, maxHp }: { hp: number; maxHp: number }) {
  // Half-heart resolution, never showing empty while the hero has any health left.
  const halves = hp <= 0 ? 0 : Math.max(1, Math.round((hp / Math.max(1, maxHp)) * HEARTS * 2))
  return (
    <span role="img" aria-label={`Health ${hp} of ${maxHp}`} className="flex flex-wrap gap-0.5">
      {Array.from({ length: HEARTS }, (_, i) => <Heart key={i} left={halves > i * 2} right={halves > i * 2 + 1} />)}
    </span>
  )
}

type ScreenHero = PulseHero & { name: string; level: number; hp: number; maxHp: number; xp: number; xpToNext: number; attack: number; defense: number; gold: number; biomeId: string; scenePath: string }

/**
 * The hero page's game screen: the hero's current scene painted in colour over
 * its biome's bands (D96), with a platformer HUD on top (party, hearts, XP,
 * coins, next adventure) and a dialogue strip saying what is happening.
 * On phones the HUD stacks above the scene so it never covers the art, and the
 * scene is cropped at exactly 4x around the hero and their foe. Wide screens
 * draw it at exactly 7x (152px stage) between full-width bands.
 */
export function GameScreen({ hero }: { hero: ScreenHero }) {
  const pulse = usePulse(hero)
  const now = useMinute()
  const bands = BIOME_BANDS[hero.biomeId] ?? FALLBACK_BANDS
  const sceneUrl = localSceneUrl(hero.scenePath, now)
  const painted = useMemo(() => paintedSceneUri(sceneUrl), [sceneUrl])
  const xpPct = hero.xpToNext > 0 ? Math.min(100, Math.round((hero.xp * 100) / hero.xpToNext)) : 0
  return (
    <section aria-label={`${hero.name}'s game screen`} className="relative overflow-hidden border-4 border-night bg-night">
      <div className="hud relative z-10 flex flex-wrap items-start justify-between gap-3 p-3 sm:absolute sm:inset-x-0 sm:top-0">
        <div className="flex items-center gap-3 border-[3px] border-night bg-night/85 px-3 py-2.5">
          <img src="/games/desk-crawler/icon-192.png" alt="" width={52} height={52} className="size-13 shrink-0 border-[3px] border-cream [image-rendering:pixelated]" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="text-sm leading-none">
              {hero.name} <span className="text-gold-ink">Lv{hero.level}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Hearts hp={hero.hp} maxHp={hero.maxHp} />
              <span className="label-px text-muted">{hero.hp}/{hero.maxHp}</span>
            </div>
            <div className="flex items-center gap-2 label-px" role="meter" aria-label="Level XP" aria-valuenow={hero.xp} aria-valuemin={0} aria-valuemax={hero.xpToNext}>
              <span className="text-xp-ink">XP</span>
              <span className="block h-2.5 w-28 border-2 border-cream bg-night sm:w-36"><span className="block h-full bg-xp" style={{ width: `${xpPct}%` }} /></span>
              <span className="text-muted">{hero.xp}/{hero.xpToNext}</span>
            </div>
            <p className="label-px text-muted">
              ATK <span className="text-ink">{hero.attack}</span> · DEF <span className="text-ink">{hero.defense}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <p className="flex items-center gap-2 border-[3px] border-night bg-night/85 px-3 py-2.5 text-xs text-gold-ink" aria-label={`${hero.gold.toLocaleString()} gold`}>
            <svg viewBox="0 0 8 8" width={16} height={16} aria-hidden="true" shapeRendering="crispEdges"><path className="fill-gold" d="M2 0h4v1H2zM1 1h6v6H1zM0 2h8v4H0zM2 7h4v1H2z" /><path className="fill-gold-lo" d="M3 2h2v4H3z" /></svg>
            {hero.gold.toLocaleString()}
          </p>
          {pulse.countdown ? (
            <p className="border-[3px] border-night bg-night/85 px-3 py-2 label-px" aria-live="off">
              Next adventure
              <span className="hud block min-w-[5ch] text-sm text-xp-ink">{pulse.countdown}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="relative">
        <div aria-hidden="true" className="absolute inset-0 grid grid-rows-[18%_14%_40%_28%]">
          <div style={{ background: bands[0] }} />
          <div style={{ background: bands[1] }} />
          <div style={{ background: bands[2] }} />
          <div className="border-t-[6px] border-night/25" style={{ background: bands[3] }} />
        </div>
        {/* The stage painted in the browser from the device image's own composition (D96); an unknown path falls back to the 1-bit art multiplied over the bands. */}
        <img src={painted ?? artUrl(sceneUrl)} alt={`${hero.name}: ${pulse.sentence}`} width={760} height={200} className={`relative [image-rendering:pixelated] ${painted ? '' : 'mix-blend-multiply'} ${SCENE_BOX}`} />
      </div>

      {/* Reserved for the status line plus one detail line, so the strip holds its height while the log loads. */}
      <div className="relative z-10 flex min-h-[4.25rem] items-start gap-3 border-t-4 border-night bg-cream py-3 pr-9 pl-3 text-night sm:pl-4">
        <PixelIcon kind={pulse.glyph} plain className="mt-0.5 text-night" />
        <p className="min-w-0 flex-1">
          <span className="hud block text-hud-sm">{pulse.sentence}</span>
          {pulse.detail ? <span className="mt-1 block text-sm text-[#3a3566]">{pulse.detail}</span> : null}
          <LatestEvent />
        </p>
        {/* The dialogue box's waiting arrow: the screen's one idle motion. */}
        <svg viewBox="0 0 5 3" width={10} height={6} aria-hidden="true" shapeRendering="crispEdges" className="absolute right-3 bottom-3 animate-[menu-bob_1.2s_infinite] fill-night">
          <path d="M0 0h5v1H0zM1 1h3v1H1zM2 2h1v1H2z" />
        </svg>
      </div>
    </section>
  )
}

type LogEntry = { kind: string; summary: string; deltas: LogDeltas }

/** The newest log line and its gains, in the dialogue strip. */
function LatestEvent() {
  const { data } = useQuery(latestLogQuery())
  const latest = ((data as { page?: LogEntry[] } | undefined)?.page ?? [])[0]
  if (!latest) return null
  const { narrative, changes } = logPresentation(latest)
  const gains = changes.filter((part) => part !== 'No effect')
  return (
    <span className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm text-[#3a3566]">
      <span>{markedRuns(narrative).map((run) => run.text).join('')}</span>
      {gains.map((part) => <span key={part} className={`label-px px-1.5 text-night ${CHIP_FILL[changeTone(part)] ?? 'bg-muted'}`}>{keepUnitsTogether(part)}</span>)}
    </span>
  )
}
