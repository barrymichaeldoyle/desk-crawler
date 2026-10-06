import { Show } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '@trmnl-games/backend/api'
import type { Id } from '@trmnl-games/backend/data-model'
import { errorMessage } from '../lib/intent'
import { seo } from '../lib/seo'
import { Button, Card, ErrorNote } from '../lib/ui'

/** Owner-run support console (D23). Every action requires a reason and is audited server-side. */
export const Route = createFileRoute('/admin')({
  head: () => seo({ title: 'Admin', index: false }),
  component: () => (
    <main id="main" className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Desk Crawler admin</h1>
      <Show when="signed-in">
        <AdminGate />
      </Show>
      <Show when="signed-out">
        <p>Sign in first.</p>
      </Show>
    </main>
  ),
})

const when = (ts: number | null | undefined) => (ts ? new Date(ts).toLocaleString() : 'none')

function AdminGate() {
  const { data: isAdmin } = useQuery(convexQuery(api.admin.isAdmin, {}))
  if (isAdmin === undefined) return <p role="status" className="text-muted">Checking access…</p>
  if (!isAdmin) return <p>Not available.</p>
  return (
    <>
      <Health />
      <UserTools />
    </>
  )
}

function Health() {
  const { data } = useQuery(convexQuery(api.admin.health, {}))
  const resume = useMutation(api.admin.resumeBlockedRun)
  const release = useMutation(api.admin.releaseHero)
  const [error, setError] = useState<string | null>(null)
  if (!data) return <p role="status" className="text-muted">Loading health…</p>
  const act = async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(errorMessage(e))
    }
  }
  return (
    <Card title="Health">
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt>World tick</dt>
        <dd>{data.world?.currentTick ?? 'none'}</dd>
        <dt>Last completed</dt>
        <dd>
          tick {data.world?.lastCompletedTick ?? 'none'} at {when(data.world?.lastCompletedAt)}
        </dd>
        <dt>Last ranking publication</dt>
        <dd>{when(data.world?.lastPublishedAt)}</dd>
        <dt>Active run</dt>
        <dd>{data.activeRun ? `tick ${data.activeRun.tick} · ${data.activeRun.state}${data.activeRun.failureCode ? ` · ${data.activeRun.failureCode}` : ''}` : 'none'}</dd>
        <dt>Open incidents</dt>
        <dd>{data.openIncidents.length}</dd>
        <dt>Blocked deletions</dt>
        <dd>{data.blockedDeletions.length}</dd>
      </dl>
      {data.activeRun?.state === 'blocked' ? (
        <Button className="mt-3" onClick={() => act(() => resume({ reasonCode: 'admin_resume' }))}>
          Resume blocked run
        </Button>
      ) : null}
      {data.quarantined.length > 0 ? (
        <div className="mt-4">
          <h3 className="font-semibold">Quarantined heroes</h3>
          <ul>
            {data.quarantined.map((h: { id: Id<'heroes'>; name: string; reasonCode: string | null }) => (
              <li key={h.id} className="flex items-center justify-between gap-2 py-1">
                <span>
                  {h.name} · {h.reasonCode}
                </span>
                <Button variant="secondary" onClick={() => act(() => release({ heroId: h.id, reasonCode: 'diagnosed' }))}>
                  Release
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <h3 className="mt-4 font-semibold">Recent admin actions</h3>
      <ul className="text-sm">
        {data.recentAudit.map((a: { at: number; action: string; reasonCode: string; outcome: string }) => (
          <li key={`${a.at}-${a.action}`}>
            {when(a.at)} · {a.action} · {a.reasonCode} · {a.outcome}
          </li>
        ))}
      </ul>
      <ErrorNote message={error} />
    </Card>
  )
}

function UserTools() {
  const [alias, setAlias] = useState('')
  const [reason, setReason] = useState('')
  const { data: user } = useQuery({ ...convexQuery(api.admin.findUser, { alias }), enabled: alias.length >= 2 })
  const repair = useMutation(api.admin.repairPublicNames)
  const suspend = useMutation(api.admin.setSuspended)
  const [error, setError] = useState<string | null>(null)
  const act = async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(errorMessage(e))
    }
  }
  return (
    <Card title="Player support">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold">Public name</span>
        <input value={alias} onChange={(e) => setAlias(e.target.value)} className="min-h-11 border-2 border-edge bg-ground px-3 text-ink" />
      </label>
      <label className="mt-2 flex flex-col gap-1 text-sm">
        <span className="font-semibold">Reason (required, audited)</span>
        <input value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-11 border-2 border-edge bg-ground px-3 text-ink" />
      </label>
      {user ? (
        <div className="mt-3">
          <p>
            <strong>{user.alias}</strong> · {user.state} · hero {user.heroName ?? 'none'}
            {user.nameRepairRequired ? ' · name repair pending' : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="secondary" disabled={reason.length < 3} onClick={() => act(() => repair({ userId: user.id, reasonCode: reason }))}>
              Mask names and require repair
            </Button>
            <Button variant="secondary" disabled={reason.length < 3} onClick={() => act(() => suspend({ userId: user.id, suspended: user.state !== 'suspended', reasonCode: reason }))}>
              {user.state === 'suspended' ? 'Restore account' : 'Suspend account'}
            </Button>
          </div>
        </div>
      ) : alias.length >= 2 ? (
        <p className="mt-3 text-sm text-muted">No player with that public name.</p>
      ) : null}
      <ErrorNote message={error} />
    </Card>
  )
}
