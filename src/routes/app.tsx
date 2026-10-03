import { Show, SignInButton, UserButton } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { api } from '../../convex/_generated/api'

/**
 * Companion home. For now it proves V01: Clerk identity reaches Convex during
 * SSR (loader) and on the client (reactive query) without a signed-out flash.
 */
export const Route = createFileRoute('/app')({
  loader: ({ context }) => context.queryClient.ensureQueryData(convexQuery(api.users.me, {})),
  component: AppHome,
})

function AppHome() {
  const { data: me } = useSuspenseQuery(convexQuery(api.users.me, {}))
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Desk Crawler</h1>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </header>
      <Show when="signed-out">
        <p>Sign in to manage your hero.</p>
        <SignInButton mode="modal">
          <button type="button" className="min-h-11 rounded-md bg-stone-900 px-4 font-semibold text-white">
            Sign in
          </button>
        </SignInButton>
      </Show>
      <section aria-live="polite" data-testid="convex-identity" className="rounded-md border border-stone-300 p-4 font-mono text-sm">
        {me === null ? 'Convex sees: signed out' : `Convex sees: signed in (${me.user ? 'onboarded' : 'not onboarded yet'})`}
      </section>
    </main>
  )
}
