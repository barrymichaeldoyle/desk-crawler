import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { parseScenePath, renderScenePng } from '@trmnl-games/desk-crawler/art/route'
import { composeScene, FULL_SCALE, LARGE_SCALE, MEDIUM_SCALE, SCENE_VERSION, SMALL_SCALE, STAGE_HEIGHT, STAGE_WIDTH } from '@trmnl-games/desk-crawler/art/scene'
import { sceneFor, scenePath } from '@trmnl-games/desk-crawler/art/sceneKey'
import { sceneTimeAt, sceneUrlAt, sceneUrlsAt } from '@trmnl-games/desk-crawler/art/sceneTime'
import { recapPeriod } from '@trmnl-games/desk-crawler/payload'
import { monsterArt } from '@trmnl-games/desk-crawler/art/monsters'
import { BWRY_PALETTE, bwryInk, BwryInk } from '@trmnl-games/desk-crawler/art/sceneColour'
import { contentV1 } from '@trmnl-games/desk-crawler/content/v1'

describe('scene art', () => {
  it('maps hero state and the latest event to a pose and subject', () => {
    expect(sceneFor('dead', false, { kind: 'death', outcome: { variant: 'combat', monsterId: 'crumb_golem', elite: true } })).toEqual({ pose: 'knocked_out', subject: { kind: 'monster', id: 'crumb_golem', elite: true } })
    expect(sceneFor('sleeping', false, null)).toEqual({ pose: 'sleep', subject: { kind: 'prop', id: 'full_bag' } })
    expect(sceneFor('sleeping', true, null).pose).toBe('walk')
    expect(sceneFor('exploring', false, { kind: 'loot', outcome: { variant: 'loot', found: 'gold', jackpot: true } }).subject).toEqual({ kind: 'prop', id: 'gold' })
    expect(sceneFor('exploring', false, { kind: 'levelup', outcome: { variant: 'combat', monsterId: 'paper_imp', elite: false } }).subject).toEqual({ kind: 'prop', id: 'level_up' })
    expect(sceneFor('exploring', false, null)).toEqual({ pose: 'idle', subject: { kind: 'none' } })
  })

  it('has art for every monster in the catalog', () => {
    for (const monster of contentV1.monsters) expect(monster.id in monsterArt).toBe(true)
  })

  it('serves allowlisted day/night paths and preserves v3 night URLs', () => {
    const good = scenePath('server_room', 'fight', { kind: 'monster', id: 'cable_serpent', elite: true }, FULL_SCALE)
    expect(good).toBe(`/art/scene/v${SCENE_VERSION}/server_room/day/fight/elite-cable_serpent/${FULL_SCALE}.png`)
    expect(parseScenePath(good)).not.toBeNull()
    for (const bad of [
      good.replace(`v${SCENE_VERSION}`, 'v0'),
      good.replace('cable_serpent', 'dragon'),
      good.replace('server_room', 'moon_base'),
      good.replace(`/${FULL_SCALE}.png`, '/9.png'),
      good.replace('fight', '../etc'),
      good.replace('/day/', '/dusk/'),
      good.replace('/day/', '/'),
      good.replace(`v${SCENE_VERSION}`, 'v1'),
    ]) {
      expect(parseScenePath(bad)).toBeNull()
    }
    const night = scenePath('office_cubicles', 'idle', { kind: 'none' }, FULL_SCALE, 'night')
    expect(parseScenePath(night)?.time).toBe('night')
    const legacy = '/art/scene/v3/office_cubicles/idle/none/5.png'
    expect(parseScenePath(legacy)?.time).toBe('night')
    expect(renderScenePng(legacy)).toEqual(renderScenePng(night))
  })

  it('changes only the office window pixels between day and night', () => {
    const day = composeScene('office_cubicles', 'fight', { kind: 'monster', id: 'paper_imp', elite: false }, 'day')
    const night = composeScene('office_cubicles', 'fight', { kind: 'monster', id: 'paper_imp', elite: false }, 'night')
    expect(day.ink).not.toEqual(night.ink)
    for (let y = 0; y < STAGE_HEIGHT; y++) for (let x = 0; x < STAGE_WIDTH; x++) {
      if (x < 6 || x >= 38 || y < 4 || y >= 18) expect(day.ink[y * STAGE_WIDTH + x]).toBe(night.ink[y * STAGE_WIDTH + x])
    }
    for (const biome of ['server_room', 'cafeteria_depths'] as const) {
      expect(composeScene(biome, 'idle', { kind: 'none' }, 'day').ink).toEqual(composeScene(biome, 'idle', { kind: 'none' }, 'night').ink)
    }
  })

  it('renders valid 1-bit PNGs at every served scale', () => {
    for (const scale of [FULL_SCALE, SMALL_SCALE, LARGE_SCALE, MEDIUM_SCALE]) {
      const png = renderScenePng(scenePath('office_cubicles', 'idle', { kind: 'prop', id: 'chest' }, scale))!
      expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
      const view = new DataView(png.buffer, png.byteOffset)
      expect(view.getUint32(16)).toBe(STAGE_WIDTH * scale)
      expect(view.getUint32(20)).toBe(STAGE_HEIGHT * scale)
    }
  })

  /** The PNG's chunks by type, and its pixels as palette indices (2-bit) or ink (1-bit, 1 = black). */
  const decode = (png: Uint8Array) => {
    const view = new DataView(png.buffer, png.byteOffset)
    const chunks = new Map<string, Uint8Array>()
    for (let at = 8; at < png.length; ) {
      const length = view.getUint32(at)
      chunks.set(String.fromCharCode(...png.slice(at + 4, at + 8)), png.slice(at + 8, at + 8 + length))
      at += 12 + length
    }
    const [width, height, depth] = [view.getUint32(16), view.getUint32(20), png[24]!]
    const raw = inflateSync(chunks.get('IDAT')!)
    const rowBytes = Math.ceil((width * depth) / 8)
    const pixels = new Uint8Array(width * height)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const byte = raw[y * (rowBytes + 1) + 1 + Math.floor((x * depth) / 8)]!
      const value = (byte >> (8 - depth - ((x * depth) % 8))) & ((1 << depth) - 1)
      pixels[y * width + x] = depth === 1 ? 1 - value : value
    }
    return { chunks, depth, colourType: png[25], pixels }
  }

  it('renders four-ink twins of v4 scenes for the BWRY panel, keeping every 1-bit ink pixel (D94)', () => {
    const path = scenePath('server_room', 'fight', { kind: 'monster', id: 'cable_serpent', elite: true }, MEDIUM_SCALE)
    const bwryPath = path.replace('.png', '-bwry.png')
    expect(parseScenePath(bwryPath)).toMatchObject({ scale: MEDIUM_SCALE, bwry: true })
    expect(parseScenePath(path)?.bwry).toBe(false)
    expect(parseScenePath('/art/scene/v3/office_cubicles/idle/none/5-bwry.png')).toBeNull()
    expect(parseScenePath(path.replace('.png', '-bwr.png'))).toBeNull()
    const mono = decode(renderScenePng(path)!)
    const colour = decode(renderScenePng(bwryPath)!)
    expect([colour.depth, colour.colourType]).toEqual([2, 3])
    expect([...colour.chunks.get('PLTE')!]).toEqual(BWRY_PALETTE.flat())
    // Paper is the transparent entry, so the panel's own white shows around the art.
    expect([...colour.chunks.get('tRNS')!]).toEqual([255, 0, 255, 255])
    mono.pixels.forEach((ink, i) => expect(ink === 1).toBe(colour.pixels[i] === BwryInk.Black))
    // The hero's cardigan prints red, the serpent and its elite crown yellow.
    const count = (ink: number) => colour.pixels.filter((p) => p === ink).length
    expect(count(BwryInk.Red)).toBeGreaterThan(0)
    expect(count(BwryInk.Yellow)).toBeGreaterThan(0)
  })

  it('reduces companion fills to the panel inks: pale fills stay paper, warm golds and greens print yellow', () => {
    expect(bwryInk('#f2c39b')).toBe(BwryInk.White) // skin
    expect(bwryInk('#e9dfc0')).toBe(BwryInk.White) // paper imp
    expect(bwryInk('#9fd8e0')).toBe(BwryInk.White) // microwave wraith (blue)
    expect(bwryInk('#e0604f')).toBe(BwryInk.Red) // cardigan
    expect(bwryInk('#7a5cc8')).toBe(BwryInk.Red) // cloak
    expect(bwryInk('#f2c14e')).toBe(BwryInk.Yellow) // gold
    expect(bwryInk('#5fb35a')).toBe(BwryInk.Yellow) // cable serpent
  })
})

