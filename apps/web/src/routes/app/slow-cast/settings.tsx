import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '@trmnl-games/backend/api'
import { useIntent } from '../../../lib/intent'
import { preload } from '../../../lib/preload'
import type { Dock } from '../../../lib/slowCast'
import { ActionFeedback, Button, Card } from '../../../lib/ui'

/** Slow Cast settings: pause, the public profile switch and deleting Slow Cast progress alone. */
export const Route = createFileRoute('/app/slow-cast/settings')({
  loader: ({ context }) => preload(context, convexQuery(api.slowCast.anglers.dock, {})),
  component: SettingsPage,
})

function SettingsPage() {
  const { data } = useQuery(convexQuery(api.slowCast.anglers.dock, {}))
  const dock = data as Dock | undefined
  const pause = useIntent(api.slowCast.anglers.pause)
  const resume = useIntent(api.slowCast.anglers.resume)
  const profile = useIntent(api.slowCast.anglers.setPublicProfile)
  const deletion = useIntent(api.deletion.requestGameDeletion)
  const [confirm, setConfirm] = useState('')
  const angler = dock?.angler
  if (!angler) return null
  const active = angler.activationState === 'active'
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Slow Cast settings</h1>
      {active ? (
        <Card title="Fishing">
          <p>{angler.status === 'paused' ? 'The rod is on the rest. Nothing is caught and nothing is lost while paused.' : 'Your angler casts every fifteen minutes, day and night.'}</p>
          <div className="mt-3">
            {angler.status === 'paused'
              ? <Button pending={resume.pending} onClick={() => void resume.run({}, 'Line back in the water.')}>Resume fishing</Button>
              : <Button variant="secondary" pending={pause.pending} onClick={() => void pause.run({}, 'Rod on the rest.')}>Pause fishing</Button>}
          </div>
          <ActionFeedback error={pause.error ?? resume.error} message={pause.message ?? resume.message} />
        </Card>
      ) : null}
      {active ? (
        <Card title="Public profile">
          <p>{angler.publicProfile ? 'Your Slow Cast level, rank and logbook count show on your public profile.' : 'Your Slow Cast progress is private.'} Leaderboards show your public name either way.</p>
          <div className="mt-3">
            <Button variant="secondary" pending={profile.pending} onClick={() => void profile.run({ visible: !angler.publicProfile }, angler.publicProfile ? 'Slow Cast is now private on your profile.' : 'Slow Cast now shows on your profile.')}>
              {angler.publicProfile ? 'Make private' : 'Show on my profile'}
            </Button>
          </div>
          {angler.publicProfile ? <p className="mt-3 text-sm"><Link to="/profile/$alias" params={{ alias: angler.alias }} className="underline underline-offset-4">Open your public profile</Link></p> : null}
          <ActionFeedback error={profile.error} message={profile.message} />
        </Card>
      ) : null}
      <Card title="Delete Slow Cast progress">
        <p>This removes your angler, cooler, logbook and Slow Cast connections. Your TRMNL Games account and your other games stay. It cannot be undone.</p>
        <label className="mt-3 flex flex-col gap-1">
          <span className="text-sm font-semibold">Type DELETE to confirm</span>
          <input value={confirm} onChange={(event) => setConfirm(event.target.value)} className="min-h-11 border-2 border-edge bg-ground px-3 text-base" autoComplete="off" />
        </label>
        <div className="mt-3">
          <Button variant="danger" disabled={confirm !== 'DELETE'} pending={deletion.pending} onClick={() => void deletion.run({ confirm: 'DELETE', gameSlug: 'slow-cast' }, 'Removing Slow Cast progress.')}>Delete Slow Cast progress</Button>
        </div>
        <ActionFeedback error={deletion.error} message={deletion.message} />
      </Card>
      <p className="text-sm"><Link to="/account" className="underline underline-offset-4">Account settings</Link> cover your public name, analytics and deleting your whole account.</p>
    </>
  )
}
