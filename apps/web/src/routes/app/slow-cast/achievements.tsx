import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { api } from '@trmnl-games/backend/api'
import { preload } from '../../../lib/preload'
import { Card } from '../../../lib/ui'

/** Slow Cast achievements: each family's highest tier, progress to the next and how many anglers hold it. */
export const Route = createFileRoute('/app/slow-cast/achievements')({
  loader: ({ context }) => preload(context, convexQuery(api.slowCast.achievements.mine, {})),
  component: AchievementsPage,
})

type Family = { family: string; name: string; category: string; tiers: number; earned: { id: string; name: string; blurb: string; tier: number } | null; next: { id: string; name: string; tier: number } | null; value: number; target: number }
type Mine = { earnedCount: number; families: Family[]; rarity: { counts: Record<string, number>; totalPlayers: number } | null } | null

const CATEGORIES = ['Fishing', 'Logbook', 'Progress', 'Trade', 'Species'] as const

function AchievementsPage() {
  const { data } = useQuery(convexQuery(api.slowCast.achievements.mine, {}))
  const mine = data as Mine | undefined
  if (!mine) return null
  // Rarity comes from the last hourly publication; an achievement it has not counted yet shows none.
  const rarity = (id: string) => {
    const held = mine.rarity?.counts[id] ?? 0
    return mine.rarity && mine.rarity.totalPlayers > 0 && held > 0 ? Math.max(1, Math.round((held * 100) / mine.rarity.totalPlayers)) : null
  }
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-3xl font-bold">Achievements</h1>
        <span className="label-px text-muted">{mine.earnedCount} earned</span>
      </div>
      {CATEGORIES.map((category) => {
        const families = mine.families.filter((f) => f.category === category)
        if (category === 'Species') {
          const caught = families.filter((f) => f.earned)
          return (
            <Card key={category} title="Species">
              <p className="mb-3 text-sm text-muted">Two per species: the first one caught, then a specimen over three quarters of the species' largest size. {caught.length} of {families.length} started.</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {caught.map((f) => (
                  <li key={f.family} className="text-sm"><strong>{f.earned!.name}</strong>{f.next ? <span className="text-muted"> · next: {f.next.name}</span> : <span className="text-xp-ink"> · complete</span>}</li>
                ))}
              </ul>
            </Card>
          )
        }
        return (
          <Card key={category} title={category}>
            <ul className="flex flex-col gap-3">
              {families.map((f) => (
                <li key={f.family} className="border-b border-rule pb-3 last:border-b-0">
                  <p className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold">{f.earned ? f.earned.name : f.name}</span>
                    <span className="label-px text-muted">{f.earned ? `Tier ${f.earned.tier} of ${f.tiers}` : 'Not yet'}{f.earned && rarity(f.earned.id) !== null ? ` · ${rarity(f.earned.id)}% of anglers` : ''}</span>
                  </p>
                  {f.earned ? <p className="text-sm text-muted">{f.earned.blurb}</p> : null}
                  {f.next ? <p className="text-sm">Next: {f.next.name} · {Math.min(f.value, f.target).toLocaleString()} of {f.target.toLocaleString()}</p> : <p className="text-sm text-xp-ink">Every tier earned.</p>}
                </li>
              ))}
            </ul>
          </Card>
        )
      })}
    </>
  )
}
