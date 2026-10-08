import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { api } from '@trmnl-games/backend/api'
import { tierLabel } from '@trmnl-games/desk-crawler/content/achievements'
import { SiteLinks } from '../../lib/prose'
import { artUrl } from '../../lib/intent'
import { DESK_CRAWLER_OG, seo } from '../../lib/seo'
import { Card } from '../../lib/ui'
import { Rarity } from '../app/desk-crawler/-achievements'

type Profile = {
  alias: string
  heroName: string
  level: number
  status: 'exploring' | 'resting' | 'travelling' | 'dead' | 'paused' | 'sleeping'
  biome: string | null
  scenePath: string
  adventuringSince: number
  rank: { rank: number; totalPlayers: number } | null
  lifetime: { combatWins: number; itemsFound: number; trips: number; rescues: number; epicFinds: number }
  achievements: Array<{ id: string; tier: number; name: string; blurb: string; family: string }>
  rarity: { counts: Record<string, number>; totalPlayers: number; scoreAt: number } | null
  achievementCount: number
}

const profileQuery = (alias: string) => convexQuery(api.profiles.view, { alias })

export const Route = createFileRoute('/desk-crawler/heroes/$alias')({
  loader: async ({ context, params }) => (await context.queryClient.ensureQueryData(profileQuery(params.alias))) as Profile | null,
  head: ({ loaderData, params }) => loaderData
    ? seo({ title: `${loaderData.heroName}, level ${loaderData.level}`, path: `/desk-crawler/heroes/${encodeURIComponent(loaderData.alias)}`, description: `${loaderData.alias}'s Desk Crawler hero ${loaderData.heroName}: level ${loaderData.level}${loaderData.rank ? `, ranked #${loaderData.rank.rank} of ${loaderData.rank.totalPlayers}` : ''}, ${loaderData.achievementCount} achievements.`, image: DESK_CRAWLER_OG })
    : seo({ title: 'Hero not found', path: `/desk-crawler/heroes/${encodeURIComponent(params.alias)}`, index: false }),
  component: HeroProfile,
})

const STATUS: Record<Profile['status'], (biome: string) => string> = {
  exploring: (biome) => `Exploring the ${biome}`,
  resting: (biome) => `Resting in the ${biome}`,
  travelling: () => 'Travelling between floors',
  dead: () => 'Recovering from a knockout',
  paused: () => 'Taking a break',
  sleeping: () => 'Stopped with a full bag',
}

/** Public, opt-in hero page (v1.2). Private, missing and hidden heroes all read the same. */
function HeroProfile() {
  const { alias } = Route.useParams()
  const { data } = useQuery(profileQuery(alias))
  const profile = data as Profile | null | undefined
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-4 py-16">
      <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold no-underline"><img src="/favicon.svg" alt="" width={24} height={24} className="[image-rendering:pixelated]" />TRMNL Games</Link>
      {profile ? <Found profile={profile} /> : (
        <header className="flex flex-col gap-3">
          <h1 className="font-display text-3xl font-bold">No hero here</h1>
          <p>This hero's page is private, or there is no player by that name.</p>
        </header>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Link to="/games/desk-crawler" className="inline-flex min-h-11 items-center underline underline-offset-4">What is Desk Crawler?</Link>
      </div>
      <SiteLinks />
    </main>
  )
}

function Found({ profile }: { profile: Profile }) {
  const since = new Date(profile.adventuringSince).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
  const rows: Array<[string, number]> = [['Fights won', profile.lifetime.combatWins], ['Items found', profile.lifetime.itemsFound], ['Trips', profile.lifetime.trips], ['Rescues', profile.lifetime.rescues], ['Epic finds', profile.lifetime.epicFinds]]
  return (
    <>
      <header className="flex flex-col gap-2">
        <p className="text-muted">{profile.alias}'s Desk Crawler hero</p>
        <h1 className="font-display text-4xl font-bold leading-tight">{profile.heroName}</h1>
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className="hud text-base text-xp-ink">Level {profile.level}</span>
          {profile.rank ? <span><span className="hud text-base text-gold-ink">#{profile.rank.rank}</span> of {profile.rank.totalPlayers} {profile.rank.totalPlayers === 1 ? 'hero' : 'heroes'}, all time</span> : null}
        </p>
        <p>{STATUS[profile.status](profile.biome ?? 'office')}. Adventuring since {since}.</p>
      </header>
      <img src={artUrl(profile.scenePath)} alt={`${profile.heroName} in the ${profile.biome ?? 'office'}`} width={760} height={200} className="w-full border-[3px] border-night bg-cream [image-rendering:pixelated]" />
      <Card title="Lifetime">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
          {rows.map(([label, value]) => <div key={label} className="flex flex-col"><dt className="text-sm text-muted">{label}</dt><dd className="hud text-base tabular-nums">{value.toLocaleString()}</dd></div>)}
        </dl>
      </Card>
      <Card title={`Achievements (${profile.achievementCount})`}>
        {profile.achievements.length === 0 ? <p>No achievements yet.</p> : (
          <ul className="flex flex-col gap-3">
            {profile.achievements.map((achievement) => (
              <li key={achievement.id} className="flex min-w-0 flex-col gap-1 border-[3px] border-night bg-panel p-3">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <strong>{achievement.name}</strong>
                  {achievement.tier > 1 ? <span className="hud text-hud-sm text-gold-ink">{tierLabel(achievement.tier)}</span> : null}
                  <span className="text-xs text-muted">{achievement.family}</span>
                </p>
                <p className="text-sm">{achievement.blurb}</p>
                <Rarity id={achievement.id} rarity={profile.rarity} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
