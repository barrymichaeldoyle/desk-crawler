import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '../../../convex/_generated/api'
import { seo } from '../../lib/seo'
import { Button, Card } from '../../lib/ui'

export const Route = createFileRoute('/app/leaderboard')({ head: () => seo({ title: 'Rankings', index: false }), component: Leaderboard })

type Board = 'recent_7d' | 'recent_24h' | 'overall'
const TABS: Array<{ board: Board; label: string }> = [
  { board: 'recent_7d', label: 'Last 7 days' },
  { board: 'recent_24h', label: 'Last 24 hours' },
  { board: 'overall', label: 'Lifetime' },
]

const groupLabel = (key: string) => (key === 'all' ? 'All heroes' : `Levels ${key}`)

function Leaderboard() {
  const [board, setBoard] = useState<Board>('recent_7d')
  const [cohortKey, setCohortKey] = useState<string | undefined>(undefined)
  const { data } = useQuery(convexQuery(api.leaderboard.view, { board, ...(cohortKey ? { cohortKey } : {}) }))
  return (
    <>
      <h1 className="sr-only">Rankings</h1>
      <div role="group" aria-label="Ranking period" className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.board}
            type="button"
            aria-pressed={board === tab.board}
            onClick={() => {
              setBoard(tab.board)
              setCohortKey(undefined)
            }}
            className={`min-h-11 flex-1 rounded-md border px-2 text-sm font-semibold ${board === tab.board ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900' : 'border-stone-300 dark:border-stone-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {!data ? (
        <p role="status" className="text-stone-600 dark:text-stone-400">Loading rankings…</p>
      ) : !data.published ? (
        <Card>
          <p>Rankings publish every hour. Check back soon.</p>
        </Card>
      ) : (
        <Card title={`${groupLabel(data.cohortKey)}, ${data.totalPlayers} ${data.totalPlayers === 1 ? 'hero' : 'heroes'}`}>
          <p className="mb-3 text-sm text-stone-600 dark:text-stone-400">
            {board === 'overall' ? 'Ranked by level and XP.' : 'XP earned in the period among heroes of similar level.'} Updated{' '}
            {new Date(data.scoreAt).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}.
          </p>
          {data.own ? (
            <p className="mb-3 font-semibold">
              You are #{data.own.rank}
              {data.own.rankDelta ? ` (${data.own.rankDelta > 0 ? '+' : ''}${data.own.rankDelta})` : ''}
              {data.own.score !== null ? ` · ${data.own.score} XP` : ''}
            </p>
          ) : data.ownCohortKey && data.ownCohortKey !== data.cohortKey ? (
            <Button variant="quiet" onClick={() => setCohortKey(data.ownCohortKey ?? undefined)}>
              Back to my group
            </Button>
          ) : (
            <p className="mb-3 text-sm text-stone-600 dark:text-stone-400">Your hero appears after its next ranked update.</p>
          )}
          {data.entries.length === 0 ? (
            <p>No heroes in this group yet.</p>
          ) : (
            <ol className="flex flex-col divide-y divide-stone-200 dark:divide-stone-800">
              {data.entries.map((row: { rank: number; name: string; hero_name: string; level: number; score: number }) => (
                <li key={row.rank} className="flex items-center gap-3 py-2">
                  <span className="w-8 text-right font-bold tabular-nums">{row.rank}</span>
                  <span className="flex-1">
                    <span className="font-semibold">{row.name}</span>
                    {row.hero_name ? <span className="text-stone-600 dark:text-stone-400"> · {row.hero_name}</span> : null}
                  </span>
                  <span className="text-sm tabular-nums text-stone-600 dark:text-stone-400">{board === 'overall' ? `Level ${row.level}` : `${row.score} XP`}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}
    </>
  )
}
