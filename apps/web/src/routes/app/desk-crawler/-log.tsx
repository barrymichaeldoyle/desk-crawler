import { usePaginatedQuery } from 'convex/react'
import { useMemo, useState } from 'react'
import { api } from '@trmnl-games/backend/api'
import { LogStory } from './-logStory'
import { Button } from '../../../lib/ui'
import type { LogDeltas } from '@trmnl-games/desk-crawler/log'

type Entry = { id: string; at: number; tick: number | null; kind: string; summary: string; source: string; deltas: LogDeltas }

const FILTERS = [
  { key: 'all', label: 'All', kinds: null },
  { key: 'fights', label: 'Fights', kinds: ['combat'] },
  { key: 'finds', label: 'Finds', kinds: ['loot'] },
  { key: 'milestones', label: 'Milestones', kinds: ['levelup', 'death', 'revive', 'travel'] },
  { key: 'rest', label: 'Rest & traps', kinds: ['rest', 'trap'] },
] as const

type FilterKey = (typeof FILTERS)[number]['key']

const dayLabel = (at: number) => {
  const day = new Date(at)
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (day.toDateString() === today.toDateString()) return 'Today'
  if (day.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return day.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })
}

/** One encounter = the entries a single tick wrote; companion commands stand alone. */
function group(entries: Entry[]) {
  const days: Array<{ label: string; encounters: Array<{ key: string; at: number; entries: Entry[] }> }> = []
  for (const entry of entries) {
    const label = dayLabel(entry.at)
    let day = days.at(-1)
    if (!day || day.label !== label) days.push((day = { label, encounters: [] }))
    const key = entry.source === 'tick' && entry.tick !== null ? `tick-${entry.tick}` : entry.id
    const last = day.encounters.at(-1)
    if (last && last.key === key) last.entries.push(entry)
    else day.encounters.push({ key, at: entry.at, entries: [entry] })
  }
  return days
}

export function AdventureLog() {
  const { results, status, loadMore } = usePaginatedQuery(api.heroes.recentLog, {}, { initialNumItems: 40 })
  const [filter, setFilter] = useState<FilterKey>('all')
  const kinds = FILTERS.find((item) => item.key === filter)!.kinds as readonly string[] | null
  const days = useMemo(() => group((results as Entry[]).filter((entry) => kinds === null || kinds.includes(entry.kind))), [results, kinds])

  return (
    <section aria-labelledby="log-title" className="window min-w-0 px-4 pt-3 pb-4 sm:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 id="log-title" className="font-display text-xl font-semibold text-gold-ink">
          Adventure log
        </h2>
        <div role="group" aria-label="Filter adventure log" className="-mx-1 flex flex-wrap">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={filter === item.key}
              onClick={() => setFilter(item.key)}
              className="menu-cursor inline-flex min-h-11 items-center px-1.5 text-sm text-muted hover:text-ink aria-pressed:font-semibold aria-pressed:text-gold-ink"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {status === 'LoadingFirstPage' ? (
        <p role="status" className="mt-3 text-muted">
          Reading the log…
        </p>
      ) : days.length === 0 ? (
        <p className="mt-3 text-muted">{filter === 'all' ? 'Nothing logged yet. The first entries arrive with the next adventure.' : 'Nothing of this kind in the loaded entries.'}</p>
      ) : (
        <div className="mt-2 flex flex-col">
          {days.map((day) => (
            <section key={day.label} aria-label={day.label}>
              <h3 className="sticky top-12 z-[1] border-b-2 border-edge bg-ground py-2 text-sm font-bold">{day.label}</h3>
              <ol>
                {day.encounters.map((encounter) => (
                  <li key={encounter.key}>
                    <ul>
                      {encounter.entries.map((entry) => (
                        <li key={entry.id} className="border-b border-rule py-3">
                          <LogStory entry={entry} />
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      {status === 'CanLoadMore' ? (
        <Button variant="quiet" className="mt-2" onClick={() => loadMore(40)}>
          Load older entries
        </Button>
      ) : null}
      {status === 'LoadingMore' ? <p role="status" className="mt-3 text-sm">Loading older adventures…</p> : null}
      {status === 'Exhausted' && days.length > 0 ? <p className="mt-3 text-xs text-muted">Detailed history is kept for three days.</p> : null}
    </section>
  )
}
