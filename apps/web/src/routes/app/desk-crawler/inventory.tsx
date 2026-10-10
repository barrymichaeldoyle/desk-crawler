import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { nextSlotAfter } from '@trmnl-games/desk-crawler/sim/schedule'
import { POTION_HEAL_PCT } from '@trmnl-games/desk-crawler/content/sustain'
import { pctOf } from '@trmnl-games/desk-crawler/sim/core/stats'
import { api } from '@trmnl-games/backend/api'
import type { Id } from '@trmnl-games/backend/data-model'
import { useIntent } from '../../../lib/intent'
import { seo } from '../../../lib/seo'
import { Glyph } from '../../../lib/glyphs'
import { BUTTON_SECONDARY, Button, Card, ErrorNote, LINK_BUTTON, LoadingState, NoticeBar, useNotice } from '../../../lib/ui'
import { preload } from '../../../lib/preload'
import { retainSellableSelection, saleIsCurrent } from '../../../lib/bagSelection'
import { RARITY_TONE } from '../../../lib/palette'
import { EmptySlot, Gem, PotionSlot, Sheet, SheetTitle, Slot, SlotPreview } from './-bagSlots'
import { useNow } from './-pulse'
import { ConfirmButtons, Consequences } from './-confirm'

export const Route = createFileRoute('/app/desk-crawler/inventory')({ head: () => seo({ title: 'Bag', index: false }), loader: ({ context }) => preload(context, convexQuery(api.inventory.mine, {}), convexQuery(api.heroes.mine, {})), component: Inventory })

type Gear = {
  id: Id<'items'>
  kind: 'weapon' | 'armor'
  templateId: string
  label: string
  rarity: string
  requiredLevel: number
  attack: number
  defense: number
  saleValue: number
  affix: { name: string; blurb: string } | null
  equipped: boolean
  held: boolean
  /** D111: in the desk drawer rather than the bag. */
  inDrawer: boolean
}
type Biome = { id: string; name: string; unlocked: boolean }

const SALE_LIMIT = 30
const statOf = (item: Gear) => item.kind === 'weapon' ? item.attack : item.defense
const statLabel = (item: Gear) => item.kind === 'weapon' ? 'attack' : 'defense'
const count = (n: number, noun: string) => `${n} ${n === 1 ? noun : `${noun}s`}`

/**
 * The bag as a bag (D97): the two equipped slots and the potion stack, then every slot of the current bag with each
 * piece drawn in it. Tapping a piece opens its sheet with the comparison and its actions; Sell gear turns the grid into
 * a selection with a pinned total, and the review is a second sheet. Nothing on the page moves while an action runs:
 * feedback arrives in a pinned notice, and only the acting slot shows busy. Under a catalog with a desk drawer (D111) the
 * drawer's six slots sit under the bag, and a sale can take pieces from both.
 */
