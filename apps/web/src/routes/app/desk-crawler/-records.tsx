import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { api } from '@trmnl-games/backend/api'

type Counters = { combatWins: number; retreats: number; deaths: number; rescues: number; goldEarned: number; itemsFound: number; ticksExplored: number }

const hours = (ticks: number) => {
  const total = Math.round((ticks * 15) / 60)
  return total < 48 ? `${total} h` : `${Math.round(total / 24)} days`
}

/** Seven-day rank in the hero's level group, from the same published board as Rankings. */
function Rank({ stopped }: { stopped: boolean }) {
  const { data } = useQuery(convexQuery(api.leaderboard.view, {}))
  if (!data) return <p className="text-stone-600 dark:text-stone-400">Reading the rankings…</p>
  const board = data as { published: boolean; cohortKey?: string; totalPlayers?: number; own?: { rank: number; rankDelta: number | null } | null }
  const group = board.cohortKey ? `Levels ${board.cohortKey.replace('-', '–').replace('+', ' and up')}` : 'your level group'
  if (!board.published || !board.own) {
    return <p>{board.published && stopped ? 'No recent rank while adventures are stopped and your seven-day XP has aged out. Lifetime progress stays earned.' : `Your hero joins the ${group} rankings after the next hourly update.`}</p>
  }
  const delta = board.own.rankDelta
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span className="font-display text-4xl font-bold tabular-nums">#{board.own.rank}</span>
      <span>
        of {board.totalPlayers} in {group}, last 7 days
        {delta ? <span className="ml-1 font-semibold">{delta > 0 ? `· up ${delta}` : `· down ${Math.abs(delta)}`}</span> : null}
      </span>
    </p>
  )
}

export function Records({ counters, lifetimeXp, stopped = false }: { counters: Counters; lifetimeXp: number; stopped?: boolean }) {
  const rows: Array<[string, string]> = [
    ['Lifetime XP', lifetimeXp.toLocaleString()],
    ['Fights won', counters.combatWins.toLocaleString()],
    ['Retreats', counters.retreats.toLocaleString()],
    ['Knockouts', counters.deaths.toLocaleString()],
    ['Rescues', counters.rescues.toLocaleString()],
    ['Items found', counters.itemsFound.toLocaleString()],
    ['Gold earned', counters.goldEarned.toLocaleString()],
    ['Time adventuring', hours(counters.ticksExplored)],
  ]
  return (
    <section aria-labelledby="records-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id="records-title" className="font-display text-xl font-semibold">
          Records
        </h2>
        <Link to="/app/desk-crawler/leaderboard" className="text-sm underline underline-offset-4">
          All rankings
        </Link>
      </div>
      <Rank stopped={stopped} />
      <dl className="grid grid-cols-2 border-t border-stone-900 dark:border-stone-300">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-2 border-b border-stone-300 py-2 odd:pr-4 dark:border-stone-700">
            <dt className="caps text-sm text-stone-600 dark:text-stone-400">{label}</dt>
            <dd className="font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
