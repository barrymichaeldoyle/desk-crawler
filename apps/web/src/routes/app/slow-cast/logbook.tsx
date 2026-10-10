import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { api } from '@trmnl-games/backend/api'
import { fishSprite, FISH_LARGE } from '@trmnl-games/slow-cast/art/fish'
import { preload } from '../../../lib/preload'
import { useAnalyticsView } from '../../../lib/analyticsProvider'
import { BAIT_LABEL, BAND_LABEL, WEATHER_LABEL, formatWeight } from '../../../lib/slowCast'
import { Card, NoticeBar, useNotice } from '../../../lib/ui'
import { Gem, SpriteIcon } from '../desk-crawler/-bagSlots'
import { FlyBox } from './-flyBox'
import { FishName } from './-fish'

/** The logbook: every species by water, then the fly box. A caught fish shows its count, best weight and where to find it; an unseen one is a silhouette with its bait (epics give nothing away). */
export const Route = createFileRoute('/app/slow-cast/logbook')({
  loader: ({ context }) => preload(context, convexQuery(api.slowCast.anglers.logbook, {}), convexQuery(api.slowCast.flies.mine, {})),
  component: LogbookPage,
})

type Entry =
  | { id: string; seen: true; name: string; rarity: string; count: number; bestGrams: number; maxGrams: number; baits: string[]; times: string[] | null; weather: string[] | null }
  | { id: string; seen: false; rarity: string; baits?: string[] | null }

/** An unseen fish: its outline in full ink, so the shape hints without naming it. */
function silhouette(id: string) {
  const sprite = fishSprite(id, FISH_LARGE.width, FISH_LARGE.height)
  return { ...sprite, rows: sprite.rows.map((row) => row.replace(/[^ ]/g, ':')) }
}

const RARITIES = ['common', 'uncommon', 'rare', 'epic'] as const

function LogbookPage() {
  const { data } = useQuery(convexQuery(api.slowCast.anglers.logbook, {}))
  const { notice, notify, dismiss } = useNotice()
  const book = data as Array<{ water: { id: string; name: string }; species: Entry[] }> | null | undefined
  useAnalyticsView('logbook viewed', { species_logged: book ? book.flatMap((w) => w.species).filter((s) => s.seen).length : 0 }, Boolean(book))
  if (!book) return null
  const seen = book.flatMap((w) => w.species).filter((s) => s.seen).length
  const total = book.flatMap((w) => w.species).length
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-3xl font-bold">Logbook</h1>
        <span className="label-px text-muted">{seen} of {total} species</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
        <Link to="/app/slow-cast/achievements" className="underline underline-offset-4">Achievements</Link>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-muted" aria-label="Rarity key">
          {RARITIES.map((rarity) => <li key={rarity} className="flex items-center gap-1.5"><Gem rarity={rarity} scale={2} />{rarity[0]!.toUpperCase() + rarity.slice(1)}</li>)}
        </ul>
      </div>
      {book.map(({ water, species }) => (
        <Card key={water.id} title={water.name}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {species.map((s) => (
              <li key={s.id} className="flex items-start gap-3 border border-rule p-3">
                <SpriteIcon sprite={s.seen ? fishSprite(s.id, FISH_LARGE.width, FISH_LARGE.height) : silhouette(s.id)} scale={2} className={s.seen ? '' : 'opacity-60'} />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold"><Gem rarity={s.rarity} scale={2} />{s.seen ? <FishName id={s.id}>{s.name}</FishName> : 'Not caught yet'}</p>
                  {s.seen ? (
                    <>
                      <p className="text-sm">{s.count} caught · best {formatWeight(s.bestGrams)} of {formatWeight(s.maxGrams)}</p>
                      <p className="text-sm text-muted">
                        {s.baits.map((b) => BAIT_LABEL[b]).join(', ')}
                        {s.times ? ` · ${s.times.map((t) => BAND_LABEL[t]).join(', ')}` : ''}
                        {s.weather ? ` · ${s.weather.map((w) => WEATHER_LABEL[w]).join(' or ')}` : ''}
                      </p>
                    </>
                  ) : <p className="text-sm text-muted">{s.baits ? `Bait: ${s.baits.map((b) => BAIT_LABEL[b]).join(' or ')}` : s.rarity === 'epic' ? 'Needs the right bait, hour and weather.' : `A ${s.rarity} fish of ${water.name}.`}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ))}
      <FlyBox notify={notify} />
      <NoticeBar notice={notice} onDismiss={dismiss} />
    </>
  )
}
