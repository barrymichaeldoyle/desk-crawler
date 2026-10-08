import { Link, createFileRoute } from '@tanstack/react-router'
import { games } from '@trmnl-games/platform'
import { PlatformHeader } from '../lib/platformShell'
import { RELEASE_STATUS, SiteLinks } from '../lib/prose'
import { SampleScreen } from '../lib/sampleScreen'
import { BUTTON_SECONDARY, LINK_BUTTON } from '../lib/ui'
import { seo } from '../lib/seo'
import { WaitlistForm } from '../lib/waitlist'

export const Route = createFileRoute('/')({ head: () => seo({ path: '/' }), component: Home })

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
            <p className="max-w-prose leading-relaxed">{game.description} Every fifteen minutes your hero fights, finds or falls, and the screen on your desk shows what happened.</p>
            <p className="text-sm text-muted">{RELEASE_STATUS}</p>
          </div>
          <WaitlistForm source="home" />
          <div className="flex flex-wrap gap-3">
            <Link to="/games/desk-crawler" className={`${LINK_BUTTON} ${BUTTON_SECONDARY}`}>How it plays</Link>
            <Link to="/app/desk-crawler" className="inline-flex min-h-11 items-center underline underline-offset-4">Open companion</Link>
          </div>
        </section>
        <SiteLinks />
      </main>
    </div>
  )
}
