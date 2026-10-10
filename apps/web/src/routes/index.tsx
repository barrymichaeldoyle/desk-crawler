import { Link, createFileRoute } from '@tanstack/react-router'
import { games } from '@trmnl-games/platform'
import { PlatformHeader } from '../lib/platformShell'
import { RELEASE_STATUS, SiteLinks } from '../lib/prose'
import { SampleScreen } from '../lib/sampleScreen'
import { BUTTON_SECONDARY, LINK_BUTTON } from '../lib/ui'
import { SITE_JSON_LD, seo } from '../lib/seo'
import { WaitlistForm } from '../lib/waitlist'
import { useQuery } from '@tanstack/react-query'
import { gamesQuery } from '../lib/gameAccess'

export const Route = createFileRoute('/')({
  head: () => seo({ path: '/', jsonLd: SITE_JSON_LD }),
  // The listing decides whether Slow Cast appears; a failure only hides it.
  loader: ({ context }) => context.queryClient.ensureQueryData(gamesQuery).then(() => undefined).catch(() => undefined),
  component: Home,
})

/** Slow Cast (D115) once it is listed: a "Coming soon" section in preview, the full section when live. Hidden, nothing. */
function SlowCastSection() {
  const { data } = useQuery(gamesQuery)
  const game = data?.games.find((g) => g.slug === 'slow-cast')
  if (!game || (game.status === 'hidden' && !data?.admin)) return null
  const live = game.status === 'live'
  return (
    <section aria-labelledby="slow-cast-heading" className="flex flex-col gap-5">
      <img src="/games/slow-cast/sample.png" alt="A sample Slow Cast screen: an angler holding a barbel at River Bend at dusk" width={780} height={460} className="w-full border-2 border-edge bg-white [image-rendering:pixelated]" />
      <div className="flex flex-col gap-2">
        <h2 id="slow-cast-heading" className="font-display text-3xl font-bold text-gold-ink">{games['slow-cast'].name}</h2>
        <p className="max-w-prose leading-relaxed">{games['slow-cast'].description} Every fifteen minutes your angler casts, and the screen on your desk shows what bit.</p>
        {live ? null : <p className="label-px text-muted">Coming soon</p>}
      </div>
      {game.canOpen ? (
        <div className="flex flex-wrap gap-3">
          <Link to="/games/slow-cast" className={`${LINK_BUTTON} ${BUTTON_SECONDARY}`}>How it plays</Link>
          <Link to="/app/slow-cast" className="inline-flex min-h-11 items-center underline underline-offset-4">Open companion</Link>
        </div>
      ) : null}
    </section>
  )
}

/** The platform front page: each game leads with its own screen. */
function Home() {
  const game = games['desk-crawler']
  return (
    <div className="mx-auto max-w-3xl">
      <PlatformHeader />
      <main id="main" className="flex flex-col gap-10 px-4 py-12 sm:py-16">
        <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">Games for your TRMNL</h1>
        <section aria-labelledby="desk-crawler-heading" className="flex flex-col gap-5">
          <SampleScreen />
          <div className="flex flex-col gap-2">
            <h2 id="desk-crawler-heading" className="font-display text-3xl font-bold text-gold-ink">{game.name}</h2>
            <p className="max-w-prose leading-relaxed">{game.description} Every fifteen minutes your hero fights, finds loot or gets knocked out, and the screen on your desk shows what happened.</p>
            <p className="text-sm text-muted">{RELEASE_STATUS}</p>
          </div>
          <WaitlistForm source="home" />
          <div className="flex flex-wrap gap-3">
            <Link to="/games/desk-crawler" className={`${LINK_BUTTON} ${BUTTON_SECONDARY}`}>How it plays</Link>
            <Link to="/app/desk-crawler" className="inline-flex min-h-11 items-center underline underline-offset-4">Open companion</Link>
          </div>
        </section>
        <SlowCastSection />
        <SiteLinks />
      </main>
    </div>
  )
}
