/**
 * 1-bit HUD marks for the device screen: the companion's half-heart health
 * (D60), the XP ticks that match it, and the attack, defense, coin and potion
 * counters, the bag and the recap's XP star, drawn in the same grid style as the log glyphs. Each row is a
 * string of cells; '#' is ink. Hearts and XP ticks are 9 wide so the two halves
 * meet on a centre column; the counters are 8x8.
 */
export const HUD_MARKS = {
  /** Outline only: this half-heart pair is spent. */
  heartEmpty: ['.###.###.', '#...#...#', '#...#...#', '#...#...#', '.#.....#.', '..#...#..', '...#.#...', '....#....'],
  /** Left half filled. */
  heartHalf: ['.###.###.', '####....#', '####....#', '####....#', '.###...#.', '..##..#..', '...#.#...', '....#....'],
  /** Both halves filled. */
  heartFull: ['.###.###.', '#########', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....'],
  /** A stacked coin: a rim with a lit edge. */
  coin: ['..####..', '.#....#.', '#..##..#', '#.#..#.#', '#.#..#.#', '#..##..#', '.#....#.', '..####..'],
  /** A stoppered flask, half full. */
  potion: ['...##...', '...##...', '..####..', '.#....#.', '#......#', '#.####.#', '#.####.#', '.######.'],
  /** Attack: an upright blade with its guard and pommel, like the title icon. */
  sword: ['...##...', '...##...', '...##...', '...##...', '.######.', '...##...', '...##...', '..####..'],
  /** Defense: a heater shield with a boss. */
  shield: ['########', '#......#', '#..##..#', '#..##..#', '#......#', '.#....#.', '..#..#..', '...##...'],
  /** Bag slots: a satchel with its flap and buckle. */
  bag: ['..####..', '.#....#.', '########', '#......#', '#.####.#', '#......#', '#......#', '########'],
  /** Experience, for the recap's XP: a five-point star. */
  star: ['...##...', '...##...', '########', '.######.', '..####..', '.######.', '.##..##.', '##....##'],
  /** XP tick, both halves unearned: an outlined box the width of a heart. */
  tickEmpty: ['#########', '#.......#', '#.......#', '#########'],
  /** Left half earned. */
  tickHalf: ['#########', '#####...#', '#####...#', '#########'],
  /** Both halves earned. */
  tickFull: ['#########', '#########', '#########', '#########'],
} as const
export type HudMark = keyof typeof HUD_MARKS

/** Horizontal ink runs of one mark as a single SVG path, the same compact form the log glyphs use. */
const markPath = (rows: readonly string[]) =>
  rows.flatMap((row, y) => [...row.matchAll(/#+/g)].map((run) => `M${run.index} ${y}h${run[0].length}v1h-${run[0].length}z`)).join('')

/** A crisp-edged SVG of one mark at the given pixel size, as a URL-encoded data URI; `fill` inks it (red hearts, D94). */
export function hudMarkUri(mark: HudMark, width: number, height: number, fill?: string): string {
  const rows = HUD_MARKS[mark]
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${rows[0].length} ${rows.length}' shape-rendering='crispEdges'><path${fill ? ` fill='${fill}'` : ''} d='${markPath(rows)}'/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
