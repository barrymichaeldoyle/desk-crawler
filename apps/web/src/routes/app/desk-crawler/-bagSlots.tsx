import { useEffect, useRef, type ReactNode } from 'react'
import { inked, type Sprite } from '@trmnl-games/desk-crawler/art/canvas'
import { itemArt } from '@trmnl-games/desk-crawler/art/items'
import { potion as potionArt } from '@trmnl-games/desk-crawler/art/props'
import { RARITY_TONE } from '../../../lib/palette'

/** A 1-bit sprite as a crisp SVG: ink cells in the current colour, white cells in the raised plum, so a piece reads as a solid object on a night slot. */
export function SpriteIcon({ sprite, scale = 3, className = '' }: { sprite: Sprite; scale?: number; className?: string }) {
  let ink = ''
  let body = ''
  sprite.rows.forEach((row, y) => {
    ;[...row].forEach((cell, x) => {
      const on = inked(cell, x, y)
      if (on === null) return
      const rect = `M${x} ${y}h1v1h-1z`
      if (on) ink += rect
      else body += rect
    })
  })
  return (
    <svg viewBox={`0 0 ${sprite.width} ${sprite.height}`} width={sprite.width * scale} height={sprite.height * scale} aria-hidden="true" shapeRendering="crispEdges" className={`shrink-0 ${className}`}>
      <path d={body} className="fill-raised" />
      <path d={ink} className="fill-current" />
    </svg>
  )
}

/** A rarity gem: one facet for common, two for uncommon, three for rare, four for epic, so rarity never rests on colour alone. */
const GEM: Record<string, string> = { common: 'M1 0h1v1H1zM0 1h3v1H0zM1 2h1v1H1z', uncommon: 'M1 0h3v1H1zM0 1h5v1H0zM1 2h3v1H1zM2 3h1v1H2z', rare: 'M1 0h5v1H1zM0 1h7v1H0zM1 2h5v1H1zM2 3h3v1H2zM3 4h1v1H3z', epic: 'M1 0h7v1H1zM0 1h9v1H0zM1 2h7v1H1zM2 3h5v1H2zM3 4h3v1H3z' }
const GEM_WIDTH: Record<string, number> = { common: 3, uncommon: 5, rare: 7, epic: 9 }

export function Gem({ rarity, scale = 3, className = '' }: { rarity: string; scale?: number; className?: string }) {
  const width = GEM_WIDTH[rarity] ?? 3
  return <svg viewBox={`0 0 ${width} 5`} width={width * scale} height={5 * scale} aria-hidden="true" shapeRendering="crispEdges" className={`shrink-0 fill-current ${RARITY_TONE[rarity] ?? ''} ${className}`}><path d={GEM[rarity] ?? GEM.common!} /></svg>
}

/** The slot's edge takes the rarity colour; common stays on the quiet raised plum. */
const RARITY_EDGE: Record<string, string> = { common: 'border-raised', uncommon: 'border-xp', rare: 'border-rare', epic: 'border-gold' }
const SLOT = 'relative flex aspect-square w-full min-w-11 items-center justify-center border-[3px] bg-night text-cream'

export type SlotItem = { id: string; kind: 'weapon' | 'armor'; templateId: string; label: string; rarity: string; requiredLevel: number }
type Marks = { selectable?: boolean; selected?: boolean; upgrade?: boolean; lockedLevel?: number | null; busy?: boolean }

const edgeOf = (item: SlotItem, { selected = false, held = false }: { selected?: boolean; held?: boolean }) => selected ? 'border-gold bg-raised' : held ? 'border-gold border-dashed' : RARITY_EDGE[item.rarity] ?? RARITY_EDGE.common

