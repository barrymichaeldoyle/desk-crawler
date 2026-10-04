import { describe, expect, it } from 'vitest'
import { parseScenePath, renderScenePng } from '@trmnl-games/desk-crawler/art/route'
import { FULL_SCALE, LARGE_SCALE, MEDIUM_SCALE, SCENE_VERSION, SMALL_SCALE, STAGE_HEIGHT, STAGE_WIDTH } from '@trmnl-games/desk-crawler/art/scene'
import { sceneFor, scenePath } from '@trmnl-games/desk-crawler/art/sceneKey'
import { monsterArt } from '@trmnl-games/desk-crawler/art/monsters'
import { contentV2 } from '@trmnl-games/desk-crawler/content/v2'

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
    for (const monster of contentV2.monsters) expect(monster.id in monsterArt).toBe(true)
  })

  it('only serves allowlisted, current-version paths', () => {
    const good = scenePath('server_room', 'fight', { kind: 'monster', id: 'cable_serpent', elite: true }, FULL_SCALE)
    expect(good).toBe(`/art/scene/v${SCENE_VERSION}/server_room/fight/elite-cable_serpent/${FULL_SCALE}.png`)
    expect(parseScenePath(good)).not.toBeNull()
    for (const bad of [
      good.replace(`v${SCENE_VERSION}`, 'v0'),
      good.replace('cable_serpent', 'dragon'),
      good.replace('server_room', 'moon_base'),
      good.replace(`/${FULL_SCALE}.png`, '/9.png'),
      good.replace('fight', '../etc'),
    ]) {
      expect(parseScenePath(bad)).toBeNull()
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

describe('companion QR codes', () => {
  it('encode only allowlisted targets and scan back to the companion URL', async () => {
    const { default: jsQR } = await import('jsqr')
    const { parseQrPath, qrInk, qrPath, renderQrPng, QR_SCALE, QR_LARGE_SCALE } = await import('@trmnl-games/desk-crawler/art/qr')
    expect(parseQrPath(qrPath('bag', QR_SCALE))).toEqual({ target: 'bag', scale: QR_SCALE })
    for (const bad of ['/art/qr/v1/evil/3.png', '/art/qr/v1/app/9.png', '/art/qr/v0/app/3.png', '/art/qr/v1/app/3.png?x=1']) {
      expect(renderQrPng(bad, 'https://example.test')).toBeNull()
    }
    for (const scale of [QR_SCALE, QR_LARGE_SCALE]) {
      const { size, ink } = qrInk('https://trmnlgames.com/app/desk-crawler/inventory', scale)
      const rgba = new Uint8ClampedArray(size * size * 4)
      for (let i = 0; i < ink.length; i += 1) rgba.fill(ink[i] ? 0 : 255, i * 4, i * 4 + 3), (rgba[i * 4 + 3] = 255)
      expect(jsQR(rgba, size, size)?.data).toBe('https://trmnlgames.com/app/desk-crawler/inventory')
    }
  })
})
