import { useClerk } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '@trmnl-games/backend/api'
import { AuthShell } from '../lib/platformShell'
import { useIntent } from '../lib/intent'
import { Button, ErrorNote } from '../lib/ui'
import { seo } from '../lib/seo'
import { preload } from '../lib/preload'

export const Route = createFileRoute('/account')({ head: () => seo({ title: 'Account', index: false }), loader: ({ context }) => preload(context, convexQuery(api.users.me, {})), component: () => <AuthShell><Account /></AuthShell> })

function Account() {
  const { data: me, isPending } = useQuery(convexQuery(api.users.me, {}))
  const deletion = useIntent(api.deletion.requestDeletion)
  const clerk = useClerk()
  const [confirm, setConfirm] = useState('')
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Account</h1>
      {isPending ? <p role="status">Loading your account…</p> : (
        <>
          <div className="flex flex-col gap-3">
            {me?.user ? <p>Playing as <strong>{me.user.publicAlias}</strong> across TRMNL Games.</p> : <p>You pick a public name when you connect your first game from TRMNL.</p>}
            <p className="text-sm text-muted">Manage your sign-in methods from the profile button above.</p>
          </div>
          <nav aria-label="Account" className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <Link to="/privacy" className="inline-flex min-h-11 items-center underline underline-offset-4">Privacy policy</Link>
            <Link to="/app/desk-crawler/settings" className="inline-flex min-h-11 items-center underline underline-offset-4">Desk Crawler settings</Link>
          </nav>
          {me ? (
            <details className="border-t-2 border-hp pt-4">
              <summary className="min-h-11 cursor-pointer font-semibold text-hp-ink">Delete TRMNL Games account…</summary>
              <p>This removes your progress and connections from every game on TRMNL Games and deletes your sign-in, and cannot be undone. Your name is hidden immediately, backups expire within about a week, and TRMNL keeps its last screen until you remove the plugin. To remove only Desk Crawler progress, use <Link to="/app/desk-crawler/settings" className="underline underline-offset-4">Desk Crawler settings</Link>.</p>
              <label className="mt-4 flex flex-col gap-2 text-sm">
                <span className="font-semibold">Type DELETE to confirm</span>
                <input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} disabled={deletion.pending} className="min-h-11 border-2 border-edge bg-ground px-3 text-base" />
              </label>
              <Button className="mt-4" variant="danger" pending={deletion.pending} busyLabel="Removing account…" disabled={confirm !== 'DELETE'} onClick={async () => { if (await deletion.run({ confirm: 'DELETE' })) await clerk.signOut({ redirectUrl: '/' }) }}>Delete my TRMNL Games account</Button>
              <ErrorNote message={deletion.error} />
            </details>
          ) : null}
        </>
      )}
    </main>
  )
}