function Inventory() {
  const { data: bag } = useQuery(convexQuery(api.inventory.mine, {}))
  const { data: hero } = useQuery(convexQuery(api.heroes.mine, {}))
  const [mode, setMode] = useState<'browse' | 'sell'>('browse')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [openId, setOpenId] = useState<string | 'potions' | null>(null)
  const [sale, setSale] = useState<Gear[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [destination, setDestination] = useState('')
  const { notice, notify: announce, dismiss } = useNotice()
  // Errors inside an open sheet show there; the pinned notice carries the rest (the sheet would hide it).
  const sheetOpen = useRef(false)
  sheetOpen.current = openId !== null || sale !== null
  const notify = (feedback: { error: string | null; message: string | null }) => {
    if (feedback.error && sheetOpen.current) return
    announce(feedback)
  }
  const equip = useIntent(api.inventory.equip, { onFeedback: notify })
  const unequip = useIntent(api.inventory.unequip, { onFeedback: notify })
  const sellMany = useIntent(api.inventory.sellMany, { onFeedback: notify })
  const claim = useIntent(api.inventory.claimHeld, { onFeedback: notify })
  const equipDrawer = useIntent(api.inventory.equipFromDrawer, { onFeedback: notify })
  const claimDrawer = useIntent(api.inventory.claimFromDrawer, { onFeedback: notify })
  const resume = useIntent(api.inventory.resumeAdventures, { onFeedback: notify })
  const buyBag = useIntent(api.inventory.buyBag, { onFeedback: notify })
  const buyPouch = useIntent(api.inventory.buyPouch, { onFeedback: notify })
  const buyOffer = useIntent(api.inventory.buyOffer, { onFeedback: notify })
  useEffect(() => {
    if (bag) setSelected((current) => retainSellableSelection(current, bag.gear as Gear[]))
  }, [bag])
  if (!bag || !hero) return <LoadingState label="Loading your bag…" />

  const gear = bag.gear as Gear[]
  const manageable = hero.simulationState !== 'quarantined' && ['exploring', 'resting', 'sleeping'].includes(hero.status)
  const reason = manageable ? null : hero.simulationState === 'quarantined' ? 'Gear changes are paused during a service check.' : hero.status === 'paused' ? 'Adventures are paused. Resume from Hero to change or sell gear.' : 'Gear changes open again once your hero is back from travelling or recovering.'
  const held = gear.find((item) => item.held) ?? null
  const sellable = gear.filter((item) => !item.equipped && !item.held)
  const inBag = sellable.filter((item) => !item.inDrawer)
  // The drawer keeps its own order, oldest first, so a piece stays where the player last saw it.
  const drawerView: { capacity: number; itemIds: string[] } = bag.drawer ?? { capacity: 0, itemIds: [] }
  const drawer = drawerView.itemIds.map((id: string) => gear.find((item) => item.id === id)).filter((item: Gear | undefined): item is Gear => item !== undefined)
  const hasDrawer = drawerView.capacity > 0
  const drawerRoom = drawer.length < drawerView.capacity
  const chosen = sellable.filter((item) => selected.has(item.id))
  const goldOf = (items: Gear[]) => items.reduce((sum, item) => sum + item.saleValue, 0)
  const rareOf = (items: Gear[]) => items.filter((item) => item.rarity === 'rare' || item.rarity === 'epic').length
  const validSale = sale === null || saleIsCurrent(sale, gear)
  const equippedOf = (kind: Gear['kind']) => gear.find((item) => item.equipped && item.kind === kind) ?? null
  const deltaOf = (item: Gear) => { const current = equippedOf(item.kind); return statOf(item) - (current ? statOf(current) : 0) }
  const busy = equip.pending || unequip.pending || sellMany.pending || claim.pending || equipDrawer.pending || claimDrawer.pending || resume.pending || buyBag.pending || buyPouch.pending || buyOffer.pending
  const full = bag.used >= bag.capacity
  // Quiet warning at 80% of the current bag (D61).
  const filling = bag.used >= Math.ceil(bag.capacity * 0.8)
  // A held find can always be claimed somewhere while the bag or the drawer has a slot.
  const claimBlocked = full && !drawerRoom
  const opened = openId === 'potions' ? null : gear.find((item) => item.id === openId) ?? null
  const slotLabel = (item: Gear) => {
    const delta = deltaOf(item)
    const compare = item.requiredLevel > hero.level ? `requires level ${item.requiredLevel}` : delta > 0 ? `${delta} better than equipped` : delta < 0 ? `${-delta} worse than equipped` : 'same as equipped'
    return `${item.label}, ${item.rarity}, +${statOf(item)} ${statLabel(item)}, ${compare}${item.held ? ', held find' : item.inDrawer ? ', in the desk drawer' : ''}`
  }
  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(retainSellableSelection(current, gear))
    if (next.has(id)) next.delete(id)
    else if (next.size < SALE_LIMIT) next.add(id)
    else announce({ error: `A sale holds up to ${SALE_LIMIT} items. Sell these first, then select more.`, message: null })
    return next
  })
  const leaveSale = () => { setMode('browse'); setSelected(new Set()) }
  const tap = (item: Gear) => { if (mode === 'sell' && !item.held) toggle(item.id); else setOpenId(item.id) }

  async function act<A>(item: Gear | null, intent: { run: (args: A, message?: string) => Promise<boolean> }, args: A, message: string) {
    setBusyId(item?.id ?? null)
    const done = await intent.run(args, message)
    setBusyId(null)
    if (done) setOpenId(null)
    return done
  }
  async function sellChosen() {
    if (!sale || !validSale || !manageable) return
    if (await sellMany.run({ itemIds: sale.map((item) => item.id) }, `Sold ${count(sale.length, 'item')} for ${goldOf(sale)} gold.`)) {
      setSale(null)
      leaveSale()
    }
  }

  const slots = Math.max(bag.capacity, inBag.length)
  const claimMessage = (item: Gear) => full ? `${item.label} is in the desk drawer.` : `${item.label} is in your bag. Keep one slot free, then resume.`
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-3xl font-bold">Your bag</h1>
        <p className="text-sm tabular-nums text-muted">{bag.ladder.name} · {bag.used} of {bag.capacity} slots{drawer.length > 0 ? ` · ${drawer.length} in the drawer` : ''}</p>
      </header>
      {hero.status === 'sleeping' ? (
        <Card title={hero.wakeAtTick !== null ? 'Resuming next adventure' : held ? 'A find is waiting' : 'Resume adventures'}>
          {held ? <>
            <p><strong>{held.label}</strong> didn’t fit, so adventures stopped. {hasDrawer ? 'Sell gear to free a bag or drawer slot, claim the find, then keep one slot free to resume.' : 'Sell gear to free a slot, claim the find, then keep one slot free to resume.'}</p>
            <Button className="mt-3" pending={claim.pending} busyLabel="Claiming…" disabled={!manageable || busy || claimBlocked} onClick={() => act(held, claim, {}, claimMessage(held))}>{full && drawerRoom ? 'Put in drawer' : 'Claim find'}</Button>
            {claimBlocked ? <p className="mt-2 text-sm">{hasDrawer ? 'Sell an item from the bag or the drawer first.' : 'Sell an item or get a bigger bag first.'}</p> : null}
          </> : hero.wakeAtTick !== null ? <ResumeAt /> : <>
            <p>{bag.canResume ? 'Room for more finds. Resume here, or set out for another unlocked area.' : hasDrawer ? 'Sell one more item from the bag or the drawer to keep a slot free, then resume.' : 'Sell one more item to keep a slot free, then resume.'}</p>
            <label className="mt-4 flex flex-col gap-2 text-sm">
              <span className="font-semibold">Resume in</span>
              <select value={destination} disabled={busy || !manageable} onChange={(event) => setDestination(event.target.value)} className="pixel-select min-h-11 border-2 border-edge pr-9 pl-3 text-base">
                <option value="">{hero.biomes.find((biome: Biome) => biome.id === hero.biomeId)?.name ?? 'Current area'}</option>
                {hero.biomes.filter((biome: Biome) => biome.unlocked && biome.id !== hero.biomeId).map((biome: Biome) => <option key={biome.id} value={biome.id}>{biome.name}</option>)}
              </select>
            </label>
            <Button className="mt-3" pending={resume.pending} busyLabel="Scheduling…" disabled={!manageable || busy || !bag.canResume} onClick={() => resume.run(destination ? { biomeId: destination } : {}, 'Resuming on the next adventure.')}>Resume adventures</Button>
            {destination ? <p className="mt-2 text-sm text-muted">Your hero sets out next adventure and arrives the one after.</p> : null}
          </>}
        </Card>
      ) : null}
      {reason ? <p className="text-sm">{hero.status === 'paused' && hero.simulationState !== 'quarantined' ? <>Adventures are paused. <Link to="/app/desk-crawler" className="underline underline-offset-4">Resume from Hero</Link> to change or sell gear.</> : reason}</p> : null}

      <Card title="Equipped" icon="sword">
        <div className="grid grid-cols-3 gap-2 min-[375px]:gap-3 sm:max-w-sm sm:gap-5">
          {(['weapon', 'armor'] as const).map((kind) => {
            const item = equippedOf(kind)
            return <div key={kind} className="flex min-w-0 flex-col gap-1.5">
              <h3 className="caps text-sm text-muted">{kind === 'weapon' ? 'Weapon' : 'Armor'}</h3>
              {item ? <Slot item={item} label={`${item.label}, equipped ${kind}, +${statOf(item)} ${statLabel(item)}`} busy={busyId === item.id} onClick={() => setOpenId(item.id)} /> : <EmptySlot />}
              <p className="text-sm leading-snug">{item ? <StatOf item={item} /> : <span className="text-muted">Empty</span>}</p>
            </div>
          })}
          <div className="flex min-w-0 flex-col gap-1.5">
            <h3 className="caps text-sm text-muted">Potions</h3>
            <PotionSlot count={bag.potions} label={`${count(bag.potions, 'potion')}, each heals ${POTION_HEAL_PCT}% of max HP`} onClick={() => setOpenId('potions')} />
            <p className="text-sm leading-snug">+{pctOf(hero.maxHp, POTION_HEAL_PCT)} HP each</p>
          </div>
        </div>
      </Card>

      <section aria-labelledby="bag-gear-title" className="window min-w-0 px-4 pt-3 pb-4 sm:px-5">
        {/* The title stays one line beside either button, so the header holds still when Sell gear becomes Done. */}
        <div className="flex min-h-11 items-center justify-between gap-3">
          {/* The page header already names the bag; this window is its gear. */}
          <h2 id="bag-gear-title" className="flex min-w-0 items-center gap-3 font-display text-xl font-bold sm:text-2xl"><Glyph name="bag" size={24} className="text-gold-ink" /><span className="truncate">Gear</span></h2>
          {mode === 'sell'
            ? <Button allowOffline variant="secondary" className="w-28 shrink-0 whitespace-nowrap" disabled={busy} onClick={leaveSale}>Done</Button>
            : <Button allowOffline variant="secondary" className="w-28 shrink-0 whitespace-nowrap" icon="tag" disabled={sellable.length === 0} onClick={() => setMode('sell')}>Sell</Button>}
        </div>
        <p className="mt-1 min-h-5 text-sm text-muted">
          {mode === 'sell'
            ? <>Tap gear to select it.{sellable.length > chosen.length ? <> <button type="button" className="font-semibold text-ink underline underline-offset-4" onClick={() => setSelected(new Set(sellable.slice(0, SALE_LIMIT).map((item) => item.id)))}>Select all</button></> : null}</>
            : inBag.length === 0 ? 'No spare gear yet. Finds land here.' : full ? (drawerRoom ? 'Bag full. New finds go in the desk drawer.' : 'Bag full. The next find is held, and adventures stop until you make room.') : filling ? 'Bag nearly full. Sell gear you no longer need.' : 'Tap a piece to compare, equip or sell it.'}
        </p>
        <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2">
          {held ? <li><Slot item={held} held label={slotLabel(held)} busy={busyId === held.id} onClick={() => setOpenId(held.id)} /></li> : null}
          {inBag.map((item) => <li key={item.id}><Slot item={item} label={slotLabel(item)} selectable={mode === 'sell'} selected={selected.has(item.id)} upgrade={deltaOf(item) > 0 && item.requiredLevel <= hero.level} lockedLevel={item.requiredLevel > hero.level ? item.requiredLevel : null} busy={busyId === item.id} onClick={() => tap(item)} /></li>)}
          {Array.from({ length: Math.max(0, slots - inBag.length) }, (_, index) => <li key={`empty-${index}`}><EmptySlot /></li>)}
        </ul>
      </section>

      {hasDrawer ? <section aria-labelledby="drawer-title" className="window min-w-0 px-4 pt-3 pb-4 sm:px-5">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <h2 id="drawer-title" className="min-w-0 truncate font-display text-xl font-bold sm:text-2xl">Desk drawer</h2>
          <p className="shrink-0 text-sm tabular-nums text-muted">{drawer.length} of {drawerView.capacity}</p>
        </div>
        <p className="mt-1 min-h-5 text-sm text-muted">
          {mode === 'sell' && drawer.length > 0 ? 'Tap gear to add it to the sale.' : drawer.length === 0 ? 'When the bag is full, finds go in here and your hero keeps adventuring.' : drawerRoom ? 'Finds that didn’t fit in the bag. Tap one to equip, move or sell it.' : 'Drawer full too. The next find is held, and adventures stop until you make room.'}
        </p>
        <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2">
          {drawer.map((item: Gear) => <li key={item.id}><Slot item={item} label={slotLabel(item)} selectable={mode === 'sell'} selected={selected.has(item.id)} upgrade={deltaOf(item) > 0 && item.requiredLevel <= hero.level} lockedLevel={item.requiredLevel > hero.level ? item.requiredLevel : null} busy={busyId === item.id} onClick={() => tap(item)} /></li>)}
          {Array.from({ length: Math.max(0, drawerView.capacity - drawer.length) }, (_, index) => <li key={`drawer-empty-${index}`}><EmptySlot /></li>)}
        </ul>
      </section> : null}

      {bag.merchant ? <Merchant visit={bag.merchant} gold={hero.gold} potions={bag.potions} cap={bag.pouch.cap} disabled={!manageable || busy} intent={buyOffer} /> : null}
      <div className="grid gap-8 sm:grid-cols-2">
        <BagLadder ladder={bag.ladder} capacity={bag.capacity} gold={hero.gold} disabled={!manageable || busy} intent={buyBag} />
        <PotionPouch pouch={bag.pouch} potions={bag.potions} gold={hero.gold} disabled={!manageable || busy} intent={buyPouch} />
      </div>

      {mode === 'sell' ? <div className="window sticky bottom-0 z-20 -mx-4 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:mx-0">
        <div className="flex items-center justify-between gap-3">
          <p role="status" className="min-w-0 text-sm tabular-nums">{chosen.length === 0 ? 'Nothing selected' : <>{count(chosen.length, 'item')} for <span className="text-gold-ink">{goldOf(chosen)} gold</span>{rareOf(chosen) > 0 ? `, ${rareOf(chosen)} rare` : ''}</>}</p>
          <Button allowOffline disabled={!manageable || busy || chosen.length === 0} onClick={() => setSale(chosen)}>Sell {chosen.length > 0 ? chosen.length : ''}</Button>
        </div>
      </div> : null}

      <Sheet open={openId === 'potions'} onClose={() => setOpenId(null)} label="Potions">
        <SheetTitle>Potions</SheetTitle>
        <p className="mt-2 tabular-nums">You have <strong className="text-rare-ink">{bag.potions}</strong>. Your {bag.pouch.name.toLowerCase()} holds {bag.pouch.cap}.</p>
        <p className="mt-2 text-sm text-muted tabular-nums">Each heals {POTION_HEAL_PCT}% of max HP (+{pctOf(hero.maxHp, POTION_HEAL_PCT)} HP). Drunk automatically when needed, or from Hero. Potions take no bag slots.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link to="/app/desk-crawler" className={`${LINK_BUTTON} ${BUTTON_SECONDARY} justify-center`}>Go to Hero</Link>
          <Button allowOffline variant="secondary" onClick={() => setOpenId(null)}>Close</Button>
        </div>
      </Sheet>

      <Sheet open={openId !== null && openId !== 'potions'} onClose={() => setOpenId(null)} label="Gear">
        {opened ? <ItemSheet key={opened.id} item={opened} hero={hero} current={equippedOf(opened.kind)} manageable={manageable} reason={reason} busy={busy} full={full} claimBlocked={claimBlocked} intents={{ equip: opened.inDrawer ? equipDrawer : equip, unequip, claim, move: claimDrawer }} onClose={() => setOpenId(null)} onEquip={() => act(opened, opened.inDrawer ? equipDrawer : equip, { itemId: opened.id }, opened.inDrawer && equippedOf(opened.kind) ? `${opened.label} equipped. The old piece went in the drawer.` : `${opened.label} equipped.`)} onUnequip={() => act(opened, unequip, { slot: opened.kind }, `${opened.label} unequipped.`)} onClaim={() => act(opened, claim, {}, claimMessage(opened))} onMove={() => act(opened, claimDrawer, { itemId: opened.id }, `${opened.label} moved into your bag.`)} onSell={() => { setOpenId(null); setSale([opened]) }} /> : <>
          <SheetTitle>Gone from your bag</SheetTitle>
          <p className="mt-2 text-sm">That piece was sold or moved from another screen.</p>
          <Button allowOffline variant="secondary" className="mt-4 w-full" onClick={() => setOpenId(null)}>Close</Button>
        </>}
      </Sheet>

      <Sheet open={sale !== null} onClose={() => { if (!sellMany.pending) setSale(null) }} label="Sell gear">
        {sale ? <>
          <SheetTitle>Sell {count(sale.length, 'item')} for <span className="text-gold-ink">{goldOf(sale)} gold</span>?</SheetTitle>
          <p className="mt-2 text-sm">This cannot be undone.{rareOf(sale) > 0 ? ` Includes ${count(rareOf(sale), 'rare item')}.` : ''}</p>
          <ul aria-label="Items in this sale" className="mt-3 max-h-48 overflow-y-auto border-y-2 border-rule text-sm">{sale.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 border-b border-rule py-1.5 last:border-b-0"><span className={`flex min-w-0 items-center gap-2 font-semibold ${RARITY_TONE[item.rarity] ?? ''}`}><Gem rarity={item.rarity} scale={2} /><span className="truncate">{item.label}</span></span><span className="shrink-0 tabular-nums text-gold-ink">{item.saleValue} gold</span></li>)}</ul>
          {!validSale ? <p role="alert" className="mt-3 text-sm font-semibold">Your gear changed. Close this and select the items again.</p> : null}
          {!manageable && reason ? <p className="mt-3 text-sm">{reason}</p> : null}
          <div className="mt-3 empty:hidden"><ErrorNote message={sellMany.error} /></div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button disabled={!manageable || busy || !validSale} pending={sellMany.pending} busyLabel="Selling…" onClick={sellChosen}>Confirm</Button>
            <Button allowOffline variant="secondary" disabled={sellMany.pending} onClick={() => setSale(null)}>Cancel</Button>
          </div>
        </> : null}
      </Sheet>

      <NoticeBar notice={notice} lifted={mode === 'sell'} onDismiss={dismiss} />
    </div>
  )
}

