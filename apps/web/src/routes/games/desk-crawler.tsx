import { Link, createFileRoute } from '@tanstack/react-router'
import { PlatformHeader } from '../../lib/platformHeader'
import { RELEASE_STATUS, SiteLinks } from '../../lib/prose'
import { BUTTON_SECONDARY, LINK_BUTTON } from '../../lib/ui'
import { DESK_CRAWLER_JSON_LD, DESK_CRAWLER_OG, seo } from '../../lib/seo'
import { SampleScreen } from '../../lib/deskCrawlerPitch'
import { WaitlistForm } from '../../lib/waitlist'

export const Route = createFileRoute('/games/desk-crawler')({ head: () => seo({ title: 'Desk Crawler', path: '/games/desk-crawler', description: 'Desk Crawler is a free office RPG that plays itself on your TRMNL e-ink display: your hero fights, loots and levels every 15 minutes.', image: DESK_CRAWLER_OG, jsonLd: DESK_CRAWLER_JSON_LD }), component: Landing })

/** Public landing. The screen below is a static, labelled sample; it never creates a hero. */
function Landing() {
  return (
    <>
      <PlatformHeader />
      <main id="main" className="mx-auto flex max-w-2xl flex-col gap-10 px-4 py-10">
        <header className="flex flex-col gap-3">
          <h1 className="flex items-center gap-4 font-display text-4xl font-bold leading-tight sm:text-5xl"><img src="/games/desk-crawler/icon-192.png" alt="" width={64} height={64} className="size-14 [image-rendering:pixelated] sm:size-16" />Desk Crawler</h1>
          <p className="text-lg text-muted">
            An office RPG that plays itself on your TRMNL. Every fifteen minutes your hero fights a Stapler Mimic, finds a Keyboard Mace or gets knocked out, and the screen on
            your desk shows what happened. Every few days you open the companion to sort gear and pick the next floor.
          </p>
        </header>

        <SampleScreen caption="Sample hero on a TRMNL X. Your own hero starts when you install the plugin and save it in TRMNL." />

        <div className="flex flex-col gap-4">
          <p className="text-muted">{RELEASE_STATUS}</p>
          <WaitlistForm source="landing" />
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/app/desk-crawler" className={`${LINK_BUTTON} ${BUTTON_SECONDARY}`}>Open the companion</Link>
            <Link to="/help/desk-crawler" className="inline-flex min-h-11 items-center underline underline-offset-4">Setup and TRMNL help</Link>
          </div>
        </div>
        <SiteLinks />
      </main>
    </>
  )
}
