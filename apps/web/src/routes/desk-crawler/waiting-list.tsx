import { Link, createFileRoute } from '@tanstack/react-router'
import { SiteLinks } from '../../lib/prose'
import { DESK_CRAWLER_OG, seo } from '../../lib/seo'
import { SampleScreen } from '../../lib/deskCrawlerPitch'
import { WaitlistForm } from '../../lib/waitlist'

export const Route = createFileRoute('/desk-crawler/waiting-list')({
  head: () => seo({ title: 'Desk Crawler waiting list', path: '/desk-crawler/waiting-list', description: 'Get one email when Desk Crawler, an office RPG for your TRMNL e-ink display, is in the TRMNL marketplace.', image: DESK_CRAWLER_OG }),
  component: Notify,
})

/** Shareable launch-list page (D105): the signup comes first, the pitch after it. */
function Notify() {
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-10 px-4 py-16">
      <header className="flex flex-col gap-3">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold no-underline"><img src="/favicon.svg" alt="" width={24} height={24} className="[image-rendering:pixelated]" />TRMNL Games</Link>
        <h1 className="flex items-center gap-4 font-display text-4xl font-bold leading-tight sm:text-5xl"><img src="/games/desk-crawler/icon-192.png" alt="" width={64} height={64} className="size-14 [image-rendering:pixelated] sm:size-16" />Desk Crawler</h1>
        <p className="text-lg text-muted">An office RPG that plays itself on your TRMNL. It's waiting on TRMNL marketplace review. Leave your email and you'll hear the moment it's live.</p>
      </header>
      <WaitlistForm source="notify" />
      <SampleScreen caption="Sample hero on a TRMNL X. Every fifteen minutes your hero fights, loots or gets knocked out, and the screen shows what happened." />
      <div className="flex flex-wrap items-center gap-4">
        <Link to="/games/desk-crawler" className="inline-flex min-h-11 items-center underline underline-offset-4">More about Desk Crawler</Link>
        <a href="https://trmnl.com" className="inline-flex min-h-11 items-center underline underline-offset-4">What's a TRMNL?</a>
      </div>
      <SiteLinks />
    </main>
  )
}
