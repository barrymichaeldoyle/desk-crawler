import { sprite } from './canvas'

/* Encounter props and markers. Reserved art (LICENSE). */

export const chestClosed = sprite(`
   ################
  #::::::::::::::::#
 #::::::::::::::::::#
 ####################
 #ww#wwwwwwwwwwww#ww#
 #ww#wwwww##wwwww#ww#
 ######w#####w#######
 #ww#wwww#ww#wwww#ww#
 #ww#wwww####wwww#ww#
 #ww#wwwwwwwwwwww#ww#
 ####################
`)

export const chestGold = sprite(`
     #   #     #
   #   #   #  #   #
  ################ #
 #wwwwwwwwwwwwwwwww#
 #w#ww#ww#ww#ww#www#
 #ww#ww#ww#ww#ww#ww#
 ####################
 #ww#wwwwwwwwwwww#ww#
 #ww#wwwww##wwwww#ww#
 ######w#####w#######
 #ww#wwww#ww#wwww#ww#
 #ww#wwww####wwww#ww#
 #ww#wwwwwwwwwwww#ww#
 ####################
`)

export const potion = sprite(`
       ####
       #ww#
       ####
      #wwww#
     #wwwwww#
    #wwwwwwww#
   #::::::::::#
   #:::w::::::#
   #::www:::::#
   #:::w::::::#
   #::::::::::#
    ##########
`)

export const gearFind = sprite(`
      #     #
   #    ###    #
       #www#
   #  #wwwww#  #
     #wwwwwww#
    #ww#####ww#
   #ww#:::::#ww#
   #ww#:::::#ww#
    #ww#:::#ww#
     #ww#:#ww#
   #  #ww#ww#  #
       #www#
   #    ###    #
`)

export const trap = sprite(`
      #      #      #
     #w#    #w#    #w#
     #w#    #w#    #w#
    #www#  #www#  #www#
    #www#  #www#  #www#
   #wwwww##wwwww##wwwww#
 ###########################
 #:::::::::::::::::::::::::#
 ###########################
`)

export const campfire = sprite(`
        #
       #w#
      #ww#  #
     #www# #w#
    #wwwww#ww#
    #ww:wwww:w#
   #ww:::ww:::w#
   #w:::::::::w#
    #w:::::::w#
  ##############
 #ww#ww#ww#ww#ww#
  ##############
`)

export const levelUp = sprite(`
          #
          #
    #    ###    #
     #  #www#  #
       #wwwww#
  ###########w#####
   #wwwwwwwwwwwww#
     #wwwwwwwww#
      #wwwwwww#
     #www###www#
    #ww#     #ww#
    ##         ##
`)

export const eliteCrown = sprite(`
 #     #     #
 ##   ###   ##
 #w# #www# #w#
 #ww#wwwww#ww#
 #wwwwwwwwwww#
 #############
 #w#w#w#w#w#w#
 #############
`)

export const fullBag = sprite(`
       #####
      #w#w#w#
       #####
     ##:::::##
    #:::::::::#
   #:::::::::::#
  #:::::www:::::#
  #::::w###w::::#
  #::::wwwww::::#
  #:::::::::::::#
   #:::::::::::#
    ###########
`)

export const signpost = sprite(`
       ###
   #############
   #wwwwwwwwwww##
   #w##w#w##ww###
   #wwwwwwwwwww##
   #############
       #w#
   #############
  ##wwwwwwwwwww#
  ###ww#w##w#w##
  ##wwwwwwwwwww#
   #############
       #w#
       #w#
     #######
`)

export const propArt = {
  chest: chestClosed,
  gold: chestGold,
  potion,
  gear: gearFind,
  trap,
  campfire,
  level_up: levelUp,
  full_bag: fullBag,
  signpost,
} as const

export type PropId = keyof typeof propArt
