import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '@trmnl-games/backend/api'
import type { Id } from '@trmnl-games/backend/data-model'
import { useIntent } from '../../../lib/intent'
import { seo } from '../../../lib/seo'
import { Button, Card, ErrorNote } from '../../../lib/ui'
import { preload } from '../../../lib/preload'

export const Route = createFileRoute('/app/desk-crawler/inventory')({ head: () => seo({ title: 'Bag', index: false }), loader: ({ context }) => preload(context, convexQuery(api.inventory.mine, {}), convexQuery(api.heroes.mine, {})), component: Inventory })

type Gear = {
  id: Id<'items'>
  kind: 'weapon' | 'armor'
  label: string
  rarity: string
  requiredLevel: number
  attack: number
  defense: number
  saleValue: number
  equipped: boolean
  held: boolean
}

function Inventory() {
  const { data: bag } = useQuery(convexQuery(api.inventory.mine, {}))
  const { data: hero } = useQuery(convexQuery(api.heroes.mine, {}))
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [destination, setDestination] = useState('')
  const equip = useIntent(api.inventory.equip)
  const sellMany = useIntent(api.inventory.sellMany)
  const claim = useIntent(api.inventory.claimHeld)
  const resume = useIntent(api.inventory.resumeAdventures)
  if (!bag || !hero) return <p role="status" className="text-stone-600 dark:text-stone-400">Loading your bag…</p>

  const gear = bag.gear as Gear[]
  const manageable = hero.status === 'exploring' || hero.status === 'resting' || hero.status === 'sleeping'
  const held = gear.find((item) => item.held)
  const sellable = gear.filter((item) => !item.equipped && !item.held)
  const chosen = sellable.filter((item) => selected.has(item.id))
  const chosenGold = chosen.reduce((sum, item) => sum + item.saleValue, 0)
  const chosenRare = chosen.filter((item) => item.rarity === 'rare').length
  const equippedOf = (kind: Gear['kind']) => gear.find((item) => item.equipped && item.kind === kind)
  const statOf = (item: Gear) => (item.kind === 'weapon' ? item.attack : item.defense)
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else if (next.size < 30) next.add(id)
      return next
    })

  async function sellChosen() {
    if (await sellMany.run({ itemIds: chosen.map((item) => item.id) })) {
      setSelected(new Set())
      setConfirming(false)
    }
  }

  return (
    <>
      <h1 className="sr-only">Bag</h1>
      {hero.status === 'sleeping' ? (
        <Card title="Bag full">
          {held ? (
            <>
              <p>
                Your bag is full, so <strong>{held.label}</strong> is waiting safely. Free a slot and claim it.
              </p>
              <Button className="mt-3" disabled={claim.pending || bag.used >= bag.capacity} onClick={() => claim.run({})}>
                Claim {held.label}
              </Button>
              {bag.used >= bag.capacity ? <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">Sell or swap something below to make room first.</p> : null}
            </>
          ) : hero.wakeAtTick !== null ? (
            <p>Adventures resume next tick.</p>
          ) : (
            <>
              <p>Leave at least one free slot, then resume. Choose where to head next if you like.</p>
              <label className="mt-3 flex flex-col gap-1 text-sm">
                <span className="font-semibold">Destination</span>
                <select value={destination} onChange={(e) => setDestination(e.target.value)} className="min-h-11 rounded-md border border-stone-400 bg-white px-3 text-stone-900">
                  <option value="">Stay in the current area</option>
                  {hero.biomes
                    .filter((b: { unlocked: boolean; id: string }) => b.unlocked && b.id !== hero.biomeId)
                    .map((b: { id: string; name: string }) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </label>
              <Button className="mt-3" disabled={resume.pending || !bag.canResume} onClick={() => resume.run(destination ? { biomeId: destination } : {})}>
                Resume adventures
              </Button>
            </>
          )}
          <ErrorNote message={claim.error ?? resume.error} />
        </Card>
      ) : null}

      <Card title={`Bag (${bag.used}/${bag.capacity})`}>
        {!manageable ? (
          <p className="mb-3 text-sm font-semibold">
            {hero.status === 'paused' ? 'Resume adventures to change or sell gear.' : 'Gear can be changed when your hero is exploring, resting or taking a break.'}
          </p>
        ) : null}
        {bag.used >= 24 && hero.status !== 'sleeping' ? <p className="mb-3 text-sm">Your bag is filling up. Sell or swap gear soon so new finds have room.</p> : null}
        <p className="mb-3 text-sm text-stone-600 dark:text-stone-400">{bag.potions} healing potions. Your hero drinks them automatically when hurt.</p>
        <ul className="flex flex-col divide-y divide-stone-200 dark:divide-stone-800">
          {gear.map((item) => {
            const current = equippedOf(item.kind)
            const better = !item.equipped && !item.held && current !== undefined && statOf(item) > statOf(current)
            return (
              <li key={item.id} className="flex items-center gap-3 py-2">
                {!item.equipped && !item.held && manageable ? (
                  <label className="-m-3 flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
                    <input type="checkbox" aria-label={`Select ${item.label} to sell`} checked={selected.has(item.id)} onChange={() => toggle(item.id)} className="h-5 w-5" />
                  </label>
                ) : (
                  <span className="w-5" aria-hidden="true" />
                )}
                <div className="flex-1">
                  <p className="font-semibold">
                    {item.label}
                    {item.equipped ? <span className="ml-2 rounded bg-stone-900 px-1.5 text-xs text-white dark:bg-stone-100 dark:text-stone-900">Equipped</span> : null}
                    {item.held ? <span className="ml-2 rounded border border-stone-900 px-1.5 text-xs dark:border-stone-100">Held</span> : null}
                    {better ? <span className="ml-2 text-xs font-semibold">Upgrade</span> : null}
                  </p>
                  <p className="text-sm text-stone-600 dark:text-stone-400">
                    {item.kind === 'weapon' ? `+${item.attack} attack` : `+${item.defense} defense`} · {item.rarity} · level {item.requiredLevel} · sells for {item.saleValue}
                  </p>
                  {!item.equipped && !item.held && item.requiredLevel > hero.level ? <p className="text-sm font-semibold">Equippable at level {item.requiredLevel}</p> : null}
                </div>
                {!item.equipped && !item.held ? (
                  <Button variant="secondary" disabled={!manageable || equip.pending || item.requiredLevel > hero.level} onClick={() => equip.run({ itemId: item.id })}>
                    Equip
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>
        <ErrorNote message={equip.error} />
      </Card>

      {chosen.length > 0 ? (
        <div role="region" aria-label="Sell selected gear" className="sticky bottom-4 rounded-lg border-2 border-stone-900 bg-white p-4 shadow-lg dark:border-stone-200 dark:bg-stone-900">
          {confirming ? (
            <>
              <p>
                Sell {chosen.length} {chosen.length === 1 ? 'item' : 'items'} for <strong>{chosenGold} gold</strong>?{chosenRare > 0 ? ` This includes ${chosenRare} rare ${chosenRare === 1 ? 'item' : 'items'}.` : ''}
              </p>
              <div className="mt-3 flex gap-2">
                <Button disabled={sellMany.pending} onClick={sellChosen}>
                  Sell
                </Button>
                <Button variant="secondary" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span>
                {chosen.length} selected · {chosenGold} gold
              </span>
              <Button onClick={() => setConfirming(true)}>Sell selected</Button>
            </div>
          )}
          <ErrorNote message={sellMany.error} />
        </div>
      ) : null}
    </>
  )
}
