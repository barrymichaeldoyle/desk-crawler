import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '@trmnl-games/backend/api'
import { seo } from '../../../lib/seo'
import { Button, Card, LoadingState } from '../../../lib/ui'
import { preload } from '../../../lib/preload'
import { levelGroup } from '@trmnl-games/desk-crawler/sim/core/stats'

export const Route = createFileRoute('/app/desk-crawler/leaderboard')({ head: () => seo({ title: 'Rankings', index: false }), loader: ({ context }) => preload(context, convexQuery(api.leaderboard.view, { board: 'recent_7d' }), convexQuery(api.heroes.mine, {})), component: Leaderboard })

type Board = 'recent_7d' | 'recent_24h' | 'overall'
const TABS: Array<{ board: Board; label: string }> = [
  { board: 'recent_7d', label: 'Last 7 days' },
  { board: 'recent_24h', label: 'Last 24 hours' },
  { board: 'overall', label: 'Lifetime' },
]

const groupLabel = (key: string) => (key === 'all' ? 'All heroes' : `Levels ${key.replace('-', '–')}`)

function Leaderboard() {
  const [board, setBoard] = useState<Board>('recent_7d')
  const [cohortKey, setCohortKey] = useState<string | undefined>(undefined)
  const { data } = useQuery(convexQuery(api.leaderboard.view, { board, ...(cohortKey ? { cohortKey } : {}) }))
  const { data: hero } = useQuery(convexQuery(api.heroes.mine, {}))
  const ownGroup = data?.ownCohortKey ?? (hero ? levelGroup(hero.level).key : '1-3')
  const groups = [...new Set(['1-3', '4-7', '8-11', ownGroup, ...(cohortKey ? [cohortKey] : [])])]
  const stopped = hero && (hero.status === 'paused' || (hero.status === 'sleeping' && hero.wakeAtTick === null))
  return (
    <>
      <header><h1 className="font-display text-3xl font-bold">Rankings</h1><p className="mt-2 text-sm text-stone-600 dark:text-stone-400">A little friendly competition. Recent XP is compared with heroes of similar level.</p></header>
      <div role="group" aria-label="Ranking period" className="flex border border-stone-900 dark:border-stone-300">
        {TABS.map((tab) => (
          <button
            key={tab.board}
            type="button"
            aria-pressed={board === tab.board}
            onClick={() => {
              setBoard(tab.board)
              setCohortKey(undefined)
            }}
            className={`min-h-11 flex-1 px-2 py-2 text-sm font-semibold not-last:border-r not-last:border-stone-900 dark:not-last:border-stone-300 ${board === tab.board ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'hover:bg-stone-200 dark:hover:bg-stone-800'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {board !== 'overall' ? <label className="flex flex-wrap items-center gap-3 text-sm"><span className="font-semibold">Level group</span><select value={cohortKey ?? ownGroup} onChange={(event) => setCohortKey(event.target.value === ownGroup ? undefined : event.target.value)} className="min-h-11 flex-1 border border-stone-400 bg-stone-50 px-3 text-base sm:flex-none dark:border-stone-600 dark:bg-stone-950">{groups.map((key) => <option key={key} value={key}>{groupLabel(key)}{key === ownGroup ? ' (your group)' : ''}</option>)}</select></label> : null}
      {!data ? (
        <LoadingState label="Loading rankings…" />
      ) : !data.published ? (
        <Card title="The first rankings are on their way">
          <p>Your hero’s first rank appears within the hour. Adventures continue while you wait.</p>
        </Card>
      ) : (
        <Card title={`${groupLabel(data.cohortKey)}, ${data.totalPlayers} ${data.totalPlayers === 1 ? 'hero' : 'heroes'}`}>
          <p className="mb-3 text-sm text-stone-600 dark:text-stone-400">
            {board === 'overall' ? 'Ranked by level and XP.' : 'XP earned in the period among heroes of similar level.'} Updated{' '}
            <time dateTime={new Date(data.scoreAt).toISOString()}>{new Date(data.scoreAt).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>. Refreshes hourly.
          </p>
          {data.own ? (
            <p className="mb-3 font-semibold">
              You are #{data.own.rank.toLocaleString()} of {data.totalPlayers.toLocaleString()}
              {data.own.rankDelta ? ` · ${data.own.rankDelta > 0 ? 'up' : 'down'} ${Math.abs(data.own.rankDelta)} since the previous update` : ''}
              {board !== 'overall' && data.own.score !== null ? ` · ${data.own.score.toLocaleString()} XP` : ''}
            </p>
          ) : ownGroup !== data.cohortKey && board !== 'overall' ? (
            <Button variant="quiet" onClick={() => setCohortKey(undefined)}>
              Back to my group
            </Button>
          ) : (
            <p className="mb-3 text-sm text-stone-600 dark:text-stone-400">{stopped && board !== 'overall' ? 'Unranked while adventures are stopped and no XP remains in this period. Your lifetime progress stays earned.' : 'Your hero’s rank appears at the next hourly update.'}</p>
          )}
          {data.entries.length === 0 ? (
            <p>No ranked heroes in this group for this period. Try your group or a different period.</p>
          ) : (
            <ol className="flex flex-col divide-y divide-stone-200 dark:divide-stone-800">
              {data.entries.map((row: { rank: number; name: string; hero_name: string; level: number; score: number }) => (
                <li key={row.rank} className="flex min-w-0 items-start gap-3 py-3">
                  <span className="w-8 text-right font-bold tabular-nums">{row.rank}</span>
                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                    <span className="block font-semibold">{row.name}</span>
                    {row.hero_name ? <span className="block text-sm text-stone-600 dark:text-stone-400">{row.hero_name}</span> : null}
                  </span>
                  <span className="min-w-0 max-w-[45%] shrink-0 text-right text-sm tabular-nums text-stone-600 [overflow-wrap:anywhere] dark:text-stone-400">{board === 'overall' ? `Level ${row.level}` : `${row.score.toLocaleString()} XP`}</span>
                </li>
              ))}
            </ol>
          )}
          {data.totalPlayers > data.entries.length ? <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">Showing the top {data.entries.length} of {data.totalPlayers.toLocaleString()} heroes.{data.own ? ' Your exact rank is shown above.' : ''}</p> : null}
        </Card>
      )}
    </>
  )
}