/** One piece: its icon, stats against the equipped piece, affix and sale value, then the actions open to it. */
function ItemSheet({ item, hero, current, manageable, reason, busy, full, claimBlocked, intents, onClose, onEquip, onUnequip, onClaim, onMove, onSell }: {
  item: Gear
  hero: { level: number }
  current: Gear | null
  manageable: boolean
  reason: string | null
  busy: boolean
  full: boolean
  claimBlocked: boolean
  intents: { equip: { pending: boolean; error: string | null }; unequip: { pending: boolean; error: string | null }; claim: { pending: boolean; error: string | null }; move: { pending: boolean; error: string | null } }
  onClose: () => void
  onEquip: () => void
  onUnequip: () => void
  onClaim: () => void
  onMove: () => void
  onSell: () => void
}) {
  const delta = statOf(item) - (current ? statOf(current) : 0)
  const canEquip = item.requiredLevel <= hero.level
  const error = item.equipped ? intents.unequip.error : item.held ? intents.claim.error : intents.equip.error ?? (item.inDrawer ? intents.move.error : null)
  // D111: Move to bag shows only while the bag has a free slot.
  const movable = item.inDrawer && !full
  // Unequipping, or equipping something weaker, makes the hero fight worse, so it asks first (in place, inside this sheet).
  const [confirming, setConfirming] = useState<'equip' | 'unequip' | null>(null)
  const weaker = !item.equipped && current !== null && delta < 0
  return <>
    <div className="flex items-start gap-3">
      <div className="w-16 shrink-0"><SlotPreview item={item} /></div>
      <div className="min-w-0 flex-1">
        <SheetTitle><span className={RARITY_TONE[item.rarity] ?? ''}>{item.label}</span></SheetTitle>
        <p className="mt-1 text-sm text-muted">{item.rarity} {item.kind}, level {item.requiredLevel}{item.equipped ? ', equipped' : item.held ? ', held find' : item.inDrawer ? ', in the desk drawer' : ''}</p>
      </div>
    </div>
    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt className="caps text-muted">{statLabel(item)}</dt>
      <dd className="tabular-nums"><StatOf item={item} />{!item.equipped ? <Delta delta={delta} /> : null}</dd>
      {!item.equipped ? <><dt className="caps text-muted">Equipped</dt><dd className="tabular-nums">{current ? <>{current.label}, <StatOf item={current} /></> : <span className="text-muted">Nothing</span>}</dd></> : null}
      {item.affix ? <><dt className="caps text-muted">{item.affix.name}</dt><dd>{item.affix.blurb}</dd></> : null}
      <dt className="caps text-muted">Sells for</dt>
      <dd className="tabular-nums text-gold-ink">{item.saleValue} gold</dd>
    </dl>
    {!manageable && reason ? <p className="mt-3 text-sm">{reason}</p> : item.held && claimBlocked ? <p className="mt-3 text-sm">Sell an item or get a bigger bag to claim this find.</p> : !item.equipped && !item.held && !canEquip ? <p className="mt-3 text-sm">Your hero can wear this from level {item.requiredLevel}. It can still be sold.</p> : null}
    <div className="mt-3 empty:hidden"><ErrorNote message={error} /></div>
    {confirming ? (
      <div className="mt-4 flex flex-col gap-3">
        <Consequences>
          {confirming === 'unequip'
            ? <li>Your hero fights without a {item.kind} until you equip another, so its {statLabel(item)} drops by <strong>{statOf(item)}</strong>. The {item.label} goes into your bag.</li>
            : <li>The {item.label} has <strong>{Math.abs(delta)} less {statLabel(item)}</strong> than your {current?.label}, so your hero fights a little worse. The {current?.label} goes into {item.inDrawer ? 'the desk drawer' : 'your bag'}.</li>}
          <li>You can change it back any time on this page.</li>
        </Consequences>
        <ConfirmButtons
          confirmLabel={confirming === 'unequip' ? 'Unequip' : 'Equip anyway'}
          busyLabel={confirming === 'unequip' ? 'Removing…' : 'Equipping…'}
          cancelLabel="Keep it on"
          pending={confirming === 'unequip' ? intents.unequip.pending : intents.equip.pending}
          disabled={!manageable || busy}
          onConfirm={confirming === 'unequip' ? onUnequip : onEquip}
          onCancel={() => setConfirming(null)}
        />
      </div>
    ) : <div className="mt-4 grid grid-cols-2 gap-2">
      {item.equipped
        ? <Button variant="secondary" disabled={!manageable || busy} pending={intents.unequip.pending} busyLabel="Removing…" onClick={() => setConfirming('unequip')}>Unequip</Button>
        : item.held
          ? <Button disabled={!manageable || busy || claimBlocked} pending={intents.claim.pending} busyLabel="Claiming…" onClick={onClaim}>{full && !claimBlocked ? 'Put in drawer' : 'Claim find'}</Button>
          : <>
            <Button variant={delta > 0 && canEquip ? 'primary' : 'secondary'} disabled={!manageable || busy || !canEquip} pending={intents.equip.pending} busyLabel="Equipping…" onClick={() => (weaker ? setConfirming('equip') : onEquip())}>Equip</Button>
            <Button allowOffline variant="secondary" disabled={!manageable || busy} onClick={onSell}>Sell</Button>
            {movable ? <Button variant="secondary" className="col-span-2" disabled={!manageable || busy} pending={intents.move.pending} busyLabel="Moving…" onClick={onMove}>Move to bag</Button> : null}
          </>}
      <Button allowOffline variant="quiet" className={item.equipped || item.held ? '' : 'col-span-2'} disabled={busy} onClick={onClose}>Close</Button>
    </div>}
  </>
}

