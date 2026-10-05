import { keepUnitsTogether } from '@trmnl-games/desk-crawler/payload'
import { markedRuns } from '@trmnl-games/desk-crawler/sim/core/narrative'
import { logPresentation, type LogDeltas } from '@trmnl-games/desk-crawler/log'
import { PixelIcon } from './-pixelIcon'

export function LogStory({ entry }: { entry: { at: number; summary: string; kind: string; deltas: LogDeltas } }) {
  const { narrative, changes } = logPresentation(entry)
  return (
    <div className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-2 gap-y-1">
      <PixelIcon kind={entry.kind} className="self-start mt-1" />
      <p>{markedRuns(keepUnitsTogether(narrative)).map((run, i) => (run.bold ? <strong className="inline-block max-w-full align-bottom [overflow-wrap:normal]" key={i}>{run.text}</strong> : run.text))}</p>
      <time className="whitespace-nowrap text-xs tabular-nums text-stone-600 dark:text-stone-400" dateTime={new Date(entry.at).toISOString()}>
        {new Date(entry.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
      </time>
      {changes.length > 0 ? (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold tabular-nums text-stone-600 dark:text-stone-400">
          {changes.map((part) => <li key={part}>{keepUnitsTogether(part)}</li>)}
        </ul>
      ) : null}
    </div>
  )
}
