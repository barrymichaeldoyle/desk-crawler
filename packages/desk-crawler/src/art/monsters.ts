import { sprite } from './canvas'

/* Twelve monsters, ~24x24, facing left toward the hero. Reserved art (LICENSE). */

// ---------------------------------------------------------------- Office Cubicles

export const paperImp = sprite(`
     #           #
     ##         ##
      ###########
     #wwwwwwwwwww#
     #w=========w#
     #w#ww===ww#w#
     #w##w===w##w#
     #w=========w#
     #w==#####==w#
     #w=========w#
  ## #wwwwwwwwwww# ##
   ###===========###
     #w=========w#
     #wwwwwwwwwww#
      ###########
       #       #
      ##       ##
`)

export const rogueRoomba = sprite(`
         #
         #
       #####
     ##:::::##
    #:::www:::#
   #:::w###w:::#
  ###############
  #wwwwwwwwwwwww#
  #w##wwwwwww##w#
  #w##wwwwwww##w#
  #wwwwwwwwwwwww#
  ###############
   #:::::::::::#
    ###########
    ##       ##
`)

export const staplerMimic = sprite(`
      ##############
    ##::::::::::::::##
   #::::::::::::::::::#
  #####################
  #w#w#w#w#w#w#w#w#w##
   w w w w w w w w w
  ##################
  #wwww##wwwwww##ww#
  #ww#w##ww#ww#w#ww#
  #wwww##wwwwwww#ww#
  #####################
 #:::::::::::::::::::::#
 #######################
`)

export const dustDaemon = sprite(`
   #               #
   ##             ##
    ##   #####   ##
     ## #:::::# ##
      #:::::::::#
     #:::::::::::#
    #::wwww:wwww::#
    #::w##w:w##w::#
    #::wwww:wwww::#
    #:::::::::::::#
    #:::w#####w:::#
     #:::w#w#w:::#
      #:::::::::#
     . #:::::::# .
    .   .#:::#.   .
   .   .  .#.  .   .
     .   .   .   .
`)

// ---------------------------------------------------------------- Server Room

export const cableSerpent = sprite(`
    #####
   #wwwww#
  #w#ww#ww#
  #wwwwwwww#
   ##ww######
    #ww#
   #####   ######
  #wwww#  #wwwwww#
  #w##w####w####w#
   #ww#ww#ww#  #ww#
    #wwwwww#    #w#
     ######   ###w#
             #wwww#
              ####
`)

export const overheatedRack = sprite(`
     #   #   #
    # # # # # #
   ###############
   #wwwwwwwwwwwww#
   #w#####w#####w#
   #w#w#w#w#w#w#w#
   #w#####w#####w#
   #wwwwwwwwwwwww#
   #w===========w#
   #w=#=#=#=#=#=w#
   #w===========w#
   #wwwwwwwwwwwww#
   #w###########w#
   #wwwwwwwwwwwww#
   ###############
    ##         ##
`)

export const firewallGremlin = sprite(`
     #   #   #
    ##  ###  ##
    ### ### ###
   #############
  ##w#w#w#w#w#w##
  #wwwwwwwwwwwww#
  #ww#ww###ww#ww#
  #ww##ww#ww##ww#
  #wwwwwwwwwwwww#
  #www#######www#
  #wwww#w#w#wwww#
  ###############
  #w#w#w#w#w#w#w#
  ###############
   ##         ##
`)

export const legacyMainframe = sprite(`
  ###################
  #wwwwwwwwwwwwwwwww#
  #w###############w#
  #w#wwwwwwwwwwwww#w#
  #w#w###www###www#w#
  #w#w#w#www#w#www#w#
  #w#w###www###www#w#
  #w#wwwww#####www#w#
  #w#wwwwwwwwwwwww#w#
  #w###############w#
  #wwwwwwwwwwwwwwwww#
  #w=#=#=#=#=#=#=#=w#
  #wwwwwwwwwwwwwwwww#
  #w##w##w##w##w##ww#
  ###################
   ###           ###
`)

// ---------------------------------------------------------------- Cafeteria Depths

export const coffeeSlime = sprite(`
       .  .  .
      .  .  .
     ###########
    #wwwwwwwwwww#
    #w:::::::::w####
    #w:ww:::ww:w#ww#
    #w:w#:::w#:w#  #
    #w:ww:::ww:w#  #
    #w:::::::::w#  #
    #w::w###w::w#ww#
    #w:::www:::w####
    #w:::::::::w#
   ##############
  #:::::::::::::::#
  #################
`)

export const crumbGolem = sprite(`
      #######
     #:.:.:.:#
     #.w#.w#.#
     #:.:.:.:#
     #.#####.#
   ###########
  #:.:.:.:.:.:#
 #.:.:.:.:.:.:.#
 #:.#:.:.:.:#.:#
 #.:#.:.:.:.#:.#
 ##:#:.:.:.:##.#
  ## #:.:.:.# ##
     #.:#.:.#
     #:.#:.:#
    ###  #####
`)

export const microwaveWraith = sprite(`
   #################
   #wwwwwwwwwww#w#w#
   #w#########w#w#w#
   #w#:::::::#w#####
   #w#:w#:w#:#w#w#w#
   #w#:::::::#w#####
   #w#::###::#w#w#w#
   #w#########w#####
   #wwwwwwwwwww#w#w#
   #################
    .  :  .  :  .
   .  :  .  :  .
  .  :  .  :  .
    .  .  .  .
`)

export const leftoversHydra = sprite(`
   ###     ###     ###
  #www#   #www#   #www#
  #w#w#   #w#w#   #w#w#
  #www#   #www#   #www#
   #w#     #w#     #w#
    #w#    #w#    #w#
     #w#   #w#   #w#
      #w#  #w#  #w#
    ###################
   #wwwwwwwwwwwwwwwwwww#
   #w:::::::::::::::::w#
    #w:::::::::::::::w#
     #wwwwwwwwwwwwwww#
      ###############
`)

export const monsterArt = {
  paper_imp: paperImp,
  rogue_roomba: rogueRoomba,
  stapler_mimic: staplerMimic,
  dust_daemon: dustDaemon,
  cable_serpent: cableSerpent,
  overheated_rack: overheatedRack,
  firewall_gremlin: firewallGremlin,
  legacy_mainframe: legacyMainframe,
  coffee_slime: coffeeSlime,
  crumb_golem: crumbGolem,
  microwave_wraith: microwaveWraith,
  leftovers_hydra: leftoversHydra,
} as const
