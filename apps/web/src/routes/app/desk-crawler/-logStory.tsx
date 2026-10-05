import { keepUnitsTogether } from '@trmnl-games/desk-crawler/payload'
import { markedRuns } from '@trmnl-games/desk-crawler/sim/core/narrative'
import { logPresentation, type LogDeltas } from '@trmnl-games/desk-crawler/log'

export function LogStory({ entry }: { entry: { summary: string; kind: string; deltas: LogDeltas } }) {
  const { narrative, changes } = logPresentation(entry)
  return (
    <div className="min-w-0">
      <p>{markedRuns(keepUnitsTogether(narrative)).map((run, i) => (run.bold ? <strong key={i}>{run.text}</strong> : run.text))}</p>
      {changes.length > 0 ? (
        <ul className="mt-1 flex flex-wrap gap-x-3 text-xs font-semibold tabular-nums text-stone-600 dark:text-stone-400">
          {changes.map((part) => <li key={part}>{keepUnitsTogether(part)}</li>)}
        </ul>
      ) : null}
    </div>
  )
}
