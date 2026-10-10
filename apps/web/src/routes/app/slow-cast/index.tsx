import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { api } from '@trmnl-games/backend/api'
import { useIntent } from '../../../lib/intent'
import { preload } from '../../../lib/preload'
import { BAIT_LABEL, BAND_LABEL, WEATHER_LABEL, type Dock } from '../../../lib/slowCast'
import { Button, Card, Meter, NoticeBar, useNotice } from '../../../lib/ui'
import { FishText } from './-fish'

/** The dock: the angler's scene, progress, the bait in use, the waters and the latest stories. The fly box lives in the logbook. */
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
  // While travelling, bait choices are for the water the angler is heading to: the next cast is there.
  const baitWater = destination ?? here
  // Bait this water uses that the angler holds, plus the one in use even when it ran out.
  const usable = angler.bait.filter((b) => (baitWater?.baits ?? []).includes(b.class) && (b.units > 0 || b.class === angler.baitOnHook))
  const held = (water: { baits: readonly string[] }) => angler.bait.filter((b) => water.baits.includes(b.class) && b.units > 0)
  // The bait the move switches to (slowCast baitForTravel): the chosen one if it works there, else the fullest held one.
  const travelBait = (water: { baits: readonly string[] }) => {
    const current = held(water).find((b) => b.class === angler.baitOnHook)
    return current ?? [...held(water)].sort((a, b) => b.units - a.units || water.baits.indexOf(a.class) - water.baits.indexOf(b.class))[0]
  }
  const coolerFull = angler.cooler.used >= angler.cooler.capacity
  const catches = dock.catches ?? []
  const coolerValue = catches.reduce((sum, fish) => sum + fish.value, 0)
  // The bait that actually fishes here (as the simulator's activeBait): chosen, used at this water and not used up.
  const fishing = angler.bait.find((b) => b.class === angler.baitOnHook && (baitWater?.baits ?? []).includes(b.class) && b.units > 0)
  // Travelling spends the next cast on the move, so the first cast at the new water is the one after.
  const firstCastThere = dock.nextTickAt ? time(dock.nextTickAt + 15 * 60_000) : null

  return (
    <>
      <section aria-labelledby="dock-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 id="dock-title" className="font-display text-3xl font-bold">{angler.alias}</h1>
          <span className="label-px text-muted">Level {angler.level} · {angler.gold} gold</span>
        </div>
        {scene ? <img src={scene} alt={`${angler.alias} fishing at ${here?.name ?? 'the water'}`} width={456} height={120} className="w-full border-2 border-edge bg-white [image-rendering:pixelated]" /> : null}
        {/* Status, conditions and timing on their own lines: run together, a phone wrapped them mid-phrase. */}
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold">
            {angler.status === 'paused' ? <>Fishing is paused. <Link to="/app/slow-cast/settings" className="font-normal underline underline-offset-4">Resume on the More page</Link>.</> : destination ? `Heading to ${destination.name}.${firstCastThere ? ` First cast there at ${firstCastThere}.` : ''}` : `Casting at ${here?.name ?? 'the water'}.`}
          </p>
          {here ? <p className="text-muted">{BAND_LABEL[here.band]}, {WEATHER_LABEL[here.weather]?.toLowerCase()} · Bite chance {here.bitePercent}%</p> : null}
          {dock.nextTickAt && !destination && angler.status !== 'paused' ? <p className="text-sm text-muted">Next cast at {time(dock.nextTickAt)}.</p> : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Meter label="XP" value={angler.xp} max={angler.xpToNext} tone="xp" />
          <Meter label={angler.cooler.name} value={angler.cooler.used} max={angler.cooler.capacity} tone="gold" />
        </div>
        {!coolerFull && catches.length > 0 ? (
          <p className="text-sm"><Link to="/app/slow-cast/cooler" className="underline underline-offset-4">Sell {catches.length} fish for {coolerValue} gold</Link></p>
        ) : null}
        {coolerFull ? (
          <p className="font-semibold text-hp-ink">
            The cooler is full, so new catches are released. <Link to="/app/slow-cast/cooler" className="underline underline-offset-4">Sell your catch</Link>.
          </p>
        ) : null}
      </section>

      <Card title="Bait">
        {usable.length === 0 ? <p className="mb-3 font-semibold text-hp-ink">You have no bait for {baitWater?.name}, so your angler {destination ? 'will fish' : 'is fishing'} a bare hook. <Link to="/app/slow-cast/shop" className="underline underline-offset-4">Buy bait</Link>.</p> : null}
        {usable.length > 0 && !fishing ? <p className="mb-3 font-semibold text-hp-ink">Your angler is fishing a bare hook. Choose a bait below{usable.every((b) => b.units === 0) ? <>, or <Link to="/app/slow-cast/shop" className="underline underline-offset-4">buy some</Link></> : null}.</p> : null}
        <div className="flex flex-wrap gap-2">
          {usable.map((bait) => (
            <Button
              key={bait.class}
              variant={angler.baitOnHook === bait.class ? 'primary' : 'secondary'}
              aria-pressed={angler.baitOnHook === bait.class}
              disabled={chooseBait.pending}
              onClick={() => { if (angler.baitOnHook !== bait.class) void chooseBait.run({ bait: bait.class as never }, `Fishing with ${bait.name.toLowerCase()} from the next cast.`) }}
            >
              {bait.name} · {bait.units} left
            </Button>
          ))}
        </div>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted">Uses</dt><dd>One per fish kept or lost</dd>
          <dt className="text-muted">No bait</dt><dd>Fewer bites, small fish only</dd>
        </dl>
        <p className="mt-3 text-sm"><Link to="/app/slow-cast/shop" className="underline underline-offset-4">What each bait catches</Link></p>
      </Card>

      <Card title="Waters">
        <ul className="flex flex-col gap-3">
          {dock.waters?.map((water) => (
            <li key={water.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-3 last:border-b-0">
              <div className="min-w-0">
                <p className="font-semibold">{water.name}{water.id === angler.waterId ? ' (here)' : ''}</p>
                {water.open ? (
                  <>
                    <p className="text-sm text-muted">{BAND_LABEL[water.band]}, {WEATHER_LABEL[water.weather]?.toLowerCase()} until {time(water.weatherUntil)}</p>
                    <p className="text-sm text-muted">Bait: {water.baits.map((b) => BAIT_LABEL[b]).join(', ')}</p>
                    {held(water).length === 0 ? <p className="text-sm text-hp-ink">You have none of its bait.</p> : null}
                  </>
                ) : <p className="text-sm text-muted">Opens at level {water.unlockLevel}{water.access ? ` with the ${water.access === 'waders' ? 'Waders' : 'Pier Permit'}` : ''}</p>}
              </div>
              {water.open && water.id !== angler.waterId && water.id !== angler.travelTo ? (
                <Button variant="secondary" disabled={travel.pending} onClick={() => {
                  const next = travelBait(water)
                  void travel.run({ waterId: water.id as never }, next ? `Heading to ${water.name}. Fishing with ${next.name.toLowerCase()} there.` : `Heading to ${water.name}. You have no bait for it yet.`)
                }}>Fish here</Button>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">Weather is the same for every angler at a water and changes every six hours. Moving skips one cast, then the angler fishes the new water.</p>
      </Card>

      <Card title="Latest">
        <ol className="flex flex-col gap-2">
          {dock.logs?.slice(0, 10).map((log) => (
            <li key={log.id} className="flex gap-3 text-sm">
              <span className="w-12 shrink-0 tabular-nums text-muted">{time(log.at)}</span>
              <span className="min-w-0"><FishText text={log.summary} />{log.xp ? <span className="text-xp-ink"> +{log.xp} XP</span> : null}</span>
            </li>
          ))}
        </ol>
      </Card>
      <NoticeBar notice={notice} onDismiss={dismiss} />
    </>
  )
}
