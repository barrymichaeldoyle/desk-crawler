import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router'
import { api } from '@trmnl-games/backend/api'
import { Card } from '../../lib/ui'
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
  { to: '/app/desk-crawler/leaderboard', label: 'Rankings' },
  { to: '/app/desk-crawler/settings', label: 'Settings' },
] as const

function AppShell() {
  return <SignedInApp />
}

function SignedInApp() {
  const { data: me, isPending } = useQuery(convexQuery(api.users.me, {}))
  // The hero page spreads into two columns on wide screens; the other tabs keep a reading width.
  const wide = useLocation({ select: (location) => location.pathname.replace(/\/$/, '') === '/app/desk-crawler' })
  if (isPending) return <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8 text-stone-600 dark:text-stone-400"><p role="status">Loading…</p></main>
  if (me?.gameState === 'deleting') return <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8"><Card title="Removing Desk Crawler progress"><p>Your account stays available. You can start again from TRMNL once removal finishes.</p></Card></main>
  if (!me?.hero) {
    return (
      <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8">
        <Card title="Start on TRMNL">
          <p>Desk Crawler starts on your TRMNL. Install the Desk Crawler plugin from the TRMNL marketplace, connect it here, then save it in TRMNL.</p>
        </Card>
      </main>
    )
  }
  if (me.hero.activationState === 'pending_trmnl') {
    return (
      <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8">
        <Card title="One more step">
          <p>
            <strong>{me.hero.name}</strong> is ready. Return to TRMNL and click <strong>Save</strong> on the Desk Crawler plugin to start adventures.
          </p>
        </Card>
      </main>
    )
  }
  return (
    <>
      <nav aria-label="Desk Crawler" className="sticky top-0 z-10 border-b border-stone-300 bg-stone-50 px-2 dark:border-stone-800 dark:bg-stone-950">
        <ul className={`mx-auto flex items-stretch ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>
          <li className="hidden items-center pr-4 pl-2 sm:flex">
            <img src="/games/desk-crawler/favicon.svg" alt="" width={20} height={20} className="[image-rendering:pixelated]" />
            <span className="ml-2 font-bold">Desk Crawler</span>
          </li>
          {NAV.map((item) => (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                activeOptions={{ exact: true }}
                className="flex min-h-11 items-center justify-center text-sm font-semibold text-stone-600 dark:text-stone-400"
                activeProps={{ className: 'text-stone-900 underline underline-offset-8 decoration-2 dark:text-stone-100' }}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main id="main" className={`mx-auto flex w-full flex-col gap-4 px-4 py-6 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>
        {me.user?.nameRepairRequired ? <NameRepair /> : null}
        <Outlet />
      </main>
    </>
  )
}
