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
  const recap = { label: 'Last 12 hours', gains: '+184 XP · 52 gold earned', activity: '9 fights won · 2 gear finds · 4 breaks', highlights: 'Gained 1 level', compact: 'Gained 1 level · +184 XP', span: '19:00-07:00', items: [{ k: 'levelup', t: '+1 level' }, { k: 'xp', t: '+184 XP' }, { k: 'coin', t: '52 gold' }, { k: 'none', t: 'Quiet' }] }

  it('includes the recap and latest outcome in every size while escaping all recap text', async () => {
    for (const markup of Object.values(screenMarkup)) {
      const html = await new Liquid({ timezoneOffset: 0 }).parseAndRender(markup, { ...payload(), recap })
      const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')
      expect(text).toContain('Last 12 hours')
      // Each fact behind its own mark (v35); a 'none' item has text but no mark.
      for (const item of recap.items) expect(text).toContain(item.t)
      // Every arrangement that carries the recap (landscape and portrait, the OG's and the X's) draws three marks.
      const recapRows = html.match(/data-recap-items="/g)!.length
      expect(recapRows).toBeGreaterThanOrEqual(2)
      expect(html.match(/data-recap-item="true"><img /g)).toHaveLength(recapRows * 3)
      expect(text).toContain('Unplugged a Cable Serpent.')
      for (const change of ['+14\u00a0XP', '+5\u00a0gold', '−12\u00a0HP']) expect(html).toMatch(new RegExp(`label--outline[^"]*">${change.replace('+', '\\+')}<`))
      // Ink panels print lost HP in red and found gold on yellow (D94).
      expect(html).toContain('label--outline text--red 1bit:text--black 2bit:text--black 4bit:text--black">−12\u00a0HP<')
      expect(html).toContain('label--outline bg--yellow 1bit:bg--white 2bit:bg--white 4bit:bg--white">+5\u00a0gold<')
      const escaped = await new Liquid({ timezoneOffset: 0 }).parseAndRender(markup, { ...payload(), recap: { ...recap, label: '<script>unsafe</script>', items: [{ k: 'xp', t: '<b>x</b>' }] } })
      expect(escaped).toContain('&lt;b&gt;x&lt;/b&gt;')
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

  it('keeps a small unlabelled home code in the full layout and a full bag panel in its place (D88)', async () => {
    const standing = await liquid.parseAndRender(screenMarkup.markup, { ...payload(), companion_qr_base: `${base}/bag`, home_qr_base: `${base}/app` })
    expect(standing).toContain(`src="${base}/app/2.png"`)
    expect(standing).toContain(`src="${base}/app/3.png"`)
    // D108: without a corner code (an older payload) the OG landscape shows none rather than a broken image.
    expect(standing).not.toContain('data-home-qr="corner"')
    expect(standing).not.toContain(`src="${base}/bag/`)
    const corner = await liquid.parseAndRender(screenMarkup.markup, { ...payload(), companion_qr_base: `${base}/bag`, home_qr_base: `${base}/home`, corner_qr_base: `${base}/corner` })
    expect(corner).toMatch(new RegExp(`class="lg:hidden absolute top--0 right--0" data-home-qr="corner"><img class="image" src="${base}/corner/2.png"`))
    expect(corner).toContain(`src="${base}/home/3.png"`)
    expect(standing).not.toContain('Your bag')
    expect(standing).not.toContain('data-bag-full')
    const full = await liquid.parseAndRender(screenMarkup.markup, { ...payload(), companion_qr_base: `${base}/bag`, home_qr_base: `${base}/app`, qr_base: `${base}/bag`, qr_label: 'Scan to open your bag', attention: 'Make room in your bag in the companion, then resume.' })
    expect(full).toContain('data-bag-full="true"')
    expect(full).toContain('Adventures are paused until you make room.')
    expect(full).toContain(`src="${base}/bag/3.png"`)
    expect(full).toContain(`src="${base}/bag/5.png"`)
    expect(full).not.toContain(`src="${base}/app/`)
    expect(full).not.toContain('data-story-list="true"')
  })

  it('keeps a standing bag link in the narrow layouts and lets the action destination take priority', async () => {
    for (const markup of [screenMarkup.markup_half_horizontal, screenMarkup.markup_half_vertical, screenMarkup.markup_quadrant]) {
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
    // Both arrangements name the slots in one gear line under the HUD rows.
    expect(html.match(/data-gear-line="true"><span[^>]*>Weapon <span class="text--bold inline-block">Uncommon Cable Cutter<\/span> · Armor <span class="text--bold inline-block">None</g)).toHaveLength(2)
  })

  const top5 = [
    { rank: 1, name: 'Ana', hero_name: 'Pip', level: 7, score: 2410 },
    { rank: 2, name: 'Bo', hero_name: 'Staple', level: 6, score: 1990 },
    { rank: 3, name: 'barrymichaeldoyle', hero_name: 'Baz', level: 5, score: 1840 },
    { rank: 4, name: 'Cy', hero_name: 'Mug', level: 5, score: 1700 },
    { rank: 5, name: 'Dee', hero_name: 'Clip', level: 4, score: 1515 },
  ]
  const board = (rank: number | null, score = 1840) => ({ ...payload(), rank, leaderboard_score: score, total_players: 141, leaderboard_cohort_label: 'Levels 4-7', top5, owner_name: 'barrymichaeldoyle' })
  const rows = (html: string) => [...html.matchAll(/<div class="([^"]*)" data-rank-row="(\d+)">(.*?XP<\/span>)<\/div>/g)].map((m) => ({ rank: Number(m[2]), own: m[1]!.includes('label--inverted'), hidden: m[1]!.startsWith('hidden'), text: m[3]!.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ') }))
  /** The boards: the OG landscape's beside the scene, the X landscape's column, and the portrait's X and OG columns. */
  const boards = (html: string) => {
    const [landscape, portrait] = html.split('landscape:hidden') as [string, string]
    const from = (text: string, a: string, b?: string) => text.slice(text.indexOf(a), b ? text.indexOf(b, text.indexOf(a)) : undefined)
    return {
      ogLandscape: rows(from(landscape, 'data-board-column="og"', 'data-rune-rule')),
      xLandscape: rows(from(landscape, 'data-board-column="true"')),
      xPortrait: [...rows(from(portrait, 'data-rank-panel', 'data-board-columns="og"')), ...rows(from(portrait, 'data-board-columns="og"')).filter((r) => r.hidden)],
      // The X portrait's appended own row follows the OG columns; it is hidden below the X's breakpoint.
      ogPortrait: rows(from(portrait, 'data-board-columns="og"')).filter((r) => !r.hidden),
    }
  }

  it('marks the own row instead of repeating the rank, and never shows the ordinal line', async () => {
    const html = await render(board(3))
    const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')
    expect(text).not.toContain('of 141')
    expect(text).not.toContain('3rd')
    expect(text).toContain('This week · Lv 4-7')
    expect(text).toContain('This week · Levels 4-7')
    // Every board lists the five rows once; only the third is inverted.
    const { ogLandscape, xLandscape, ogPortrait } = boards(html)
    for (const list of [ogLandscape, xLandscape, ogPortrait]) expect(list.map((r) => [r.rank, r.own])).toEqual([[1, false], [2, false], [3, true], [4, false], [5, false]])
    expect(xLandscape[2]!.text).toBe('3. barrymichaeldoyle1840 XP')
    // On ink panels the own row is red rather than black (D94).
    expect(html).toMatch(/label--inverted bg--red 1bit:bg--black 2bit:bg--black 4bit:bg--black" data-rank-row="3"/)
  })

  it('draws a vertical rule between the stories and the ranking on the X, in the landscape only', async () => {
    const html = await render(board(3))
    const [landscape, portrait] = html.split('landscape:hidden')
    expect(landscape).toMatch(/<div class="hidden lg:block col--span-4"><div class="flex flex--row flex--stretch-y gap--medium h--full" data-board-column="true">\s*<div class="hidden lg:block no-shrink border--v-30" data-column-rule="true"><\/div>/)
    expect(portrait).not.toContain('data-column-rule')
  })

  it('shows up to ten rows on the X from top10, falling back to top5', async () => {
    const ten = [...top5, ...[6, 7, 8, 9, 10].map((rank) => ({ rank, name: `P${rank}`, hero_name: `H${rank}`, level: 4, score: 1600 - rank * 100 }))]
    const html = await render({ ...board(3), top10: ten })
    const { ogLandscape, xLandscape, xPortrait, ogPortrait } = boards(html)
    // Landscape: ten rows in the X's column, five beside the OG's scene; nothing is appended because the hero is on the board.
    expect(xLandscape.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(ogLandscape.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5])
    // Portrait: rows 1-5 beside 6-10 on the X, 1-3 beside 4-6 on the OG.
    expect(html).toContain('<div class="hidden lg:block stretch-x"><div class="grid grid--cols-1 lg:grid--cols-2 gap--none lg:gap--large stretch-x">')
    expect(xPortrait.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(ogPortrait.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6])
    // A hero below the tenth row takes the tenth row's place in the X landscape, the fifth beside the OG scene, and the
    // sixth in the OG portrait; the X portrait appends it.
    const eleventh = boards(await render({ ...board(11, 400), top10: ten }))
    expect(eleventh.xLandscape.map((r) => [r.rank, r.own])).toEqual([[1, false], [2, false], [3, false], [4, false], [5, false], [6, false], [7, false], [8, false], [9, false], [11, true]])
    expect(eleventh.ogLandscape.map((r) => [r.rank, r.own])).toEqual([[1, false], [2, false], [3, false], [4, false], [11, true]])
    expect(eleventh.ogPortrait.map((r) => [r.rank, r.own])).toEqual([[1, false], [2, false], [3, false], [4, false], [5, false], [11, true]])
    expect(eleventh.xPortrait.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    // An older payload without top10 still draws its five rows.
    expect(boards(await render(board(3))).xLandscape.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5])
  })

  it('appends the own row below the rows a device shows', async () => {
    const fourth = boards(await render(board(4, 1700)))
    expect(fourth.ogLandscape.map((r) => [r.rank, r.own])).toEqual([[1, false], [2, false], [3, false], [4, true], [5, false]])
    const twelfth = boards(await render(board(12, 980)))
    for (const list of [twelfth.ogLandscape, twelfth.ogPortrait]) expect(list.at(-1)).toMatchObject({ rank: 12, own: true, text: '12. barrymichaeldoyle980 XP' })
    expect(twelfth.ogLandscape.map((r) => r.rank)).toEqual([1, 2, 3, 4, 12])
    expect(twelfth.xLandscape.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 12])
    expect(twelfth.xLandscape.slice(0, 5).every((r) => !r.own)).toBe(true)
  })

  it('explains an absent rank without marking any row', async () => {
    const awaiting = await render({ ...board(null), top5: [] })
    expect(awaiting).toContain('Ranking within the hour')
    expect(rows(awaiting)).toEqual([])
    const dormant = await render({ ...board(null), rank_status: 'dormant' })
    expect(dormant).toContain('Not ranked while paused')
    expect(rows(dormant).some((r) => r.own)).toBe(false)
  })

  it('shows the home code in the corner beside the rank, and only the bag panel when the bag is full', async () => {
    const base = 'https://art.test/art/qr/v3'
    const standing = await render({ ...payload(), companion_qr_base: `${base}/bag`, home_qr_base: `${base}/app` })
    expect(standing).toContain('data-home-qr="true"')
    expect(standing).toContain('data-board-column="true"')
    expect(standing).toContain('data-rank-panel="true"')
    const action = await render({ ...payload(), companion_qr_base: `${base}/bag`, home_qr_base: `${base}/app`, qr_base: `${base}/bag`, qr_url: `${base}/bag/3.png`, qr_url_large: `${base}/bag/5.png`, qr_label: 'Scan to open your bag' })
    expect(action).not.toContain('data-home-qr')
    // The stories and their ranking give way to the panel; the OG landscape keeps its board beside the scene.
    expect(action).not.toContain('data-board-column="true"')
    expect(action).not.toContain('data-rank-panel')
    expect(action).toContain('data-board-column="og"')
    expect(action).toContain('Bag full')
  })
})

describe('X half, side and quarter arrangements (D95)', () => {
  const ten = Array.from({ length: 10 }, (_, i) => ({ rank: i + 1, name: `P${i + 1}`, hero_name: `H${i + 1}`, level: 5, score: 2000 - i * 100 }))
  const vars = { ...payload(), rank: 3, leaderboard_score: 1800, leaderboard_cohort_label: 'Levels 4-7', top10: ten, owner_name: 'P3', companion_qr_base: 'https://art.test/art/qr/v3/bag', ...Object.fromEntries(['scene_url', 'scene_url_small', 'scene_url_medium', 'scene_url_large'].map((field, i) => [field, `https://art.test/art/scene/${i}.png`])) }
  const views = async (markup: string) => {
    const html = await new Liquid({ timezoneOffset: 0 }).parseAndRender(markup, vars)
    const [landscape, portrait] = html.split('landscape:hidden') as [string, string]
    return { landscape, portrait }
  }

  it('gives the half views the full header, a scene, a ruled board and a one-line ledger', async () => {
    const { landscape, portrait } = await views(screenMarkup.markup_half_horizontal)
    for (const view of [landscape, portrait]) {
      expect(view).toContain('data-hero-header="x"')
      expect(view).toContain('data-scene-row="x"')
      expect(view).toContain('data-story-chips-inline="true"')
    }
    // The landscape's narrow details column counts by marks alone (D103); the portrait header names them.
    expect(landscape).toMatch(/data-hero-header="x">.*data-counters="2"/s)
    expect(portrait).toMatch(/data-counters="words"/)
    // Four rows in the landscape details column, five beside the portrait scene.
    expect(landscape.split('data-board-column="x"')[1]!.match(/data-rank-row=/g)).toHaveLength(4)
    // The landscape (D97): the details column holds the hero, the HUD with the gear on two lines and the board; the
    // rune rule stood on end, then the scene and code over a thin rule and the ledger.
    const x = landscape.slice(landscape.indexOf('data-details-column="x"'))
    const order = ['data-hero-header="x"', 'data-hp-count="true"', 'data-gear-line="stacked"', 'data-board-column="x"', 'data-rune-rule="vertical"', 'data-scene-row="x"', 'data-companion-qr="true"', 'data-scene-rule="true"', 'data-ledger="x"'].map(marker => x.indexOf(marker))
    expect(order.every(index => index >= 0)).toBe(true)
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(portrait.split('data-board-column="x"')[1]!.match(/data-rank-row=/g)).toHaveLength(5)
  })

  it('sets the side code in the header corner, the gear behind its marks and the recap ribbon at the foot (D104)', async () => {
    const recap = { label: 'Night recap', span: '19:00-07:00', items: [{ k: 'xp', t: '+182 XP' }] }
    const html = await new Liquid({ timezoneOffset: 0 }).parseAndRender(screenMarkup.markup_half_vertical, { ...vars, recap, weapon: 'Uncommon Cable Cutter' })
    const [landscape, portrait] = html.split('landscape:hidden') as [string, string]
    // Landscape: the code closes the header row, the gear follows it, and the scene carries no code.
    const x = landscape.slice(landscape.indexOf('data-hero-header="x"'))
    const order = ['data-hero-header="x"', 'data-companion-qr="true"', 'data-gear-line="icons"', 'data-scene-row="x"', 'data-ledger="x"', 'data-board-column="x"', 'data-recap-ribbon="true"'].map(marker => x.indexOf(marker))
    expect(order.every(index => index >= 0)).toBe(true)
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(x).toMatch(/data-gear-line="icons"><div[^>]*><img[^>]*src="[^"]+"[^>]*><span class="title--small text--regular"><span class="text--bold inline-block">Uncommon Cable Cutter<\/span>/)
    expect(x).not.toMatch(/data-scene-row="x"><img[^>]*><div/)
    expect(x.split('data-board-column="x"')[1]!.match(/data-rank-row=/g)).toHaveLength(4)
    expect(x.slice(0, x.indexOf('data-recap-ribbon')).match(/data-recap-items/g)).toBeNull()
    // The narrower portrait column keeps the gear words, the recap over its stories, five rows and its code at the foot.
    expect(portrait).toContain('data-gear-line="true"')
    expect(portrait).not.toContain('data-recap-ribbon')
    expect(portrait.split('data-board-column="x"')[1]!.match(/data-rank-row=/g)).toHaveLength(5)
    expect(portrait.lastIndexOf('data-companion-qr')).toBeGreaterThan(portrait.indexOf('data-board-column="x"'))
    // The quarter landscape takes the same ribbon after its stories.
    const quadrant = (await new Liquid({ timezoneOffset: 0 }).parseAndRender(screenMarkup.markup_quadrant, { ...vars, recap })).split('landscape:hidden')[0]!
    const q = quadrant.slice(quadrant.indexOf('data-ledger="x"'))
    expect(q.indexOf('data-recap-ribbon="true"')).toBeGreaterThan(q.indexOf('data-story-list'))
  })

  it('gives the quarter the HP and XP counts, with the code beside the name in landscape', async () => {
    const { landscape, portrait } = await views(screenMarkup.markup_quadrant)
    for (const view of [landscape, portrait]) {
      const x = view.slice(view.indexOf('data-hero-header="x"'))
      expect(x).toContain('data-hp-count="true"')
      expect(x).toContain('data-xp-count="true"')
    }
    expect(landscape.slice(landscape.indexOf('data-hero-header="x"'), landscape.indexOf('data-ledger="x"'))).toContain('data-companion-qr="true"')
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
  it('leaves the time column empty for the live travel line, which says its arrival in the story (D91)', async () => {
    const vars = payload() as { log: Array<Record<string, unknown>> } & Record<string, unknown>
    const travel = { u: NOW / 1000, k: 'travel', s: 'Off to the [[Server Room]], arriving 10:30.', n: 'Off to the [[Server Room]], arriving 10:30.', d: '', live: true }
    for (const [key, markup] of Object.entries(screenMarkup)) {
      const html: string = await new Liquid({ timezoneOffset: 0 }).parseAndRender(markup, { ...vars, utc_offset: 7200, log: [travel, ...vars.log] })
      expect(html, key).toContain('arriving 10:30.')
      // Each travel line's block (up to the next entry's rule) has no time and no empty row in the narrow columns;
      // the stored entry after it still has its time.
      const blocks = html.split('arriving 10:30.').slice(1).map((rest) => rest.split('border--h-30')[0]!)
      expect(blocks.length, key).toBeGreaterThan(0)
      for (const block of blocks) {
        expect(block, key).not.toContain('data-story-time')
        expect(block, key).not.toContain('data-story-changes')
        expect(block, key).not.toContain('data-story-lead-meta')
      }
      expect(html, key).toContain('data-story-time="true">')
    }
  })

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
    expect(html).toMatch(/data-story-time="true">10:19<\/span><\/div><div class="(lg:hidden )?flex[^"]*" data-story-changes="true">/)
  })

  it('gives the newest story the whole line on the X and puts its changes and time below it, in the columns', async () => {
    const vars = payload() as { log: Array<Record<string, unknown>> } & Record<string, unknown>
    const html = await render({ ...vars, utc_offset: 7200, log: [{ ...vars.log[0], n: 'Took down an elite [[Legacy Mainframe]]. The floor heard it.' }, ...vars.log] })
    const [landscape, portrait] = html.split('landscape:hidden')
    // Portrait, on the X: no chips on the story's line, a meta row with the stat columns and the time; on the OG: the time stays on the line.
    const lead = portrait!.split('The floor heard it.')[1]!.split('border--h-30')[0]!
    expect(lead).toMatch(/<span class="lg:hidden label lg:title--small no-shrink" data-story-time="true">10:19<\/span>/)
    expect(lead).toMatch(/<div class="hidden lg:flex flex--row flex--right flex--center-y gap--xsmall" data-story-lead-meta="true"><span class="hidden lg:flex[^"]*" data-story-chips-inline="true">.*data-chip-cell="xp">.*<span class="label lg:title--small no-shrink" data-story-time="true">10:19<\/span><\/div>/)
    // Landscape: the screen-wide ledger uses the meta row on every device, and the OG's stacked chips are gone.
    const wide = landscape!.split('The floor heard it.')[1]!.split('border--h-30')[0]!
    expect(wide).toMatch(/<div class="flex lg:flex flex--row flex--right flex--center-y gap--xsmall" data-story-lead-meta="true"><span class="flex lg:flex flex--row[^"]*" data-story-chips-inline="true">/)
    expect(landscape).not.toContain('data-story-changes')
    expect(lead.indexOf('data-story-chips-inline')).toBeGreaterThan(lead.indexOf('data-story-lead-meta'))
  })

  it('puts the changes on the story line on the X in the full layout, in fixed XP, gold and HP columns', async () => {
    const vars = payload() as { log: Array<Record<string, unknown>> } & Record<string, unknown>
    const html = await render({ ...vars, utc_offset: 7200, log: [{ ...vars.log[0], d: '+1\u00a0healing potion · +14\u00a0XP · −12\u00a0HP' }, { ...vars.log[0], d: '' }] })
    const cells = (kind: string) => [...html.matchAll(new RegExp(`data-chip-cell="${kind}">(<span[^>]*>[^<]*</span>)?</span>`, 'g'))].map((m) => (m[1] ?? '').replace(/<[^>]+>/g, ''))
    // The first entry: XP and HP in their columns, gold empty, the potion just before them; landscape and portrait each draw it once.
    expect(cells('xp')).toEqual(['+14\u00a0XP', '+14\u00a0XP'])
    expect(cells('gold')).toEqual(['', ''])
    expect(cells('hp')).toEqual(['−12\u00a0HP', '−12\u00a0HP'])
    expect(html).toMatch(/data-story-chips-inline="true"><span class="label lg:title--small label--outline">\+1\u00a0healing potion<\/span><span[^>]*data-chip-cell="xp"/)
    // The second entry has no changes, so it reserves no columns and its story keeps the line.
    expect(html.match(/data-story-chips-inline/g)).toHaveLength(2)
    expect(html).toMatch(/<div class="lg:hidden flex[^"]*" data-story-changes="true">/)
    // The narrower layouts keep the changes under the story on both devices.
    const side = await new Liquid({ timezoneOffset: 0 }).parseAndRender(screenMarkup.markup_half_vertical, { ...vars, utc_offset: 7200 })
    expect(side).not.toContain('data-story-chips-inline')
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
    expect(await render({ ...payload(), celebration: 'Level up! Now level 6' })).toMatch(/label--inverted bg--red 1bit:bg--black 2bit:bg--black 4bit:bg--black">Level up! Now level 6</)
    expect(await render(payload())).not.toMatch(/class="[^"]*label--inverted/)
  })

  it('celebrates the longest achievement name on every layout and gives achievement lines a glyph', async () => {
    const vars = payload() as { log: Array<Record<string, unknown>> } & Record<string, unknown>
    const name = 'Achievement: Nine Lives (Expired)'
    for (const [key, markup] of Object.entries(screenMarkup)) {
      const html = await new Liquid({ timezoneOffset: 0 }).parseAndRender(markup, { ...vars, celebration: name, log: [{ ...vars.log[0], k: 'achievement', n: 'Achievement: [[Nine Lives (Expired)]]', d: '' }, ...vars.log] })
      // The quadrant has no room for a badge (D44); the other three show it.
      if (key !== 'markup_quadrant') expect(html).toContain(`4bit:bg--black">${name}<`)
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
    expect(html).toMatch(/<\/span><\/div><div class="(lg:hidden )?flex[^"]*" data-story-changes="true">/)
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

describe('merchant notice (D78)', () => {
  it('shows the notice as an inverted line without collapsing the stories, and never beside an attention line', async () => {
    const vars = { ...payload(), notice: 'Merchant visiting. Shop in the companion soon.', log: [{ n: 'One', s: 'One', k: 'loot', u: NOW / 1000, d: '' }, { n: 'Two', s: 'Two', k: 'rest', u: NOW / 1000 - 900, d: '' }] }
    for (const markup of Object.values(screenMarkup)) {
      const html = await new Liquid({ timezoneOffset: 0 }).parseAndRender(markup, vars)
      expect(html).toMatch(/label--outline" data-clamp="\d">Merchant visiting\. Shop in the companion soon\.</)
      expect(html).toContain('>Two<')
      const withAttention = await new Liquid({ timezoneOffset: 0 }).parseAndRender(markup, { ...vars, attention: 'Updates delayed. Nothing is lost.' })
      expect(withAttention).not.toContain('A merchant is visiting')
    }
  })
})

describe('HUD hearts and counters (D72)', () => {
  const full = hudMarkUri('heartFull', 36, 32)
  const half = hudMarkUri('heartHalf', 36, 32)
  const empty = hudMarkUri('heartEmpty', 36, 32)
  /** Hearts inside the black heart rows only; the narrow counter line also uses the full heart as its HP mark. */
  const count = (html: string, uri: string) => {
    const rows = [...html.matchAll(/data-hearts="\d+"><div class="hidden 1bit:block[^"]*"><div[^>]*>((?:<img[^>]*>)+)<\/div>/g)].map((m) => m[1]).join('')
    return rows.split(`src="${uri}"`).length - 1
  }

  it('draws the same hearts in red on ink panels (D94)', async () => {
    const html = await render(payload())
    const ink = [...html.matchAll(/<div class="1bit:hidden 2bit:hidden 4bit:hidden no-shrink"><div[^>]*>((?:<img[^>]*>)+)<\/div>/g)].map((m) => m[1]).join('')
    expect(ink.split(`src="${hudMarkUri('heartFull', 36, 32, '#ff0000')}"`).length - 1).toBe(16)
    expect(ink.split(`src="${hudMarkUri('heartEmpty', 36, 32, '#ff0000')}"`).length - 1).toBe(4)
  })

  it('fills ten hearts in half steps from the real numbers in every layout', async () => {
    for (const markup of Object.values(screenMarkup)) {
      const html = await new Liquid({ timezoneOffset: 0 }).parseAndRender(markup, payload())
      // 118/148 → 15.9 halves → 16: eight full hearts and two empty ones, in every arrangement (landscape and portrait,
      // and in the half, side and quarter views the OG's and the X's).
      expect(html).toContain('data-hearts="16"')
      const rows = html.match(/data-hearts="/g)!.length
      expect(rows).toBeGreaterThanOrEqual(2)
      expect([count(html, full), count(html, half), count(html, empty)]).toEqual([8 * rows, 0, 2 * rows])
      const odd = await new Liquid({ timezoneOffset: 0 }).parseAndRender(markup, { ...payload(), hp: 75, max_hp: 100 })
      expect([count(odd, full), count(odd, half), count(odd, empty)]).toEqual([7 * rows, rows, 2 * rows])
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
    // The half and quarter views draw the ticks in the X's arrangements only (D95); the OG's columns have no room.
    for (const markup of [screenMarkup.markup_half_horizontal, screenMarkup.markup_quadrant]) {
      const html = await new Liquid({ timezoneOffset: 0 }).parseAndRender(markup, payload())
      const og = html.split(/<div class="hidden lg:block [^"]*stretch-x">/)[0]!
      expect(html).toContain('data-xp-ticks="6"')
      expect(og).not.toContain('data-xp-ticks')
    }
  })

  it('shows attack and defense beside the name, the HP count alone after the hearts, and the bag beside the potions (D88)', async () => {
    const vars = { ...payload(), gold: 640, potions: 1, weapon: 'Uncommon Cable Cutter' }
    const escape = (uri: string) => uri.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&')
    const fullView = await render(vars)
    const [landscape, portrait] = fullView.split('landscape:hidden')
    for (const view of [landscape, portrait]) {
      expect(view).toMatch(new RegExp(`level 5</span>\\s*<div[^>]*data-attack-defense="true"><div[^>]*><img[^>]*src="${escape(hudMarkUri('sword', 24, 24))}" alt=""><span class="label lg:title--small">18</span></div><div[^>]*><img[^>]*src="${escape(hudMarkUri('shield', 24, 24))}" alt=""><span class="label lg:title--small">7</span></div></div></div>`))
      expect(view).toMatch(/data-hp-count="true">118\/148 HP<\/span><\/div>/)
    }
    // Both arrangements: the named counts under the hero on every device; the XP row ends at its count.
    for (const view of [landscape, portrait]) {
      expect(view).toMatch(/<div class="flex[^"]*" data-counters="words">(?:<div[^>]*><img[^>]*><span class="label lg:title--small">(?:640 gold|1 potion|3\/30)<\/span><\/div>){3}<\/div>/)
      expect(view).toMatch(/data-xp-count="true">210\/656 XP<\/span><\/div>/)
      // The OG names the gear by the attack and defense marks.
      expect(view).toMatch(/data-gear-line="og">.*>Uncommon Cable Cutter<\/span><\/div>.*>No armor<\/span><\/div><\/div>/)
    }
    // Unlinked payloads carry no bag, so no count is drawn.
    expect(await render({ ...vars, bag_capacity: null })).not.toContain('data-bag-count')
    // D103: the stance follows the bag under its own gauge, in the full header and the narrow counter rows; none without stances.
    expect(await render(vars)).not.toContain('data-stance')
    for (const markup of [screenMarkup.markup, screenMarkup.markup_half_vertical, screenMarkup.markup_half_horizontal]) {
      const stanced = await new Liquid({ timezoneOffset: 0 }).parseAndRender(markup, { ...vars, stance: 'bold', stance_name: 'Bold' })
      expect(stanced).toMatch(new RegExp(`data-stance="bold"[^>]*><img[^>]*src="${escape(hudMarkUri('stanceBold', 24, 24))}" alt=""><span class="label lg:title--small">Bold</span>`))
    }
    expect(await render({ ...vars, potions: 2 })).toContain('>2 potions<')
    expect(fullView).toMatch(/data-gear-line="true"><span class="title--small text--regular" data-clamp="0" data-clamp-lg="0">Weapon <span class="text--bold inline-block">Uncommon Cable Cutter<\/span> · Armor <span class="text--bold inline-block">None<\/span><\/span>/)
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