type Ladder = {
  name: string
  next: { id: string; name: string; capacity: number; price: number | null; milestoneLevel: number | null; milestoneAdventures: number | null; buyable: boolean; lockedUntilLevel: number | null } | null
}
type Pouch = { name: string; cap: number; next: { id: string; name: string; cap: number; price: number | null; milestoneLevel: number | null; buyable: boolean; lockedUntilLevel: number | null } | null }
type Offer = { id: 'potions' | 'pouch' | 'bag'; name: string; quantity: number; price: number; tierId?: string }
type Visit = { offers: Offer[]; expiresAtTick: number; ticksLeft: number; biomeId: string }
type PurchaseIntent<A> = { pending: boolean; run: (args: A, message?: string) => Promise<boolean> }

/** D77: the potion pouch, its next tier and the three ways to get it, beside the bag ladder. */
function PotionPouch({ pouch, potions, gold, disabled, intent }: { pouch: Pouch; potions: number; gold: number; disabled: boolean; intent: PurchaseIntent<{ tierId: string }> }) {
  const next = pouch.next
  const affordable = next?.price != null && gold >= next.price
  return <Card title={pouch.name} icon="potion">
    <p className="tabular-nums">Holds <strong>{pouch.cap}</strong> potions. You have <strong>{potions}</strong>.</p>
    {next ? <>
      <p className="mt-3"><strong>Next: {next.name}</strong>, {next.cap} potions</p>
      <p className="mt-1 text-sm text-muted">Yours at level {next.milestoneLevel}, or sooner if your hero finds one or the merchant has one.</p>
      {next.price !== null ? next.buyable ? <>
        <Button className="mt-3" variant={affordable ? 'primary' : 'secondary'} disabled={disabled || !affordable} pending={intent.pending} icon="coin" busyLabel="Buying…" onClick={() => intent.run({ tierId: next.id }, `${next.name} bought. It holds ${next.cap} potions.`)}>Buy for {next.price} gold</Button>
        {!affordable ? <p className="mt-2 text-sm tabular-nums">You have <span className="text-gold-ink">{gold} gold</span>.</p> : null}
      </> : <p className="mt-2 text-sm">{next.lockedUntilLevel !== null ? `You can buy it from level ${next.lockedUntilLevel}.` : 'You can buy it after your next pouch milestone.'}</p> : null}
    </> : <p className="mt-3 text-sm text-muted">This is the biggest pouch for now.</p>}
  </Card>
}