describe('local scene time', () => {
  it('uses local 07:00–19:00 boundaries, fractional offsets and midnight rollover', () => {
    const at = (hour: number, minute = 0) => Date.UTC(2026, 9, 5, hour, minute)
    expect(sceneTimeAt(at(6, 59), 0)).toBe('night')
    expect(sceneTimeAt(at(7), 0)).toBe('day')
    expect(sceneTimeAt(at(18, 59), 0)).toBe('day')
    expect(sceneTimeAt(at(19), 0)).toBe('night')
    expect(sceneTimeAt(at(5), 2 * 3600)).toBe('day')
    expect(sceneTimeAt(at(17), 2 * 3600)).toBe('night')
    expect(sceneTimeAt(at(1, 15), 5.75 * 3600)).toBe('day')
    expect(sceneTimeAt(at(1, 14), 5.75 * 3600)).toBe('night')
    expect(sceneTimeAt(at(10), -4.5 * 3600)).toBe('night')
    expect(sceneTimeAt(at(23), 2 * 3600)).toBe('night')
    expect(sceneTimeAt(at(1), -4 * 3600)).toBe('night')
  })

  it('reads UTC without a valid offset, turning with the recap (D106)', () => {
    const at = (hour: number, minute = 0) => Date.UTC(2026, 9, 5, hour, minute)
    for (const offset of [null, NaN, Infinity, 14 * 3600 + 1, 0.5]) {
      expect(sceneTimeAt(at(6, 59), offset)).toBe('night')
      expect(sceneTimeAt(at(7), offset)).toBe('day')
      expect(sceneTimeAt(at(19), offset)).toBe('night')
    }
    for (const hour of [0, 6, 7, 12, 18, 19, 23]) {
      const now = at(hour, 30)
      expect(sceneTimeAt(now, null)).toBe(recapPeriod(now, null).label === 'Night recap' ? 'day' : 'night')
    }
    expect(sceneTimeAt(NaN, null)).toBe('day')
  })

  it('selects all scales together without mutating the payload or legacy URLs', () => {
    const url = (scale: number) => `https://example.test${scenePath('office_cubicles', 'fight', { kind: 'monster', id: 'paper_imp', elite: true }, scale)}`
    const payload = Object.freeze({ scene_url: url(5), scene_url_small: url(2), scene_url_large: url(6), scene_url_medium: url(3), gold: 42 })
    const local = sceneUrlsAt(payload, Date.UTC(2026, 9, 5, 17), 7200)
    for (const key of ['scene_url', 'scene_url_small', 'scene_url_large', 'scene_url_medium'] as const) {
      expect(local[key]).toBe(payload[key].replace('/day/', '/night/'))
      expect(payload[key]).toContain('/day/')
    }
    expect(local.gold).toBe(42)
    const legacy = '/art/scene/v3/office_cubicles/idle/none/5.png'
    expect(sceneUrlAt(legacy, 'day')).toBe(legacy)
    expect(sceneUrlAt('', 'night')).toBe('')
  })
})

