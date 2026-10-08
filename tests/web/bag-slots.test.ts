import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { catalogs } from '@trmnl-games/desk-crawler/content'
import { ITEM_ART, itemArt } from '@trmnl-games/desk-crawler/art/items'
import { EmptySlot, Sheet, Slot, SpriteIcon } from '../../apps/web/src/routes/app/desk-crawler/-bagSlots'

const piece = { id: 'x', kind: 'weapon' as const, templateId: 'ruler_blade', label: 'Ruler Blade', rarity: 'uncommon', requiredLevel: 1 }

it('draws every gear template in every catalog as a 16x16 icon', () => {
  for (const catalog of Object.values(catalogs)) {
    for (const template of catalog.gearTemplates) {
      const art = ITEM_ART[template.id]
      expect(art, `${template.id} has no bag icon`).toBeDefined()
      expect([art!.width, art!.height]).toEqual([16, 16])
    }
  }
})

it('falls back to the starter piece of the same kind for an unknown template', () => {
  expect(itemArt('mystery', 'weapon')).toBe(ITEM_ART.letter_opener)
  expect(itemArt('mystery', 'armor')).toBe(ITEM_ART.cardigan)
})

it('renders a sprite as crisp cell rectangles in two fills', () => {
  const markup = renderToStaticMarkup(createElement(SpriteIcon, { sprite: ITEM_ART.cardigan! }))
  expect(markup).toContain('shape-rendering="crispEdges"')
  expect(markup).toContain('class="fill-raised"')
  expect(markup).toContain('class="fill-current"')
  expect(markup).toContain('width="48" height="48"')
})

it('names a slot for assistive technology and only exposes a pressed state while selecting for a sale', () => {
  const browse = renderToStaticMarkup(createElement(Slot, { item: piece, label: 'Ruler Blade, uncommon, +5 attack', onClick: () => undefined, upgrade: true }))
  expect(browse).toContain('aria-label="Ruler Blade, uncommon, +5 attack"')
  expect(browse).not.toContain('aria-pressed')
  const selecting = renderToStaticMarkup(createElement(Slot, { item: piece, label: 'Ruler Blade', onClick: () => undefined, selectable: true, selected: true }))
  expect(selecting).toContain('aria-pressed="true"')
  const busy = renderToStaticMarkup(createElement(Slot, { item: piece, label: 'Ruler Blade', onClick: () => undefined, busy: true }))
  expect(busy).toContain('aria-busy="true"')
})

it('keeps an empty slot out of the accessibility tree', () => {
  expect(renderToStaticMarkup(createElement(EmptySlot))).toContain('aria-hidden="true"')
})

it('renders a closed sheet as an empty native dialog so opening it never reflows the page', () => {
  const markup = renderToStaticMarkup(createElement(Sheet, { open: false, onClose: () => undefined, label: 'Gear', children: 'Contents' }))
  expect(markup).toContain('<dialog')
  expect(markup).toContain('aria-label="Gear"')
  expect(markup).not.toContain('Contents')
})
