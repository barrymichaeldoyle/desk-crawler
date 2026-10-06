import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { nextSlotAfter } from '@trmnl-games/desk-crawler/sim/schedule'
import { api } from '@trmnl-games/backend/api'
import type { Id } from '@trmnl-games/backend/data-model'
import { useIntent } from '../../../lib/intent'
import { seo } from '../../../lib/seo'
import { ActionFeedback, Button, Card, LoadingState } from '../../../lib/ui'
import { preload } from '../../../lib/preload'
import { retainSellableSelection, saleIsCurrent } from '../../../lib/bagSelection'
import { RARITY_TONE } from '../../../lib/palette'
import { useNow } from './-pulse'

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

const statOf = (item: Gear) => item.kind === 'weapon' ? item.attack : item.defense
const statLabel = (item: Gear) => item.kind === 'weapon' ? 'attack' : 'defense'

function Inventory() {
  const { data: bag } = useQuery(convexQuery(api.inventory.mine, {}))
  const { data: hero } = useQuery(convexQuery(api.heroes.mine, {}))
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sale, setSale] = useState<Gear[] | null>(null)
  const [destination, setDestination] = useState('')
  const selectionHeading = useRef<HTMLHeadingElement>(null)
  const saleHeading = useRef<HTMLHeadingElement>(null)
  const equip = useIntent(api.inventory.equip)
  const unequip = useIntent(api.inventory.unequip)
  const sellMany = useIntent(api.inventory.sellMany)
  const claim = useIntent(api.inventory.claimHeld)
  const resume = useIntent(api.inventory.resumeAdventures)
  const [gearAction, setGearAction] = useState<'equip' | 'unequip' | null>(null)
  const [sleepAction, setSleepAction] = useState<'claim' | 'resume' | null>(null)
  useEffect(() => {
    if (bag) setSelected((current) => retainSellableSelection(current, bag.gear as Gear[]))
  }, [bag])
  useEffect(() => { if (sale) saleHeading.current?.focus() }, [sale])
  if (!bag || !hero) return <LoadingState label="Loading your bag…" />

  const gear = bag.gear as Gear[]
  const manageable = hero.simulationState !== 'quarantined' && ['exploring', 'resting', 'sleeping'].includes(hero.status)
  const held = gear.find((item) => item.held)
  const sellable = gear.filter((item) => !item.equipped && !item.held)
  const chosen = sellable.filter((item) => selected.has(item.id))
  const displayed = sale ?? chosen
  const chosenGold = displayed.reduce((sum, item) => sum + item.saleValue, 0)
  const chosenRare = displayed.filter((item) => item.rarity === 'rare').length
  const validSale = sale === null || saleIsCurrent(sale, gear)
  const gearFeedback = gearAction ? { equip, unequip }[gearAction] : null
  const sleepFeedback = sleepAction ? { claim, resume }[sleepAction] : null
  const equippedOf = (kind: Gear['kind']) => gear.find((item) => item.equipped && item.kind === kind)
  const busy = equip.pending || unequip.pending || sellMany.pending || claim.pending || resume.pending
  const locked = busy || sale !== null
  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(retainSellableSelection(current, gear))
    if (next.has(id)) next.delete(id)
    else if (next.size < 30) next.add(id)
    return next
  })
  const cancelSale = () => { setSale(null); selectionHeading.current?.focus() }

  async function sellChosen() {
    if (!sale || !validSale || !manageable) return
    if (await sellMany.run({ itemIds: sale.map((item) => item.id) }, `Sold ${sale.length} ${sale.length === 1 ? 'item' : 'items'} for ${chosenGold} gold.`)) {
      setSelected(new Set())
      setSale(null)
      selectionHeading.current?.focus()
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-3xl font-bold">Your bag</h1>
        <p className="text-sm tabular-nums text-muted">{bag.used} / {bag.capacity} slots · {bag.capacity - bag.used} free</p>
      </header>
      {hero.status === 'sleeping' ? (
        <Card title={hero.wakeAtTick !== null ? 'Ready for the next adventure' : held ? 'A find is waiting safely' : 'Ready to head out?'}>
          {held ? <>
            <p><strong>{held.label}</strong> didn’t fit, so adventures stopped to keep it safe. Sell gear to free a slot, claim your find, then leave one slot free to resume.</p>
            <p className="mt-2 text-sm text-muted">+{statOf(held)} {statLabel(held)} · {held.rarity} · requires level {held.requiredLevel}</p>
            <Button className="mt-3" pending={claim.pending} busyLabel="Claiming…" disabled={!manageable || locked || bag.used >= bag.capacity} onClick={() => { setSleepAction('claim'); return claim.run({}, `${held.label} is now in your bag. Leave one free slot, then resume adventures.`) }}>Claim find</Button>
            {bag.used >= bag.capacity ? <p className="mt-2 text-sm">Sell an item below first. Equipping gear doesn’t free a slot.</p> : null}
          </> : hero.wakeAtTick !== null ? <ResumeAt /> : <>
            <p>{bag.canResume ? 'Your find is claimed and there’s room for more. Resume here or head to another unlocked area.' : 'Your find is claimed. Sell one more item to leave a free slot, then resume.'}</p>
            <label className="mt-4 flex flex-col gap-2 text-sm">
              <span className="font-semibold">Resume in</span>
              <select value={destination} disabled={locked || !manageable} onChange={(event) => setDestination(event.target.value)} className="pixel-select min-h-11 border-2 border-edge px-3 text-base">
                <option value="">{hero.biomes.find((biome: { id: string }) => biome.id === hero.biomeId)?.name ?? 'Current area'}</option>
                {hero.biomes.filter((biome: { unlocked: boolean; id: string }) => biome.unlocked && biome.id !== hero.biomeId).map((biome: { id: string; name: string }) => <option key={biome.id} value={biome.id}>{biome.name}</option>)}
              </select>
            </label>
            <Button className="mt-3" pending={resume.pending} busyLabel="Scheduling…" disabled={!manageable || locked || !bag.canResume} onClick={() => { setSleepAction('resume'); return resume.run(destination ? { biomeId: destination } : {}, 'Adventures will resume on the next adventure, without catch-up.') }}>Resume adventures</Button>
            {destination ? <p className="mt-2 text-sm text-muted">Set out on the next adventure and arrive on the one after it.</p> : null}
          </>}
          <ActionFeedback error={sleepFeedback?.error ?? null} message={sleepFeedback?.message ?? null} />
        </Card>
      ) : null}
      {!manageable ? <p className="text-sm">{hero.simulationState === 'quarantined' ? 'Gear changes are paused during a service check. Your items are safe.' : hero.status === 'paused' ? <>Adventures are paused. <Link to="/app/desk-crawler" className="underline underline-offset-4">Resume from Hero</Link> to change or sell gear.</> : 'You can change and sell gear once your hero is back from travelling or recovering.'}</p> : null}
      <Card title="Equipped">
        <div className="grid grid-cols-2 gap-5">
          {(['weapon', 'armor'] as const).map((kind) => {
            const item = equippedOf(kind)
            return <div key={kind} className="min-w-0">
              <h3 className="caps text-sm text-muted">{kind === 'weapon' ? 'Weapon' : 'Armor'}</h3>
              {item ? <ItemName label={item.label} rarity={item.rarity} className="mt-1" /> : <p className="mt-1 font-semibold">{`No ${kind} equipped`}</p>}
              <p className="mt-1 text-sm text-muted">{item ? <><StatChange item={item} /> · {item.rarity}</> : 'Equip something from your bag below.'}</p>
              {item ? <Button variant="quiet" className="mt-1 -ml-4" disabled={!manageable || locked} pending={unequip.pending} busyLabel="Removing…" aria-label={`Unequip ${item.label}`} onClick={() => { setGearAction('unequip'); return unequip.run({ slot: kind }, `${item.label} unequipped.`) }}>Unequip</Button> : null}
            </div>
          })}
        </div>
        <ActionFeedback error={gearFeedback?.error ?? null} message={gearFeedback?.message ?? null} />
      </Card>
      <section aria-labelledby="bag-gear-title" className="window min-w-0 px-4 pt-3 pb-4 sm:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="bag-gear-title" ref={selectionHeading} tabIndex={-1} className="font-display text-xl font-semibold text-gold-ink">Gear to review</h2>
          <p className="text-sm">{sellable.length} {sellable.length === 1 ? 'item' : 'items'}</p>
        </div>
        {bag.used >= 24 && hero.status !== 'sleeping' ? <p className="mt-3 text-sm">{bag.used >= bag.capacity ? 'Your bag is full. Adventures continue until the next gear find, which will be held safely.' : 'Your bag is filling up. Sell gear you no longer need to make room for new finds.'}</p> : null}
        <p className="mt-2 text-sm text-muted">Compare with your equipped gear. Select items to sell; you’ll review the sale before it happens.</p>
        {chosen.length > 0 && sale === null ? <Button allowOffline variant="quiet" className="-ml-4" disabled={busy} onClick={() => setSelected(new Set())}>Clear selection</Button> : null}
        {sellable.length === 0 ? <p className="mt-4">No spare gear yet. New finds will appear here as your hero explores.</p> : <ul className="mt-3 border-t-2 border-edge">
          {sellable.map((item) => {
            const current = equippedOf(item.kind)
            const delta = statOf(item) - (current ? statOf(current) : 0)
            const canEquip = item.requiredLevel <= hero.level
            return <li key={item.id} className="grid grid-cols-[44px_minmax(0,1fr)] gap-x-2 border-b border-rule py-3 sm:grid-cols-[44px_minmax(0,1fr)_auto]">
              <label className="flex min-h-11 cursor-pointer items-center justify-center self-start">
                <input type="checkbox" disabled={!manageable || locked} aria-label={`Select ${item.label} to sell`} checked={selected.has(item.id)} onChange={() => toggle(item.id)} className="pixel-check size-5" />
              </label>
              <div className="min-w-0">
                <ItemName label={item.label} rarity={item.rarity} />
                <p className="mt-1 text-sm"><StatChange item={item} /> <span className={`font-semibold ${delta > 0 ? 'text-xp-ink' : delta < 0 ? 'text-hp-ink' : 'text-muted'}`}>· {delta > 0 ? `+${delta} upgrade` : delta < 0 ? `${delta} vs equipped` : 'same as equipped'}</span></p>
                <p className="mt-1 text-sm text-muted">{item.rarity} · level {item.requiredLevel} · sells for <span className="text-gold-ink">{item.saleValue} gold</span></p>
              </div>
              <Button variant={delta > 0 && canEquip ? 'primary' : 'secondary'} className="col-start-2 mt-2 justify-self-start sm:col-start-3 sm:row-start-1 sm:mt-0 sm:self-center" aria-label={`Equip ${item.label}`} disabled={!manageable || locked || !canEquip} pending={equip.pending} busyLabel="Equipping…" onClick={async () => {
                setGearAction('equip')
                if (await equip.run({ itemId: item.id }, `${item.label} equipped.`)) setSelected((current) => { const next = new Set(current); next.delete(item.id); return next })
              }}>{canEquip ? 'Equip' : `Requires level ${item.requiredLevel}`}</Button>
            </li>
          })}
        </ul>}
        <ActionFeedback error={sale ? null : sellMany.error} message={sellMany.message} />
      </section>
      <Card title="Healing potions">
        <p className="tabular-nums"><strong className="text-rare-ink">{bag.potions}</strong> {bag.potions === 1 ? 'potion' : 'potions'} available. Potions use no gear slots.</p>
        <p className="mt-2 text-sm text-muted">Your hero uses them automatically when needed. You can also <Link to="/app/desk-crawler" className="underline underline-offset-4">drink one from Hero</Link>.</p>
      </Card>
      {displayed.length > 0 ? <section aria-label="Sell selected gear" onKeyDown={(event) => { if (sale && !busy && event.key === 'Escape') { event.preventDefault(); cancelSale() } }} className={`${sale ? 'relative sm:sticky sm:bottom-0' : 'sticky bottom-0'} window z-20 -mx-4 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:mx-0`}>
        {sale ? <>
          <h2 ref={saleHeading} tabIndex={-1} className="font-semibold">Sell {sale.length} {sale.length === 1 ? 'item' : 'items'} for <span className="text-gold-ink">{chosenGold} gold</span>?</h2>
          <p className="mt-2 text-sm">This cannot be undone.{chosenRare > 0 ? ` Includes ${chosenRare} rare ${chosenRare === 1 ? 'item' : 'items'}.` : ''}</p>
          <ul tabIndex={0} aria-label="Items in this sale" className="mt-2 max-h-32 overflow-y-auto text-sm">{sale.map((item) => <li key={item.id}>{item.label} · {item.saleValue} gold</li>)}</ul>
          {!validSale ? <p role="alert" className="mt-2 text-sm font-semibold">Your gear changed. Cancel and select the items again.</p> : null}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button disabled={!manageable || busy || !validSale} pending={sellMany.pending} busyLabel="Selling…" onClick={sellChosen}>Confirm sale</Button>
            <Button allowOffline variant="secondary" disabled={busy} onClick={cancelSale}>Cancel</Button>
          </div>
        </> : <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-sm tabular-nums">{chosen.length} selected · <span className="text-gold-ink">{chosenGold} gold</span>{chosenRare > 0 ? ` · ${chosenRare} rare` : ''}</p>
          <Button allowOffline disabled={!manageable || busy} onClick={() => { sellMany.clearFeedback(); setSale(chosen) }}>Review sale</Button>
        </div>}
        {sale && sellMany.error ? <ActionFeedback error={sellMany.error} message={null} /> : null}
      </section> : null}
    </div>
  )
}

