import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { ActionFeedback, Button, Card, Meter } from '../../apps/web/src/lib/ui'
import { NetworkProvider } from '../../apps/web/src/lib/network'

it('server-renders a pending button with a busy label, unavailable but still focusable', () => {
  const markup = renderToStaticMarkup(createElement(NetworkProvider, null,
    createElement(Button, { pending: true, busyLabel: 'Selling…', 'aria-label': 'Confirm sale' }, 'Sell'),
  ))
  expect(markup).toContain('type="button"')
  expect(markup).toContain('aria-busy="true"')
  // aria-disabled, not disabled: a disabled button drops keyboard focus to the page while the action runs.
  expect(markup).toContain('aria-disabled="true"')
  expect(markup).not.toContain('disabled=""')
  expect(markup).toContain('aria-label="Confirm sale"')
  expect(markup).toContain('Selling…')
})

it('preserves the explicit submit type without inventing a pending or disabled state', () => {
  const markup = renderToStaticMarkup(createElement(Button, { type: 'submit' }, 'Save names'))
  expect(markup).toContain('type="submit"')
  expect(markup).not.toContain('aria-busy=')
  expect(markup).not.toContain('disabled=')
})

it('gives a ruled section a real heading and a matching accessible name', () => {
  const markup = renderToStaticMarkup(createElement(Card, { title: 'Equipped', children: 'Letter opener' }))
  const label = /aria-labelledby="([^"]+)"/.exec(markup)?.[1]
  expect(label).toBeTruthy()
  expect(markup).toContain(`<h2 id="${label}"`)
  expect(markup).toContain('Equipped</h2>')
})

it('announces failures without also announcing an obsolete success', () => {
  const markup = renderToStaticMarkup(createElement(ActionFeedback, { error: 'Sale not confirmed', message: 'Sold your gear' }))
  expect(markup).toContain('role="alert"')
  expect(markup).toContain('Sale not confirmed')
  expect(markup).not.toContain('Sold your gear')
})

it('exposes numerical health to assistive technology, not only a visual bar', () => {
  const markup = renderToStaticMarkup(createElement(Meter, { label: 'Health', value: 12, max: 48 }))
  expect(markup).toContain('role="meter"')
  expect(markup).toContain('aria-label="Health"')
  expect(markup).toContain('aria-valuenow="12"')
  expect(markup).toContain('aria-valuemax="48"')
  expect(markup).toContain('aria-valuetext="12 of 48"')
  expect(markup).toContain('width:25%')
})
