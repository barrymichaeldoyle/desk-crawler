import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router'
import { api } from '@trmnl-games/backend/api'
import { Card, LoadingState } from '../../lib/ui'
import { RELEASE_STATUS } from '../../lib/prose'
import { seo } from '../../lib/seo'
import { NameRepair } from './desk-crawler/-nameRepair'
import { preload } from '../../lib/preload'

/** Companion shell: auth gate, setup states and mobile-first navigation (companion.md). */
export const Route = createFileRoute('/app/desk-crawler')({
  head: () => seo({ title: 'Companion', index: false }),
  loader: ({ context }) => preload(context, convexQuery(api.users.me, {})),
  component: AppShell,
})

const NAV = [
  { to: '/app/desk-crawler', label: 'Hero' },
  { to: '/app/desk-crawler/inventory', label: 'Bag' },
  { to: '/app/desk-crawler/leaderboard', label: 'Ranks' },
  { to: '/app/desk-crawler/settings', label: 'Settings' },
] as const

function AppShell() {
  return <SignedInApp />
}

function SignedInApp() {
  const { data: me, isPending } = useQuery(convexQuery(api.users.me, {}))
  // The hero page spreads into two columns on wide screens; the other tabs keep a reading width.
  const wide = useLocation({ select: (location) => location.pathname.replace(/\/$/, '') === '/app/desk-crawler' })
  const settings = useLocation({ select: (location) => location.pathname.replace(/\/$/, '').endsWith('/settings') })
  if (isPending) return <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8"><LoadingState label="Loading Desk Crawler…" /></main>
  if (me?.gameState === 'deleting') return <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8"><Card title="Removing Desk Crawler progress"><p>Your account stays available. You can start again from TRMNL once removal finishes.</p></Card></main>
  if (!me?.hero) {
    return (
      <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8">
        <Card title="Start on TRMNL">
          <p>Install the Desk Crawler plugin from the TRMNL marketplace, connect it here, then save it in TRMNL. Your hero sets out from there.</p>
          <p className="mt-3 text-sm text-muted">{RELEASE_STATUS}</p>
          <Link to="/help/desk-crawler" className="mt-3 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">How to connect Desk Crawler</Link>
        </Card>
      </main>
    )
  }
  if (me.hero.activationState === 'pending_trmnl' && !settings) {
    return (
      <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8">
        <Card title="Save in TRMNL to start">
          <p>
            <strong>{me.hero.name}</strong> is ready. Back in TRMNL, click <strong>Save</strong> on the Desk Crawler plugin and the first adventure follows.
          </p>
          <Link to="/help/desk-crawler" className="mt-3 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">Help with setup</Link>
          <Link to="/app/desk-crawler/settings" className="ml-4 inline-flex min-h-11 items-center underline underline-offset-4">Desk Crawler settings</Link>
        </Card>
      </main>
    )
  }
  return (
    <>
      <nav aria-label="Desk Crawler" className="hud sticky top-0 z-10 border-b-4 border-raised bg-night px-2">
        <ul className={`mx-auto flex min-h-13 items-stretch ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>
          <li className="hidden items-center pr-4 pl-2 sm:flex">
            <img src="/games/desk-crawler/favicon.svg" alt="" width={24} height={24} className="[image-rendering:pixelated]" />
            <span className="ml-3 text-xs text-gold-ink">Desk Crawler</span>
          </li>
          {NAV.map((item) => (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                activeOptions={{ exact: true }}
                className="menu-cursor flex min-h-13 items-center justify-center text-[0.625rem] text-muted hover:text-ink aria-[current=page]:text-gold-ink aria-[current=page]:shadow-[inset_0_-4px_0_var(--color-gold)] max-sm:before:hidden sm:text-hud-sm"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main id="main" className={`mx-auto flex w-full min-w-0 flex-col gap-8 px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>
        {me.user?.nameRepairRequired ? <NameRepair /> : null}
        <Outlet />
      </main>
    </>
  )
}
