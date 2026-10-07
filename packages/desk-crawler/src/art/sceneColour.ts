import type { HeroPose } from './hero'
import type { monsterArt } from './monsters'
import type { PropId } from './props'
import { parseScenePath } from './route'
import { scenePlacements, STAGE_HEIGHT, STAGE_WIDTH, type Placement } from './scene'

/**
 * The companion's colour layer for a scene (D87): flat fills under the 1-bit art, which the hero page multiplies on
 * top, so ink stays black, white takes the fill and shades mix the two. Each sprite fills everything its outline
 * encloses (a 4-connected flood from its edge through transparent cells marks the outside), so open-bodied monsters
 * read as solid creatures rather than showing the backdrop through. Device images are untouched.
 */
const HERO = { skin: '#f2c39b', steel: '#c9d3e0', cardigan: '#e0604f' }
const CLOAK = '#7a5cc8'
const CROWN = '#f2c14e'

const MONSTER: Record<keyof typeof monsterArt, string> = {
  paper_imp: '#e9dfc0',
  rogue_roomba: '#8a8fa3',
  stapler_mimic: '#d4473f',
  dust_daemon: '#9c8f7a',
  cable_serpent: '#5fb35a',
  overheated_rack: '#e8743b',
  firewall_gremlin: '#f0a03a',
  legacy_mainframe: '#c9b88f',
  coffee_slime: '#8a5a3c',
  crumb_golem: '#d9a75e',
  microwave_wraith: '#9fd8e0',
  leftovers_hydra: '#7fae4a',
}

const PROP: Record<PropId, string> = {
  chest: '#b5793f',
  gold: '#f2c14e',
  potion: '#e0505a',
  gear: '#a9b4c6',
  trap: '#9a9a9a',
  campfire: '#f08a3b',
  level_up: '#f2c14e',
  full_bag: '#b5793f',
  signpost: '#b5793f',
}

/** The hero's white cells are skin, except the blade, which each pose holds in a different place. */
const HERO_STEEL: Record<HeroPose, (x: number, y: number) => boolean> = {
  idle: (x) => x >= 17,
  fight: (x) => x >= 17,
  walk: (x) => x >= 17,
  rest: () => false,
  sleep: () => false,
  knocked_out: (_x, y) => y >= 13,
}

/** Cells a sprite's outline encloses: not reachable from outside its box through transparent cells. */
function enclosed(rows: readonly string[], width: number): boolean[][] {
  const height = rows.length
  const outside = rows.map(() => new Array<boolean>(width).fill(false))
  const queue: Array<[number, number]> = []
  const visit = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height || outside[y]![x] || rows[y]![x] !== ' ') return
    outside[y]![x] = true
    queue.push([x, y])
  }
  for (let x = 0; x < width; x += 1) (visit(x, 0), visit(x, height - 1))
  for (let y = 0; y < height; y += 1) (visit(0, y), visit(width - 1, y))
  while (queue.length > 0) {
    const [x, y] = queue.pop()!
    visit(x + 1, y), visit(x - 1, y), visit(x, y + 1), visit(x, y - 1)
  }
  return outside.map((row) => row.map((out) => !out))
}

function fillFor(placement: Placement, pose: HeroPose): (ch: string, x: number, y: number) => string {
  switch (placement.role) {
    case 'hero':
      return (ch, x, y) => (ch === 'w' ? (HERO_STEEL[pose](x, y) ? HERO.steel : HERO.skin) : HERO.cardigan)
    case 'cloak':
      return () => CLOAK
    case 'crown':
      return () => CROWN
    // Monsters and props draw their bodies in white, so the body colour fills them whole; their shading stays in the art.
    case 'monster':
      return () => MONSTER[placement.id]
    case 'prop':
      return () => PROP[placement.id]
  }
}

/** The colour layer as stage-sized rows of colours (null for no fill), later sprites over earlier ones like the art. */
export function sceneColours(pose: HeroPose, placements: readonly Placement[]): Array<Array<string | null>> {
  const grid = Array.from({ length: STAGE_HEIGHT }, () => new Array<string | null>(STAGE_WIDTH).fill(null))
  for (const placement of placements) {
    const { sprite, left, top } = placement
    const inside = enclosed(sprite.rows, sprite.width)
    const fill = fillFor(placement, pose)
    sprite.rows.forEach((row, dy) =>
      [...row].forEach((ch, dx) => {
        const x = left + dx
        const y = top + dy
        if (inside[dy]![dx] && x >= 0 && y >= 0 && x < STAGE_WIDTH && y < STAGE_HEIGHT) grid[y]![x] = fill(ch, dx, dy)
      }),
    )
  }
  return grid
}

/** The colour layer for a scene image path as an SVG data URI at the stage's aspect ratio, or null for an unknown path. */
export function sceneColourUri(path: string): string | null {
  const parsed = parseScenePath(path.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, ''))
  if (!parsed) return null
  const grid = sceneColours(parsed.pose, scenePlacements(parsed.pose, parsed.subject))
  let rects = ''
  grid.forEach((row, y) => {
    for (let x = 0; x < STAGE_WIDTH; ) {
      const colour = row[x]
      let end = x + 1
      while (end < STAGE_WIDTH && row[end] === colour) end += 1
      if (colour) rects += `<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${colour}"/>`
      x = end
    }
  })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}" width="${STAGE_WIDTH * 5}" height="${STAGE_HEIGHT * 5}" preserveAspectRatio="none" shape-rendering="crispEdges">${rects}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
