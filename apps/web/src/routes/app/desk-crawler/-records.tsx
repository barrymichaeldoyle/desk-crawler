import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { api } from '@trmnl-games/backend/api'
import { Glyph, SectionTitle, type GlyphName } from '../../../lib/glyphs'

type Counters = { combatWins: number; retreats: number; deaths: number; rescues: number; goldEarned: number; itemsFound: number; ticksExplored: number; eliteWins: number; potionsUsed: number; trapsAvoided: number; itemsSold: number }

const hours = (ticks: number) => {
  const total = Math.round((ticks * 15) / 60)
  return total < 48 ? `${total} h` : `${Math.round(total / 24)} days`
}

/** Seven-day rank in the hero's level group, from the same published board as Rankings. */
function Rank({ stopped }: { stopped: boolean }) {
  const { data } = useQuery(convexQuery(api.leaderboard.view, {}))
  if (!data) return <p className="text-muted">Reading the rankings…</p>
  const board = data as { published: boolean; cohortKey?: string; totalPlayers?: number; own?: { rank: number; rankDelta: number | null } | null }
  const group = board.cohortKey ? `Levels ${board.cohortKey.replace('-', '–').replace('+', ' and up')}` : 'your level group'
  if (!board.published || !board.own) {
    return <p>{board.published && stopped ? 'Unranked: no XP in the last seven days while stopped.' : `Your hero joins the ${group} rankings after the next hourly update.`}</p>
  }
  const delta = board.own.rankDelta
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span className="hud text-base text-gold-ink">#{board.own.rank}</span>
      <span>
        of {board.totalPlayers} in {group}, last 7 days
        {delta ? <span className={`ml-1 inline-flex items-center gap-1 font-semibold ${delta > 0 ? 'text-xp-ink' : 'text-hp-ink'}`}><Glyph name={delta > 0 ? 'up' : 'down'} size={8} />{delta > 0 ? `up ${delta}` : `down ${Math.abs(delta)}`}</span> : null}
      </span>
    </p>
  )
}

export function Records({ counters, lifetimeXp, stopped = false }: { counters: Counters; lifetimeXp: number; stopped?: boolean }) {
  // Each record wears its stat's glyph in that stat's ink (the One Meaning Rule); the label still names it.
  const rows: Array<[string, string, GlyphName, string]> = [
    ['Lifetime XP', lifetimeXp.toLocaleString(), 'levelup', 'text-xp-ink'],
    ['Fights won', counters.combatWins.toLocaleString(), 'combat', 'text-hp-ink'],
    ['Retreats', counters.retreats.toLocaleString(), 'flag', 'text-muted'],
    ['Knockouts', counters.deaths.toLocaleString(), 'death', 'text-hp-ink'],
    ['Rescues', counters.rescues.toLocaleString(), 'revive', 'text-xp-ink'],
    ['Items found', counters.itemsFound.toLocaleString(), 'loot', 'text-gold-ink'],
    ['Gold earned', counters.goldEarned.toLocaleString(), 'coin', 'text-gold-ink'],
    ['Time adventuring', hours(counters.ticksExplored), 'clock', 'text-sky-ink'],
    ['Elites beaten', counters.eliteWins.toLocaleString(), 'star', 'text-hp-ink'],
    ['Potions drunk', counters.potionsUsed.toLocaleString(), 'potion', 'text-rare-ink'],
    ['Traps avoided', counters.trapsAvoided.toLocaleString(), 'trap', 'text-rare-ink'],
    ['Items sold', counters.itemsSold.toLocaleString(), 'tag', 'text-gold-ink'],
  ]
  return (
    <section aria-labelledby="records-title" className="window flex min-w-0 flex-col gap-3 px-4 pt-3 pb-4 sm:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <SectionTitle id="records-title" glyph="medal">Records</SectionTitle>
        <Link to="/app/desk-crawler/leaderboard" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">
          All rankings
        </Link>
      </div>
      <Rank stopped={stopped} />
      {/* Two columns even on phones: twelve single rows made the section a screen tall. */}
      <dl className="grid grid-cols-2 gap-x-4 min-[480px]:gap-x-6">
        {rows.map(([label, value, glyph, tone]) => (
          <div key={label} className="flex min-w-0 items-center justify-between gap-2 border-t-2 border-dashed border-rule py-2">
            <dt className="flex min-w-0 items-center gap-2 label-px text-muted"><Glyph name={glyph} className={tone} />{label}</dt>
            <dd className="font-bold whitespace-nowrap tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
