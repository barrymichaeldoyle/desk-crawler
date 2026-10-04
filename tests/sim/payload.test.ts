import { describe, expect, it } from 'vitest'
import { contentV2 } from '@trmnl-games/desk-crawler/content/v2'
import { buildPayload, type PayloadInput } from '@trmnl-games/desk-crawler/payload'

const NOW = Date.UTC(2026, 9, 4, 8, 20)
const input: PayloadInput = {
  now: NOW,
  world: { currentTick: 1, lastCompletedTick: 1, lastCompletedAt: NOW - 60_000, createdAt: NOW - 3_600_000, ticksPaused: false, maintenanceMode: false },
  ownerAlias: 'Ana',
  timezone: 'UTC',
  hero: { name: 'Baz', level: 1, xp: 0, hp: 60, gold: 0, status: 'exploring', biomeId: 'office_cubicles', lastTick: 0, quarantined: false },
  weaponName: null,
  armorName: null,
  potions: 3,
  bagUsed: 0,
  bagCapacity: 30,
  heldItemName: null,
  logs: [],
  instanceName: 'Desk Crawler',
  content: contentV2,
  spriteBaseUrl: null,
  artBaseUrl: 'https://art.test',
  latestEvent: null,
  ranking: null,
}
const pick = (p: unknown) => p as { first_run: boolean; qr_base: string; qr_label: string; companion_qr_base: string; status: string }

describe('first-run and companion QR fields', () => {
  it('welcomes a brand-new hero with a QR to the companion', () => {
    expect(pick(buildPayload(input))).toMatchObject({ first_run: true, qr_base: 'https://art.test/art/qr/v3/app', qr_label: 'Scan to open your companion' })
  })

  it('drops the welcome once the first adventure is logged', () => {
    const p = pick(buildPayload({ ...input, logs: [{ at: NOW - 60_000, kind: 'combat', summary: 'Beat a Paper Imp. +8 XP, +3 gold.' }] }))
    expect(p).toMatchObject({ first_run: false, qr_base: '' })
  })

  it('points a full bag at the bag, and setup at the companion', () => {
    expect(pick(buildPayload({ ...input, hero: { ...input.hero!, status: 'sleeping' }, heldItemName: 'Rare Mace' })).qr_base).toBe('https://art.test/art/qr/v3/bag')
    expect(pick(buildPayload({ ...input, hero: null }))).toMatchObject({ status: 'unlinked', first_run: false, qr_base: 'https://art.test/art/qr/v3/app' })
  })

  it('always links an active hero to the bag, with nothing needing doing', () => {
    const p = pick(buildPayload({ ...input, logs: [{ at: NOW - 60_000, kind: 'combat', summary: 'Beat a Paper Imp. +8 XP, +3 gold.' }] }))
    expect(p).toMatchObject({ qr_base: '', companion_qr_base: 'https://art.test/art/qr/v3/bag' })
    expect(pick(buildPayload({ ...input, hero: null })).companion_qr_base).toBe('')
    expect(pick(buildPayload({ ...input, artBaseUrl: null })).companion_qr_base).toBe('')
  })
})

describe('next tick time (D42)', () => {
  const next = (p: unknown) => (p as { next_tick_at: number | null }).next_tick_at
  it('gives the next quarter-hour slot in UTC seconds while the hero adventures', () => {
    expect(next(buildPayload(input))).toBe(Date.UTC(2026, 9, 4, 8, 30) / 1000)
    expect(next(buildPayload({ ...input, hero: { ...input.hero!, status: 'travelling', targetBiomeId: 'server_room', arriveAtTick: 2 } }))).toBe(Date.UTC(2026, 9, 4, 8, 30) / 1000)
  })

  it('promises nothing when the hero is stopped or the service is behind', () => {
    for (const status of ['paused', 'sleeping', 'dead'] as const) expect(next(buildPayload({ ...input, hero: { ...input.hero!, status } }))).toBeNull()
    expect(next(buildPayload({ ...input, world: { ...input.world!, lastCompletedAt: NOW - 3_600_000 } }))).toBeNull()
    expect(next(buildPayload({ ...input, world: { ...input.world!, maintenanceMode: true } }))).toBeNull()
    expect(next(buildPayload({ ...input, hero: null }))).toBeNull()
  })
})
