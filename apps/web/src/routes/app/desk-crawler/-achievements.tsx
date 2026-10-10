import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { api } from '@trmnl-games/backend/api'
import { ACHIEVEMENTS, RARITY_PERCENT_MIN_POPULATION, rarityBand, tierLabel, type RarityBand } from '@trmnl-games/desk-crawler/content/achievements'
import { useState } from 'react'
import { Glyph, SectionTitle, type GlyphName } from '../../../lib/glyphs'
import { Button, Meter } from '../../../lib/ui'
import { Sheet, SheetTitle } from './-bagSlots'

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

/** Each family wears the glyph of what it counts; monster families share the sword, set pieces the trophy. */
const FAMILY_GLYPH: Record<string, GlyphName> = {
  elites: 'star', jackpots: 'coin', rare_finds: 'loot', epics: 'loot', finds: 'loot', adventures: 'travel', trips: 'travel', gold: 'coin',
  levels: 'levelup', knockouts: 'death', rescues: 'revive', retreats: 'flag', potions: 'potion', traps: 'trap', breaks: 'rest',
  bags: 'bag', sales: 'tag', keepsakes: 'keepsake', purchases: 'coin', merchants: 'merchant', stances: 'shield', choices: 'choice',
  office_raider: 'raid', desk_defender: 'raid', tasks_done: 'todo',
}
const familyGlyph = (family: Family): GlyphName => FAMILY_GLYPH[family.family] ?? (family.family.startsWith('slay_') ? 'combat' : 'trophy')

/** An earned family as a badge tile: its glyph on gold, the tier in the corner and the name beneath. Tapping opens its sheet. */
function EarnedTile({ family, onOpen }: { family: Family & { earned: Earned }; onOpen: () => void }) {
  return (
    <li className="min-w-0">
      <button type="button" onClick={onOpen} aria-label={family.tiers > 1 ? `${family.earned.name}, tier ${tierLabel(family.earned.tier)}` : family.earned.name} className="flex size-full min-h-24 flex-col items-center gap-1.5 border-[3px] border-night bg-panel px-1 pt-2.5 pb-2 text-center hover:bg-raised active:bg-raised">
        <span aria-hidden="true" className="relative grid size-10 place-items-center border-2 border-night bg-gold text-night">
          <Glyph name={familyGlyph(family)} />
          {family.tiers > 1 ? <span className="hud absolute -top-2 -right-3 border-2 border-night bg-night px-0.5 text-[0.5rem] leading-3 text-gold-ink">{tierLabel(family.earned.tier)}</span> : null}
        </span>
        <span className="line-clamp-2 text-xs leading-tight font-semibold [overflow-wrap:anywhere]">{family.earned.name}</span>
      </button>
    </li>
  )
}

/** One earned achievement's details: what it is, its rarity, when it came and how far the next tier is. */
function EarnedSheet({ family, rarity, onClose }: { family: (Family & { earned: Earned }) | null; rarity: View['rarity']; onClose: () => void }) {
  return (
    <Sheet open={family !== null} onClose={onClose} label="Achievement">
      {family ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center border-2 border-night bg-gold text-night"><Glyph name={familyGlyph(family)} size={24} /></span>
            <div className="min-w-0">
              <SheetTitle>{family.earned.name}{family.tiers > 1 ? <span className="hud ml-2 align-middle text-hud-sm text-gold-ink">{tierLabel(family.earned.tier)}</span> : null}</SheetTitle>
              <p className="text-sm text-muted">{family.name}</p>
            </div>
          </div>
          <p>{family.earned.blurb}</p>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <Rarity id={family.earned.id} rarity={rarity} />
            {family.earned.unlockedAt ? <time className="text-xs tabular-nums text-muted" dateTime={new Date(family.earned.unlockedAt).toISOString()}>Earned {new Date(family.earned.unlockedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</time> : null}
          </div>
          {family.next ? <Meter label={`Tier ${tierLabel(family.next.tier)}`} value={Math.min(family.value, family.target)} max={family.target} tone="gold" /> : <p className="text-sm text-muted">Top tier reached.</p>}
          <Button variant="secondary" className="mt-1" allowOffline onClick={onClose}>Close</Button>
        </div>
      ) : null}
    </Sheet>
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
  const [openId, setOpenId] = useState<string | null>(null)
  if (!data) return null
  const view = data as View
  const earned = view.families.filter((f): f is Family & { earned: Earned } => f.earned !== null)
  const locked = view.families.filter((f) => f.earned === null)
  const opened = earned.find((f) => f.family === openId) ?? null
  return (
    <section aria-labelledby="achievements-title" className="window flex min-w-0 flex-col gap-3 px-3 pt-3 pb-4 min-[375px]:px-4 sm:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <SectionTitle id="achievements-title" glyph="achievement">Achievements</SectionTitle>
        <span className="text-sm text-muted tabular-nums">{view.unlocked.length} of {ACHIEVEMENTS.length}</span>
      </div>
      {view.rarity ? (
        <p className="text-xs text-muted">Rarity is the share of ranked heroes holding each one, as of the last hourly update.</p>
      ) : null}
      {earned.length === 0 ? <p className="text-sm">The first adventure earns the first one.</p> : null}
      {/* Badges, not cards: a dozen achievements fit a phone's screen, and each opens its details. */}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(5.25rem,1fr))] gap-2">
        {earned.map((family) => <EarnedTile key={family.family} family={family} onOpen={() => setOpenId(family.family)} />)}
      </ul>
      <EarnedSheet family={opened} rarity={view.rarity} onClose={() => setOpenId(null)} />
      {locked.length > 0 ? (
        <details className="group">
          <summary className="menu-cursor inline-flex min-h-11 cursor-pointer items-center text-sm underline underline-offset-4">{locked.length} more to find</summary>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {locked.map((family) => <LockedCard key={family.family} family={family} rarity={view.rarity} />)}
          </ul>
        </details>
      ) : null}
    </section>
  )
}
