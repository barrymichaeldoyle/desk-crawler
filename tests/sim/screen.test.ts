import { describe, expect, it } from 'vitest'
import { Liquid } from 'liquidjs'
import { contentV1 } from '@trmnl-games/desk-crawler/content/v1'
import { buildPayload } from '@trmnl-games/desk-crawler/payload'
import { parseUtcOffset, screenMarkup, glyphUri } from '@trmnl-games/desk-crawler/templates/screen'
import { hudMarkUri } from '@trmnl-games/desk-crawler/art/hud'

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
    weaponAttack: 0,
    armorDefense: 0,
    potions: 1,
    bagUsed: 3,
    bagCapacity: 30,
    heldItemName: null,
    logs: [{ at: NOW - 60_000, kind: 'combat', summary: 'Unplugged a Cable Serpent. +14 XP, +5 gold.', deltas: { xpEarned: 14, gold: 5, hp: -12 } }],
    instanceName: 'Desk Crawler',
    content: contentV1,
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
      expect(await liquid.parseAndRender(markup, { ...payload(), desk_keepsake_code: '482 917' })).toContain('Keepsake code 482 917')
      expect(await liquid.parseAndRender(markup, payload())).not.toContain('Keepsake')
    }
  })

  it('uses the short label in the narrow side and quarter portrait bars', async () => {
    for (const markup of [screenMarkup.markup_half_vertical, screenMarkup.markup_quadrant]) {
      const html = await new Liquid({ timezoneOffset: 0 }).parseAndRender(markup, { ...payload(), desk_keepsake_code: '482 917' })
      expect(html).toContain('>Keepsake 482 917<')
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
      for (const change of ['+14\u00a0XP', '+5\u00a0gold', '−12\u00a0HP']) expect(html).toContain(`label--outline">${change}<`)
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

describe('companion QR in every view', () => {
  const base = 'https://art.test/art/qr/v3'
  const liquid = new Liquid({ timezoneOffset: 0 })

  it('keeps a standing bag link in all layouts and lets the action destination take priority', async () => {
    for (const markup of Object.values(screenMarkup)) {
      const standing = await liquid.parseAndRender(markup, { ...payload(), companion_qr_base: `${base}/bag` })
      expect(standing).toContain(`src="${base}/bag/3.png"`)
      expect(standing).toContain(`src="${base}/bag/4.png"`)
      expect(standing).toContain('Your bag')
      const action = await liquid.parseAndRender(markup, { ...payload(), companion_qr_base: `${base}/bag`, qr_base: `${base}/app`, qr_label: 'Open your companion', attention: 'A find is waiting.' })
      expect(action).toContain(`src="${base}/app/3.png"`)
      expect(action).toContain('Open your companion')
      expect(action).toContain('A find is waiting.')
      expect(action).not.toContain(`src="${base}/bag/`)
    }
  })

  it('keeps the setup QR on unlinked and first-run screens without duplicating the bag code', async () => {
    for (const markup of Object.values(screenMarkup)) {
      for (const state of [{ status: 'unlinked' }, { first_run: true }]) {
        const html = await liquid.parseAndRender(markup, { ...payload(), ...state, qr_base: `${base}/app`, companion_qr_base: `${base}/bag` })
        expect(html).toContain(`src="${base}/app/`)
        expect(html).not.toContain(`src="${base}/bag/`)
        // One small and one large code in each of the landscape and portrait arrangements.
        expect(html.match(/src="https:\/\/art.test\/art\/qr\//g)).toHaveLength(4)
      }
    }
  })

  it('asks for a scan only while a setup code is on screen', async () => {
    for (const markup of Object.values(screenMarkup)) {
      const live = await liquid.parseAndRender(markup, { ...payload(), status: 'unlinked', data_state: 'unlinked', attention: 'Sign in to the companion, then save this plugin in TRMNL.', qr_base: `${base}/app` })
      expect(live).toContain('Finish setting up')
      expect(live).toContain('Scan with your phone')
      const paused = await liquid.parseAndRender(markup, { ...payload(), status: 'unlinked', data_state: 'service_paused', attention: 'Desk Crawler is down for maintenance.', qr_base: '' })
      expect(paused).toContain('Back soon')
      expect(paused).toContain('Desk Crawler is down for maintenance.')
      expect(paused).not.toContain('Scan')
    }
  })

  it('omits the code when the payload has no art endpoint', async () => {
    for (const markup of Object.values(screenMarkup)) {
      const html = await liquid.parseAndRender(markup, payload())
      expect(html).not.toMatch(/src="\/\d\.png"/)
      expect(html).not.toContain('data-companion-qr')
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
  it('shows the HP count beside the hearts, the XP numbers after the ticks, and names the gear slots', async () => {
    const html = await render({ ...payload(), weapon: 'Uncommon Cable Cutter', armor: '' })
    expect(html).toMatch(/data-hp-count="true">118\/148 HP</)
    expect(html).toMatch(/data-xp-count="true">210\/656 XP</)
    expect(html).not.toContain('progress-bar')
    expect(html).not.toContain('style=')
    expect(html).toMatch(/>Weapon<\/span><\/div><div><span[^>]*>Uncommon Cable Cutter</)
    expect(html).toMatch(/>Armor<\/span><\/div><div><span[^>]*>None</)
  })

  const top5 = [
    { rank: 1, name: 'Ana', score: 2410 },
    { rank: 2, name: 'Bo', score: 1990 },
    { rank: 3, name: 'barrymichaeldoyle', score: 1840 },
    { rank: 4, name: 'Cy', score: 1700 },
    { rank: 5, name: 'Dee', score: 1515 },
  ]
  const board = (rank: number | null, score = 1840) => ({ ...payload(), rank, leaderboard_score: score, total_players: 141, leaderboard_cohort_label: 'Levels 4-7', top5, owner_name: 'barrymichaeldoyle' })
  const rows = (html: string) => [...html.matchAll(/<div class="([^"]*)" data-rank-row="(\d+)">(.*?)<\/div>/g)].map((m) => ({ rank: Number(m[2]), own: m[1]!.includes('label--inverted'), hidden: m[1]!.startsWith('hidden'), ogOnly: m[1]!.startsWith('lg:hidden'), text: m[3]!.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '\u00a0') }))

  it('marks the own row instead of repeating the rank, and never shows the ordinal line', async () => {
    const html = await render(board(3))
    const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')
    expect(text).not.toContain('of 141')
    expect(text).not.toContain('3rd')
    expect(text).toContain('This week · Lv 4-7')
    expect(text).toContain('This week · Levels 4-7')
    // The landscape and portrait arrangements each list the five rows once; only the third is inverted.
    const landscape = rows(html.split('landscape:hidden')[0]!)
    expect(landscape.map((r) => [r.rank, r.own])).toEqual([[1, false], [2, false], [3, true], [4, false], [5, false]])
    expect(landscape[2]!.text).toBe('3. barrymichaeldoyle1840\u00a0XP')
    expect(landscape.filter((r) => r.hidden).map((r) => r.rank)).toEqual([4, 5])
  })

  it('appends the own row below the rows a device shows', async () => {
    const fourth = rows((await render(board(4, 1700))).split('landscape:hidden')[0]!)
    expect(fourth.map((r) => [r.rank, r.own, r.ogOnly])).toEqual([[1, false, false], [2, false, false], [3, false, false], [4, true, false], [5, false, false], [4, true, true]])
    const twelfth = rows((await render(board(12, 980))).split('landscape:hidden')[0]!)
    expect(twelfth.slice(5).map((r) => [r.rank, r.own, r.ogOnly, r.hidden, r.text])).toEqual([[12, true, true, false, '12. barrymichaeldoyle980\u00a0XP'], [12, true, false, true, '12. barrymichaeldoyle980\u00a0XP']])
    expect(twelfth.slice(0, 5).every((r) => !r.own)).toBe(true)
  })

  it('explains an absent rank without marking any row', async () => {
    const awaiting = await render({ ...board(null), top5: [] })
    expect(awaiting).toContain('Ranking within the hour')
    expect(rows(awaiting)).toEqual([])
    const dormant = await render({ ...board(null), rank_status: 'dormant' })
    expect(dormant).toContain('Not ranked while paused')
    expect(rows(dormant).some((r) => r.own)).toBe(false)
  })

  it('shows the standing bag QR beside the rank, and only the action QR when one is set', async () => {
    const base = 'https://art.test/art/qr/v3'
    const standing = await render({ ...payload(), companion_qr_base: `${base}/bag` })
    expect(standing).toContain(`src="${base}/bag/3.png"`)
    expect(standing).toContain('Your bag')
    const action = await render({ ...payload(), companion_qr_base: `${base}/bag`, qr_base: `${base}/bag`, qr_url: `${base}/bag/3.png`, qr_url_large: `${base}/bag/5.png`, qr_label: 'Scan to open your bag' })
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
      expect(html).toContain('label--outline">+1\u00a0healing potion<')
      expect(html).toContain('label--outline">+20\u00a0HP<')
    }
  })
  it('shows each line with its glyph and owner-local HH:MM', async () => {
    const html = await render({ ...payload(), utc_offset: 7200 })
    expect(html).toContain('class="image no-shrink" src="data:image/svg+xml,')
    expect(html).toMatch(/<span class="text--regular">Unplugged a Cable Serpent/)
    expect(html).toMatch(/data-story-time="true">10:19<\/span><\/div><div class="flex[^"]*" data-story-changes="true">/)
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

  it('celebrates the longest achievement name on every layout and gives achievement lines a glyph', async () => {
    const vars = payload() as { log: Array<Record<string, unknown>> } & Record<string, unknown>
    const name = 'Achievement: Nine Lives (Expired)'
    for (const [key, markup] of Object.entries(screenMarkup)) {
      const html = await new Liquid({ timezoneOffset: 0 }).parseAndRender(markup, { ...vars, celebration: name, log: [{ ...vars.log[0], k: 'achievement', n: 'Achievement: [[Nine Lives (Expired)]]', d: '' }, ...vars.log] })
      // The quadrant has no room for a badge (D44); the other three show it.
      if (key !== 'markup_quadrant') expect(html).toContain(`label--inverted">${name}<`)
      expect(html.includes(glyphUri('achievement', 16)) || html.includes(glyphUri('achievement', 24))).toBe(true)
    }
  })

  it('shows one separate stat row, including HP loss, in all four layouts', async () => {
    const vars = payload()
    for (const markup of Object.values(screenMarkup)) {
      const html = await new Liquid({ timezoneOffset: 0 }).parseAndRender(markup, vars)
      const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')
      expect(text).toContain('Unplugged a Cable Serpent.')
      expect(text).toContain('+14 XP +5 gold −12 HP')
      expect(html).toMatch(/data-story-changes="true"><div class="no-shrink w--\[\d+px\]"><\/div><div class="grow w--min-0"> <span class="label lg:title--small label--outline">\+14\u00a0XP<\/span> <span[^>]*>\+5\u00a0gold<\/span> <span[^>]*>−12\u00a0HP<\/span><\/div>/)
    }
  })

  it('keeps numeric changes outside narrative clamping and falls back for older payloads', async () => {
    const vars = payload() as { log: Array<Record<string, unknown>> } & Record<string, unknown>
    const html = await render({ ...vars, log: [{ ...vars.log[0], n: 'A very long story '.repeat(10) }] })
    expect(html).toMatch(/data-clamp="2" data-clamp-lg="0"><span class="text--regular">A very long story/)
    expect(html).toMatch(/<\/span><\/div><div class="flex[^"]*" data-story-changes="true">/)
    const old = await render({ ...vars, log: [{ s: 'Old story. +4 XP.', k: 'combat', u: NOW / 1000 }] })
    expect(old).toContain('Old story. +4 XP.')
    expect(old).not.toContain('undefined')
  })
})

describe('next adventure clock (D72)', () => {
  it('stays in the payload for the companion but is never drawn on the device', async () => {
    const vars = payload()
    expect(vars.next_tick_at).toBe(Math.floor(Date.UTC(2026, 9, 4, 8, 30) / 1000))
    for (const markup of Object.values(screenMarkup)) {
      const html = await new Liquid({ timezoneOffset: 0 }).parseAndRender(markup, { ...vars, utc_offset: 7200 })
      expect(html).not.toContain('Next adventure')
      expect(html).not.toContain('10:30')
    }
  })
})

describe('HUD hearts and counters (D72)', () => {
  const full = hudMarkUri('heartFull', 36, 32)
  const half = hudMarkUri('heartHalf', 36, 32)
  const empty = hudMarkUri('heartEmpty', 36, 32)
  /** Hearts inside the heart rows only; the narrow counter line also uses the full heart as its HP mark. */
  const count = (html: string, uri: string) => {
    const rows = [...html.matchAll(/data-hearts="\d+"><div[^>]*>((?:<img[^>]*>)+)<\/div>/g)].map((m) => m[1]).join('')
    return rows.split(`src="${uri}"`).length - 1
  }

  it('fills ten hearts in half steps from the real numbers in every layout', async () => {
    for (const markup of Object.values(screenMarkup)) {
      const html = await new Liquid({ timezoneOffset: 0 }).parseAndRender(markup, payload())
      // 118/148 → 15.9 halves → 16: eight full hearts and two empty ones, in both the landscape and portrait arrangements.
      expect(html).toContain('data-hearts="16"')
      expect([count(html, full), count(html, half), count(html, empty)]).toEqual([16, 0, 4])
      const odd = await new Liquid({ timezoneOffset: 0 }).parseAndRender(markup, { ...payload(), hp: 75, max_hp: 100 })
      expect([count(odd, full), count(odd, half), count(odd, empty)]).toEqual([14, 2, 4])
    }
  })

  it('never shows an empty row while the hero has any health, and shows all empty at zero', async () => {
    const low = await render({ ...payload(), hp: 1, max_hp: 148 })
    expect(low).toContain('data-hearts="1"')
    expect([count(low, full), count(low, half), count(low, empty)]).toEqual([0, 2, 18])
    const dead = await render({ ...payload(), hp: 0, hp_pct: 0 })
    expect(dead).toContain('data-hearts="0"')
    expect([count(dead, full), count(dead, half), count(dead, empty)]).toEqual([0, 0, 20])
    expect(dead).toMatch(/data-hp-count="true">0\/148 HP</)
  })

  it('draws XP as ten half-step ticks under the hearts, floored like them', async () => {
    const tick = (mark: 'tickFull' | 'tickHalf' | 'tickEmpty') => hudMarkUri(mark, 36, 16)
    const ticks = (html: string) => {
      const rows = [...html.matchAll(/data-xp-ticks="\d+"><div[^>]*>((?:<img[^>]*>)+)<\/div>/g)].map((m) => m[1]).join('')
      return (['tickFull', 'tickHalf', 'tickEmpty'] as const).map((mark) => rows.split(`src="${tick(mark)}"`).length - 1)
    }
    // 32% → 6.4 halves → 6: three full ticks, in both the landscape and portrait arrangements.
    const html = await render(payload())
    expect(html).toContain('data-xp-ticks="6"')
    expect(ticks(html)).toEqual([6, 0, 14])
    expect(ticks(await render({ ...payload(), xp_pct: 75 }))).toEqual([14, 2, 4])
    expect(ticks(await render({ ...payload(), xp_pct: 0 }))).toEqual([0, 0, 20])
    expect(ticks(await render({ ...payload(), xp_pct: 100 }))).toEqual([20, 0, 0])
    // Narrow columns keep the ticks on the X only, except the portrait side, which has the height for them.
    const half = await new Liquid({ timezoneOffset: 0 }).parseAndRender(screenMarkup.markup_half_horizontal, payload())
    expect(half).toMatch(/hidden lg:block stretch-x">{?[^]*?data-xp-ticks="6"/)
    expect(await new Liquid({ timezoneOffset: 0 }).parseAndRender(screenMarkup.markup_quadrant, payload())).not.toContain('data-xp-ticks')
  })

  it('shows attack and defense with their marks beside the HP count, and gold and potions beside the XP count', async () => {
    const vars = { ...payload(), gold: 640, potions: 1, weapon: 'Uncommon Cable Cutter' }
    const escape = (uri: string) => uri.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&')
    const fullView = await render(vars)
    expect(fullView).toMatch(new RegExp(`data-hp-count="true">118/148 HP</span><div[^>]*><img[^>]*src="${escape(hudMarkUri('sword', 24, 24))}" alt=""><span class="label lg:title--small">18</span></div><div[^>]*><img[^>]*src="${escape(hudMarkUri('shield', 24, 24))}" alt=""><span class="label lg:title--small">7</span></div></div>`))
    expect(fullView).toMatch(new RegExp(`data-xp-count="true">210/656 XP</span><div[^>]*><img[^>]*src="${escape(hudMarkUri('coin', 24, 24))}" alt=""><span class="label lg:title--small">640</span></div><div[^>]*><img[^>]*src="${escape(hudMarkUri('potion', 24, 24))}" alt=""><span class="label lg:title--small">1</span></div></div>`))
    // The X full names the counts beside the hero (the OG rows above are lg:hidden) and puts the gear on one line.
    expect(fullView).toMatch(/<div class="hidden lg:flex[^"]*" data-counters="words">(?:<div[^>]*><img[^>]*><span class="label lg:title--small">(?:18 attack|7 defense|640 gold|1 potion)<\/span><\/div>){4}<\/div>/)
    expect(await render({ ...vars, potions: 2 })).toContain('>2 potions<')
    expect(fullView).toMatch(/data-gear-line="true"><span class="title--small text--regular" data-clamp="0" data-clamp-lg="0">Weapon <span class="text--bold inline-block">Uncommon Cable Cutter<\/span> · Armor <span class="text--bold inline-block">None<\/span><\/span>/)
    expect(fullView.split('landscape:hidden')[0]).toMatch(/data-hp-count="true">118\/148 HP<\/span><div class="lg:hidden flex/)
    // Narrow columns: the HP count leads the combat row, and coins and potions take their own row.
    const side = await new Liquid({ timezoneOffset: 0 }).parseAndRender(screenMarkup.markup_half_vertical, vars)
    expect(side).toMatch(/data-counters="true"><div[^>]*><img[^>]*><span class="label lg:title--small">118\/148<\/span><\/div><div[^>]*><img[^>]*><span class="label lg:title--small">18<\/span><\/div><div[^>]*><img[^>]*><span class="label lg:title--small">7<\/span><\/div><\/div><div[^>]*data-counters="2"><div[^>]*><img[^>]*><span class="label lg:title--small">640<\/span><\/div><div[^>]*><img[^>]*><span class="label lg:title--small">1<\/span>/)
  })

  it('puts the time under the story in the narrow portrait columns only', async () => {
    const quadrant = await new Liquid({ timezoneOffset: 0 }).parseAndRender(screenMarkup.markup_quadrant, { ...payload(), utc_offset: 7200 })
    const [landscape, portrait] = quadrant.split('landscape:hidden')
    expect(landscape).toMatch(/data-story-time="true">10:19<\/span><\/div>/)
    expect(portrait).toMatch(/data-story-changes="true"><div[^>]*><\/div><div class="grow w--min-0"><span class="label lg:title--small no-shrink" data-story-time="true">10:19<\/span> <span/)
  })
})
