import { describe, expect, it } from 'vitest'
import { parseScenePath, renderScenePng } from '../../convex/art/route'
import { FULL_SCALE, SCENE_VERSION, SMALL_SCALE, STAGE_HEIGHT, STAGE_WIDTH } from '../../convex/art/scene'
import { sceneFor, scenePath } from '../../convex/art/sceneKey'
import { monsterArt } from '../../convex/art/monsters'
import { contentV2 } from '../../convex/content/v2'

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

  it('renders valid 1-bit PNGs at both scales', () => {
    for (const scale of [FULL_SCALE, SMALL_SCALE]) {
      const png = renderScenePng(scenePath('office_cubicles', 'idle', { kind: 'prop', id: 'chest' }, scale))!
      expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
      const view = new DataView(png.buffer, png.byteOffset)
      expect(view.getUint32(16)).toBe(STAGE_WIDTH * scale)
      expect(view.getUint32(20)).toBe(STAGE_HEIGHT * scale)
    }
  })
})
