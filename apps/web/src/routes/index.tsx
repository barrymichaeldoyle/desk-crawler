import { Link, createFileRoute } from '@tanstack/react-router'
import { games } from '@trmnl-games/platform'
import { PlatformHeader } from '../lib/platformShell'
import { SiteLinks } from '../lib/prose'
import { seo } from '../lib/seo'

export const Route = createFileRoute('/')({ head: () => seo({ path: '/' }), component: Home })

function Home() {
  const game = games['desk-crawler']
  return (
    <div className="mx-auto max-w-3xl">
      <PlatformHeader />
      <main id="main" className="flex flex-col gap-10 px-4 py-12 sm:py-16">
        <header className="flex max-w-2xl flex-col gap-4">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">A little adventure on your desk.</h1>
          <p className="text-lg leading-relaxed text-stone-600 dark:text-stone-400">Games for your TRMNL e-ink display, with one companion for the decisions you make along the way.</p>
        </header>
        <section aria-labelledby="desk-crawler-heading" className="border-y border-stone-300 py-8 dark:border-stone-800">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <img src="/games/desk-crawler/icon-192.png" alt="" width={96} height={96} className="h-24 w-24 shrink-0 rounded-xl [image-rendering:pixelated]" />
            <div className="flex flex-col gap-3">
              <h2 id="desk-crawler-heading" className="text-2xl font-bold">{game.name}</h2>
              <p className="leading-relaxed">{game.description} Fight office monsters, find unlikely equipment, and check in every few days to sort your gear.</p>
              <p className="text-sm text-stone-600 dark:text-stone-400">Free to play. In development, awaiting TRMNL marketplace review.</p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link to="/games/desk-crawler" className="inline-flex min-h-11 items-center rounded-md bg-stone-900 px-4 font-semibold text-white dark:bg-stone-100 dark:text-stone-900">Meet Desk Crawler</Link>
                <Link to="/app/desk-crawler" className="inline-flex min-h-11 items-center underline underline-offset-4">Open companion</Link>
              </div>
            </div>
          </div>
        </section>
        <SiteLinks />
      </main>
    </div>
  )
}
