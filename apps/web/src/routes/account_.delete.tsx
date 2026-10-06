import { Show, SignIn, useClerk, useUser } from '@clerk/tanstack-react-start'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { useRef, useState, type FormEvent } from 'react'
import { stopAnalytics } from '../lib/analytics'
import { seo } from '../lib/seo'
import { SwitchAccount } from '../lib/switchAccount'
import { Button } from '../lib/ui'
import { captureDeletionLink, confirmAccountDeletion, pendingDeletionLink } from '../server/deletionFns'

export const Route = createFileRoute('/account_/delete')({
  validateSearch: (search: Record<string, unknown>): { token?: string; invalid?: boolean } => ({
    ...(typeof search.token === 'string' ? { token: search.token } : {}),
    ...(search.invalid === true || search.invalid === 'true' ? { invalid: true } : {}),
  }),
  beforeLoad: async ({ search }) => {
    if (search.token !== undefined) {
      const result = await captureDeletionLink({ data: { token: search.token } })
      throw redirect({ to: '/account/delete', search: result.ok ? {} : { invalid: true }, replace: true })
    }
  },
  loader: () => pendingDeletionLink(),
  headers: () => ({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' }),
  head: () => {
    const head = seo({ title: 'Confirm account deletion', index: false })
    return { ...head, meta: [...head.meta, { name: 'referrer', content: 'no-referrer' }] }
  },
  component: DeletePage,
})

function DeletePage() {
  const { pending } = Route.useLoaderData()
  const { invalid } = Route.useSearch()
  return <main id="main" data-analytics-private className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-12">
    <h1 className="font-display text-3xl font-bold">Confirm account deletion</h1>
    {!pending || invalid ? <><p role="alert">That deletion link is expired or unavailable.</p><Link to="/account" className="inline-flex min-h-11 items-center underline underline-offset-4">Request a new link from Account</Link></> : <>
      <p>Your account is still active. Opening this page does not delete anything.</p>
      <Show when="signed-out"><p>Sign in with the account that requested the deletion email.</p><SignIn routing="hash" forceRedirectUrl="/account/delete" signUpForceRedirectUrl="/account/delete" /></Show>
      <Show when="signed-in"><DeleteForm /></Show>
    </>}
  </main>
}

function DeleteForm() {
  const clerk = useClerk()
  const { user } = useUser()
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [started, setStarted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)
  const operationId = useRef<string | null>(null)
  if (started) return <p role="status">Account deletion has started. Your sign-in and game data are being removed.</p>
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (confirm !== 'DELETE' || inFlight.current) return
    if (!navigator.onLine) { setError('You are offline. Reconnect to confirm deletion.'); return }
    inFlight.current = true
    setPending(true)
    setError(null)
    operationId.current ??= crypto.randomUUID()
    try {
      const result = await confirmAccountDeletion({ data: { operationId: operationId.current, confirm: 'DELETE' } })
      if (!result.ok) { setError(result.message); return }
      stopAnalytics()
      setStarted(true)
      await clerk.signOut({ redirectUrl: '/' }).catch(() => {})
    } catch { setError('We couldn’t confirm deletion. Check your connection and try again.') }
    finally { inFlight.current = false; setPending(false) }
  }
  return <form onSubmit={submit} className="flex flex-col gap-4">
    <p>You are deleting the account signed in as <strong>{user?.primaryEmailAddress?.emailAddress}</strong>.</p>
    <p>This permanently removes your progress and connections from every TRMNL Games game and deletes your sign-in. Backups expire separately; your TRMNL may keep its last image until you remove the plugin.</p>
    <SwitchAccount returnTo="/account/delete" />
    <label className="flex flex-col gap-2"><span className="font-semibold">Type DELETE to confirm</span><input value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} disabled={pending} className="min-h-11 border-2 border-edge bg-ground px-3 text-base" /></label>
    {error ? <p role="alert">{error}</p> : null}
    <Button type="submit" variant="danger" pending={pending} busyLabel="Removing account…" disabled={confirm !== 'DELETE'}>Permanently delete my account</Button>
    <Link to="/account" className="inline-flex min-h-11 items-center underline underline-offset-4">Keep my account</Link>
  </form>
}
