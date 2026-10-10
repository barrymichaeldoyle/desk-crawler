import { usePaginatedQuery } from 'convex/react'
import { useMemo, useState } from 'react'
import { api } from '@trmnl-games/backend/api'
import { LogStory } from './-logStory'
import { Button } from '../../../lib/ui'
import { SectionTitle } from '../../../lib/glyphs'
import { PixelIcon } from './-pixelIcon'
import { KIND_BADGE } from '../../../lib/palette'
import type { LogDeltas } from '@trmnl-games/desk-crawler/log'

type Entry = { id: string; at: number; tick: number | null; kind: string; summary: string; source: string; deltas: LogDeltas }

/** Each filter is a badge wearing the glyph of the log lines it keeps, so all of them fit one phone-width row. */
const FILTERS = [
  { key: 'all', label: 'All', kinds: null, glyph: null },
  { key: 'fights', label: 'Fights', kinds: ['combat'], glyph: 'combat' },
  { key: 'finds', label: 'Finds', kinds: ['loot'], glyph: 'loot' },
  { key: 'milestones', label: 'Milestones', kinds: ['levelup', 'achievement', 'death', 'revive', 'travel'], glyph: 'levelup' },
  { key: 'rest', label: 'Rest & traps', kinds: ['rest', 'trap'], glyph: 'rest' },
  { key: 'raids', label: 'Raids', kinds: ['raid'], glyph: 'raid' },
  { key: 'todo', label: 'To-do', kinds: ['todo'], glyph: 'todo' },
] as const

/** Entries shown before "Show more": the log is the longest thing on the Hero page. */
const FIRST_VIEW = 12
const MORE = 20

type FilterKey = (typeof FILTERS)[number]['key']

const dayLabel = (at: number) => {
  const day = new Date(at)
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (day.toDateString() === today.toDateString()) return 'Today'
  if (day.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return day.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })
}

const minute = (at: number) => Math.floor(at / 60_000)
const listNames = (names: string[]) => (names.length === 1 ? names[0]! : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`)

/**
 * Achievements earned together (one after another within the same minute) fold into one line naming them all, so a
 * burst of unlocks reads as one moment instead of a column of identical badges.
 */
function foldAchievements(entries: Entry[]): Entry[] {
  const out: Entry[] = []
  let run: Entry[] = []
  const flush = () => {
    if (run.length > 1) {
      const names = run.map((entry) => entry.summary.replace(/^Achievement:\s*/, ''))
      out.push({ ...run[0]!, id: run.map((entry) => entry.id).join('+'), summary: `${run.length} achievements: ${listNames(names)}` })
    } else out.push(...run)
    run = []
  }
  for (const entry of entries) {
    if (entry.kind === 'achievement' && (run.length === 0 || minute(run[0]!.at) === minute(entry.at))) { run.push(entry); continue }
    flush()
    if (entry.kind === 'achievement') run.push(entry)
    else out.push(entry)
  }
  flush()
  return out
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
  const [limit, setLimit] = useState(FIRST_VIEW)
  const chosen = FILTERS.find((item) => item.key === filter)!
  const kinds = chosen.kinds as readonly string[] | null
  const shown = useMemo(() => foldAchievements((results as Entry[]).filter((entry) => kinds === null || kinds.includes(entry.kind))), [results, kinds])
  const days = useMemo(() => group(shown.slice(0, limit)), [shown, limit])
  const hidden = shown.length > limit
  const showMore = () => {
    setLimit((value) => value + MORE)
    // Fetch the next page once what is loaded runs short of the next view.
    if (status === 'CanLoadMore' && shown.length < limit + MORE * 2) loadMore(40)
  }

  return (
    <section aria-labelledby="log-title" className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <SectionTitle id="log-title" glyph="quest">Quest log</SectionTitle>
        {/* Seven badges share one row on phones (44px tall, as wide as the row allows), so none drops to a row of its own; the chosen one's name reads below. */}
        <div role="group" aria-label="Filter adventure log" className="grid w-full grid-cols-7 gap-1 sm:flex sm:w-auto">
          {FILTERS.map((item) => {
            const pressed = filter === item.key
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={pressed}
                aria-label={item.label}
                title={item.label}
                onClick={() => { setFilter(item.key); setLimit(FIRST_VIEW) }}
                className={`grid h-11 min-w-0 place-items-center border-2 sm:w-11 sm:shrink-0 ${pressed ? `border-night outline-2 outline-gold ${item.glyph ? KIND_BADGE[item.glyph] : 'bg-gold'} text-night` : 'border-raised bg-panel text-muted hover:border-edge hover:text-ink active:border-edge'}`}
              >
                {item.glyph ? <PixelIcon kind={item.glyph} plain /> : <span className="label-px">All</span>}
              </button>
            )
          })}
        </div>
      </div>
      <p aria-live="polite" className="mt-2 label-px text-muted">{filter === 'all' ? 'Everything' : chosen.label}</p>

      {status === 'LoadingFirstPage' ? (
        <div role="status" aria-label="Reading the log" className="mt-2 flex flex-col">
          <p aria-hidden="true" className="py-2 label-px text-muted">Today</p>
          <ol aria-hidden="true" className="flex flex-col gap-2 pb-3">
            {[0, 1, 2].map((row) => (
              <li key={row} className="window grid min-h-[4.75rem] grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3 px-3 py-2.5">
                <span className="size-8 bg-raised" />
                <span className="flex flex-col gap-2 pt-1">
                  <span className={`h-4 bg-raised ${row === 1 ? 'w-3/5' : 'w-4/5'}`} />
                  <span className="h-3 w-24 bg-raised" />
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : days.length === 0 ? (
        <p className="mt-3 text-muted">{filter === 'all' ? 'Nothing logged yet.' : 'No entries of this kind loaded.'}</p>
      ) : (
        <div className="mt-2 flex flex-col">
          {days.map((day) => (
            <section key={day.label} aria-label={day.label}>
              <h3 className="sticky top-14 z-[1] bg-ground py-2 label-px text-muted">{day.label}</h3>
              <ol className="flex flex-col gap-2 pb-3">
                {day.encounters.map((encounter) => (
                  <li key={encounter.key}>
                    <ul className="flex flex-col gap-2">
                      {encounter.entries.map((entry) => (
                        <li key={entry.id} className="window px-3 py-2.5">
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

      {hidden || status === 'CanLoadMore' ? (
        <Button variant="quiet" className="mt-2" onClick={showMore}>
          Show more
        </Button>
      ) : null}
      {status === 'LoadingMore' ? <p role="status" className="mt-3 text-sm">Loading older adventures…</p> : null}
      {status === 'Exhausted' && !hidden && days.length > 0 ? <p className="mt-3 text-xs text-muted">Detailed history is kept for three days.</p> : null}
    </section>
  )
}
