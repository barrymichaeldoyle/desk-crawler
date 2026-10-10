import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '@trmnl-games/backend/api'
import { preload } from '../../../lib/preload'
import { formatWeight } from '../../../lib/slowCast'
import { Card } from '../../../lib/ui'
import { FishName } from './-fish'

/**
 * Slow Cast rankings (2026-10-10): each water's heaviest fish, this week and of all time. No XP or levels: the fish
 * itself is the score. Opens on the angler's own water.
 */
export const Route = createFileRoute('/app/slow-cast/rankings')({
  loader: ({ context }) => preload(context, convexQuery(api.slowCast.leaderboard.view, {})),
  component: RankingsPage,
})

const WATERS = [
  { id: 'millpond', label: 'Millpond' },
  { id: 'river_bend', label: 'River Bend' },
  { id: 'harbour_pier', label: 'Harbour Pier' },
] as const
const PERIODS = [
  { id: 'week', label: 'This week' },
  { id: 'all', label: 'All time' },
] as const

type Row = { rank: number; name: string; speciesId: string; grams: number; own: boolean; profile: boolean }
type View = { waterId: (typeof WATERS)[number]['id']; period: 'week' | 'all'; weekEndsAt: number; entries: Row[]; own: { rank: number | null; speciesId: string; grams: number } | null; full: boolean }

const TAB = 'hud text-hud-sm min-h-11 flex-1 border-[3px] px-2'

function RankingsPage() {
  const { data: first } = useQuery(convexQuery(api.slowCast.leaderboard.view, {}))
  const [water, setWater] = useState<View['waterId'] | null>(null)
  const [period, setPeriod] = useState<View['period']>('week')
  const chosen = water ?? (first as View | undefined)?.waterId ?? 'millpond'
  const { data } = useQuery(convexQuery(api.slowCast.leaderboard.view, { waterId: chosen, period }))
  const view = data as View | undefined
  const resets = view ? new Date(view.weekEndsAt).toLocaleString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' }) : null
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Rankings</h1>
      <p className="text-sm text-muted">The heaviest fish each angler has landed at each water, kept or released.</p>
      <div role="tablist" aria-label="Water" className="flex gap-2">
        {WATERS.map((w) => (
          <button key={w.id} type="button" role="tab" aria-selected={chosen === w.id} onClick={() => setWater(w.id)} className={`${TAB} ${chosen === w.id ? 'border-gold bg-gold text-night' : 'border-edge text-ink'}`}>
            {w.label}
          </button>
        ))}
      </div>
      <div role="tablist" aria-label="Period" className="flex gap-2">
        {PERIODS.map((p) => (
          <button key={p.id} type="button" role="tab" aria-selected={period === p.id} onClick={() => setPeriod(p.id)} className={`${TAB} ${period === p.id ? 'border-gold text-gold-ink' : 'border-edge text-muted'}`}>
            {p.label}
          </button>
        ))}
      </div>
      {!view ? null : (
        <Card>
          <p className="mb-3 text-sm text-muted">
            {view.own ? <>Your best: {formatWeight(view.own.grams)} <FishName id={view.own.speciesId} />{view.own.rank ? `, #${view.own.rank}` : ''}.</> : `You have no fish here ${view.period === 'week' ? 'this week' : 'yet'}.`}
            {view.period === 'week' && resets ? ` Starts again ${resets}.` : ''}
          </p>
          {view.entries.length === 0 ? <p>No fish landed here {view.period === 'week' ? 'this week' : 'yet'}.</p> : (
            <ol className="flex flex-col">
              {view.entries.map((row) => (
                <li key={row.rank} className={`flex items-center gap-3 border-b border-rule py-2 last:border-b-0 ${row.own ? 'bg-raised' : ''}`}>
                  <span className="w-8 shrink-0 tabular-nums text-muted">{row.rank}</span>
                  <span className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className={`truncate ${row.own ? 'font-semibold text-gold-ink' : ''}`}>
                      {row.profile ? <Link to="/profile/$alias" params={{ alias: row.name }} className="underline underline-offset-4">{row.name}</Link> : row.name}
                    </span>
                    <span className="text-sm"><FishName id={row.speciesId} /></span>
                  </span>
                  <span className="shrink-0 tabular-nums">{formatWeight(row.grams)}</span>
                </li>
              ))}
            </ol>
          )}
          {view.full ? <p className="mt-3 text-sm text-muted">Showing the top 100.</p> : null}
        </Card>
      )}
    </>
  )
}
