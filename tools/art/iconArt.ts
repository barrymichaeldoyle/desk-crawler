/** The approved simple hero, sword and circle, drawn on native pixel grids. */
import { Canvas, sprite } from '@trmnl-games/desk-crawler/art/canvas'

const hero = sprite(`
      ##
    ######
   ########
  ##########
  ####ww####
 ###wwwww###
 ##wwwwwww##
 #wwwwwwwww#
 #ww#www#ww#
 #wwwwwwwww#
  #wwwwwww#
   #wwwww#
    #www#
   ##www##
  ##w#w#w##
 ###ww#ww###
####ww#ww####
####w###w####
####w#w#w####
 ####www####
   ########
`)

/** The icon on a 32x32 white canvas. */
export function iconCanvas(): Canvas {
  const canvas = new Canvas(32, 32)
  const center = 15.5
  for (let y = 0; y < 32; y += 1) for (let x = 0; x < 32; x += 1) {
    const distance = Math.hypot(x - center, y - center)
    if (distance <= 14 && distance >= 12.8) canvas.set(x, y, true)
  }
  canvas.draw(hero, 6, 6)
  canvas.vline(24, 9, 17)
  canvas.hline(23, 25, 10)
  canvas.hline(22, 26, 17)
  canvas.vline(23, 18, 23)
  canvas.vline(25, 18, 23)
  canvas.hline(22, 25, 23)
  canvas.hline(19, 22, 24)
  return canvas
}

/** A separate 16px drawing keeps the face and sword readable in browser tabs. */
export function faviconCanvas(): Canvas {
  const canvas = new Canvas(16, 16)
  canvas.draw(sprite(`
     #####
   ########
   ###ww###
  ##wwwww##  #
  #wwwwwww# ###
  #ww#ww#w#  #
  #wwwwwww#  #
   #wwwww#   #
    #www#   ###
   ##www##   #
  ###w#w###  #
  ####w#######
   #######
`), 0, 1)
  return canvas
}
