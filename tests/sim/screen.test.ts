import { describe, expect, it } from 'vitest'
import { Liquid } from 'liquidjs'
import { contentV2 } from '@trmnl-games/desk-crawler/content/v2'
import { buildPayload } from '@trmnl-games/desk-crawler/payload'
import { parseUtcOffset, screenMarkup } from '@trmnl-games/desk-crawler/templates/screen'

const NOW = Date.UTC(2026, 9, 4, 8, 20)

const payload = () =>
  buildPayload({
    now: NOW,
    world: { currentTick: 120, lastCompletedTick: 120, lastCompletedAt: NOW - 60_000, createdAt: NOW - 86_400_000, ticksPaused: false, maintenanceMode: false },
    ownerAlias: 'barrymichaeldoyle',
    timezone: 'UTC',
    hero: { name: 'Baz', level: 5, xp: 210, hp: 118, gold: 640, status: 'exploring', biomeId: 'server_room', lastTick: 120, lastAdvancedAt: NOW - 60_000, quarantined: false },
    weaponName: null,
    armorName: null,
    potions: 1,
    bagUsed: 3,
    bagCapacity: 30,
    heldItemName: null,
    logs: [{ at: NOW - 60_000, kind: 'combat', summary: 'Unplugged a Cable Serpent. +14 XP, +5 gold.' }],
    instanceName: 'Desk Crawler',
    content: contentV2,
    spriteBaseUrl: null,
    artBaseUrl: null,
    latestEvent: null,
    ranking: null,
  }) as unknown as Record<string, unknown>

/** TRMNL renders third-party markup in UTC with merge_variables only: no `trmnl` object. */
const render = (vars: Record<string, unknown>) => new Liquid({ timezoneOffset: 0 }).parseAndRender(screenMarkup.markup, vars)

describe('parseUtcOffset', () => {
  it('accepts whole seconds within ±14 hours', () => {
    expect(parseUtcOffset('7200')).toBe(7200)
    expect(parseUtcOffset('-18000')).toBe(-18000)
    expect(parseUtcOffset('0')).toBe(0)
    expect(parseUtcOffset('50400')).toBe(50400)
    expect(parseUtcOffset(' 3600 ')).toBe(3600)
  })

  it('treats missing or malformed values as absent', () => {
    for (const raw of [null, '', 'abc', '7200.5', '1e4', '50401', '-50401', '9999999']) expect(parseUtcOffset(raw)).toBeNull()
  })
})

describe('full layout', () => {
  it('leads bars with the numbers and names the gear slots', async () => {
    const html = await render({ ...payload(), weapon: 'Uncommon Cable Cutter', armor: '' })
    expect(html).toMatch(/118\/148<\/span> <span class="label[^"]*">HP</)
    expect(html).toContain('class="track outline"')
    expect(html).toMatch(/>Weapon<\/span><\/div><div><span[^>]*>Uncommon Cable Cutter</)
    expect(html).toMatch(/>Armor<\/span><\/div><div><span[^>]*>None</)
  })

  it('shows the standing bag QR beside the rank, and only the action QR when one is set', async () => {
    const base = 'https://art.test/art/qr/v2'
    const standing = await render({ ...payload(), companion_qr_base: `${base}/bag` })
    expect(standing).toContain(`src="${base}/bag/3.png"`)
    expect(standing).toContain('Your bag')
    const action = await render({ ...payload(), companion_qr_base: `${base}/bag`, qr_url: `${base}/bag/3.png`, qr_url_large: `${base}/bag/5.png`, qr_label: 'Scan to open your bag' })
    expect(action).not.toContain('Your bag')
    expect(action).not.toContain('This week')
  })
})

describe('next adventure line (D42)', () => {
  it('renders HH:MM in the owner offset from the utc_offset merge variable', async () => {
    const vars = payload()
    expect(vars.next_tick_at).toBe(Math.floor(Date.UTC(2026, 9, 4, 8, 30) / 1000))
    expect(await render({ ...vars, utc_offset: 7200 })).toContain('Next adventure 10:30')
  })

  it('is omitted without an offset, and TRMNL metadata alone does not supply one', async () => {
    const vars = payload()
    expect(await render({ ...vars, utc_offset: null })).not.toContain('Next adventure')
    expect(await render({ ...vars, trmnl: { user: { utc_offset: 7200 } } })).not.toContain('Next adventure')
  })
})
