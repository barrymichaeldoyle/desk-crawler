import { Canvas, sprite, type Sprite } from './canvas'
import { heroPoses, type HeroPose } from './hero'
import { monsterArt } from './monsters'
import { eliteCrown, propArt, type PropId } from './props'

/**
 * Scene window composition (revision 12): biome backdrop + hero pose + the
 * latest encounter's subject, on a 190x50 pixel stage. Deterministic for a
 * given key, so the image URL is cacheable.
 */
export const STAGE_WIDTH = 152
export const STAGE_HEIGHT = 40
/** Full layout renders 152x40 at x4 (608x160); smaller layouts at x2 (304x80). */
export const FULL_SCALE = 4
export const SMALL_SCALE = 2
const GROUND = 37
const HERO_X = 24
const SUBJECT_X = 92

export const SCENE_VERSION = 1
export type BiomeArt = 'office_cubicles' | 'server_room' | 'cafeteria_depths'
export type Subject = { kind: 'monster'; id: keyof typeof monsterArt; elite: boolean } | { kind: 'prop'; id: PropId } | { kind: 'none' }

const star = sprite(`
 #
###
 #
`)
const moon = sprite(`
  ####
 ##ww
##ww
##w
##ww
 ##ww
  ####
`)
const torch = sprite(`
  #
 #w#
#www#
 #w#
 ###
  #
  #
  #
`)
const plant = sprite(`
   # #  #
  #w# ##w#
 #ww##www#
  ##w#w##
 #ww###ww#
  ## # ##
   #####
   #:::#
   #:::#
   #####
`)
const monitor = sprite(`
#########
#wwwwwww#
#w:::::w#
#w:::::w#
#wwwwwww#
#########
   ###
  #####
`)
const pot = sprite(`
   #
   #
 #####
#:::::#
#:::::#
 #####
`)

// ---------------------------------------------------------------- backdrops

function office(c: Canvas): void {
  // Night window with moon and stars: the office after hours.
  c.rect(4, 2, 36, 18, '#')
  c.rect(6, 4, 32, 14, 'w')
  for (const [x, y] of [[8, 6], [16, 11], [24, 5], [9, 13]] as const) c.draw(star, x, y)
  c.draw(moon, 28, 7)
  c.vline(22, 4, 17)
  c.hline(6, 37, 10)
  // Cubicle partition with a cork-board shade, monitor and plant.
  c.rect(56, 14, 32, 2, '#')
  c.rect(56, 16, 32, 6, ':')
  c.vline(56, 14, 24)
  c.vline(87, 14, 24)
  c.draw(monitor, 66, 6)
  c.rect(122, 14, 30, 2, '#')
  c.rect(122, 16, 30, 6, ':')
  c.vline(122, 14, 24)
  c.draw(monitor, 132, 6)
  c.draw(plant, 140, 26)
  for (const x of [52, 100, 136]) {
    c.hline(x, x + 8, 0)
    c.hline(x + 2, x + 6, 1, ':')
  }
}

function serverRoom(c: Canvas): void {
  // Racks of varied height with blinking lights.
  const racks: Array<[number, number]> = [[2, 22], [20, 26], [52, 24], [70, 20], [118, 26], [136, 22]]
  for (const [left, height] of racks) {
    const top = 28 - height
    c.rect(left, top, 14, height, '#')
    c.rect(left + 2, top + 2, 10, height - 4, 'w')
    for (let y = top + 4; y < top + height - 3; y += 3) {
      c.hline(left + 3, left + 10, y, '=')
      if ((left + y) % 2 === 0) c.paint(left + 10, y + 1, '#')
    }
  }
  // Cables sagging from the ceiling.
  for (let x = 0; x < STAGE_WIDTH; x += 1) c.paint(x, 1 + Math.round(2 * Math.sin(x / 7)), '#')
  // Raised floor tiles.
  for (let x = 0; x < STAGE_WIDTH; x += 10) c.vline(x, GROUND + 1, STAGE_HEIGHT - 1, ':')
}

function cafeteria(c: Canvas): void {
  // Stone arches with torches: the cafeteria's depths.
  for (const left of [4, 104]) {
    for (let x = 0; x <= 44; x += 1) {
      const y = 2 + Math.round(9 * (1 - Math.sin((Math.PI * x) / 44)))
      c.paint(left + x, y, '#')
      c.paint(left + x, y + 1, '#')
    }
    c.vline(left, 11, 24)
    c.vline(left + 44, 11, 24)
    c.draw(torch, left + 20, 6)
  }
  // Brick wall between the arches.
  for (let y = 4; y < 24; y += 4) {
    c.hline(52, 100, y, '#')
    for (let x = 52 + ((y / 4) % 2) * 4; x <= 100; x += 8) c.vline(x, y, y + 3, '#')
  }
  // Serving counter with a steaming pot.
  c.rect(0, 24, STAGE_WIDTH, 2, '#')
  c.rect(0, 26, STAGE_WIDTH, 3, ':')
  c.draw(pot, 72, 18)
  for (const [x, y] of [[76, 15], [77, 13], [76, 11]] as const) c.paint(x, y, '#')
}

const BACKDROPS: Record<BiomeArt, (c: Canvas) => void> = { office_cubicles: office, server_room: serverRoom, cafeteria_depths: cafeteria }

/** Draw a sprite with a 1px white halo so it stays legible over busy backdrops. */
function drawWithHalo(c: Canvas, s: Sprite, left: number, top: number): void {
  s.rows.forEach((row, dy) =>
    [...row].forEach((ch, dx) => {
      if (ch === ' ') return
      for (let oy = -1; oy <= 1; oy += 1) for (let ox = -1; ox <= 1; ox += 1) c.set(left + dx + ox, top + dy + oy, false)
    }),
  )
  c.draw(s, left, top)
}

export function composeScene(biome: BiomeArt, pose: HeroPose, subject: Subject): Canvas {
  const c = new Canvas(STAGE_WIDTH, STAGE_HEIGHT)
  BACKDROPS[biome](c)
  // Ground and a clear floor band.
  c.rect(0, GROUND, STAGE_WIDTH, 1, '#')
  c.rect(0, GROUND - 22, STAGE_WIDTH, 0, 'w')
  const hero = heroPoses[pose]
  drawWithHalo(c, hero, HERO_X, GROUND - hero.height)
  if (subject.kind === 'monster') {
    const art = monsterArt[subject.id]
    drawWithHalo(c, art, SUBJECT_X, GROUND - art.height)
    if (subject.elite) drawWithHalo(c, eliteCrown, SUBJECT_X + Math.floor((art.width - eliteCrown.width) / 2), GROUND - art.height - eliteCrown.height - 2)
  } else if (subject.kind === 'prop') {
    const art = propArt[subject.id]
    drawWithHalo(c, art, SUBJECT_X, GROUND - art.height)
  }
  return c
}
