import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router'
import { api } from '@trmnl-games/backend/api'
import { games } from '@trmnl-games/platform'
import { gamesQuery, requireOpenGame } from '../../lib/gameAccess'
import { Glyph, type GlyphName } from '../../lib/glyphs'
import { preload } from '../../lib/preload'
import { seo } from '../../lib/seo'
import { Card, LoadingState } from '../../lib/ui'
import type { Dock } from '../../lib/slowCast'
import { useAlertOpened } from './desk-crawler/-alerts'

/**
 * Slow Cast companion shell (slow-cast.md "Companion", D115): the lifecycle gate (not-found for anyone who cannot
 * open the game yet), setup states and the tab bar for Dock, Cooler, Shop, Logbook and Settings.
 */
export const Route = createFileRoute('/app/slow-cast')({
  head: () => seo({ title: games['slow-cast'].name, index: false }),
  loader: async ({ context }) => {
    await requireOpenGame(context, 'slow-cast')
    await preload(context, convexQuery(api.slowCast.anglers.dock, {}))
  },
  component: Shell,
})

const NAV = [
  { to: '/app/slow-cast', label: 'Dock', glyph: 'hero' },
  { to: '/app/slow-cast/cooler', label: 'Cooler', glyph: 'bag' },
  { to: '/app/slow-cast/shop', label: 'Shop', glyph: 'coin' },
  // Five tabs share a phone's width, so the last two take short names.
  { to: '/app/slow-cast/logbook', label: 'Log', glyph: 'star' },
  { to: '/app/slow-cast/settings', label: 'More', glyph: 'cog' },
] as const satisfies ReadonlyArray<{ to: string; label: string; glyph: GlyphName }>

function Shell() {
  const { data, isPending } = useQuery(convexQuery(api.slowCast.anglers.dock, {}))
  const dock = data as Dock | undefined
  const { data: listing } = useQuery(gamesQuery)
  const status = listing?.games.find((game) => game.slug === 'slow-cast')?.status
  const settings = useLocation({ select: (location) => location.pathname.replace(/\/$/, '').endsWith('/settings') })
  // A cooler or bait alert's tap lands here with ?alert=<kind>; counted once the page is ready.
  useAlertOpened(!isPending)
  const banner = status && status !== 'live' ? <p className="label-px mx-auto mt-3 w-full max-w-3xl px-4 text-muted">{status === 'hidden' ? 'Hidden: only admins can see Slow Cast' : 'Preview: only admins can open Slow Cast'}</p> : null
  if (isPending) return <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8"><LoadingState label="Loading Slow Cast…" /></main>
  if (dock?.gameState === 'deleting') return <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8"><Card title="Removing Slow Cast progress"><p>Your account and your other games stay. You can start again from TRMNL once removal finishes.</p></Card></main>
  if (!dock?.angler) {
    return (
      <>{banner}<main id="main" className="mx-auto w-full max-w-3xl px-4 py-8">
        <Card title="Start on TRMNL">
          <p>Install the Slow Cast plugin from the TRMNL marketplace, connect it here, then save it in TRMNL. Your angler casts the first line within fifteen minutes.</p>
          <Link to="/help/slow-cast" className="mt-3 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">How Slow Cast works</Link>
        </Card>
      </main></>
    )
  }
  if (dock.angler.activationState === 'pending_trmnl' && !settings) {
    return (
      <>{banner}<main id="main" className="mx-auto w-full max-w-3xl px-4 py-8">
        <Card title="Save in TRMNL to start">
          <p>Your angler is ready at the Millpond. Back in TRMNL, click <strong>Save</strong> on the Slow Cast plugin and the first cast follows.</p>
          <Link to="/help/slow-cast" className="mt-3 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">Help with setup</Link>
        </Card>
      </main></>
    )
  }
  return (
    <>
      <nav aria-label="Slow Cast" className="hud sticky top-0 z-30 border-b-4 border-raised bg-night px-2">
        <ul className="mx-auto flex min-h-13 max-w-3xl items-stretch">
          {NAV.map((item) => (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                activeOptions={{ exact: true }}
                className="menu-cursor flex min-h-13 flex-col items-center justify-center gap-1 text-[0.625rem] text-muted hover:text-ink aria-[current=page]:text-gold-ink aria-[current=page]:shadow-[inset_0_-4px_0_var(--color-gold)] max-sm:before:hidden sm:flex-row sm:gap-2 sm:text-hud-sm"
              >
                <Glyph name={item.glyph} className="sm:hidden lg:block" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {banner}
      <main id="main" className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-6 px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
    </>
  )
}
