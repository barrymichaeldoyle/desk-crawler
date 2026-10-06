import { describe, expect, it } from 'vitest'
import { catalogs } from '@trmnl-games/desk-crawler/content'
import { validateCatalog } from '@trmnl-games/desk-crawler/content/validate'
import { starterKit } from '@trmnl-games/desk-crawler/sim/core/starter'

describe('gear catalog', () => {
  it('gives every same-tier item in a slot its own stat', () => {
    for (const content of Object.values(catalogs)) {
      for (const tier of Object.keys(content.gearTiers).map(Number)) {
        for (const kind of ['weapon', 'armor'] as const) {
          const offsets = content.gearTemplates.filter((t) => t.tier === tier && t.kind === kind).map((t) => t.statOffset ?? 0)
          expect(new Set(offsets).size, `tier ${tier} ${kind}`).toBe(offsets.length)
        }
      }
      expect(validateCatalog(content)).toEqual([])
    }
  })

  it('keeps the starter gear at the tier stat, so first-day pacing is unchanged', () => {
    for (const content of Object.values(catalogs)) {
      const { weapon, armor } = starterKit(content)
      expect(weapon.attack).toBe(content.gearTiers[1]!.weaponAttack)
      expect(armor.defense).toBe(content.gearTiers[1]!.armorDefense)
    }
  })
})
