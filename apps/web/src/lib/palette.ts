/** Game colours by meaning. Every coloured mark also carries a glyph or label, never colour alone. */

/** Log and status glyph colours, keyed by log kind. */
export const KIND_TONE: Record<string, string> = {
  combat: 'text-hp-ink',
  death: 'text-hp-ink',
  loot: 'text-gold-ink',
  levelup: 'text-gold-ink',
  rest: 'text-xp-ink',
  revive: 'text-xp-ink',
  travel: 'text-sky-ink',
  trap: 'text-rare-ink',
  system: 'text-muted',
}

/** Each biome's swatch: Office Cubicles in sticky-note gold, Server Room in status-LED blue, Cafeteria Depths in ketchup red. */
export const BIOME_SWATCH: Record<string, string> = {
  office_cubicles: 'bg-gold',
  server_room: 'bg-sky',
  cafeteria_depths: 'bg-hp',
}

/** Item rarity: name colour plus a gem whose facets grow with rarity. */
export const RARITY_TONE: Record<string, string> = {
  common: 'text-ink',
  uncommon: 'text-xp-ink',
  rare: 'text-rare-ink',
}
