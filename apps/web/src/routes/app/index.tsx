import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { api } from '@trmnl-games/backend/api'
import { seo } from '../../lib/seo'
import { preload } from '../../lib/preload'

/** Short library labels; the hero page carries the full status sentence. */
const STATUS_LABEL: Record<string, string> = { paused: 'Paused', dead: 'Knocked out', sleeping: 'Bag full' }

export const Route = createFileRoute('/app/')({ head: () => seo({ title: 'My games', index: false }), loader: ({ context }) => preload(context, convexQuery(api.users.me, {})), component: Library })

function Library() {
  const { data: me, isPending } = useQuery(convexQuery(api.users.me, {}))
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <h1 className="font-display text-3xl font-bold">My games</h1>
      {isPending ? <p role="status">Loading your games…</p> : (
        <section className="flex flex-col gap-4 border-y border-stone-300 py-6 dark:border-stone-800" aria-labelledby="library-dc">
          <div className="flex items-center gap-4">
            <img src="/games/desk-crawler/icon-192.png" alt="" width={64} height={64} className="h-16 w-16 [image-rendering:pixelated]" />
            <div>
              <h2 id="library-dc" className="font-display text-xl font-bold">Desk Crawler</h2>
              <p className="mt-1 text-stone-600 dark:text-stone-400">{me?.hero ? `${me.hero.name} · ${me.hero.activationState === 'active' ? STATUS_LABEL[me.hero.status] ?? 'Adventuring' : 'Waiting for TRMNL Save'}` : me?.gameState === 'deleting' ? 'Removing your game progress…' : 'An office RPG for your TRMNL.'}</p>
            </div>
          </div>
          <Link to={me?.hero || me?.gameState === 'deleting' ? '/app/desk-crawler' : '/games/desk-crawler'} className="inline-flex min-h-11 self-start items-center bg-stone-900 px-4 font-semibold text-white dark:bg-stone-100 dark:text-stone-900">{me?.hero ? 'Open Desk Crawler' : 'View Desk Crawler'}</Link>
        </section>
      )}
    </main>
  )
}
