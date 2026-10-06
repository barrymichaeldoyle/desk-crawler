import { keepUnitsTogether } from '@trmnl-games/desk-crawler/payload'
import { markedRuns } from '@trmnl-games/desk-crawler/sim/core/narrative'
import { logPresentation, type LogDeltas } from '@trmnl-games/desk-crawler/log'
import { PixelIcon } from './-pixelIcon'
import { KIND_BADGE } from '../../../lib/palette'

/** Change chips take their stat's colour; losses keep the stat colour too, the sign carries direction. */
export const changeTone = (part: string) => (/\bXP\b/.test(part) ? 'text-xp-ink' : /\bHP\b/.test(part) ? 'text-hp-ink' : /\bgold\b/.test(part) ? 'text-gold-ink' : /potion/i.test(part) ? 'text-rare-ink' : 'text-muted')

export function LogStory({ entry }: { entry: { at: number; summary: string; kind: string; deltas: LogDeltas } }) {
  const { narrative, changes } = logPresentation(entry)
  return (
    <div className="min-w-0 space-y-1">
      <div className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3">
        <span aria-hidden="true" className={`grid size-8 place-items-center border-2 border-night ${KIND_BADGE[entry.kind] ?? KIND_BADGE.system}`}><PixelIcon kind={entry.kind} plain className="text-night" /></span>
        <p className="pt-1">{markedRuns(keepUnitsTogether(narrative)).map((run, i) => (run.bold ? <strong className="inline-block max-w-full align-bottom [overflow-wrap:normal]" key={i}>{run.text}</strong> : run.text))}</p>
      </div>
      <div className="flex items-baseline gap-x-3 pl-11">
        <time className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted" dateTime={new Date(entry.at).toISOString()}>
          {new Date(entry.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </time>
        {changes.length > 0 ? (
          <ul className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs font-semibold tabular-nums">
            {changes.map((part) => <li key={part} className={changeTone(part)}>{keepUnitsTogether(part)}</li>)}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