/** A rarity gem: one facet for common, two for uncommon, three for rare, so rarity never rests on colour alone. */
const GEM: Record<string, string> = { common: 'M1 0h1v1H1zM0 1h3v1H0zM1 2h1v1H1z', uncommon: 'M1 0h3v1H1zM0 1h5v1H0zM1 2h3v1H1zM2 3h1v1H2z', rare: 'M1 0h5v1H1zM0 1h7v1H0zM1 2h5v1H1zM2 3h3v1H2zM3 4h1v1H3z' }

function ItemName({ label, rarity, className = '' }: { label: string; rarity: string; className?: string }) {
  const path = GEM[rarity] ?? GEM.common!
  const width = rarity === 'rare' ? 7 : rarity === 'uncommon' ? 5 : 3
  return <p className={`flex min-w-0 items-center gap-2 font-semibold ${RARITY_TONE[rarity] ?? ''} ${className}`}>
    <svg viewBox={`0 0 ${width} 5`} width={width * 3} height={15} aria-hidden="true" shapeRendering="crispEdges" className="shrink-0 fill-current"><path d={path} /></svg>
    <span className="min-w-0">{label}</span>
  </p>
}

function StatChange({ item }: { item: Gear }) {
  return <span className={item.kind === 'weapon' ? 'text-hp-ink' : 'text-sky-ink'}>+{statOf(item)} {statLabel(item)}</span>
}

function ResumeAt() {
  const now = useNow(60_000)
  const at = now === null ? null : new Date(nextSlotAfter(now)).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return <p>Resume is scheduled for {at ?? 'the next adventure'}. If updates are delayed, your hero joins the next completed adventure. No catch-up rewards.</p>
}
