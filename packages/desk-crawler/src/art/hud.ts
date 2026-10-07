/**
 * 1-bit HUD marks for the device screen: the companion's half-heart health
 * (D60) and the coin and potion counters, drawn in the same grid style as the
 * log glyphs. Each row is a string of cells; '#' is ink. Hearts are 9x8 so the
 * two halves meet on a centre column; the counters are 8x8.
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
} as const
export type HudMark = keyof typeof HUD_MARKS

/** Horizontal ink runs of one mark as a single SVG path, the same compact form the log glyphs use. */
const markPath = (rows: readonly string[]) =>
  rows.flatMap((row, y) => [...row.matchAll(/#+/g)].map((run) => `M${run.index} ${y}h${run[0].length}v1h-${run[0].length}z`)).join('')

/** A crisp-edged SVG of one mark at the given pixel size, as a URL-encoded data URI. */
export function hudMarkUri(mark: HudMark, width: number, height: number): string {
  const rows = HUD_MARKS[mark]
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${rows[0].length} ${rows.length}' shape-rendering='crispEdges'><path d='${markPath(rows)}'/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
