/** Game colours by meaning. Every coloured mark also carries a glyph or label, never colour alone. */

/** Log and status glyph colours, keyed by log kind. */
export const KIND_TONE: Record<string, string> = {
  combat: 'text-hp-ink',
  death: 'text-hp-ink',
  loot: 'text-gold-ink',
  levelup: 'text-gold-ink',
  achievement: 'text-gold-ink',
  rest: 'text-xp-ink',
  revive: 'text-xp-ink',
  travel: 'text-sky-ink',
  trap: 'text-rare-ink',
  merchant: 'text-gold-ink',
  choice: 'text-sky-ink',
  system: 'text-muted',
}

/** Each biome's world-map tile: Office Cubicles in carpet tan, Server Room in status-LED blue, Cafeteria Depths in ketchup coral. */
export const BIOME_SWATCH: Record<string, string> = {
  office_cubicles: 'bg-[#f3d394] text-night',
  server_room: 'bg-sky text-night',
  cafeteria_depths: 'bg-[#f08a6b] text-night',
}

/** Item rarity: name colour plus a gem whose facets grow with rarity. */
export const RARITY_TONE: Record<string, string> = {
  common: 'text-ink',
  uncommon: 'text-xp-ink',
  rare: 'text-rare-ink',
  epic: 'text-gold-ink',
}

/** Log badge fills: the glyph sits in night ink on its game colour. */
export const KIND_BADGE: Record<string, string> = {
  combat: 'bg-hp-ink',
  death: 'bg-hp-ink',
  loot: 'bg-gold',
  levelup: 'bg-gold',
  achievement: 'bg-gold',
  rest: 'bg-xp',
  revive: 'bg-xp',
  travel: 'bg-sky-ink',
  trap: 'bg-rare-ink',
  system: 'bg-muted',
}

/**
 * Each biome's game-screen bands (ceiling, upper wall, wall, floor). The 1-bit
 * scene multiplies over them, so its ink stays crisp and its paper takes the colour.
 */
export const BIOME_BANDS: Record<string, readonly [string, string, string, string]> = {
  office_cubicles: ['#e7b96f', '#f3d394', '#fbe9c2', '#c98f5a'],
  server_room: ['#5d8fd6', '#78a9e4', '#9fd0f0', '#ffd166'],
  cafeteria_depths: ['#f08a6b', '#f9b394', '#ffd9c2', '#d9534f'],
}
