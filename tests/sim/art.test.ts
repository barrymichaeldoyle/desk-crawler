import { describe, expect, it } from 'vitest'
import { parseScenePath, renderScenePng } from '@trmnl-games/desk-crawler/art/route'
import { composeScene, FULL_SCALE, LARGE_SCALE, MEDIUM_SCALE, SCENE_VERSION, SMALL_SCALE, STAGE_HEIGHT, STAGE_WIDTH } from '@trmnl-games/desk-crawler/art/scene'
import { sceneFor, scenePath } from '@trmnl-games/desk-crawler/art/sceneKey'
import { sceneTimeAt, sceneUrlAt, sceneUrlsAt } from '@trmnl-games/desk-crawler/art/sceneTime'
import { monsterArt } from '@trmnl-games/desk-crawler/art/monsters'
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
})

describe('local scene time', () => {
  it('uses local 06:00–18:00 boundaries, fractional offsets and midnight rollover', () => {
    const at = (hour: number, minute = 0) => Date.UTC(2026, 9, 5, hour, minute)
    expect(sceneTimeAt(at(5, 59), 0)).toBe('night')
    expect(sceneTimeAt(at(6), 0)).toBe('day')
    expect(sceneTimeAt(at(17, 59), 0)).toBe('day')
    expect(sceneTimeAt(at(18), 0)).toBe('night')
    expect(sceneTimeAt(at(4), 2 * 3600)).toBe('day')
    expect(sceneTimeAt(at(16), 2 * 3600)).toBe('night')
    expect(sceneTimeAt(at(0, 15), 5.75 * 3600)).toBe('day')
    expect(sceneTimeAt(at(10), -4.5 * 3600)).toBe('night')
    expect(sceneTimeAt(at(23), 2 * 3600)).toBe('night')
    expect(sceneTimeAt(at(1), -4 * 3600)).toBe('night')
    for (const offset of [null, NaN, Infinity, 14 * 3600 + 1, 0.5]) expect(sceneTimeAt(at(23), offset)).toBe('day')
  })

  it('selects all scales together without mutating the payload or legacy URLs', () => {
    const url = (scale: number) => `https://example.test${scenePath('office_cubicles', 'fight', { kind: 'monster', id: 'paper_imp', elite: true }, scale)}`
    const payload = Object.freeze({ scene_url: url(5), scene_url_small: url(2), scene_url_large: url(6), scene_url_medium: url(3), gold: 42 })
    const local = sceneUrlsAt(payload, Date.UTC(2026, 9, 5, 16), 7200)
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
})
