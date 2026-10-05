import { afterEach, expect, it, vi } from 'vitest'
import { afterVisibleVisit } from '../../apps/web/src/lib/visibleVisit'

afterEach(() => vi.useRealTimers())

function visibility() {
  const source = Object.assign(new EventTarget(), { visibilityState: 'visible' as DocumentVisibilityState })
  const set = (state: DocumentVisibilityState) => {
    source.visibilityState = state
    source.dispatchEvent(new Event('visibilitychange'))
  }
  return { source, set }
}

it('waits for two continuous visible seconds and reschedules after returning from a hidden tab', () => {
  vi.useFakeTimers()
  const { source, set } = visibility()
  const acknowledge = vi.fn()
  const stop = afterVisibleVisit(acknowledge, source)
  vi.advanceTimersByTime(1500)
  set('hidden')
  vi.advanceTimersByTime(10_000)
  expect(acknowledge).not.toHaveBeenCalled()
  set('visible')
  vi.advanceTimersByTime(1999)
  expect(acknowledge).not.toHaveBeenCalled()
  vi.advanceTimersByTime(1)
  expect(acknowledge).toHaveBeenCalledTimes(1)
  stop()
})

it('does not acknowledge a hidden initial visit or a page that unmounts', () => {
  vi.useFakeTimers()
  const { source, set } = visibility()
  set('hidden')
  const acknowledge = vi.fn()
  const stop = afterVisibleVisit(acknowledge, source)
  vi.advanceTimersByTime(10_000)
  expect(acknowledge).not.toHaveBeenCalled()
  set('visible')
  vi.advanceTimersByTime(1000)
  stop()
  vi.advanceTimersByTime(10_000)
  set('hidden')
  set('visible')
  vi.advanceTimersByTime(10_000)
  expect(acknowledge).not.toHaveBeenCalled()
})
