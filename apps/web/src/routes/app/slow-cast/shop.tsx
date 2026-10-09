import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { api } from '@trmnl-games/backend/api'
import { useIntent } from '../../../lib/intent'
import { preload } from '../../../lib/preload'
import { formatWeight, type Dock } from '../../../lib/slowCast'
import { Button, Card, NoticeBar, useNotice } from '../../../lib/ui'

/** The tackle shop: the next rod and cooler, the access items and bait tubs, each at a fixed price. */
export const Route = createFileRoute('/app/slow-cast/shop')({
  loader: ({ context }) => preload(context, convexQuery(api.slowCast.anglers.dock, {})),
  component: ShopPage,
})

const WATER_NAME: Record<string, string> = { river_bend: 'River Bend', harbour_pier: 'the Harbour Pier' }

function ShopPage() {
  const { data } = useQuery(convexQuery(api.slowCast.anglers.dock, {}))
  const dock = data as Dock | undefined
  const { notice, notify, dismiss } = useNotice()
  const rod = useIntent(api.slowCast.anglers.buyNextRod, { onFeedback: notify })
  const cooler = useIntent(api.slowCast.anglers.buyNextCooler, { onFeedback: notify })
  const access = useIntent(api.slowCast.anglers.buyAccessItem, { onFeedback: notify })
  const bait = useIntent(api.slowCast.anglers.buyBaitTubs, { onFeedback: notify })
  const angler = dock?.angler
  if (!dock || !angler || !dock.shop) return null
  const gold = angler.gold
  const short = (price: number) => (gold < price ? ` (${price - gold} more gold)` : '')
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-3xl font-bold">Tackle shop</h1>
        <span className="label-px text-gold-ink">{gold} gold</span>
      </div>

      <Card title="Rod">
        <p>You fish with the <strong>{angler.rod.name}</strong>, which lands fish up to {formatWeight(angler.rod.limitGrams)}. Anything heavier gets away.</p>
        {dock.shop.rod ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button disabled={gold < dock.shop.rod.price} pending={rod.pending} onClick={() => void rod.run({}, `Bought the ${dock.shop!.rod!.name}.`)}>
              Buy the {dock.shop.rod.name} for {dock.shop.rod.price}
            </Button>
            <span className="text-sm text-muted">Lands up to {formatWeight(dock.shop.rod.limitGrams)}, +{dock.shop.rod.biteBonusPercent}% bites{short(dock.shop.rod.price)}</span>
          </div>
        ) : <p className="mt-2 text-sm text-muted">This is the best rod.</p>}
      </Card>

      <Card title="Cooler">
        <p>The <strong>{angler.cooler.name}</strong> holds {angler.cooler.capacity} fish. A bigger cooler means fewer released fish between visits.</p>
        {dock.shop.cooler ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button disabled={gold < dock.shop.cooler.price} pending={cooler.pending} onClick={() => void cooler.run({}, `Bought the ${dock.shop!.cooler!.name}.`)}>
              Buy the {dock.shop.cooler.name} for {dock.shop.cooler.price}
            </Button>
            <span className="text-sm text-muted">Holds {dock.shop.cooler.capacity}{short(dock.shop.cooler.price)}</span>
          </div>
        ) : <p className="mt-2 text-sm text-muted">This is the biggest cooler.</p>}
      </Card>

      <Card title="Passes">
        <ul className="flex flex-col gap-3">
          {dock.shop.access.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3">
              <span>{item.name} <span className="text-sm text-muted">· opens {WATER_NAME[item.water] ?? item.water}</span></span>
              {item.owned ? <span className="label-px text-xp-ink">Owned</span> : (
                <Button variant="secondary" disabled={gold < item.price || access.pending} onClick={() => void access.run({ access: item.id }, `Bought the ${item.name}.`)}>
                  Buy for {item.price}
                </Button>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">A pass is permanent. Each water also needs its level: River Bend at 4, the Harbour Pier at 8.</p>
      </Card>

      <Card title="Bait">
        <ul className="flex flex-col gap-3">
          {angler.bait.map((b) => (
            <li key={b.class} className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-3 last:border-b-0">
              <span>{b.name} <span className="text-sm text-muted">· {b.units} held · {b.tubSize} a tub for {b.price}</span></span>
              <span className="flex gap-2">
                {[1, 3].filter((n) => n <= b.tubsThatFit).map((n) => (
                  <Button key={n} variant="secondary" disabled={gold < b.price * n || bait.pending} onClick={() => void bait.run({ bait: b.class as never, tubs: n }, `Bought ${n} ${n === 1 ? 'tub' : 'tubs'} of ${b.name.toLowerCase()}.`)}>
                    {n === 1 ? '1 tub' : `${n} tubs`} · {b.price * n}
                  </Button>
                ))}
                {b.tubsThatFit === 0 ? <span className="label-px text-muted">Full</span> : null}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">Each bait holds up to 72. Bait never spoils.</p>
      </Card>
      <NoticeBar notice={notice} onDismiss={dismiss} />
    </>
  )
}
