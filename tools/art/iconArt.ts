/** The Warrior's head and blade in a rune circle, shared by the marketplace icon and the companion's web icons. */
import { Canvas, sprite } from '../../convex/art/canvas'

const icon = sprite(`
                ########
              ##        ##
            ##     ##     ##
           #      ####      #
          #      ######      #
         #       #wwww#       #
        #        #wwww#   #    #
        #         #ww#   ###   #
       #      #########   #     #
       #     #ww##ww##w#  #     #
       #     #wwwwwwwww#  #     #
       #     #w#ww#www#   #     #
       #     #wwwwwwww#  ###    #
       #      #ww##ww#  #####   #
        #      #wwww#    #w#   #
        #     ##::::##   #w#   #
         #   #::::::::#  #w#  #
          # #:::w#w::::# #w# #
           #::::#w#:::::####
            ##::::::::::##
              ##########
`)

/** The icon on a 32x32 white canvas. */
export function iconCanvas(): Canvas {
  const canvas = new Canvas(32, 32)
  canvas.draw(icon, -4, 5)
  return canvas
}
