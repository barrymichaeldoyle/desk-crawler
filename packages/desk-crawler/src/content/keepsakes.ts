/** Cosmetic desk souvenirs. Order is permanent: append new entries, never reorder earned ones. */
export const DESK_KEEPSAKES = [
  { id: 'stapler', name: 'Heroic Stapler', description: 'Held the department together. Literally.', pixels: ['........', '.#####..', '.#...##.', '..#####.', '......#.', '.######.', '.######.', '........'] },
  { id: 'mug', name: 'Survivor’s Mug', description: 'The coffee went cold. The adventure did not.', pixels: ['........', '.#####..', '.#...###', '.#...#.#', '.#...###', '.#...#..', '..###...', '........'] },
  { id: 'disk', name: 'Ancient Save Disk', description: 'Contains one spreadsheet and a prophecy.', pixels: ['.######.', '.#..#.#.', '.#..#.#.', '.######.', '.#....#.', '.#.##.#.', '.######.', '........'] },
  { id: 'plant', name: 'Unkillable Fern', description: 'Thrives on fluorescent light and office gossip.', pixels: ['...#....', '.#.#.#..', '..###...', '.#.##.#.', '..###...', '..###...', '..#.#...', '...#....'] },
  { id: 'key', name: 'Mystery Cabinet Key', description: 'Nobody remembers which cabinet. Everybody wants it.', pixels: ['..###...', '.#...#..', '.#.#.#..', '..###...', '...#....', '...###..', '...#....', '...##...'] },
  { id: 'duck', name: 'Debugging Duck', description: 'Listened carefully. Said absolutely nothing.', pixels: ['....##..', '...####.', '...#.###', '.#####..', '#######.', '#######.', '.#####..', '........'] },
  { id: 'clock', name: 'Five O’Clock Clock', description: 'Every meeting ends eventually.', pixels: ['..####..', '.#....#.', '#..#...#', '#..#...#', '#..###.#', '#......#', '.#....#.', '..####..'] },
  { id: 'badge', name: 'Very Important Badge', description: 'Access granted to the biscuit cupboard.', pixels: ['..#..#..', '..#..#..', '..####..', '.######.', '.#....#.', '.#.##.#.', '.#....#.', '.######.'] },
  { id: 'lamp', name: 'Late Shift Lamp', description: 'A little light for a very long quest.', pixels: ['..####..', '.######.', '########', '...#....', '...#....', '...#....', '..####..', '.######.'] },
  { id: 'tape', name: 'Legendary Sticky Tape', description: 'A temporary fix that became permanent.', pixels: ['..####..', '.######.', '###..###', '###..###', '.######.', '..#####.', '......#.', '.....##.'] },
  { id: 'pager', name: 'On-Call Relic', description: 'Still waiting for somebody to call back.', pixels: ['........', '.######.', '.#....#.', '.#.##.#.', '.#....#.', '.######.', '..#..#..', '........'] },
  { id: 'trophy', name: 'Employee of the Quest', description: 'For outstanding service to the adventure.', pixels: ['.######.', '##....##', '#.#..#.#', '.######.', '..####..', '...##...', '..####..', '.######.'] },
] as const

export const KEEPSAKE_WEEK_MS = 7 * 24 * 60 * 60 * 1000
/** Monday 00:00 UTC; the client never chooses the award period. */
const MONDAY_EPOCH = Date.UTC(1970, 0, 5)
export const keepsakeWeek = (now: number) => Math.floor((now - MONDAY_EPOCH) / KEEPSAKE_WEEK_MS)
export const keepsakeWeekStartsAt = (week: number) => MONDAY_EPOCH + week * KEEPSAKE_WEEK_MS

/** A fixed-size shelf derived from one lifetime count: no growing document or history scan. */
export const keepsakeShelf = (totalCollected: number) => DESK_KEEPSAKES.map((item, index) => ({
  ...item,
  count: Math.max(0, Math.floor((totalCollected + DESK_KEEPSAKES.length - 1 - index) / DESK_KEEPSAKES.length)),
}))
