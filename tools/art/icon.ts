/** Render the 512x512 marketplace icon: the Warrior's head and blade in a rune circle. pnpm tsx tools/art/icon.ts <out.png> */
import { writeFileSync } from 'node:fs'
import { Canvas, sprite } from '../../convex/art/canvas'
import { encodePng1Bit } from '../../convex/art/png'

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
const out = process.argv[2] ?? 'icon.png'
const canvas = new Canvas(32, 32)
canvas.draw(icon, -4, 5)
const { width, height, ink } = canvas.scaled(16)
writeFileSync(out, encodePng1Bit(width, height, ink))
console.log(`wrote ${out} ${width}x${height}`)
