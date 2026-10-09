import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { games } from '@trmnl-games/platform'
import { gamesQuery, requireOpenGame } from '../../lib/gameAccess'
import { seo } from '../../lib/seo'

/**
 * Slow Cast companion (D115). Hidden until its listing is approved: the loader gate answers
 * not-found for everyone but admins. Until slice S4 this is an admin-only build status page.
 */
export const Route = createFileRoute('/app/slow-cast')({
  head: () => seo({ title: games['slow-cast'].name, index: false }),
  loader: ({ context }) => requireOpenGame(context, 'slow-cast'),
  component: SlowCastHome,
})

function SlowCastHome() {
  const { data } = useQuery(gamesQuery)
  const status = data?.games.find((game) => game.slug === 'slow-cast')?.status
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8">
      <h1 className="font-display text-3xl font-bold">{games['slow-cast'].name}</h1>
      {status && status !== 'live' ? <p className="label-px self-start">{status === 'hidden' ? 'Hidden: only admins can see this' : 'Preview: only admins can open this'}</p> : null}
      <p>{games['slow-cast'].description} It is being built. The angler, the cooler and the tackle shop arrive here as each part is finished.</p>
      <p><Link to="/app" className="underline underline-offset-4">Back to My games</Link></p>
    </main>
  )
}
