/**
 * 1-bit marks for the Slow Cast screen (template v2): the counters (cooler, bait, gold, logbook, XP ticks), the
 * conditions (time of day and weather), and one glyph per story kind, in the same 8x8 grid style as Desk Crawler's HUD
 * marks. Each row is a string of cells; '#' is ink.
 */
export const SC_MARKS = {
  /** A cool box: lid, handle and a latch. */
  cooler: ['..####..', '..#..#..', '########', '#......#', '########', '#..##..#', '#......#', '########'],
  /** Bait: a hook, eye at the top and the barb turned up. */
  hook: ['...##...', '..#..#..', '...##...', '....#...', '#...#...', '##..#...', '.#..#...', '..##....'],
  /** A stacked coin, as in Desk Crawler. */
  coin: ['..####..', '.#....#.', '#..##..#', '#.#..#.#', '#.#..#.#', '#..##..#', '.#....#.', '..####..'],
  /** The logbook: an open book. */
  book: ['.##..##.', '#..##..#', '#..##..#', '#..##..#', '#..##..#', '#..##..#', '#.####.#', '###..###'],
  /** The water: a map pin. */
  pin: ['..####..', '.#....#.', '#..##..#', '#..##..#', '.#....#.', '..#..#..', '..#..#..', '...##...'],
  /** The board: a trophy cup. */
  trophy: ['########', '#.####.#', '#.####.#', '.######.', '..####..', '...##...', '..####..', '.######.'],
  /** Experience and level-ups: a five-point star. */
  star: ['...##...', '...##...', '########', '.######.', '..####..', '.######.', '.##..##.', '##....##'],

  /** Day: a sun with rays. */
  day: ['#..##..#', '.#....#.', '..####..', '#.####.#', '#.####.#', '..####..', '.#....#.', '#..##..#'],
  /** Dawn and dusk: half a sun on the horizon. */
  dawn: ['...##...', '#......#', '.#.##.#.', '..####..', '.######.', '########', '........', '########'],
  dusk: ['........', '.#.##.#.', '..####..', '.######.', '########', '........', '########', '........'],
  /** Night: a crescent moon and a star. */
  night: ['..###..#', '.##.....', '##......', '##....#.', '##......', '##......', '.##...#.', '..####..'],
  /** Weather. */
  clear: ['...##...', '.#....#.', '..####..', '#.####.#', '#.####.#', '..####..', '.#....#.', '...##...'],
  overcast: ['........', '...##...', '.##..##.', '#......#', '#......#', '.######.', '........', '........'],
  rain: ['...##...', '.##..##.', '#......#', '.######.', '........', '.#..#..#', '#..#..#.', '........'],
  wind: ['.....##.', '......#.', '######..', '........', '#######.', '.......#', '......#.', '........'],
  fog: ['........', '######..', '........', '..######', '........', '######..', '........', '..######'],

  /** Story kinds. A fish kept: a solid fish. */
  catch: ['........', '....###.', '#..#####', '##.###.#', '########', '#..#####', '....###.', '........'],
  /** A fish released: the fish outlined over a ripple. */
  release: ['...####.', '#.#....#', '###..#.#', '#.#....#', '...####.', '........', '.##..##.', '#..##..#'],
  /** The one that got away: a tail flicking out of the water. */
  got_away: ['##....##', '###..###', '.######.', '..####..', '...##...', '...##...', '.#.##.#.', '#......#'],
  /** Wildlife and the bank: a bird in flight. */
  ambient: ['........', '##....##', '#.#..#.#', '...##...', '...##...', '........', '........', '........'],
  /** Moving water: a boot print path, as a signpost. */
  travel: ['...#....', '.#####..', '.######.', '.#####..', '...#....', '...#....', '...#....', '..###...'],
  /** Out of bait: the bare hook with a cross. */
  bait_out: ['#....#..', '.#..#...', '..##....', '..##....', '.#..#...', '#....#..', '........', '........'],
  /** Achievements: the trophy. */
  achievement: ['########', '#.####.#', '#.####.#', '.######.', '..####..', '...##...', '..####..', '.######.'],
  /** System and service lines: a dot. */
  system: ['........', '........', '...##...', '..####..', '..####..', '...##...', '........', '........'],

  /** XP ticks the width of Desk Crawler's: empty, half and full. */
  tickEmpty: ['#########', '#.......#', '#.......#', '#########'],
  tickHalf: ['#########', '#####...#', '#####...#', '#########'],
  tickFull: ['#########', '#########', '#########', '#########'],
} as const
export type ScMark = keyof typeof SC_MARKS

/** The story kinds with their own glyph; any other kind takes `system`. */
export const STORY_GLYPHS = ['catch', 'release', 'got_away', 'ambient', 'travel', 'bait_out', 'achievement', 'system'] as const satisfies readonly ScMark[]

const markPath = (rows: readonly string[]) =>
  rows.flatMap((row, y) => [...row.matchAll(/#+/g)].map((run) => `M${run.index} ${y}h${run[0].length}v1h-${run[0].length}z`)).join('')

/** A crisp-edged SVG of one mark at the given size, as a URL-encoded data URI; `fill` inks it (BWRY red). */
export function markUri(mark: ScMark, width: number, height = width, fill?: string): string {
  const rows = SC_MARKS[mark]
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${rows[0].length} ${rows.length}' shape-rendering='crispEdges'><path${fill ? ` fill='${fill}'` : ''} d='${markPath(rows)}'/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
