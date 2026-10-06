import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { expect, it } from 'vitest'
import { LogStory } from '../../apps/web/src/routes/app/desk-crawler/-logStory'

it('renders the expense story and reward once, in distinct elements', () => {
  const html = renderToStaticMarkup(createElement(LogStory, { entry: { at: Date.UTC(2026, 9, 5, 11, 30), kind: 'loot', summary: 'An old expense claim finally paid out: 2 gold.', deltas: { xpEarned: 0, gold: 2, hp: 0 } } }))
  expect(html).toContain('<p>An old expense claim finally paid out.</p>')
  expect(html).toMatch(/<\/p><\/div><div[^>]*><time[^>]*dateTime="2026-10-05T11:30:00.000Z"[^>]*>[^<]+<\/time><ul/)
  expect(html.match(/2 gold/g)).toHaveLength(1)
})

it('renders marked names and all combat changes, including HP, below the story', () => {
  const html = renderToStaticMarkup(createElement(LogStory, { entry: { at: Date.UTC(2026, 9, 5, 11, 30), kind: 'combat', summary: 'Beat a [[Paper Imp]]. +14 XP, +5 gold.', deltas: { xpEarned: 14, gold: 5, hp: -12 } } }))
  expect(html).toContain('<p>Beat a <strong class="inline-block max-w-full align-bottom [overflow-wrap:normal]">Paper Imp</strong>.</p>')
  for (const change of ['+14 XP', '+5 gold', '−12 HP']) expect(html.match(new RegExp(change.replace('+', '\\+'), 'g'))).toHaveLength(1)
})

it('renders a potion find in the change list below the story', () => {
  const html = renderToStaticMarkup(createElement(LogStory, { entry: { at: Date.UTC(2026, 9, 5, 11, 30), kind: 'loot', summary: 'Found a healing potion.', deltas: { xpEarned: 0, gold: 0, hp: 0, potionsFound: 1 } } }))
  expect(html).toContain('<p>Found a healing potion.</p>')
  expect(html).toMatch(/<li>\+1 healing potion<\/li>/)
})

it('explains a full-health coffee break in the stats row', () => {
  const html = renderToStaticMarkup(createElement(LogStory, { entry: { at: Date.UTC(2026, 9, 5, 11, 30), kind: 'rest', summary: 'Took a coffee break anyway.', deltas: { xpEarned: 0, gold: 0, hp: 0 } } }))
  expect(html).toContain('<p>Took a coffee break anyway.</p>')
  expect(html).toContain('<li>No effect</li>')
  expect(html).not.toContain('+0')
})
