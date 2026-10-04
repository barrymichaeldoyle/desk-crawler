import { useClerk } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '@trmnl-games/backend/api'
import { AuthShell } from '../lib/platformShell'
import { useIntent } from '../lib/intent'
import { Button, Card, ErrorNote } from '../lib/ui'
import { seo } from '../lib/seo'
import { preload } from '../lib/preload'

export const Route = createFileRoute('/account')({ head: () => seo({ title: 'Account', index: false }), loader: ({ context }) => preload(context, convexQuery(api.users.me, {})), component: () => <AuthShell><Account /></AuthShell> })

function Account() {
  const { data: me, isPending } = useQuery(convexQuery(api.users.me, {}))
  const deletion = useIntent(api.deletion.requestDeletion)
  const clerk = useClerk()
  const [confirm, setConfirm] = useState('')
  return (
    <main id="main" className="flex flex-col gap-6 px-4 py-8">
      <h1 className="text-3xl font-bold">Account</h1>
      {isPending ? <p role="status">Loading your account…</p> : (
        <>
          <Card title="Public identity">
            {me?.user ? <p>Your public name is <strong>{me.user.publicAlias}</strong>. It is shared across TRMNL Games.</p> : <p>Pick a public name when you connect your first game from TRMNL. Your sign-in is ready.</p>}
            <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">Use the profile button above to manage your sign-in methods.</p>
          </Card>
          <Card title="Privacy and data">
            <p><Link to="/privacy" className="underline underline-offset-4">Read the privacy policy</Link> for what we store and how deletion works.</p>
            <p className="mt-3">To remove only Desk Crawler progress and keep your account, use <Link to="/app/desk-crawler/settings" className="underline underline-offset-4">Desk Crawler settings</Link>.</p>
          </Card>
          <Card title="Delete TRMNL Games account">
            <p>This permanently removes your progress and connections from every game on TRMNL Games, and deletes your sign-in. Your public name is hidden immediately. Backups expire within about a week. TRMNL may keep the last screen until you remove the plugin from its playlist.</p>
            {me ? (
              <>
                <label className="mt-4 flex flex-col gap-2 text-sm">
                  <span className="font-semibold">Type DELETE to confirm</span>
                  <input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" className="min-h-11 rounded-md border border-stone-400 bg-white px-3 text-stone-900" />
                </label>
                <Button className="mt-4" variant="secondary" disabled={confirm !== 'DELETE' || deletion.pending} onClick={async () => { if (await deletion.run({ confirm: 'DELETE' })) await clerk.signOut({ redirectUrl: '/' }) }}>Delete my TRMNL Games account</Button>
                <ErrorNote message={deletion.error} />
              </>
            ) : null}
          </Card>
        </>
      )}
    </main>
  )
}
