import { sprite } from './canvas'

/*
 * The Warrior: an office adventurer with tousled hair, cardigan, lanyard badge
 * and a letter-opener blade. 24x24 grids, facing right. Reserved art (LICENSE).
 */

export const heroIdle = sprite(`
          ######
        #########
       ##########         #
      ###wwwww###        #w#
      ##wwwwwwww#        #w#
      #ww#ww#www#        #w#
      #wwwwwwwww#        #w#
       #ww###ww#         #w#
        #wwwww#          #w#
       ##::#::##        #####
      #:::w#w:::#        #w#
     #::::#w#:::##      ##w#
    #w#:::#w#::::#######ww#
    #w#:::#w#::::##ww####
    #w#::::#:::::# ###
     ## #:::::::#
        #:::::::#
        #########
        ##     ##
        ##     ##
        ##     ##
       ###     ###
      ####     ####
`)

export const heroFight = sprite(`
          ######
        #########
       ##########
      ###wwwww###
      ##wwwwwwww#
      #ww#ww##ww#
      #wwwwwwwww#
       #ww##www#
        #wwwww#
       ##::#::##
      #:::w#w:::#
     #::::#w#:::########w##
    #w#:::#w#::::#ww#######ww#
    #w#:::#w#::::#########ww#
    #w#::::#:::::#      ####
     ## #:::::::#
        #:::::::#
        #########
        ##    ##
       ##      ##
      ##        ##
     ##          ##
    ###          ###
`)

export const heroWalk = sprite(`
          ######
        #########
       ##########
      ###wwwww###
      ##wwwwwwww#
      #ww#ww#www#
      #wwwwwwwww#
       #ww###ww#
        #wwwww#
       ##::#::##
      #:::w#w:::#
     #::::#w#:::#
    #w#:::#w#::::#
    #w#:::#w#::::#w#
     ##::::#:::::#w#
       #:::::::# ##
        #:::::::#
        #########
         ##   ##
        ##     ##
       ##       ##
      ###       ###
     ####       ####
`)

export const heroRest = sprite(`




          ######
        #########
       ##########
      ###wwwww###
      ##wwwwwwww#
      #ww##w##ww#
      #wwwwwwwww#
       #ww###ww#
        #wwwww#
       ##::#::##
      #:::w#w:::#
     #:::::#:::::#
    #w#:::::::::#w#
    #w#:::::::::#w#
    ###############
   ##################
   ##################
`)

export const heroSleep = sprite(`
                    ###
                      #
                     #
                    ###
              ##
               #
              #
              ##
    ######
   ########################
  #wwwwww#::::::::::::::::##
  #w##ww##::::::w#w:::::::##
  #wwwwww#::::::::::::::::##
   ########################
   ########################
`)

export const heroKnockedOut = sprite(`





    ######
   ########################
  #wwwwww#::::::::::::::::##
  #w#w#ww#::::::w#w:::::::##
  #ww#www#::::::::::::::::##
  #w#w#ww#::::::::::::::::##
   ########################
   ########################
          #w#      ####
          #w##########w#
          ###############
`)

/** A flowing cloak drawn behind the standing poses for a touch of the arcane. */
export const heroCloak = sprite(`
       ###
      #:::#
     #:::::#
    #::::::#
    #::::::#
   #:::::::#
   #::::::#
  #::::::#
  #:::::#
 #:::::#
 #::::#
  ####
`)

export const CLOAKED_POSES = new Set(['idle', 'fight', 'walk'])

export const heroPoses = {
  idle: heroIdle,
  fight: heroFight,
  walk: heroWalk,
  rest: heroRest,
  sleep: heroSleep,
  knocked_out: heroKnockedOut,
} as const

export type HeroPose = keyof typeof heroPoses
