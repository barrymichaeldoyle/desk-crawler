import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { api } from '../../../convex/_generated/api'
import { useIntent } from '../../lib/intent'
import { Button, Card, ErrorNote } from '../../lib/ui'

export const Route = createFileRoute('/app/settings')({ component: Settings })

function Settings() {
  const { data: me } = useQuery(convexQuery(api.users.me, {}))
  const { data: hero } = useQuery(convexQuery(api.heroes.mine, {}))
  const setTimezone = useIntent(api.users.setTimezone)
  const pause = useIntent(api.heroes.pause)
  const resume = useIntent(api.heroes.resume)
  const browserZone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'
  if (!me?.user || !hero) return <p className="text-stone-500">Loading settings…</p>
  return (
    <>
      <Card title="Profile">
        <p>
          Public name: <strong>{me.user.publicAlias}</strong>
        </p>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">Shown publicly on leaderboards and TRMNL screens.</p>
      </Card>
      <Card title="Time zone">
        <p>
          Times are shown in <strong>{me.user.timezone}</strong>. This only changes how times are written, never your hero's progress.
        </p>
        {browserZone !== me.user.timezone ? (
          <Button className="mt-3" variant="secondary" disabled={setTimezone.pending} onClick={() => setTimezone.run({ timezone: browserZone })}>
            Use {browserZone}
          </Button>
        ) : null}
        <ErrorNote message={setTimezone.error} />
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
      <Card title="Help">
        <p className="text-sm">Your TRMNL shows a dated snapshot of the game and refreshes on its own schedule. Sleep Mode and slower refresh never reduce your hero's progress.</p>
      </Card>
    </>
  )
}
