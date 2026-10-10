import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import { api } from '@trmnl-games/backend/api'
import { useIntent } from '../../../lib/intent'
import { preload } from '../../../lib/preload'
import { formatWeight, type Dock } from '../../../lib/slowCast'
import { Button, Card, NoticeBar, useNotice } from '../../../lib/ui'
import { ConfirmSheet } from '../desk-crawler/-confirm'
import { FishList, baitCatches } from './-fish'
import { Rows } from './-rows'

/** The tackle shop: the next rod and cooler, the passes and bait tubs, each at a fixed price and confirmed before buying. */
export const Route = createFileRoute('/app/slow-cast/shop')({
  loader: ({ context }) => preload(context, convexQuery(api.slowCast.anglers.dock, {}), convexQuery(api.slowCast.anglers.logbook, {})),
  component: ShopPage,
})

const WATER_NAME: Record<string, string> = { river_bend: 'River Bend', harbour_pier: 'the Harbour Pier' }

/** A purchase waiting for its confirmation: a stray tap only opens the sheet. Rows say what changes, as label and value. */
type Offer = { title: string; price: number; rows: ReadonlyArray<readonly [string, ReactNode]>; buy: () => Promise<boolean> }

function ShopPage() {
  const { data } = useQuery(convexQuery(api.slowCast.anglers.dock, {}))
  const dock = data as Dock | undefined
  const { data: book } = useQuery(convexQuery(api.slowCast.anglers.logbook, {}))
  // Fish are named only once caught, as in the logbook.
  const seen = new Set((book as Array<{ species: Array<{ id: string; seen: boolean }> }> | null | undefined)?.flatMap((w) => w.species).filter((f) => f.seen).map((f) => f.id))
  const { notice, notify, dismiss } = useNotice()
  const rod = useIntent(api.slowCast.anglers.buyNextRod, { onFeedback: notify })
  const cooler = useIntent(api.slowCast.anglers.buyNextCooler, { onFeedback: notify })
  const access = useIntent(api.slowCast.anglers.buyAccessItem, { onFeedback: notify })
  const bait = useIntent(api.slowCast.anglers.buyBaitTubs, { onFeedback: notify })
  const [offer, setOffer] = useState<Offer | null>(null)
  const angler = dock?.angler
  if (!dock || !angler || !dock.shop) return null
  const gold = angler.gold
  const buying = rod.pending || cooler.pending || access.pending || bait.pending
  const short = (price: number) => (gold < price ? <span className="text-sm text-muted">{price - gold} gold short</span> : null)
  const gateOf = (water: string) => dock.waters?.find((w) => w.id === water)?.opensAfter ?? null
  const nextRod = dock.shop.rod
  const nextCooler = dock.shop.cooler
  // Bait for waters the angler can fish comes first; the rest waits under its own heading.
  const openWaters = new Set(dock.waters?.filter((w) => w.open).map((w) => w.id))
  const usableBait = angler.bait.filter((b) => dock.waters?.some((w) => openWaters.has(w.id) && w.baits.includes(b.class)))
  const laterBait = angler.bait.filter((b) => !usableBait.includes(b))
  const baitRow = (b: (typeof angler.bait)[number]) => {
    const waters = dock.waters?.filter((w) => w.baits.includes(b.class)).map((w) => w.name) ?? []
    const catches = baitCatches(b.class, seen)
    return (
      <li key={b.class} className="flex flex-col gap-2 border-b border-rule pb-4 last:border-b-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="font-semibold">{b.name}</p>
          <p className="text-sm text-muted">{b.units} held</p>
        </div>
        <Rows rows={[
          ['Waters', waters.join(', ')],
          ...(catches.only.ids.length + catches.only.unseen > 0 ? [['Only bait for', <FishList {...catches.only} />] as const] : []),
          ...(catches.also.ids.length + catches.also.unseen > 0 ? [['Also catches', <FishList {...catches.also} />] as const] : []),
          ['Tub', `${b.tubSize} for ${b.price} gold`],
        ]} />
        <div className="flex flex-wrap gap-2">
          {[1, 3].filter((n) => n <= b.tubsThatFit).map((n) => (
            <Button key={n} variant="secondary" disabled={gold < b.price * n || buying} onClick={() => setOffer({ title: `Buy ${n === 1 ? 'a tub' : `${n} tubs`} of ${b.name.toLowerCase()}?`, price: b.price * n, rows: [['You get', `${b.tubSize * n} ${b.name.toLowerCase()}`], ['You will hold', `${b.units + b.tubSize * n} (now ${b.units})`]], buy: () => bait.run({ bait: b.class as never, tubs: n }, `Bought ${n} ${n === 1 ? 'tub' : 'tubs'} of ${b.name.toLowerCase()}.`) })}>
              {n === 1 ? 'Buy 1 tub' : `Buy ${n} tubs`}
            </Button>
          ))}
          {b.tubsThatFit === 0 ? <span className="label-px text-muted">Full</span> : null}
        </div>
      </li>
    )
  }
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-3xl font-bold">Tackle shop</h1>
        <span className="label-px text-gold-ink">{gold} gold</span>
      </div>

      <Card title="Rod">
        <Rows rows={[
          ['Yours', <><strong>{angler.rod.name}</strong>, lands up to {formatWeight(angler.rod.limitGrams)}</>],
          nextRod ? ['Next', <><strong>{nextRod.name}</strong>, lands up to {formatWeight(nextRod.limitGrams)}, +{nextRod.biteBonusPercent}% bite chance</>] : null,
        ]} />
        <p className="mt-2 text-sm text-muted">A fish heavier than your rod can land gets away.</p>
        {nextRod ? (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button disabled={gold < nextRod.price || buying} onClick={() => setOffer({ title: `Buy the ${nextRod.name}?`, price: nextRod.price, rows: [['Replaces', `the ${angler.rod.name}`], ['Lands up to', `${formatWeight(nextRod.limitGrams)} (now ${formatWeight(angler.rod.limitGrams)})`], ['Bite chance', `+${nextRod.biteBonusPercent}% over the Cane Rod`]], buy: () => rod.run({}, `Bought the ${nextRod.name}.`) })}>
                Buy for {nextRod.price} gold
              </Button>
              {short(nextRod.price)}
            </div>
          </>
        ) : <p className="mt-2 text-sm text-muted">This is the best rod.</p>}
      </Card>

      <Card title="Cooler">
        <Rows rows={[
          ['Yours', <><strong>{angler.cooler.name}</strong>, holds {angler.cooler.capacity} fish</>],
          nextCooler ? ['Next', <><strong>{nextCooler.name}</strong>, holds {nextCooler.capacity} fish</>] : null,
        ]} />
        <p className="mt-2 text-sm text-muted">When the cooler is full, new catches are released and earn no gold.</p>
        {nextCooler ? (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button disabled={gold < nextCooler.price || buying} onClick={() => setOffer({ title: `Buy the ${nextCooler.name}?`, price: nextCooler.price, rows: [['Replaces', `the ${angler.cooler.name}`], ['Holds', `${nextCooler.capacity} fish (now ${angler.cooler.capacity})`], ['Your catch', 'Moves into the new cooler']], buy: () => cooler.run({}, `Bought the ${nextCooler.name}.`) })}>
                Buy for {nextCooler.price} gold
              </Button>
              {short(nextCooler.price)}
            </div>
          </>
        ) : <p className="mt-2 text-sm text-muted">This is the biggest cooler.</p>}
      </Card>

      <Card title="Passes">
        <ul className="flex flex-col gap-3">
          {dock.shop.access.map((item) => {
            const water = WATER_NAME[item.water] ?? item.water
            const gate = gateOf(item.water)
            const missing = gate ? Math.max(0, gate.species - gate.logged) : 0
            return (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-3 last:border-b-0">
                <div className="min-w-0">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-muted">Lets you fish {water}{gate ? `, which opens after ${gate.species} ${gate.waterName} species (${gate.species - missing} logged)` : ''}.</p>
                </div>
                {item.owned ? <span className="label-px text-xp-ink">Owned</span> : (
                  <Button variant="secondary" disabled={gold < item.price || buying} onClick={() => setOffer({ title: `Buy the ${item.name}?`, price: item.price, rows: [['Opens', water[0]!.toUpperCase() + water.slice(1)], ['Fish there', gate && missing > 0 ? `After ${missing} more ${gate.waterName} species` : 'Straight away']], buy: () => access.run({ access: item.id }, `Bought the ${item.name}.`) })}>
                    Buy for {item.price} gold
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      </Card>

      <Card title="Bait">
        <ul className="flex flex-col gap-3">{usableBait.map(baitRow)}</ul>
        {laterBait.length > 0 ? (
          <>
            <h3 className="mt-5 mb-3 font-semibold">For waters you can't fish yet</h3>
            <ul className="flex flex-col gap-3">{laterBait.map(baitRow)}</ul>
          </>
        ) : null}
        <p className="mt-3 text-sm text-muted">Up to 72 of each. Bait never spoils.</p>
      </Card>
      <ConfirmSheet
        open={offer !== null}
        title={offer?.title ?? ''}
        confirmLabel={offer ? `Buy for ${offer.price} gold` : 'Buy'}
        busyLabel="Buying…"
        cancelLabel="Cancel"
        pending={buying}
        onClose={() => setOffer(null)}
        onConfirm={async () => {
          if (!offer || buying) return
          await offer.buy()
          setOffer(null)
        }}
      >
        {offer ? <Rows rows={[...offer.rows, ['Cost', `${offer.price} gold`], ['Gold left', `${gold - offer.price}`]]} /> : null}
      </ConfirmSheet>
      <NoticeBar notice={notice} onDismiss={dismiss} />
    </>
  )
}
