import { describe, expect, it } from 'vitest'
import { heroPoses } from '@trmnl-games/desk-crawler/art/hero'
import { monsterArt } from '@trmnl-games/desk-crawler/art/monsters'
import { scenePlacements } from '@trmnl-games/desk-crawler/art/scene'
import { sceneColours, sceneColourUri } from '@trmnl-games/desk-crawler/art/sceneColour'
import { scenePath } from '@trmnl-games/desk-crawler/art/sceneKey'

describe('companion scene colours (D87)', () => {
  it('fills what an outline encloses and leaves the outside and the gaps between legs clear', () => {
    const placements = scenePlacements('idle', { kind: 'monster', id: 'cable_serpent', elite: false })
    const grid = sceneColours('idle', placements)
    const hero = placements.find((p) => p.role === 'hero')!
    const monster = placements.find((p) => p.role === 'monster')!
    // A face cell is skin, the blade steel, the cardigan red.
    expect(grid[hero.top + 4]![hero.left + 9]).toBe('#f2c39b')
    expect(grid[hero.top + 6]![hero.left + 26]).toBe('#c9d3e0')
    expect(grid[hero.top + 10]![hero.left + 8]).toBe('#e0604f')
    // Between the legs and beside the sprite is backdrop.
    expect(grid[hero.top + 20]![hero.left + 12]).toBeNull()
    expect(grid[hero.top]![hero.left]).toBeNull()
    const filled = grid.slice(monster.top, monster.top + monster.sprite.height).flatMap((row) => row.slice(monster.left, monster.left + monster.sprite.width)).filter((c) => c === '#5fb35a')
    expect(filled.length).toBeGreaterThan(30)
  })

  it('covers every pose and monster and rejects unknown paths', () => {
    for (const pose of Object.keys(heroPoses) as Array<keyof typeof heroPoses>)
      for (const id of Object.keys(monsterArt) as Array<keyof typeof monsterArt>)
        expect(sceneColourUri(scenePath('server_room', pose, { kind: 'monster', id, elite: true }, 5))).toMatch(/^data:image\/svg\+xml,/)
    expect(sceneColourUri(`https://art.test${scenePath('office_cubicles', 'walk', { kind: 'prop', id: 'signpost' }, 5)}?t=1`)).not.toBeNull()
    expect(sceneColourUri('/art/scene/v4/nowhere/day/idle/none/5.png')).toBeNull()
  })
})
