import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { api } from '@trmnl-games/backend/api'
import { useIntent } from '../../../lib/intent'
import { preload } from '../../../lib/preload'
import { BAIT_LABEL, BAND_LABEL, WEATHER_LABEL, type Dock } from '../../../lib/slowCast'
import { Button, Card, Meter, NoticeBar, useNotice } from '../../../lib/ui'

/** The dock: the angler's scene, progress, the bait on the hook, the waters and the latest stories. */
export const Route = createFileRoute('/app/slow-cast/')({
  loader: ({ context }) => preload(context, convexQuery(api.slowCast.anglers.dock, {}), convexQuery(api.slowCast.payload.preview, {})),
  component: DockPage,
})

const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

function DockPage() {
  const { data } = useQuery(convexQuery(api.slowCast.anglers.dock, {}))
  const { data: preview } = useQuery(convexQuery(api.slowCast.payload.preview, {}))
  const { notice, notify, dismiss } = useNotice()
  const travel = useIntent(api.slowCast.anglers.travelTo, { onFeedback: notify })
  const chooseBait = useIntent(api.slowCast.anglers.chooseBait, { onFeedback: notify })
  const dock = data as Dock | undefined
  const angler = dock?.angler
  if (!dock || !angler) return null
  const here = dock.waters?.find((w) => w.id === angler.waterId)
  const destination = angler.travelTo ? dock.waters?.find((w) => w.id === angler.travelTo) : null
  const scene = typeof preview?.scene_base === 'string' && preview.scene_base ? `${preview.scene_base}/3.png` : null
  // Bait this water uses that the angler holds, plus the one on the hook even when it ran out.
  const usable = angler.bait.filter((b) => (here?.baits ?? []).includes(b.class) && (b.units > 0 || b.class === angler.baitOnHook))
  const coolerFull = angler.cooler.used >= angler.cooler.capacity

  return (
    <>
      <section aria-labelledby="dock-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 id="dock-title" className="font-display text-3xl font-bold">{angler.alias}</h1>
          <span className="label-px text-muted">Level {angler.level} · {angler.gold} gold</span>
        </div>
        {scene ? <img src={scene} alt={`${angler.alias} fishing at ${here?.name ?? 'the water'}`} width={456} height={120} className="w-full border-2 border-edge bg-white [image-rendering:pixelated]" /> : null}
        <p className="text-lg">
          {angler.status === 'paused' ? 'Rod on the rest: fishing is paused.' : destination ? `Heading to ${destination.name}: the next tick arrives, the one after casts.` : `Casting at ${here?.name ?? 'the water'}`}
          {here ? <span className="text-muted"> · {BAND_LABEL[here.band]}, {WEATHER_LABEL[here.weather]?.toLowerCase()} · {here.bitePercent}% a bite each cast</span> : null}
        </p>
        {dock.nextTickAt ? <p className="text-sm text-muted">Next cast at {time(dock.nextTickAt)}.</p> : null}
        <p className="text-sm"><Link to="/app/slow-cast/rankings" className="underline underline-offset-4">Rankings</Link></p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Meter label="XP" value={angler.xp} max={angler.xpToNext} tone="xp" />
          <Meter label={angler.cooler.name} value={angler.cooler.used} max={angler.cooler.capacity} tone="gold" />
        </div>
        {coolerFull ? (
          <p className="font-semibold text-hp-ink">
            The cooler is full, so new catches go back. <Link to="/app/slow-cast/cooler" className="underline underline-offset-4">Sell your catch</Link>.
          </p>
        ) : null}
      </section>

      <Card title="On the hook">
        {usable.length === 0 ? <p>None of your bait is used here. <Link to="/app/slow-cast/shop" className="underline underline-offset-4">Buy bait</Link> for {here?.name}.</p> : null}
        <div className="flex flex-wrap gap-2">
          {usable.map((bait) => (
            <Button
              key={bait.class}
              variant={angler.baitOnHook === bait.class ? 'primary' : 'secondary'}
              aria-pressed={angler.baitOnHook === bait.class}
              disabled={chooseBait.pending}
              onClick={() => { if (angler.baitOnHook !== bait.class) void chooseBait.run({ bait: bait.class as never }, `${bait.name} on the hook from the next cast.`) }}
            >
              {bait.name} · {bait.units}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">A fish you keep, or one that gets away, takes one bait. A quiet cast takes none, and with the cooler full the bait stays on the hook. With no bait the angler fishes a bare hook, which bites less and catches only small fish.</p>
      </Card>

      <Card title="Waters">
        <ul className="flex flex-col gap-3">
          {dock.waters?.map((water) => (
            <li key={water.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-3 last:border-b-0">
              <div className="min-w-0">
                <p className="font-semibold">{water.name}{water.id === angler.waterId ? ' (here)' : ''}</p>
                <p className="text-sm text-muted">
                  {water.open ? `${BAND_LABEL[water.band]}, ${WEATHER_LABEL[water.weather]?.toLowerCase()} until ${time(water.weatherUntil)} · bait: ${water.baits.map((b) => BAIT_LABEL[b]).join(', ')}` : `Opens at level ${water.unlockLevel}${water.access ? ` with the ${water.access === 'waders' ? 'Waders' : 'Pier Permit'}` : ''}`}
                </p>
              </div>
              {water.open && water.id !== angler.waterId && water.id !== angler.travelTo ? (
                <Button variant="secondary" disabled={travel.pending} onClick={() => void travel.run({ waterId: water.id as never }, `Packing up for ${water.name}.`)}>Fish here</Button>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">Weather is the same for every angler at a water and changes every six hours. Travelling takes one tick.</p>
      </Card>

      <Card title="Latest">
        <ol className="flex flex-col gap-2">
          {dock.logs?.slice(0, 10).map((log) => (
            <li key={log.id} className="flex gap-3 text-sm">
              <span className="w-12 shrink-0 tabular-nums text-muted">{time(log.at)}</span>
              <span className="min-w-0">{log.summary}{log.xp ? <span className="text-xp-ink"> +{log.xp} XP</span> : null}</span>
            </li>
          ))}
        </ol>
      </Card>
      <NoticeBar notice={notice} onDismiss={dismiss} />
    </>
  )
}
