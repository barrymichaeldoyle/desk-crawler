import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ConvexError } from 'convex/values'
import { useMutation } from 'convex/react'
import { useEffect, useRef, useState } from 'react'
import { api } from '@trmnl-games/backend/api'

type Summary = {
  baseline: { at: number } | null
  observed: { logSequence: number }
  xpGained: number | null
  levelsGained: number | null
  newEvents: number | null
  counters: { combatWins: number; goldEarned: number; itemsFound: number; deaths: number } | null
  unequipped: number
  held: boolean
  status: string
}

/**
 * D25 return recap: frozen for this visit, acknowledged once after it has been
 * visible for a moment (never during SSR, prefetch or a hidden tab).
 */
export function ReturnRecap() {
  const { data, refetch } = useQuery(convexQuery(api.heroes.returnSummary, {}))
  const record = useMutation(api.heroes.recordCompanionVisit)
  const [shown, setShown] = useState<Summary | null>(null)
  const acknowledged = useRef(false)

  useEffect(() => {
    if (data && shown === null) setShown(data as Summary)
  }, [data, shown])

  useEffect(() => {
    if (!shown || acknowledged.current) return
    let attempts = 0
    const acknowledge = async (sequence: number) => {
      if (document.visibilityState !== 'visible') return
      acknowledged.current = true
      try {
        await record({ operationId: crypto.randomUUID(), expectedLogSequence: sequence })
      } catch (error) {
        const code = error instanceof ConvexError ? (error.data as { code?: string }).code : undefined
        if (code === 'RECAP_CHANGED' && attempts < 1) {
          attempts += 1
          // Newer events exist: show them before acknowledging (bounded retry).
          const fresh = (await refetch()).data as Summary | undefined
          if (fresh) {
            setShown(fresh)
            acknowledged.current = false
          }
        }
      }
    }
    const timer = window.setTimeout(() => void acknowledge(shown.observed.logSequence), 2000)
    return () => window.clearTimeout(timer)
  }, [shown, record, refetch])

  if (!shown) return null
  return <Ledger summary={shown} />
}

function Ledger({ summary }: { summary: Summary }) {
  const bag = summary.held ? (
    <p className="mt-3 font-semibold">
      A new find is waiting.{' '}
      <Link to="/app/desk-crawler/inventory" className="underline underline-offset-4">
        Manage your bag
      </Link>
    </p>
  ) : summary.unequipped > 0 ? (
    <p className="mt-3 text-sm text-stone-700 dark:text-stone-300">
      {summary.unequipped} unequipped {summary.unequipped === 1 ? 'item' : 'items'} in your bag.{' '}
      <Link to="/app/desk-crawler/inventory" className="underline underline-offset-4">
        Review gear
      </Link>
    </p>
  ) : null

  if (summary.baseline === null) {
    return (
      <section aria-labelledby="ledger-title">
        <h2 id="ledger-title" className="font-display text-xl font-semibold">
          Your first visit
        </h2>
        <p className="mt-2 max-w-prose">Your hero adventures every 15 minutes, even with this page closed and your TRMNL asleep. Come back in a few days and this is where you will see what they got up to.</p>
        {bag}
      </section>
    )
  }

  const since = new Date(summary.baseline.at).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const rows: Array<[string, number]> = [
    ['XP', summary.xpGained ?? 0],
    ['Levels', summary.levelsGained ?? 0],
    ...(summary.counters
      ? ([
          ['Fights won', summary.counters.combatWins],
          ['Gold earned', summary.counters.goldEarned],
          ['Items found', summary.counters.itemsFound],
          ...(summary.counters.deaths > 0 ? ([['Knockouts', summary.counters.deaths]] as Array<[string, number]>) : []),
        ] as Array<[string, number]>)
      : []),
  ]
  const quiet = rows.every(([, value]) => value === 0)
  return (
    <section aria-labelledby="ledger-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id="ledger-title" className="font-display text-xl font-semibold">
          Since you left
        </h2>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          {since}
          {summary.newEvents && !quiet ? ` · ${summary.newEvents} log ${summary.newEvents === 1 ? 'entry' : 'entries'}` : ''}
        </p>
      </div>
      {quiet ? (
        <p className="mt-2">Nothing new yet. Your hero is still at it.</p>
      ) : (
        <dl className="mt-2 grid grid-cols-2 border-t border-stone-900 sm:grid-cols-3 dark:border-stone-300">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-2 border-b border-stone-300 py-2 odd:pr-4 sm:pr-4 dark:border-stone-700">
              <dt className="caps text-sm text-stone-600 dark:text-stone-400">{label}</dt>
              <dd className={`text-xl font-bold tabular-nums ${value === 0 ? 'text-stone-400 dark:text-stone-600' : ''}`}>{value > 0 ? `+${value.toLocaleString()}` : '0'}</dd>
            </div>
          ))}
        </dl>
      )}
      {bag}
    </section>
  )
}
