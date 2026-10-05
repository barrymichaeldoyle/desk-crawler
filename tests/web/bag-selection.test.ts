import { expect, it } from 'vitest'
import { retainSellableSelection, saleIsCurrent } from '../../apps/web/src/lib/bagSelection'

const item = (id: string, overrides = {}) => ({ id, equipped: false, held: false, saleValue: 10, ...overrides })

it('removes sold, equipped and held selections without selecting replacement gear', () => {
  const selected = new Set(['sold', 'equipped', 'held', 'available'])
  const gear = [item('equipped', { equipped: true }), item('held', { held: true }), item('available'), item('new')]
  expect([...retainSellableSelection(selected, gear)]).toEqual(['available'])
  expect([...selected]).toEqual(['sold', 'equipped', 'held', 'available'])
})

it('retains the state identity when every selection is still available', () => {
  const selected = new Set(['one'])
  expect(retainSellableSelection(selected, [item('one'), item('two')])).toBe(selected)
})

it('frees a full selection limit after another device sells the selected gear', () => {
  const selected = new Set(Array.from({ length: 30 }, (_, i) => `old-${i}`))
  expect(retainSellableSelection(selected, [item('new')]).size).toBe(0)
})

it('accepts the same reviewed items and prices even if the query order changes', () => {
  const review = [item('one'), item('two', { saleValue: 20 })]
  expect(saleIsCurrent(review, [...review].reverse())).toBe(true)
})

it('refuses a changed price, sold item, equipped item or held item', () => {
  const review = [item('one'), item('two')]
  for (const changed of [[], [item('one')], [item('one'), item('two', { saleValue: 11 })], [item('one'), item('two', { equipped: true })], [item('one'), item('two', { held: true })]]) {
    expect(saleIsCurrent(review, changed)).toBe(false)
  }
})

it('refuses empty, duplicate or over-limit sale reviews', () => {
  const gear = Array.from({ length: 31 }, (_, i) => item(String(i)))
  expect(saleIsCurrent([], gear)).toBe(false)
  expect(saleIsCurrent([gear[0]!, gear[0]!], gear)).toBe(false)
  expect(saleIsCurrent(gear, gear)).toBe(false)
})
