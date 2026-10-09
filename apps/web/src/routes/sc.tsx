import { createFileRoute, redirect } from '@tanstack/react-router'
import { requireOpenGame } from '../lib/gameAccess'

/**
 * The short link Slow Cast's screen codes encode (D115), like Desk Crawler's `/dc`: a shorter URL draws a smaller QR.
 * Not-found until the game is open to the visitor, so a hidden game's link does not announce it.
 */
export const Route = createFileRoute('/sc')({
  beforeLoad: async ({ context }) => {
    await requireOpenGame(context, 'slow-cast')
    throw redirect({ to: '/app/slow-cast', replace: true })
  },
})
