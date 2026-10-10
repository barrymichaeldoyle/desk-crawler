import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '@trmnl-games/backend/api'
import { useIntent } from '../../../lib/intent'
import { preload } from '../../../lib/preload'
import type { Dock } from '../../../lib/slowCast'
import { ActionFeedback, Button, Card, NoticeBar, useNotice } from '../../../lib/ui'
import { AlertsCard, type AlertKindCopy } from '../desk-crawler/-alerts'
import { ConfirmSheet, Consequences } from '../desk-crawler/-confirm'

/** The More tab: links to rankings, achievements and help, then settings (pause, public profile, alerts, deleting Slow Cast progress alone). */
export const Route = createFileRoute('/app/slow-cast/settings')({
  loader: ({ context }) => preload(context, convexQuery(api.slowCast.anglers.dock, {})),
  component: SettingsPage,
})

const SLOW_CAST_ALERTS: readonly AlertKindCopy[] = [
  { id: 'coolerFull', name: 'Cooler full', blurb: 'New catches are being released. Sent half an hour after the cooler fills, once each time.' },
  { id: 'baitOut', name: 'Out of bait', blurb: 'Your angler used up the bait they were fishing with and is on a bare hook.' },
]

const MORE_LINKS = [
  { to: '/app/slow-cast/rankings', label: 'Rankings', blurb: 'Where you stand on the XP boards.' },
  { to: '/app/slow-cast/achievements', label: 'Achievements', blurb: 'Every tier you have earned and what comes next.' },
  { to: '/help/slow-cast', label: 'How Slow Cast works', blurb: 'Bait, weather, waters and the cooler.' },
] as const

function SettingsPage() {
  const { notice, notify, dismiss } = useNotice()
  const { data } = useQuery(convexQuery(api.slowCast.anglers.dock, {}))
  const dock = data as Dock | undefined
  const pause = useIntent(api.slowCast.anglers.pause)
  const resume = useIntent(api.slowCast.anglers.resume)
  const profile = useIntent(api.slowCast.anglers.setPublicProfile)
  const deletion = useIntent(api.deletion.requestGameDeletion)
  const [confirm, setConfirm] = useState('')
  const [askingPause, setAskingPause] = useState(false)
  const angler = dock?.angler
  if (!angler) return null
  const active = angler.activationState === 'active'
  return (
    <>
      <h1 className="font-display text-3xl font-bold">More</h1>
      <Card>
        <ul className="flex flex-col">
          {MORE_LINKS.map((link) => (
            <li key={link.to} className="border-b border-rule last:border-b-0">
              <Link to={link.to} className="flex min-h-12 flex-col justify-center py-2">
                <span className="font-semibold underline underline-offset-4">{link.label}</span>
                <span className="text-sm text-muted">{link.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <h2 className="font-display text-2xl font-bold">Settings</h2>
      {active ? (
        <Card title="Fishing">
          <p>{angler.status === 'paused' ? 'Fishing is paused. Your angler catches nothing until you resume, and keeps everything they have.' : 'Your angler casts every fifteen minutes, day and night.'}</p>
          <div className="mt-3">
            {angler.status === 'paused'
              ? <Button pending={resume.pending} onClick={() => void resume.run({}, 'Fishing resumed.')}>Resume fishing</Button>
              : <Button variant="secondary" disabled={pause.pending} onClick={() => setAskingPause(true)}>Pause fishing</Button>}
          </div>
          <ActionFeedback error={pause.error ?? resume.error} message={pause.message ?? resume.message} />
        </Card>
      ) : null}
      {active ? (
        <Card title="Public profile">
          <p>{angler.publicProfile ? 'Your Slow Cast level, rank and logbook count show on your public profile.' : 'Your Slow Cast progress is private.'} Leaderboards always show your public name.</p>
          <div className="mt-3">
            <Button variant="secondary" pending={profile.pending} onClick={() => void profile.run({ visible: !angler.publicProfile }, angler.publicProfile ? 'Slow Cast is now private on your profile.' : 'Slow Cast now shows on your profile.')}>
              {angler.publicProfile ? 'Make private' : 'Show on my profile'}
            </Button>
          </div>
          {angler.publicProfile ? <p className="mt-3 text-sm"><Link to="/profile/$alias" params={{ alias: angler.alias }} className="underline underline-offset-4">Open your public profile</Link></p> : null}
          <ActionFeedback error={profile.error} message={profile.message} />
        </Card>
      ) : null}
      {active ? <AlertsCard notify={notify} kinds={SLOW_CAST_ALERTS} intro="Get a nudge on this phone when your angler needs you." quietNote="A cooler alert waits until quiet hours end; an out-of-bait alert during quiet hours is skipped." /> : null}
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
      <ConfirmSheet
        open={askingPause}
        title="Pause fishing?"
        confirmLabel="Pause fishing"
        busyLabel="Pausing…"
        cancelLabel="Keep fishing"
        pending={pause.pending}
        onClose={() => setAskingPause(false)}
        onConfirm={async () => {
          if (pause.pending) return
          await pause.run({}, 'Fishing paused.')
          setAskingPause(false)
        }}
      >
        <Consequences>
          <li>No casts, fish or XP until you resume, and missed casts are not made up later.</li>
          <li>Your 24-hour and 7-day XP keeps ageing out, so you can drop down those boards.</li>
          <li>Your cooler, bait and gold stay as they are. Resume any time.</li>
        </Consequences>
      </ConfirmSheet>
      <NoticeBar notice={notice} onDismiss={dismiss} />
    </>
  )
}
