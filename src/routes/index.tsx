import { Link, createFileRoute } from '@tanstack/react-router'
import { seo } from '../lib/seo'

export const Route = createFileRoute('/')({ head: () => seo({ path: '/' }), component: Landing })

/** Public landing. The sample below is static and labeled; it never creates a hero. */
function Landing() {
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-10 px-4 py-16">
      <header className="flex flex-col gap-3">
        <p className="font-semibold text-stone-600 dark:text-stone-400">Desk Crawler</p>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">An office RPG that plays itself on your TRMNL.</h1>
        <p className="text-lg text-stone-600 dark:text-stone-400">
          Every fifteen minutes your hero fights a Stapler Mimic, finds a Keyboard Mace or gets knocked out, and your TRMNL shows
          what happened. Open the companion every few days to sort gear and choose where to explore next. It's free.
        </p>
      </header>

      <section aria-labelledby="sample-heading" className="overflow-hidden rounded-lg border-2 border-stone-900 bg-white text-stone-900 dark:border-stone-300">
        <img
          src={`${import.meta.env.VITE_CONVEX_SITE_URL ?? ''}/art/scene/v3/server_room/fight/elite-legacy_mainframe/5.png`}
          alt="Sample scene: the Warrior faces an elite Legacy Mainframe in the Server Room"
          width={760}
          height={200}
          fetchPriority="high"
          className="block w-full [image-rendering:pixelated]"
        />
        <div className="p-5 font-mono">
          <h2 id="sample-heading" className="mb-3 text-sm text-stone-600 dark:text-stone-400">
            Example screen
          </h2>
          <p className="text-xl font-bold">An elite Legacy Mainframe went offline for good. +64 XP, +15 gold.</p>
          <p className="mt-2 text-sm">Steve, level 5. Exploring the Server Room. Rank 3 of 41 this week.</p>
        </div>
      </section>

      <p className="text-stone-600 dark:text-stone-400">
        Desk Crawler is still in development. It will appear in the TRMNL plugin directory after review.
      </p>
      <nav aria-label="Site" className="flex flex-wrap gap-4 text-sm underline underline-offset-4">
        <Link to="/app">Companion</Link>
        <Link to="/help/trmnl">TRMNL help</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/support">Support</Link>
      </nav>
    </main>
  )
}