describe('companion QR codes', () => {
  it('encode only allowlisted targets and scan back to the companion URL', async () => {
    const { default: jsQR } = await import('jsqr')
    const { parseQrPath, qrInk, qrPath, renderQrPng, QR_SCALE, QR_SCALES } = await import('@trmnl-games/desk-crawler/art/qr')
    expect(parseQrPath(qrPath('bag', QR_SCALE))).toEqual({ target: 'bag', scale: QR_SCALE })
    for (const bad of ['/art/qr/v1/evil/3.png', '/art/qr/v1/app/9.png', '/art/qr/v0/app/3.png', '/art/qr/v1/app/3.png?x=1']) {
      expect(renderQrPng(bad, 'https://example.test')).toBeNull()
    }
    for (const scale of QR_SCALES) {
      const { size, ink } = qrInk('https://trmnlgames.com/app/desk-crawler/inventory', scale)
      const rgba = new Uint8ClampedArray(size * size * 4)
      for (let i = 0; i < ink.length; i += 1) rgba.fill(ink[i] ? 0 : 255, i * 4, i * 4 + 3), (rgba[i * 4 + 3] = 255)
      expect(jsQR(rgba, size, size)?.data).toBe('https://trmnlgames.com/app/desk-crawler/inventory')
    }
  })

  it('draws the home and corner codes from the short link, the corner one smaller and quiet only left and below (D108)', async () => {
    const { default: jsQR } = await import('jsqr')
    const { qrInk, renderQrPng } = await import('@trmnl-games/desk-crawler/art/qr')
    const { size: full } = qrInk('https://trmnlgames.com/app/desk-crawler', 2)
    const { size: home } = qrInk('https://trmnlgames.com/dc', 2)
    const { size, ink } = qrInk('https://trmnlgames.com/dc', 2, true)
    expect([full, home, size]).toEqual([66, 58, 54])
    // Dark modules touch the top and right edges; the left and bottom keep two modules (4 px) of quiet zone.
    const dark = (x: number, y: number) => ink[y * size + x] === 1
    expect(Array.from({ length: size }, (_, x) => dark(x, 0)).some(Boolean)).toBe(true)
    expect(Array.from({ length: size }, (_, y) => dark(size - 1, y)).some(Boolean)).toBe(true)
    for (let i = 0; i < size; i += 1) for (const edge of [0, 3]) expect(dark(edge, i) || dark(i, size - 1 - edge)).toBe(false)
    // On the screen the white margin closes the quiet zone: pad the top and right, and it scans.
    const pad = 10
    const w = size + pad
    const rgba = new Uint8ClampedArray(w * w * 4).fill(255)
    for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) if (dark(x, y)) rgba.fill(0, ((y + pad) * w + x) * 4, ((y + pad) * w + x) * 4 + 3)
    expect(jsQR(rgba, w, w)?.data).toBe('https://trmnlgames.com/dc')
    expect(renderQrPng('/art/qr/v3/corner/2.png', 'https://trmnlgames.com')).not.toBeNull()
    expect(renderQrPng('/art/qr/v3/home/3.png', 'https://trmnlgames.com')).not.toBeNull()
  })
})

describe('hero social card (D109)', () => {
  it('draws every character a public name or hero name may use', async () => {
    const { glyphFor } = await import('@trmnl-games/desk-crawler/art/font')
    const fallback = glyphFor('?')
    for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ._'-#·:/,") expect(glyphFor(ch) === fallback && ch !== '?').toBe(false)
    expect(glyphFor('€')).toBe(fallback)
  })
})
