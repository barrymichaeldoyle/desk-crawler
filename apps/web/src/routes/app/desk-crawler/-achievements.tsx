import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { api } from '@trmnl-games/backend/api'
import { ACHIEVEMENTS, RARITY_PERCENT_MIN_POPULATION, rarityBand, tierLabel, type RarityBand } from '@trmnl-games/desk-crawler/content/achievements'
import { PixelIcon } from './-pixelIcon'

type Earned = { id: string; name: string; blurb: string; tier: number; unlockedAt: number | null }
type Family = { family: string; name: string; category: string; tier: number; tiers: number; earned: Earned | null; next: { id: string; tier: number } | null; value: number; target: number }
type View = { unlocked: Array<{ id: string }>; families: Family[]; rarity: { counts: Record<string, number>; totalPlayers: number; scoreAt: number } | null }

const BAND_TONE: Record<RarityBand, string> = { common: 'text-muted', uncommon: 'text-xp-ink', rare: 'text-rare-ink', legendary: 'text-gold-ink' }
const BAND_LABEL: Record<RarityBand, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', legendary: 'Legendary' }

/** "7% of heroes" from the publication tally; below a small population, "3 of 11 heroes" (achievements.md "Rarity"). */
function rarityOf(id: string, rarity: View['rarity']): { band: RarityBand; text: string } | null {
  if (!rarity || rarity.totalPlayers <= 0) return null
  const count = rarity.counts[id] ?? 0
  const share = count / rarity.totalPlayers
  const band = rarityBand(share)
  if (rarity.totalPlayers < RARITY_PERCENT_MIN_POPULATION) return { band, text: `${count} of ${rarity.totalPlayers} ${rarity.totalPlayers === 1 ? 'hero' : 'heroes'}` }
  const pct = Math.round(share * 100)
  return { band, text: `${pct < 1 ? '<1' : pct}% of heroes` }
}

export function Rarity({ id, rarity }: { id: string; rarity: View['rarity'] }) {
  const r = rarityOf(id, rarity)
  if (!r) return <span className="text-xs text-muted">Rarity after the next hourly update</span>
  return (
    <span className="flex flex-wrap items-baseline gap-x-2 text-xs">
      <span className={`font-semibold ${BAND_TONE[r.band]}`}>{BAND_LABEL[r.band]}</span>
      <span className="text-muted">{r.text}</span>
    </span>
  )
}

function EarnedCard({ family, rarity }: { family: Family & { earned: Earned }; rarity: View['rarity'] }) {
  const { earned, next } = family
  const multi = family.tiers > 1
  return (
    <li className="flex min-w-0 flex-col gap-1 border-[3px] border-night bg-panel p-3">
      <div className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3">
        <span aria-hidden="true" className="grid size-8 place-items-center border-2 border-night bg-gold"><PixelIcon kind="achievement" plain className="text-night" /></span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <strong>{earned.name}</strong>
            {multi ? <span className="hud text-hud-sm text-gold-ink">{tierLabel(earned.tier)}</span> : null}
            <span className="text-xs text-muted">{family.name}</span>
          </p>
          <p className="text-sm">{earned.blurb}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pl-11">
        <Rarity id={earned.id} rarity={rarity} />
        {earned.unlockedAt ? (
          <time className="text-xs tabular-nums text-muted" dateTime={new Date(earned.unlockedAt).toISOString()}>{new Date(earned.unlockedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</time>
        ) : null}
      </div>
      {next ? (
        <p className="pl-11 text-xs tabular-nums text-muted">
          {family.value.toLocaleString()} of {family.target.toLocaleString()} for tier {tierLabel(next.tier)}
        </p>
      ) : null}
    </li>
  )
}

/** An unearned family: a "?" with its category and the first tier's rarity, never a name. Legendary first tiers stay a surprise. */
function LockedCard({ family, rarity }: { family: Family; rarity: View['rarity'] }) {
  const first = ACHIEVEMENTS.find((def) => def.family === family.family && def.tier === 1)
  const r = first ? rarityOf(first.id, rarity) : null
  const preview = r && r.band !== 'legendary'
  return (
    <li className="flex min-w-0 items-center gap-3 border-[3px] border-dashed border-faint p-3 text-muted">
      <span aria-hidden="true" className="hud grid size-8 shrink-0 place-items-center border-2 border-dashed border-faint text-hud-sm">?</span>
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-semibold">{family.category}</span>
        {preview ? <span className="text-xs"><span className={`font-semibold ${BAND_TONE[r.band]}`}>{BAND_LABEL[r.band]}</span> · {r.text}</span> : <span className="text-xs">Not yet</span>}
      </span>
    </li>
  )
}

/** Achievements under Records (achievements.md): permanent, retroactive, no task list and no timers. */
export function Achievements() {
  const { data } = useQuery(convexQuery(api.achievements.mine, {}))
  if (!data) return null
  const view = data as View
  const earned = view.families.filter((f): f is Family & { earned: Earned } => f.earned !== null)
  const locked = view.families.filter((f) => f.earned === null)
  return (
    <section aria-labelledby="achievements-title" className="window flex min-w-0 flex-col gap-3 px-4 pt-3 pb-4 sm:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id="achievements-title" className="font-display text-3xl font-bold">Achievements</h2>
        <span className="text-sm text-muted tabular-nums">{view.unlocked.length} of {ACHIEVEMENTS.length}</span>
      </div>
      {view.rarity ? (
        <p className="text-xs text-muted">Rarity is the share of ranked heroes holding each one, as of the last hourly update.</p>
      ) : null}
      {earned.length === 0 ? <p className="text-sm">The first adventure earns the first one.</p> : null}
      <ul className="grid gap-3 min-[640px]:grid-cols-2">
        {earned.map((family) => <EarnedCard key={family.family} family={family} rarity={view.rarity} />)}
      </ul>
      {locked.length > 0 ? (
        <details className="group">
          <summary className="menu-cursor inline-flex min-h-11 cursor-pointer items-center text-sm underline underline-offset-4">{locked.length} more to find</summary>
          <ul className="mt-3 grid gap-2 min-[640px]:grid-cols-2">
            {locked.map((family) => <LockedCard key={family.family} family={family} rarity={view.rarity} />)}
          </ul>
        </details>
      ) : null}
    </section>
  )
}
