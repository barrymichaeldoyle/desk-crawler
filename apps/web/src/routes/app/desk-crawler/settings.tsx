import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '@trmnl-games/backend/api'
import { useIntent } from '../../../lib/intent'
import { seo } from '../../../lib/seo'
import { ActionFeedback, Button, Card, LoadingState } from '../../../lib/ui'
import { preload } from '../../../lib/preload'
import { DeskKeepsakes } from './-keepsakes'

export const Route = createFileRoute('/app/desk-crawler/settings')({ head: () => seo({ title: 'Settings', index: false }), loader: ({ context }) => preload(context, convexQuery(api.users.me, {}), convexQuery(api.heroes.mine, {}), convexQuery(api.connections.mine, {})), component: Settings })

function Settings() {
  const { data: me } = useQuery(convexQuery(api.users.me, {}))
  const { data: hero } = useQuery(convexQuery(api.heroes.mine, {}))
  const pause = useIntent(api.heroes.pause)
  const { data: connections } = useQuery(convexQuery(api.connections.mine, {}))
  const disconnect = useIntent(api.connections.disconnect)
  const deletion = useIntent(api.deletion.requestGameDeletion)
  const [confirmText, setConfirmText] = useState('')
  const [disconnectId, setDisconnectId] = useState<string | null>(null)
  const resume = useIntent(api.heroes.resume)
  const [action, setAction] = useState<'pause' | 'resume' | null>(null)
  const feedback = action ? { pause, resume }[action] : null
  if (!me?.user || !hero) return <LoadingState label="Loading settings…" />
  const healthy = hero.simulationState !== 'quarantined'
  return (
    <>
      <header><h1 className="font-display text-3xl font-bold">Settings</h1><p className="mt-2 text-sm text-muted">Your public name, adventures and TRMNL connections.</p></header>
      <Card title="Profile">
        <p>
          Public name: <strong>{me.user.publicAlias}</strong>
        </p>
        <p className="mt-1 text-sm text-muted">Shown publicly on leaderboards and TRMNL screens.</p>
      </Card>
      <Card title="Adventures">
        {hero.activationState !== 'active' ? (
          <p>Your hero is ready. Return to TRMNL and Save the Desk Crawler plugin to start adventures.</p>
        ) : hero.status === 'paused' ? (
          <>
            <p>Adventures are paused. Your hero earns nothing while paused and there is no catch-up.</p>
            <Button className="mt-3" pending={resume.pending} busyLabel="Resuming…" disabled={!healthy || pause.pending} onClick={() => { setAction('resume'); return resume.run({}, 'Adventures resumed. Your hero joins the next adventure.') }}>
              Resume adventures
            </Button>
          </>
        ) : hero.status === 'sleeping' ? (
          <p>Adventures stopped to keep a new find safe. <Link to="/app/desk-crawler/inventory" className="underline underline-offset-4">Make room in your bag and resume</Link>.</p>
        ) : (
          <>
            <p>Pause encounters and rewards until you’re ready to resume. Recent XP ages out, so your rank can change. Lifetime progress stays earned.</p>
            <Button className="mt-3" variant="secondary" pending={pause.pending} busyLabel="Pausing…" disabled={!healthy || resume.pending || (hero.status !== 'exploring' && hero.status !== 'resting')} onClick={() => { setAction('pause'); return pause.run({}, 'Adventures paused. Resume whenever you’re ready.') }}>
              Pause adventures
            </Button>
          </>
        )}
        {hero.status === 'dead' || hero.status === 'travelling' ? <p className="mt-2 text-sm text-muted">You can pause after your hero returns from {hero.status === 'dead' ? 'recovering' : 'travelling'}.</p> : null}
        {!healthy ? <p className="mt-2 text-sm">Your hero is paused for a service check. Progress is safe.</p> : null}
        <ActionFeedback error={feedback?.error ?? null} message={feedback?.message ?? null} />
      </Card>
      <DeskKeepsakes />
      <Card title="TRMNL installations">
        <p className="mb-3 text-sm text-muted">Plugin installations showing your hero. Your hero keeps adventuring even if all are disconnected.</p>
        {connections === undefined ? <LoadingState label="Loading installations…" /> : connections.length > 0 ? (
          <ul className="flex flex-col divide-y divide-rule">
            {connections.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 py-2">
                <span className="min-w-0">
                  <span className="font-semibold">Installation {c.uuid.slice(0, 8)}</span>
                  <span className="ml-2 text-sm text-muted">{c.state === 'active' ? 'Connected' : c.state === 'uninstalled' ? 'Uninstalled' : 'Disconnected'}</span>
                </span>
                {c.state === 'active' ? (
                  <Button allowOffline variant="secondary" disabled={disconnect.pending} onClick={() => { disconnect.clearFeedback(); setDisconnectId(c.id) }}>
                    Disconnect
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p>No installations connected. Your activated hero keeps its progress. Connect again through the Desk Crawler plugin in TRMNL.</p>
        )}
        {disconnectId ? <div className="mt-4 border-t border-rule pt-4">
          <p className="font-semibold">Disconnect installation {connections?.find((connection) => connection.id === disconnectId)?.uuid.slice(0, 8)}?</p>
          <p className="mt-2 text-sm">This stops new screens for this installation. Your hero keeps adventuring. TRMNL may show its last image until you remove the plugin from the playlist.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" pending={disconnect.pending} busyLabel="Disconnecting…" onClick={async () => { const connection = connections?.find((entry) => entry.id === disconnectId); if (connection && await disconnect.run({ instanceId: connection.id }, 'Installation disconnected. Your hero keeps adventuring.')) setDisconnectId(null) }}>Confirm disconnect</Button>
            <Button allowOffline variant="quiet" disabled={disconnect.pending} onClick={() => setDisconnectId(null)}>Cancel</Button>
          </div>
        </div> : null}
        <ActionFeedback {...disconnect} />
        <Link to="/help/desk-crawler" className="mt-2 inline-flex min-h-11 items-center text-sm underline underline-offset-4">Help with connections and display refresh</Link>
      </Card>
      <details className="border-t-2 border-hp pt-4">
        <summary className="min-h-11 cursor-pointer font-semibold text-hp-ink">Delete Desk Crawler progress…</summary>
        <p>
          This removes your Desk Crawler hero, items, history and TRMNL connections. It cannot be undone. Your TRMNL Games account and sign-in stay available, and progress in other games is unaffected. Your public name disappears from Desk Crawler rankings immediately. Backups expire within about a week; TRMNL may keep its last screen until you remove the plugin.
        </p>
        <label className="mt-3 flex flex-col gap-1 text-sm">
          <span className="font-semibold">Type DELETE to confirm</span>
          <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="min-h-11 border-2 border-edge bg-ground px-3 text-base" autoComplete="off" autoCapitalize="characters" spellCheck={false} disabled={deletion.pending} />
        </label>
        <Button
          className="mt-3"
          variant="danger"
          pending={deletion.pending}
          busyLabel="Removing progress…"
          disabled={confirmText !== 'DELETE' || deletion.pending}
          onClick={async () => {
            await deletion.run({ confirm: 'DELETE' })
          }}
        >
          Delete my Desk Crawler progress
        </Button>
        <ActionFeedback {...deletion} />
        <p className="mt-4 text-sm">To delete your sign-in and all games, go to <Link to="/account" className="underline underline-offset-4">Account</Link>.</p>
      </details>
      <Card title="Help">
        <p className="text-sm">Your TRMNL shows a snapshot of the game and refreshes on its own schedule. Sleep Mode and slower refresh never reduce your hero's progress.</p>
        <Link to="/support" className="mt-2 inline-flex min-h-11 items-center text-sm underline underline-offset-4">Contact support</Link>
      </Card>
    </>
  )
}
