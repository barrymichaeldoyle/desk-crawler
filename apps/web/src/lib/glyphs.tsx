import { GLYPHS } from '@trmnl-games/desk-crawler/art/glyphs'
import type { ReactNode } from 'react'

/**
 * 8x8 pixel glyphs that only the companion draws: navigation, section titles, records, buttons and filters. The log-kind
 * glyphs stay in the shared package because the device screen draws them too; these never reach a TRMNL template.
 * Each row is eight cells; '#' is ink.
 */
const UI_GLYPHS = {
  hero: ['..####..', '.######.', '.#.##.#.', '.######.', '..####..', '........', '.######.', '########'],
  bag: ['..####..', '..#..#..', '.######.', '#......#', '#.####.#', '#.#..#.#', '#.####.#', '########'],
  trophy: ['########', '#.####.#', '#.####.#', '.######.', '..####..', '...##...', '..####..', '.######.'],
  cog: ['...##...', '.######.', '.##..##.', '###..###', '###..###', '.##..##.', '.######.', '...##...'],
  coin: ['..####..', '.######.', '###.####', '###.####', '###.####', '###.####', '.######.', '..####..'],
  potion: ['...##...', '...##...', '..####..', '.#....#.', '#......#', '########', '########', '.######.'],
  clock: ['.######.', '#......#', '#..#...#', '#..#...#', '#..###.#', '#......#', '#......#', '.######.'],
  flag: ['.#######', '.#.....#', '.#.....#', '.#######', '.#......', '.#......', '.#......', '###.....'],
  star: ['...##...', '...##...', '########', '.######.', '..####..', '.##..##.', '.#....#.', '........'],
  tag: ['....####', '...#...#', '..#..#.#', '.#.....#', '#.....#.', '.#...#..', '..#.#...', '...#....'],
  pin: ['..####..', '.##..##.', '.#....#.', '.##..##.', '..####..', '...##...', '...##...', '...##...'],
  quest: ['.######.', '.#....##', '.#.##..#', '.#.....#', '.#.###.#', '.#.....#', '.#.###.#', '.#######'],
  shield: ['########', '#..##..#', '#..##..#', '########', '#..##..#', '.#.##.#.', '..####..', '...##...'],
  medal: ['##....##', '.##..##.', '..####..', '.######.', '##....##', '##....##', '.######.', '..####..'],
  crown: ['........', '#..##..#', '##.##.##', '########', '########', '#.#..#.#', '########', '........'],
  pause: ['........', '.##..##.', '.##..##.', '.##..##.', '.##..##.', '.##..##.', '.##..##.', '........'],
  play: ['.#......', '.##.....', '.###....', '.####...', '.####...', '.###....', '.##.....', '.#......'],
  door: ['.######.', '.#....#.', '.#....#.', '.#....#.', '.#...##.', '.#....#.', '.#....#.', '########'],
  up: ['...##...', '..####..', '.######.', '########', '...##...', '...##...', '...##...', '...##...'],
  down: ['...##...', '...##...', '...##...', '...##...', '########', '.######.', '..####..', '...##...'],
  screen: ['########', '#......#', '#.####.#', '#.####.#', '#......#', '########', '...##...', '.######.'],
  plug: ['..#..#..', '..#..#..', '.######.', '.######.', '..####..', '...##...', '...##...', '...##...'],
  eye: ['........', '..####..', '.#....#.', '#..##..#', '#..##..#', '.#....#.', '..####..', '........'],
  share: ['.....##.', '....####', '.....##.', '.##.#...', '####....', '.##.#...', '.....##.', '....####'],
  sword: GLYPHS.combat!,
  shirt: ['.##..##.', '########', '########', '.######.', '..####..', '..####..', '..####..', '..####..'],
  keepsake: ['..####..', '.#....#.', '#..##..#', '#.####.#', '#.####.#', '#..##..#', '.#....#.', '..####..'],
} as const satisfies Record<string, readonly string[]>

export type GlyphName = keyof typeof UI_GLYPHS | keyof typeof GLYPHS

const rowsOf = (name: string): readonly string[] => (UI_GLYPHS as Record<string, readonly string[]>)[name] ?? GLYPHS[name] ?? GLYPHS.system!

/** One glyph as a crisp inline SVG in the current colour, 16px unless `size` says otherwise. Decorative: the text beside it names the thing. */
export function Glyph({ name, size = 16, className = '' }: { name: GlyphName; size?: number; className?: string }) {
  const path = rowsOf(name).flatMap((row, y) => [...row.matchAll(/#+/g)].map((run) => `M${run.index} ${y}h${run[0].length}v1h-${run[0].length}z`)).join('')
  return (
    <svg viewBox="0 0 8 8" width={size} height={size} aria-hidden="true" shapeRendering="crispEdges" className={`shrink-0 fill-current ${className}`}>
      <path d={path} />
    </svg>
  )
}

/** A page section's Pixelify heading with its glyph in the stat's ink, so a long page has landmarks to scan for. */
export function SectionTitle({ id, glyph, tone = 'text-gold-ink', size = 'text-3xl', children }: { id?: string; glyph: GlyphName; tone?: string; size?: string; children: ReactNode }) {
  return (
    <h2 id={id} className={`flex items-center gap-3 font-display font-bold ${size}`}>
      <Glyph name={glyph} size={24} className={tone} />
      <span className="min-w-0">{children}</span>
    </h2>
  )
}
