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
    logs: [{ at: NOW - 60_000, kind: 'combat', summary: 'Unplugged a Cable Serpent. +14 XP, +5 gold.', deltas: { xpEarned: 14, gold: 5, hp: -12 } }],
    instanceName: 'Desk Crawler',
    content: contentV2,
    spriteBaseUrl: null,
    artBaseUrl: null,
    latestEvent: null,
    ranking: null,
  }) as unknown as Record<string, unknown>

/** TRMNL renders third-party markup in UTC with merge_variables only: no `trmnl` object. */
const render = (vars: Record<string, unknown>) => new Liquid({ timezoneOffset: 0 }).parseAndRender(screenMarkup.markup, vars)

describe('keepsake footer', () => {
  it('shows the supplied device code in all four layouts and omits it from companion previews', async () => {
    for (const markup of Object.values(screenMarkup)) {
      const liquid = new Liquid({ timezoneOffset: 0 })
      expect(await liquid.parseAndRender(markup, { ...payload(), desk_keepsake_code: 'ABCD-EFGH' })).toContain('Keepsake ABCD-EFGH')
      expect(await liquid.parseAndRender(markup, payload())).not.toContain('Keepsake')
    }
  })
})

describe('device catch-up summary (D54)', () => {
  const recap = { label: 'Last 12 hours', gains: '+184 XP · 52 gold earned', activity: '9 fights won · 2 gear finds · 4 breaks', highlights: 'Gained 1 level', compact: 'Gained 1 level · +184 XP' }

  it('includes the recap and latest outcome in every size while escaping all recap text', async () => {
    for (const markup of Object.values(screenMarkup)) {
      const html = await new Liquid({ timezoneOffset: 0 }).parseAndRender(markup, { ...payload(), recap })
      const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')
      expect(text).toContain('Last 12 hours')
      expect(text).toContain('Gained 1 level')
      expect(text).toContain('Unplugged a Cable Serpent.')
      expect(text).toContain('+14 XP · +5 gold · −12 HP')
      const escaped = await new Liquid({ timezoneOffset: 0 }).parseAndRender(markup, { ...payload(), recap: { ...recap, label: '<script>unsafe</script>' } })
      expect(escaped).toContain('&lt;script&gt;unsafe&lt;/script&gt;')
      expect(escaped).not.toContain('<script>unsafe</script>')
    }
  })

  it('gives attention messages priority over the recap in all four sizes', async () => {
    for (const markup of Object.values(screenMarkup)) {
      const html = await new Liquid({ timezoneOffset: 0 }).parseAndRender(markup, { ...payload(), recap, attention: 'Bag full. A find is waiting.' })
      expect(html).toContain('Bag full. A find is waiting.')
      expect(html).not.toContain('Last 12 hours')
    }
  })
})

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

  it('shows the own rank as an ordinal', async () => {
    const ranked = (rank: number) => render({ ...payload(), rank, total_players: 141, leaderboard_cohort_label: 'Levels 4-7' })
    const cases: Array<[number, string]> = [[1, '1st'], [2, '2nd'], [3, '3rd'], [4, '4th'], [11, '11th'], [12, '12th'], [13, '13th'], [21, '21st'], [102, '102nd'], [111, '111th']]
    for (const [rank, label] of cases) expect((await ranked(rank)).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')).toContain(`${label}of 141 this week`)
  })

  it('shows the standing bag QR beside the rank, and only the action QR when one is set', async () => {
    const base = 'https://art.test/art/qr/v3'
    const standing = await render({ ...payload(), companion_qr_base: `${base}/bag` })
    expect(standing).toContain(`src="${base}/bag/3.png"`)
    expect(standing).toContain('Your bag')
    const action = await render({ ...payload(), companion_qr_base: `${base}/bag`, qr_url: `${base}/bag/3.png`, qr_url_large: `${base}/bag/5.png`, qr_label: 'Scan to open your bag' })
    expect(action).not.toContain('Your bag')
    expect(action).not.toContain('This week')
  })
})

