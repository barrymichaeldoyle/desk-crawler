/**
 * 1-bit 8x8 glyphs for log kinds, drawn in the same grid as the device art.
 * Each row is eight cells; '#' is ink. Shared by the companion log and the device screen.
 */
export const GLYPHS: Record<string, readonly string[]> = {
  combat: ['......##', '.....###', '....###.', '#..###..', '.####...', '..##....', '.#.##...', '#...#...'],
  loot: ['........', '.######.', '#......#', '########', '#..##..#', '#......#', '########', '........'],
  trap: ['........', '#.#.#.#.', '#.#.#.#.', '########', '#......#', '########', '........', '........'],
  rest: ['....###.', '......#.', '.....#..', '....###.', '###.....', '..#.....', '.#......', '###.....'],
  travel: ['........', '....#...', '....##..', '#######.', '#######.', '....##..', '....#...', '........'],
  death: ['.######.', '########', '#..##..#', '#..##..#', '########', '.##..##.', '.######.', '.#.##.#.'],
  revive: ['...##...', '...##...', '.######.', '.######.', '...##...', '...##...', '...##...', '...##...'],
  levelup: ['...##...', '..####..', '.######.', '########', '...##...', '...##...', '...##...', '...##...'],
  achievement: ['...##...', '..####..', '.#.##.#.', '########', '.######.', '..####..', '.##..##.', '.#....#.'],
  choice: ['..####..', '.#....#.', '......#.', '.....#..', '....#...', '....#...', '........', '....#...'],
  merchant: ['........', '.######.', '#.#..#.#', '########', '.#....#.', '.######.', '..#..#..', '.##..##.'],
  system: ['..####..', '.#....#.', '#..##..#', '#.#..#.#', '#.#..#.#', '#..##..#', '.#....#.', '..####..'],
}

export const glyphRows = (kind: string): readonly string[] => GLYPHS[kind] ?? GLYPHS.system!

/** A standalone crisp-edged SVG for one glyph at `size` px. */
export function glyphSvg(kind: string, size: number): string {
  const rects = glyphRows(kind)
    .flatMap((row, y) => [...row].map((cell, x) => (cell === '#' ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : '')))
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 8 8" shape-rendering="crispEdges" fill="black">${rects}</svg>`
}