/** D78: the visiting merchant's offers, each sold once, open for a few adventures. */
function Merchant({ visit, gold, potions, cap, disabled, intent }: { visit: Visit; gold: number; potions: number; cap: number; disabled: boolean; intent: PurchaseIntent<{ offerId: Offer['id'] }> }) {
  return <Card title="Wandering Merchant" icon="merchant">
    <p className="text-sm">Leaves in {visit.ticksLeft === 1 ? 'one adventure' : `${visit.ticksLeft} adventures`}. Each offer sells once.</p>
    <ul className="mt-3 flex flex-col gap-3">
      {visit.offers.map((offer) => {
        const affordable = gold >= offer.price
        const overflow = offer.id === 'potions' && potions + offer.quantity > cap
        return <li key={offer.id} className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-faint pt-3 first:border-t-0 first:pt-0">
          <span><strong>{offer.name}</strong>{overflow ? <span className="block text-sm text-muted">Your pouch holds {cap}; make room first.</span> : null}</span>
          <Button variant={affordable && !overflow ? 'primary' : 'secondary'} disabled={disabled || !affordable || overflow} pending={intent.pending} icon="coin" busyLabel="Buying…" onClick={() => intent.run({ offerId: offer.id }, `${offer.name} bought.`)}>Buy for {offer.price} gold</Button>
        </li>
      })}
    </ul>
    {visit.offers.some((offer) => gold < offer.price) ? <p className="mt-2 text-sm tabular-nums">You have <span className="text-gold-ink">{gold} gold</span>.</p> : null}
  </Card>
}

