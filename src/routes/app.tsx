import { Show, SignInButton, UserButton } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { api } from '../../convex/_generated/api'
import { Button, Card } from '../lib/ui'
import { seo } from '../lib/seo'
import { NameRepair } from './app/-nameRepair'

/** Companion shell: auth gate, setup states and mobile-first navigation (companion.md). */
export const Route = createFileRoute('/app')({
  head: () => seo({ title: 'Companion', index: false }),
  component: AppShell,
})

const NAV = [
  { to: '/app', label: 'Hero' },
  { to: '/app/inventory', label: 'Bag' },
  { to: '/app/leaderboard', label: 'Rankings' },
  { to: '/app/settings', label: 'Settings' },
] as const

function AppShell() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col">
      <header className="flex items-center justify-between gap-4 px-4 py-4">
        <Link to="/" className="font-semibold">
          Desk Crawler
        </Link>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </header>
      <Show when="signed-out">
        <main id="main" className="flex flex-col gap-4 px-4 py-8">
          <h1 className="text-2xl font-bold">Desk Crawler companion</h1>
          <p>Sign in to check on your hero and sort out gear.</p>
          <SignInButton mode="modal">
            <Button>Sign in</Button>
          </SignInButton>
        </main>
      </Show>
      <Show when="signed-in">
        <SignedInApp />
      </Show>
    </div>
  )
}

function SignedInApp() {
  const { data: me, isPending } = useQuery(convexQuery(api.users.me, {}))
  if (isPending) return <main id="main" className="px-4 py-8 text-stone-600 dark:text-stone-400"><p role="status">Loading…</p></main>
  if (!me?.hero) {
    return (
      <main id="main" className="px-4 py-8">
        <Card title="Start on TRMNL">
          <p>Desk Crawler starts on your TRMNL. Install the Desk Crawler plugin from the TRMNL marketplace, connect it here, then save it in TRMNL.</p>
        </Card>
      </main>
    )
  }
  if (me.hero.activationState === 'pending_trmnl') {
    return (
      <main id="main" className="px-4 py-8">
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
      <nav aria-label="Main" className="sticky top-0 z-10 border-y border-stone-300 bg-stone-50/95 px-2 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95">
        <ul className="flex">
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
      <main id="main" className="flex flex-col gap-4 px-4 py-6">
        {me.user?.nameRepairRequired ? <NameRepair /> : null}
        <Outlet />
      </main>
    </>
  )
}
