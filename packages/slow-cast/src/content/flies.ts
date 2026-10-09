import { sprite, type Sprite } from '@trmnl-games/engine/art/canvas'

/**
 * The fly box (slow-cast.md "Staying on the TRMNL"): one fly a week for entering the code your TRMNL shows. Twelve
 * designs make a full box; after that each design comes round again. Cosmetic only: no XP, catch or rank effect.
 */
export interface FlyDef {
  readonly id: string
  readonly name: string
  /** 7x7 for the companion's box. */
  readonly art: Sprite
}

const fly = (id: string, name: string, art: string): FlyDef => ({ id, name, art: sprite(art) })

export const FLIES: readonly FlyDef[] = [
  fly('black_gnat', 'Black Gnat', `
   #
  ###
 #:::#
  ###
 # # #
   #
  ##
`),
  fly('royal_coachman', 'Royal Coachman', `
 #   #
  # #
 #www#
 #:::#
 #www#
   #
  ##
`),
  fly('mayfly', 'Mayfly', `
#  #
 # #
  ###
  #w#
  ###
   #
   ##
`),
  fly('woolly_bugger', 'Woolly Bugger', `
  ###
 #:#:#
 #:::#
 #:#:#
 #:::#
   #
  ##
`),
  fly('red_tag', 'Red Tag', `
   #
  #:#
  #:#
  #:#
  #w#
   #
  ##
`),
  fly('blue_dun', 'Blue Dun', `
 #  #
  ##
 #ww#
 #::#
 #ww#
   #
  ##
`),
  fly('march_brown', 'March Brown', `
#   #
 # #
 ###
 #:#
 ###
  #
 ##
`),
  fly('zulu', 'Zulu', `
  ###
 #:::#
 #w:w#
 #:::#
  ###
   #
  ##
`),
  fly('silver_doctor', 'Silver Doctor', `
   #
  #w#
 #www#
 #w:w#
  #w#
   #
  ##
`),
  fly('greenwell', "Greenwell's Glory", `
 # #
  #
 ###
 #.#
 ###
  #
 ##
`),
  fly('hares_ear', "Hare's Ear", `
  #
 #:#
#:::#
 #:#
 #:#
  #
 ##
`),
  fly('golden_olive', 'Golden Olive', `
 #   #
  ###
 #w.w#
 #...#
  ###
   #
  ##
`),
]

/** The fly that a collection's newest claim added: designs come round in order. */
export const flyForClaim = (claimNumber: number): FlyDef => FLIES[(claimNumber - 1) % FLIES.length]!

/** Each design's count in a collection of `total` flies. */
export const flyBox = (total: number) => FLIES.map((f, index) => ({ ...f, count: total <= index ? 0 : Math.floor((total - index - 1) / FLIES.length) + 1 }))

export { keepsakeWeek as flyWeek, keepsakeWeekStartsAt as flyWeekStartsAt } from './week'
