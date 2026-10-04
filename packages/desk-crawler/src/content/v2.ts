import type { ContentCatalog, MonsterTemplate } from '../sim/core/types'
import { contentV1 } from './v1'

/*
 * Content catalog v2: harness-tuned from v1 toward D24 pacing and D30 late game
 * (docs/evidence/balance.md). Same IDs, names and narrative; changed numbers only.
 */

const tuned: Record<string, Pick<MonsterTemplate, 'xp' | 'gold'>> = {
  paper_imp: { xp: { min: 5, max: 6 }, gold: { min: 1, max: 2 } },
  rogue_roomba: { xp: { min: 5, max: 7 }, gold: { min: 1, max: 2 } },
  stapler_mimic: { xp: { min: 6, max: 7 }, gold: { min: 2, max: 3 } },
  dust_daemon: { xp: { min: 6, max: 8 }, gold: { min: 2, max: 3 } },
  cable_serpent: { xp: { min: 12, max: 15 }, gold: { min: 4, max: 5 } },
  overheated_rack: { xp: { min: 13, max: 16 }, gold: { min: 4, max: 6 } },
  firewall_gremlin: { xp: { min: 14, max: 17 }, gold: { min: 5, max: 6 } },
  legacy_mainframe: { xp: { min: 15, max: 18 }, gold: { min: 5, max: 6 } },
  coffee_slime: { xp: { min: 35, max: 41 }, gold: { min: 7, max: 8 } },
  crumb_golem: { xp: { min: 38, max: 45 }, gold: { min: 7, max: 9 } },
  microwave_wraith: { xp: { min: 40, max: 47 }, gold: { min: 8, max: 10 } },
  leftovers_hydra: { xp: { min: 43, max: 50 }, gold: { min: 8, max: 10 } },
}

const lootGold: Record<string, { min: number; max: number }> = {
  office_cubicles: { min: 1, max: 3 },
  server_room: { min: 4, max: 6 },
  cafeteria_depths: { min: 7, max: 10 },
}

export const contentV2: ContentCatalog = {
  ...contentV1,
  contentVersion: 'v2',
  monsters: contentV1.monsters.map((m) => ({ ...m, ...tuned[m.id]! })),
  biomes: contentV1.biomes.map((b) => ({ ...b, lootGold: lootGold[b.id]! })),
  rarities: [
    { rarity: 'common', weight: 70, statBonus: 0, saleMultiplier: 1 },
    { rarity: 'uncommon', weight: 28, statBonus: 2, saleMultiplier: 2 },
    { rarity: 'rare', weight: 2, statBonus: 4, saleMultiplier: 4 },
  ],
}
