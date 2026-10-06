import { Link, createFileRoute } from '@tanstack/react-router'
import { SiteLinks } from '../../lib/prose'
import { seo } from '../../lib/seo'

export const Route = createFileRoute('/games/desk-crawler')({ head: () => seo({ title: 'Desk Crawler', path: '/games/desk-crawler', description: 'An office RPG that plays itself on your TRMNL e-ink display.' }), component: Landing })

/** Public landing. The sample below is static and labeled; it never creates a hero. */
function Landing() {
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-10 px-4 py-16">
      <header className="flex flex-col gap-3">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold no-underline"><img src="/favicon.svg" alt="" width={24} height={24} className="[image-rendering:pixelated]" />TRMNL Games</Link>
        <h1 className="flex items-center gap-4 font-display text-4xl font-bold leading-tight sm:text-5xl"><img src="/games/desk-crawler/icon-192.png" alt="" width={64} height={64} className="size-14 [image-rendering:pixelated] sm:size-16" />Desk Crawler</h1>
        <p className="text-lg text-muted">
          An office RPG that plays itself on your TRMNL. Every fifteen minutes your hero fights a Stapler Mimic, finds a Keyboard Mace or gets knocked out, and your TRMNL shows
          what happened. Open the companion every few days to sort gear and choose where to explore next. It's free.
        </p>
      </header>

      <section aria-labelledby="sample-heading" className="flex flex-col gap-3">
        <h2 id="sample-heading" className="font-display text-2xl font-bold">An adventure at a glance</h2>
        <div className="rounded-[1.4rem] bg-night p-[clamp(0.5rem,2.5vw,1rem)] dark:bg-[#2b3474]"><img
          src="/games/desk-crawler/screen-sample.png"
          alt="Example Desk Crawler screen: Pip explores the Server Room, with health, XP, equipment, adventure stories and weekly rankings."
          width={800}
          height={480}
          fetchPriority="high"
          className="block w-full rounded-md bg-white [image-rendering:pixelated]"
        /></div>
        <p className="text-sm text-muted">Illustrative hero and rankings. Your own adventure begins after you connect the plugin and click Save in TRMNL.</p>
      </section>

      <p className="text-muted">
        Desk Crawler is still in development. It will appear in the TRMNL plugin directory after review.
      </p>
      <Link to="/app/desk-crawler" className="inline-flex min-h-11 self-start items-center border-2 border-night bg-gold px-4 font-semibold text-night hover:bg-gold-hi">Open Desk Crawler companion</Link>
      <SiteLinks />
    </main>
  )
}
