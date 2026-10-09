import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { api } from '@trmnl-games/backend/api'
import { useIntent } from '../../../lib/intent'
import { Button, Card } from '../../../lib/ui'
import { SpriteIcon } from '../desk-crawler/-bagSlots'

type Box = { totalCollected: number; claimedThisWeek: boolean; nextAvailableAt: number | null; connected: boolean; newest: string | null; box: Array<{ id: string; name: string; count: number; rows: string[] }> } | null

type Notify = (feedback: { error: string | null; message: string | null }) => void

/** The fly box (D115): enter the code your TRMNL shows for one fly a week. Cosmetic; the newest one rides on the angler's hat. */
export function FlyBox({ notify }: { notify: Notify }) {
  const { data } = useQuery(convexQuery(api.slowCast.flies.mine, {}))
  const box = data as Box | undefined
  const claim = useIntent(api.slowCast.flies.claim, { onFeedback: notify })
  const [code, setCode] = useState('')
  if (!box) return null
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (await claim.run({ code }, 'Checking the code…')) setCode('')
  }
  const next = box.nextAvailableAt ? new Date(box.nextAvailableAt).toLocaleDateString([], { weekday: 'long' }) : null
  return (
    <Card title="Fly box">
      <p>Your TRMNL shows a <strong>Fly code</strong> in its title bar each week. Enter it here for a fly; the newest one rides on your angler's hat. Flies are for show: they never change a catch.</p>
      {box.claimedThisWeek ? (
        <p className="mt-3 text-sm font-semibold">This week's fly is in the box. A new code appears on {next}.</p>
      ) : box.connected ? (
        <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Fly code</span>
            <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="off" placeholder="482 917" className="min-h-11 w-36 border-2 border-edge bg-ground px-3 text-base tracking-widest" />
          </label>
          <Button type="submit" disabled={code.replace(/\s/g, '').length !== 6} pending={claim.pending} busyLabel="Checking…">Add the fly</Button>
        </form>
      ) : (
        <p className="mt-3 text-sm text-muted">Connect a TRMNL with Slow Cast to see this week's code.</p>
      )}
      <ul className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6" aria-label={`${box.totalCollected} flies collected`}>
        {box.box.map((fly) => (
          <li key={fly.id} className={`flex flex-col items-center gap-1 border p-2 text-center text-xs ${fly.count > 0 ? 'border-edge' : 'border-rule opacity-40'}`} title={fly.count > 0 ? fly.name : 'Not collected yet'}>
            <SpriteIcon sprite={{ width: fly.rows[0]!.length, height: fly.rows.length, rows: fly.rows }} scale={4} />
            <span className="leading-tight">{fly.count > 0 ? fly.name : '?'}{fly.count > 1 ? ` ×${fly.count}` : ''}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
