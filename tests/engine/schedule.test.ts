import { describe, expect, it } from 'vitest'
import { makeSchedule, SLOT_MS } from '@trmnl-games/engine/schedule'
import { deriveSharedSeed, deriveStreamSeed } from '@trmnl-games/engine/seed'
import { deriveStreamSeed as deskCrawlerSeed } from '@trmnl-games/desk-crawler/sim/seed'
import * as deskCrawler from '@trmnl-games/desk-crawler/sim/schedule'

describe('engine schedule', () => {
  it('keeps Desk Crawler on the quarter-hour', () => {
    const at = Date.UTC(2026, 9, 9, 10, 15, 4)
    expect(deskCrawler.wallSlotFor(at)).toBe(Date.UTC(2026, 9, 9, 10, 15))
    expect(deskCrawler.CRON_MINUTES).toBe('0,15,30,45')
  })

  it('offsets a second world by five minutes so the two never share a slot', () => {
    const slowCast = makeSchedule(5 * 60_000)
    expect(slowCast.cronMinutes).toBe('5,20,35,50')
    expect(slowCast.wallSlotFor(Date.UTC(2026, 9, 9, 10, 19, 59))).toBe(Date.UTC(2026, 9, 9, 10, 5))
    expect(slowCast.wallSlotFor(Date.UTC(2026, 9, 9, 10, 20))).toBe(Date.UTC(2026, 9, 9, 10, 20))
    expect(slowCast.nextSlotAfter(Date.UTC(2026, 9, 9, 10, 0))).toBe(Date.UTC(2026, 9, 9, 10, 5))
    expect(slowCast.slotEta(Date.UTC(2026, 9, 9, 10, 0), 3)).toBe(Date.UTC(2026, 9, 9, 10, 35))
  })

  it('refuses an offset outside one slot', () => {
    expect(() => makeSchedule(SLOT_MS)).toThrow(RangeError)
    expect(() => makeSchedule(-1)).toThrow(RangeError)
  })
})

describe('engine seeds', () => {
  it('derive the same per-stream seed Desk Crawler has always used', () => {
    expect(deskCrawlerSeed('seed', 'hero', 7, 1, 'encounter')).toBe(deriveStreamSeed('seed', 'hero', 7, 1, 'encounter'))
    // Fixed vector: changing the hash input would change every replay.
    expect(deriveStreamSeed('seed', 'hero', 7, 1, 'encounter')).toMatchInlineSnapshot(`3137966346`)
  })

  it('give everyone at one water the same forecast seed and different waters different ones', () => {
    expect(deriveSharedSeed('w', 'millpond', 3)).toBe(deriveSharedSeed('w', 'millpond', 3))
    expect(deriveSharedSeed('w', 'millpond', 3)).not.toBe(deriveSharedSeed('w', 'river_bend', 3))
  })
})
