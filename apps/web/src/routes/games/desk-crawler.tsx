import { Link, createFileRoute } from '@tanstack/react-router'
import { SiteLinks } from '../../lib/prose'
import { seo } from '../../lib/seo'

export const Route = createFileRoute('/games/desk-crawler')({ head: () => seo({ title: 'Desk Crawler', path: '/games/desk-crawler', description: 'An office RPG that plays itself on your TRMNL e-ink display.' }), component: Landing })

/** Public landing. The sample below is static and labeled; it never creates a hero. */
function Landing() {
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-10 px-4 py-16">
      <header className="flex flex-col gap-3">
        <Link to="/" className="font-semibold underline underline-offset-4">TRMNL Games</Link>
        <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">Desk Crawler</h1>
        <p className="text-lg text-stone-600 dark:text-stone-400">
          An office RPG that plays itself on your TRMNL. Every fifteen minutes your hero fights a Stapler Mimic, finds a Keyboard Mace or gets knocked out, and your TRMNL shows
          what happened. Open the companion every few days to sort gear and choose where to explore next. It's free.
        </p>
      </header>

      <section aria-labelledby="sample-heading" className="flex flex-col gap-3">
        <h2 id="sample-heading" className="font-display text-2xl font-bold">An adventure at a glance</h2>
        <img
          src="/games/desk-crawler/screen-sample.png"
          alt="Example Desk Crawler screen: Pip explores the Server Room, with health, XP, equipment, adventure stories and weekly rankings."
          width={800}
          height={480}
          fetchPriority="high"
          className="block w-full border border-stone-300 bg-white [image-rendering:pixelated] dark:border-stone-700"
        />
        <p className="text-sm text-stone-600 dark:text-stone-400">Illustrative hero and rankings. Your own adventure begins after you connect the plugin and click Save in TRMNL.</p>
      </section>

      <p className="text-stone-600 dark:text-stone-400">
        Desk Crawler is still in development. It will appear in the TRMNL plugin directory after review.
      </p>
      <Link to="/app/desk-crawler" className="inline-flex min-h-11 self-start items-center bg-stone-900 px-4 font-semibold text-white dark:bg-stone-100 dark:text-stone-900">Open Desk Crawler companion</Link>
      <SiteLinks />
    </main>
  )
}
