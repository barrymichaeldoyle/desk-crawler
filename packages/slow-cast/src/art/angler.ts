import { sprite, type Sprite } from '@trmnl-games/engine/art/canvas'

/**
 * Angler poses (slow-cast.md "Device"), facing right toward the water, 14x24 on the stage. The rod is drawn by the
 * scene from the hands (`ROD_HAND`) so one rod line serves every pose; `holding` has no rod and shows the catch.
 */
export type AnglerPose = 'waiting' | 'casting' | 'reeling' | 'holding' | 'paused'

const waiting = sprite(`
    ####
   #wwww#
  ########
    #ww#
    #w##
     ##
   #::::#
  #::::::#
  #::#::::##
  #::#:::#
  #::#::#
  #:::::#
   #####
   #####
   #===#
   #= =#
   #= =#
   #= =#
   #= =#
   ## ##
  ### ###
`)

const casting = sprite(`
    ####
   #wwww#
  ########
    #ww#   #
    #w##  #
     ##  #
   #::::#
  #::::::#
  #::#::::#
  #::#:::#
  #::#::#
  #:::::#
   #####
   #####
   #===#
   #= =#
   #= =#
   #= =#
   #= =#
   ## ##
  ### ###
`)

const reeling = sprite(`
    ####
   #wwww#
  ########
    #ww#
    #w##
     ##
   #::::#
  #:::::::#
  #::#::::###
  #::#:::# ##
  #::#::#
  #:::::#
   #####
   #####
   #===#
   #= =#
   #==#
   #==#
   #= =#
   ## ##
  ### ###
`)

const holding = sprite(`
    ####
   #wwww#
  ########
    #ww#
    #w##
     ##
   #::::#
  #::::::####
  #:::::::###
  #:::::#
  #:::::#
  #:::::#
   #####
   #####
   #===#
   #= =#
   #= =#
   #= =#
   #= =#
   ## ##
  ### ###
`)

/** Sitting on a stool beside the rod rest, flask in hand. */
const paused = sprite(`




    ####
   #wwww#
  ########
    #ww#
    #w##
     ##
   #::::#
  #::::::#
  #::::::##
  #:::::#w#
  #:::::###
   ######
   #=====#
   #= #=#
   #= #=#
  ####### 
   #   #
   #   #
  ### ###
`)

export const anglerPoses: Readonly<Record<AnglerPose, Sprite>> = { waiting, casting, reeling, holding, paused }

/** Where the hands hold the rod butt, relative to the sprite's top-left, per pose. */
export const ROD_HAND: Readonly<Record<AnglerPose, readonly [number, number]>> = {
  waiting: [10, 8],
  casting: [10, 3],
  reeling: [11, 9],
  holding: [11, 8],
  paused: [9, 13],
}