describe('rich text and status times (D45)', () => {
  it('sets marked names in bold and keeps other text escaped', async () => {
    const vars = payload() as { log: Array<Record<string, unknown>> } & Record<string, unknown>
    const html = await render({ ...vars, utc_offset: 0, log: [{ ...vars.log[0], n: 'Fed a [[Paper Imp]] to the <shredder>.' }] })
    expect(html).toContain('Fed a <span class="text--bold inline-block">Paper Imp</span> to the &lt;shredder&gt;.</span>')
  })

  it('shows a pending status with its owner-local time, or the fallback label without an offset', async () => {
    const dead = { ...payload(), status_label: 'Knocked out. Back in about 2 h', status_eta_label: 'Knocked out, back at', status_eta_at: Date.UTC(2026, 9, 4, 10, 30) / 1000 }
    expect(await render({ ...dead, utc_offset: 7200 })).toContain('<span class="text--regular">Knocked out, back at 12:30</span>')
    expect(await render({ ...dead, utc_offset: null })).toContain('<span class="text--regular">Knocked out. Back in about 2 h</span>')
  })
})

describe('log lines (D44)', () => {
  it('shows potion acquisition beside the other changes in all four layouts', async () => {
    const vars = payload()
    for (const markup of Object.values(screenMarkup)) {
      const html = await new Liquid({ timezoneOffset: 0 }).parseAndRender(markup, { ...vars, log: [{ n: 'Found a healing potion. Drank a potion.', s: 'Found a healing potion. Drank a potion.', k: 'loot', u: NOW / 1000, d: '+1 healing potion · +20 HP' }] })
      expect(html.replace(/<[^>]+>/g, '')).toContain('+1 healing potion · +20 HP')
    }
  })
  it('shows each line with its glyph and owner-local HH:MM', async () => {
    const html = await render({ ...payload(), utc_offset: 7200 })
    expect(html).toContain('class="image no-shrink" src="data:image/svg+xml,')
    expect(html).toMatch(/<span class="text--regular">Unplugged a Cable Serpent/)
    expect(html).toMatch(/label lg:title--small no-shrink">10:19<\/span><span[^>]*>\+14/)
  })

  it('leaves the time out without an offset', async () => {
    const html = await render({ ...payload(), utc_offset: null })
    expect(html).toMatch(/data-clamp="0" data-clamp-lg="0"><span class="text--regular">Unplugged a Cable Serpent/)
  })

  it('clamps only text too long to fit, since the clamp drops bold', async () => {
    const vars = payload() as { log: Array<Record<string, unknown>> } & Record<string, unknown>
    const long = 'Sent an elite [[Microwave Wraith]] back to the kitchen. +188 XP, +57 gold. Reached level 12!'
    const html = await render({ ...vars, utc_offset: 0, log: [{ ...vars.log[0], n: long }, { ...vars.log[0], n: 'Fed a [[Paper Imp]] to the shredder.' }] })
    expect(html).toMatch(/data-clamp="2" data-clamp-lg="0"><span class="text--regular">Sent an elite/)
    expect(html).toContain('Fed a <span class="text--bold inline-block">Paper Imp</span>')
  })

  it('celebrates a big moment with a badge', async () => {
    expect(await render({ ...payload(), celebration: 'Level up! Now level 6' })).toMatch(/label--inverted">Level up! Now level 6</)
    expect(await render(payload())).not.toContain('label--inverted')
  })

  it('shows one separate stat row, including HP loss, in all four layouts', async () => {
    const vars = payload()
    for (const markup of Object.values(screenMarkup)) {
      const html = await new Liquid({ timezoneOffset: 0 }).parseAndRender(markup, vars)
      const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')
      expect(text).toContain('Unplugged a Cable Serpent.')
      expect(text).toContain('+14 XP · +5 gold · −12 HP')
      expect(text).not.toContain('Serpent. +14')
    }
  })

  it('keeps numeric changes outside narrative clamping and falls back for older payloads', async () => {
    const vars = payload() as { log: Array<Record<string, unknown>> } & Record<string, unknown>
    const html = await render({ ...vars, log: [{ ...vars.log[0], n: 'A very long story '.repeat(10) }] })
    expect(html).toMatch(/<\/span><\/div><div class="flex[^"]*"><span class="label lg:title--small grow">\+14 XP · \+5 gold · −12 HP<\/span>/)
    const old = await render({ ...vars, log: [{ s: 'Old story. +4 XP.', k: 'combat', u: NOW / 1000 }] })
    expect(old).toContain('Old story. +4 XP.')
    expect(old).not.toContain('undefined')
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
