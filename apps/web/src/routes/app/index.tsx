import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { api } from '@trmnl-games/backend/api'
import { seo } from '../../lib/seo'
import { preload } from '../../lib/preload'
import { BUTTON_PRIMARY, LINK_BUTTON } from '../../lib/ui'
import { games } from '@trmnl-games/platform'
import { gamesQuery } from '../../lib/gameAccess'

/** Short library labels; the hero page carries the full status sentence. */
const STATUS_LABEL: Record<string, string> = { paused: 'Paused', dead: 'Knocked out', sleeping: 'Bag full' }

export const Route = createFileRoute('/app/')({ head: () => seo({ title: 'My games', index: false }), loader: ({ context }) => preload(context, convexQuery(api.users.me, {}), gamesQuery), component: Library })

function Library() {
  const { data: me, isPending } = useQuery(convexQuery(api.users.me, {}))
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <h1 className="font-display text-3xl font-bold">My games</h1>
      {isPending ? <p role="status">Loading your games…</p> : (
        <section className="window flex flex-col gap-4 p-5" aria-labelledby="library-dc">
          <div className="flex items-center gap-4">
            <img src="/games/desk-crawler/icon-192.png" alt="" width={64} height={64} className="h-16 w-16 [image-rendering:pixelated]" />
            <div>
              <h2 id="library-dc" className="font-display text-2xl font-bold text-gold-ink">Desk Crawler</h2>
              {me?.hero ? (
                <p className="mt-1 text-muted"><strong className="text-ink">{me.hero.name}</strong> <span className="label-px ml-1">{me.hero.activationState === 'active' ? STATUS_LABEL[me.hero.status] ?? 'Adventuring' : 'Waiting for TRMNL Save'}</span></p>
              ) : (
                <p className="mt-1 text-muted">{me?.gameState === 'deleting' ? 'Removing your game progress…' : 'An office RPG that plays itself on your TRMNL.'}</p>
              )}
            </div>
          </div>
          <Link to={me?.hero || me?.gameState === 'deleting' ? '/app/desk-crawler' : '/games/desk-crawler'} className={`self-start ${LINK_BUTTON} ${BUTTON_PRIMARY}`}>{me?.hero ? 'Open Desk Crawler' : 'About Desk Crawler'}</Link>
        </section>
      )}
      <UpcomingGames />
    </main>
  )
}

/** Slow Cast in the library (D115): its angler's state once started, a "Coming soon" tile in preview, and a hidden-status mark for admins. */
function UpcomingGames() {
  const { data } = useQuery(gamesQuery)
  const game = data?.games.find((g) => g.slug === 'slow-cast')
  const { data: dock } = useQuery({ ...convexQuery(api.slowCast.anglers.dock, {}), enabled: game?.canOpen === true })
  if (!game) return null
  const angler = (dock as { angler?: { activationState: string; status: string; level: number } | null } | undefined)?.angler
  return (
    <section className="window flex flex-col gap-3 p-5" aria-labelledby="library-sc">
      <h2 id="library-sc" className="font-display text-2xl font-bold">{games['slow-cast'].name}</h2>
      {!angler ? <img src="/games/slow-cast/sample.png" alt="A sample Slow Cast screen" width={780} height={460} className="w-full border-2 border-edge bg-white [image-rendering:pixelated]" /> : null}
      <p className="text-muted">{angler ? `Level ${angler.level} · ${angler.activationState !== 'active' ? 'Waiting for TRMNL Save' : angler.status === 'paused' ? 'Paused' : 'Fishing'}` : games['slow-cast'].description}</p>
      {game.status !== 'live' ? <p className="label-px self-start">{game.status === 'hidden' ? 'Hidden: only admins can see this' : 'Coming soon'}</p> : null}
      {game.canOpen ? <Link to="/app/slow-cast" className={`self-start ${LINK_BUTTON} ${BUTTON_PRIMARY}`}>{angler ? 'Open Slow Cast' : 'About Slow Cast'}</Link> : null}
    </section>
  )
}
