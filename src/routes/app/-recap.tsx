import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ConvexError } from 'convex/values'
import { useMutation } from 'convex/react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../../../convex/_generated/api'
import { Card } from '../../lib/ui'

type Summary = {
  baseline: { at: number } | null
  observed: { logSequence: number }
  xpGained: number | null
  levelsGained: number | null
  newEvents: number | null
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
  if (shown.baseline === null) {
    return (
      <Card title="Welcome">
        <p>Your hero adventures every 15 minutes, even when this page and your TRMNL are off. Check back every few days to manage gear.</p>
      </Card>
    )
  }
  const since = new Date(shown.baseline.at).toLocaleString(undefined, { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  const quiet = !shown.xpGained && !shown.levelsGained
  return (
    <Card title={`Since ${since}`}>
      {quiet ? (
        <p>No new progress since your last visit.</p>
      ) : (
        <p>
          {shown.xpGained ? <strong>+{shown.xpGained} XP</strong> : null}
          {shown.levelsGained ? (
            <>
              {' '}
              and{' '}
              <strong>
                {shown.levelsGained} new {shown.levelsGained === 1 ? 'level' : 'levels'}
              </strong>
            </>
          ) : null}
          {shown.newEvents ? ` across ${shown.newEvents} adventures.` : '.'}
        </p>
      )}
      {shown.held ? (
        <p className="mt-2 font-semibold">
          A new find is waiting.{' '}
          <Link to="/app/inventory" className="underline">
            Manage your bag
          </Link>
        </p>
      ) : shown.unequipped > 0 ? (
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          {shown.unequipped} unequipped {shown.unequipped === 1 ? 'item' : 'items'} in your bag.{' '}
          <Link to="/app/inventory" className="underline">
            Review gear
          </Link>
        </p>
      ) : null}
    </Card>
  )
}
