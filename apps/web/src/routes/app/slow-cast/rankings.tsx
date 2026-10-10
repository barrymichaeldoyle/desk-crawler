import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '@trmnl-games/backend/api'
import { preload } from '../../../lib/preload'
import { Card } from '../../../lib/ui'

/** Slow Cast rankings by XP: seven days and a day in level groups, all time overall, from the hourly published set. */
export const Route = createFileRoute('/app/slow-cast/rankings')({
  loader: ({ context }) => preload(context, convexQuery(api.slowCast.leaderboard.view, { board: 'recent_7d' })),
  component: RankingsPage,
})

const BOARDS = [
  { id: 'recent_7d', label: '7 days' },
  { id: 'recent_24h', label: '24 hours' },
  { id: 'overall', label: 'All time' },
] as const

type View = { published: false } | { published: true; cohortLabel: string; totalPlayers: number; globalTotalPlayers: number; scoreAt: number; entries: Array<{ rank: number; name: string; level: number; score: number }>; own: { rank: number; rankDelta: number | null; score: number | null } | null }

function RankingsPage() {
  const [board, setBoard] = useState<(typeof BOARDS)[number]['id']>('recent_7d')
  const { data } = useQuery(convexQuery(api.slowCast.leaderboard.view, { board }))
  const view = data as View | undefined
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Rankings</h1>
      <div role="tablist" aria-label="Period" className="flex gap-2">
        {BOARDS.map((b) => (
          <button key={b.id} type="button" role="tab" aria-selected={board === b.id} onClick={() => setBoard(b.id)} className={`hud text-hud-sm min-h-11 flex-1 border-[3px] px-3 ${board === b.id ? 'border-gold bg-gold text-night' : 'border-edge text-ink'}`}>
            {b.label}
          </button>
        ))}
      </div>
      {!view ? null : !view.published ? (
        <Card><p>The first rankings appear at the end of the hour.</p></Card>
      ) : (
        <Card title={view.cohortLabel}>
          <p className="mb-3 text-sm text-muted">
            {view.own ? <>You are #{view.own.rank} of {view.totalPlayers}{view.own.rankDelta ? <>, <span className={view.own.rankDelta > 0 ? 'text-xp-ink' : 'text-hp-ink'}>{view.own.rankDelta > 0 ? 'up' : 'down'} {Math.abs(view.own.rankDelta)}</span> since the last update</> : null}.</> : `${view.totalPlayers} anglers in this group.`} Updated hourly; {view.globalTotalPlayers} anglers fished this week.
          </p>
          <ol className="flex flex-col">
            {view.entries.map((row) => (
              <li key={row.rank} className={`flex items-center gap-3 border-b border-rule py-2 last:border-b-0 ${view.own?.rank === row.rank ? 'font-semibold text-gold-ink' : ''}`}>
                <span className="w-10 shrink-0 tabular-nums">{row.rank}</span>
                <span className="min-w-0 flex-1 truncate">{row.name}</span>
                <span className="shrink-0 text-sm text-muted">L{row.level}</span>
                {board !== 'overall' ? <span className="w-20 shrink-0 text-right tabular-nums">{row.score} XP</span> : null}
              </li>
            ))}
          </ol>
        </Card>
      )}
    </>
  )
}