/** D61: the current bag, the next one and the three ways to get it. */
function BagLadder({ ladder, capacity, gold, disabled, intent }: { ladder: Ladder; capacity: number; gold: number; disabled: boolean; intent: PurchaseIntent<{ tierId: string }> }) {
  const next = ladder.next
  const affordable = next?.price != null && gold >= next.price
  return <Card title="Bigger bags" icon="bag">
    <p className="tabular-nums">Your <strong>{ladder.name}</strong> holds <strong>{capacity}</strong> pieces of gear. Equipped gear and potions don’t take up space.</p>
    {next ? <>
      <p className="mt-3"><strong>Next: {next.name}</strong>, {next.capacity} slots</p>
      <p className="mt-1 text-sm text-muted">{next.milestoneAdventures !== null ? `Yours after ${next.milestoneAdventures} adventures` : `Yours at level ${next.milestoneLevel}`}, or sooner if your hero finds one.</p>
      {next.price !== null ? next.buyable ? <>
        <Button className="mt-3" variant={affordable ? 'primary' : 'secondary'} disabled={disabled || !affordable} pending={intent.pending} icon="coin" busyLabel="Buying…" onClick={() => intent.run({ tierId: next.id }, `${next.name} bought. It holds ${next.capacity}.`)}>Buy for {next.price} gold</Button>
        {!affordable ? <p className="mt-2 text-sm tabular-nums">You have <span className="text-gold-ink">{gold} gold</span>.</p> : null}
      </> : <p className="mt-2 text-sm">{next.lockedUntilLevel !== null ? `You can buy it from level ${next.lockedUntilLevel}.` : 'You can buy it after your next bag milestone.'}</p> : null}
    </> : <p className="mt-3 text-sm text-muted">This is the biggest bag for now.</p>}
  </Card>
}

/** A piece's own figure stays neutral; only a comparison takes a colour (green better, red worse). */
function StatOf({ item }: { item: Gear }) {
  return <span>+{statOf(item)} {statLabel(item)}</span>
}

/** The difference against the equipped piece, signed and coloured by direction. */
function Delta({ delta }: { delta: number }) {
  return <span className={`font-semibold ${delta > 0 ? 'text-xp-ink' : delta < 0 ? 'text-hp-ink' : 'text-muted'}`}>{delta > 0 ? ` (+${delta} better)` : delta < 0 ? ` (${delta} worse)` : ' (same)'}</span>
}

function ResumeAt() {
  const now = useNow(60_000)
  const at = now === null ? null : new Date(nextSlotAfter(now)).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return <p>Resuming at {at ?? 'the next adventure'}, or the first adventure after that if updates run late.</p>
}
