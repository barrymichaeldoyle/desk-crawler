import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '@trmnl-games/backend/api'
import { fishSprite, FISH_SMALL } from '@trmnl-games/slow-cast/art/fish'
import { useIntent } from '../../../lib/intent'
import { preload } from '../../../lib/preload'
import { formatWeight, type Dock } from '../../../lib/slowCast'
import { Button, Card, NoticeBar, useNotice } from '../../../lib/ui'
import { SpriteIcon } from '../desk-crawler/-bagSlots'

/** The cooler: choose fish to sell, or sell them all. Nothing is ever sold automatically. */
export const Route = createFileRoute('/app/slow-cast/cooler')({
  loader: ({ context }) => preload(context, convexQuery(api.slowCast.anglers.dock, {})),
  component: CoolerPage,
})

function CoolerPage() {
  const { data } = useQuery(convexQuery(api.slowCast.anglers.dock, {}))
  const dock = data as Dock | undefined
  const { notice, notify, dismiss } = useNotice()
  const sell = useIntent(api.slowCast.anglers.sellCatches, { onFeedback: notify })
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set())
  if (!dock?.angler) return null
  const catches = dock.catches ?? []
  const picked = catches.filter((c) => chosen.has(c.id))
  const total = (rows: typeof catches) => rows.reduce((sum, row) => sum + row.value, 0)
  const toggle = (id: string) => setChosen((current) => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  const sellRows = async (rows: typeof catches) => {
    if (rows.length === 0) return
    if (await sell.run({ catchIds: rows.map((r) => r.id) }, `Sold ${rows.length} fish for ${total(rows)} gold.`)) setChosen(new Set())
  }
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-3xl font-bold">Cooler</h1>
        <span className="label-px text-muted">{dock.angler.cooler.name} · {catches.length}/{dock.angler.cooler.capacity} · {dock.angler.gold} gold</span>
      </div>
      {catches.length === 0 ? (
        <Card><p>The cooler is empty. Fish land here as the angler catches them.</p></Card>
      ) : (
        <Card>
          <ul className="flex flex-col">
            {catches.map((fish) => (
              <li key={fish.id}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 border-b border-rule py-2 last:border-b-0">
                  <input type="checkbox" className="size-5 shrink-0" checked={chosen.has(fish.id)} onChange={() => toggle(fish.id)} />
                  <SpriteIcon sprite={fishSprite(fish.speciesId, FISH_SMALL.width, FISH_SMALL.height)} scale={3} />
                  <span className="min-w-0 flex-1">{fish.name} <span className="text-muted">· {formatWeight(fish.grams)}</span></span>
                  <span className="shrink-0 tabular-nums text-gold-ink">{fish.value} gold</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button disabled={picked.length === 0} pending={sell.pending} busyLabel="Selling…" onClick={() => void sellRows(picked)}>
              {picked.length === 0 ? 'Choose fish to sell' : `Sell ${picked.length} for ${total(picked)} gold`}
            </Button>
            <Button variant="secondary" disabled={sell.pending} onClick={() => void sellRows(catches)}>Sell all for {total(catches)} gold</Button>
          </div>
          <p className="mt-3 text-sm text-muted">A fish is worth more the heavier it is, up to double its base price. With the cooler full, new catches still count for XP and the logbook, but go back.</p>
        </Card>
      )}
      <NoticeBar notice={notice} onDismiss={dismiss} />
    </>
  )
}
