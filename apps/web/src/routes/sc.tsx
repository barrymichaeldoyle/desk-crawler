import { createFileRoute, redirect } from '@tanstack/react-router'

/** The short link Slow Cast's screen codes encode (D115), like Desk Crawler's `/dc`: a shorter URL draws a smaller QR. */
export const Route = createFileRoute('/sc')({
  beforeLoad: () => {
    throw redirect({ to: '/app/slow-cast', replace: true })
  },
})