/** The piece's icon with its gem, and an upgrade arrow, level lock or selection tick in the corners. */
function SlotFace({ item, selectable = false, selected = false, upgrade = false, lockedLevel = null, busy = false }: { item: SlotItem } & Marks) {
  return <>
    <SpriteIcon sprite={itemArt(item.templateId, item.kind)} className={busy ? 'opacity-40' : ''} />
    <Gem rarity={item.rarity} scale={2} className="absolute bottom-1 left-1" />
    {selectable ? <span aria-hidden="true" className={`absolute top-1 left-1 flex size-4 items-center justify-center border-2 border-edge ${selected ? 'bg-gold' : 'bg-night'}`}>{selected ? <svg viewBox="0 0 6 6" width={10} height={10} shapeRendering="crispEdges" className="fill-night"><path d="M4 1h1v1H4zM3 2h1v1H3zM0 3h1v1H0zM2 3h1v1H2zM1 4h1v1H1z" /></svg> : null}</span> : null}
    {lockedLevel !== null ? <span aria-hidden="true" className="absolute top-1 right-1 bg-night px-0.5 label-px text-muted">L{lockedLevel}</span> : upgrade ? <svg aria-hidden="true" viewBox="0 0 7 7" width={14} height={14} shapeRendering="crispEdges" className="absolute top-1 right-1 fill-xp"><path d="M3 0h1v1H3zM2 1h3v1H2zM1 2h5v1H1zM0 3h7v1H0zM2 4h3v3H2z" /></svg> : null}
    {busy ? <span aria-hidden="true" className="dither absolute inset-0 text-faint/60" /> : null}
  </>
}

/**
 * One bag slot: the piece's icon on a night square inside its rarity edge. A slot is a button that opens the piece's
 * sheet, or toggles it in a sale.
 */
export function Slot({ item, onClick, label, held = false, ...marks }: { item: SlotItem; onClick: () => void; label: string; held?: boolean } & Marks) {
  return (
    <button type="button" aria-label={label} aria-pressed={marks.selectable ? marks.selected ?? false : undefined} aria-busy={marks.busy || undefined} onClick={onClick} className={`${SLOT} ${edgeOf(item, { selected: marks.selected ?? false, held })} hover:bg-raised active:bg-raised focus-visible:outline-offset-[-2px]`}>
      <SlotFace item={item} {...marks} />
    </button>
  )
}

/** The same slot without a control, for a sheet's heading. */
export function SlotPreview({ item }: { item: SlotItem }) {
  return <div aria-hidden="true" className={`${SLOT} ${edgeOf(item, {})}`}><SlotFace item={item} /></div>
}

/** An empty slot: a dithered night square in a dashed raised edge. */
export function EmptySlot() {
  return <div aria-hidden="true" className="dither aspect-square w-full min-w-11 border-[3px] border-dashed border-raised bg-night text-raised" />
}

/** The potion stack as a slot, counting the potions in the corner. */
export function PotionSlot({ count, onClick, label }: { count: number; onClick: () => void; label: string }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={`${SLOT} border-raised hover:bg-raised active:bg-raised focus-visible:outline-offset-[-2px]`}>
      <SpriteIcon sprite={potionArt} className={count === 0 ? 'opacity-40' : ''} />
      <span aria-hidden="true" className="absolute right-1 bottom-0.5 label-px text-rare-ink">{count}</span>
    </button>
  )
}

/**
 * A native modal dialog drawn as a bottom sheet on phones and a centred window from 640px. The browser owns the focus
 * trap, Escape and focus return; focus lands on the sheet's title; the page behind never changes shape while it is open.
 */
export function Sheet({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      dialog.querySelector<HTMLElement>('[data-sheet-title]')?.focus()
    } else if (!open && dialog.open) dialog.close()
  }, [open])
  return (
    <dialog ref={ref} aria-label={label} onClose={onClose} onClick={(event) => { if (event.target === ref.current) onClose() }} className="sheet">
      {open ? <div className="window px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">{children}</div> : null}
    </dialog>
  )
}

export function SheetTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 data-sheet-title tabIndex={-1} className={`font-display text-2xl font-bold outline-none ${className}`}>{children}</h2>
}
