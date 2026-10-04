/** The TRMNL Games mark: a desk display showing a d-pad and two buttons, drawn on native pixel grids. */
import { Canvas, sprite } from '@trmnl-games/desk-crawler/art/canvas'

const display = sprite(`
 ##########################
############################
##                        ##
##                        ##
##                        ##
##     ###                ##
##     ###           ##   ##
##     ###          ####  ##
##  #########       ####  ##
##  #########        ##   ##
##  #########   ##        ##
##     ###     ####       ##
##     ###     ####       ##
##     ###      ##        ##
##                        ##
##                        ##
##                        ##
############################
 ##########################
            ####
            ####
       ##############
       ##############
`)

/** The mark on a 32x32 white canvas. */
export function platformIconCanvas(): Canvas {
  const canvas = new Canvas(32, 32)
  canvas.draw(display, 2, 4)
  return canvas
}

/** A separate 16px drawing keeps the controller readable in browser tabs. */
export function platformFaviconCanvas(): Canvas {
  const canvas = new Canvas(16, 16)
  canvas.draw(sprite(`
 ############
#            #
#   #        #
#   #     ## #
# #####   ## #
#   #   ##   #
#   #   ##   #
#            #
 ############
      ##
    ######
`), 1, 2)
  return canvas
}
