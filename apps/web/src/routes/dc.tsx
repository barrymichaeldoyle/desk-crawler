import { createFileRoute, redirect } from '@tanstack/react-router'

/** The short link the TRMNL screen's corner codes encode (D108): a shorter URL draws a smaller QR. */
export const Route = createFileRoute('/dc')({
  beforeLoad: () => {
    throw redirect({ to: '/app/desk-crawler', replace: true })
  },
})
