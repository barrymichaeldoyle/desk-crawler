import { describe, expect, it } from 'vitest'
import { contentV2 } from '../../convex/content/v2'
import { buildPayload, type PayloadInput } from '../../convex/lib/payload'

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
const pick = (p: unknown) => p as { first_run: boolean; qr_base: string; qr_label: string; status: string }

describe('first-run and companion QR fields', () => {
  it('welcomes a brand-new hero with a QR to the companion', () => {
    expect(pick(buildPayload(input))).toMatchObject({ first_run: true, qr_base: 'https://art.test/art/qr/v1/app', qr_label: 'Scan to open your companion' })
  })

  it('drops the welcome once the first adventure is logged', () => {
    const p = pick(buildPayload({ ...input, logs: [{ at: NOW - 60_000, kind: 'combat', summary: 'Beat a Paper Imp. +8 XP, +3 gold.' }] }))
    expect(p).toMatchObject({ first_run: false, qr_base: '' })
  })

  it('points a full bag at the bag, and setup at the companion', () => {
    expect(pick(buildPayload({ ...input, hero: { ...input.hero!, status: 'sleeping' }, heldItemName: 'Rare Mace' })).qr_base).toBe('https://art.test/art/qr/v1/bag')
    expect(pick(buildPayload({ ...input, hero: null }))).toMatchObject({ status: 'unlinked', first_run: false, qr_base: 'https://art.test/art/qr/v1/app' })
  })
})
