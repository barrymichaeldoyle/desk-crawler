import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '@trmnl-games/backend/api'
import { useIntent } from '../../../lib/intent'
import { seo } from '../../../lib/seo'
import { Button, Card, ErrorNote } from '../../../lib/ui'

export const Route = createFileRoute('/app/desk-crawler/settings')({ head: () => seo({ title: 'Settings', index: false }), component: Settings })

function Settings() {
  const { data: me } = useQuery(convexQuery(api.users.me, {}))
  const { data: hero } = useQuery(convexQuery(api.heroes.mine, {}))
  const pause = useIntent(api.heroes.pause)
  const { data: connections } = useQuery(convexQuery(api.connections.mine, {}))
  const disconnect = useIntent(api.connections.disconnect)
  const deletion = useIntent(api.deletion.requestGameDeletion)
  const [confirmText, setConfirmText] = useState('')
  const resume = useIntent(api.heroes.resume)
  if (!me?.user || !hero) return <p role="status" className="text-stone-600 dark:text-stone-400">Loading settings…</p>
  return (
    <>
      <h1 className="sr-only">Settings</h1>
      <Card title="Profile">
        <p>
          Public name: <strong>{me.user.publicAlias}</strong>
        </p>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">Shown publicly on leaderboards and TRMNL screens.</p>
      </Card>
      <Card title="Adventures">
        {hero.status === 'paused' ? (
          <>
            <p>Adventures are paused. Your hero earns nothing while paused and there is no catch-up.</p>
            <Button className="mt-3" disabled={resume.pending} onClick={() => resume.run({})}>
              Resume adventures
            </Button>
          </>
        ) : (
          <>
            <p>Pausing stops encounters and rewards until you resume. Your rank stays, but recent XP ages out.</p>
            <Button className="mt-3" variant="secondary" disabled={pause.pending || (hero.status !== 'exploring' && hero.status !== 'resting')} onClick={() => pause.run({})}>
              Pause adventures
            </Button>
          </>
        )}
        <ErrorNote message={pause.error ?? resume.error} />
      </Card>
      <Card title="TRMNL installations">
        <p className="mb-3 text-sm text-stone-600 dark:text-stone-400">Plugin installations showing your hero. Your hero keeps adventuring even if all are disconnected.</p>
        {connections && connections.length > 0 ? (
          <ul className="flex flex-col divide-y divide-stone-200 dark:divide-stone-800">
            {connections.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-semibold">Installation {c.uuid.slice(0, 8)}</span>
                  <span className="ml-2 text-sm text-stone-600 dark:text-stone-400">{c.state === 'active' ? 'Connected' : c.state === 'uninstalled' ? 'Uninstalled' : 'Disconnected'}</span>
                </span>
                {c.state === 'active' ? (
                  <Button variant="secondary" disabled={disconnect.pending} onClick={() => disconnect.run({ instanceId: c.id })}>
                    Disconnect
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p>No installations yet.</p>
        )}
        <ErrorNote message={disconnect.error} />
      </Card>
      <Card title="Delete Desk Crawler progress">
        <p>
          This removes your Desk Crawler hero, items, history and TRMNL connections. It cannot be undone. Your TRMNL Games account and sign-in stay available, and progress in other games is unaffected. Your public name disappears from Desk Crawler rankings immediately. Backups expire within about a week; TRMNL may keep its last screen until you remove the plugin.
        </p>
        <label className="mt-3 flex flex-col gap-1 text-sm">
          <span className="font-semibold">Type DELETE to confirm</span>
          <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="min-h-11 rounded-md border border-stone-400 bg-white px-3 text-stone-900" autoComplete="off" />
        </label>
        <Button
          className="mt-3"
          variant="secondary"
          disabled={confirmText !== 'DELETE' || deletion.pending}
          onClick={async () => {
            await deletion.run({ confirm: 'DELETE' })
          }}
        >
          Delete my Desk Crawler progress
        </Button>
        <ErrorNote message={deletion.error} />
        <p className="mt-4 text-sm">To delete your sign-in and all games, go to <Link to="/account" className="underline underline-offset-4">Account</Link>.</p>
      </Card>
      <Card title="Help">
        <p className="text-sm">Your TRMNL shows a snapshot of the game and refreshes on its own schedule. Sleep Mode and slower refresh never reduce your hero's progress.</p>
      </Card>
    </>
  )
}
