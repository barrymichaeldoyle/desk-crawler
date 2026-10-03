import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Landing })

/** Public landing. The sample below is static and labeled; it never creates a hero. */
function Landing() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-10 px-4 py-16">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-sm uppercase tracking-widest text-stone-500">Desk Crawler</p>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">A little office adventure for your TRMNL.</h1>
        <p className="text-lg text-stone-600 dark:text-stone-400">
          Your Warrior explores every fifteen minutes, finds gear, survives mishaps and climbs a leaderboard. Glance at your desk
          display for the story; visit the companion now and then to manage gear. Free to play.
        </p>
      </header>

      <section aria-labelledby="sample-heading" className="overflow-hidden rounded-lg border-2 border-stone-900 bg-white text-stone-900 dark:border-stone-300">
        <img
          src={`${import.meta.env.VITE_CONVEX_SITE_URL ?? ''}/art/scene/v3/server_room/fight/elite-legacy_mainframe/5.png`}
          alt="Sample scene: the Warrior faces an elite Legacy Mainframe in the Server Room"
          width={760}
          height={200}
          className="block w-full [image-rendering:pixelated]"
        />
        <div className="p-5 font-mono">
          <h2 id="sample-heading" className="mb-3 text-xs uppercase tracking-widest text-stone-500">
            Sample screen · not a real hero
          </h2>
          <p className="text-xl font-bold">An elite Legacy Mainframe went offline! +64 XP, +15 gold.</p>
          <p className="mt-2 text-sm">Steve · Level 5 Warrior · Exploring the Server Room · #3 of 41 this week</p>
        </div>
      </section>

      <p className="text-stone-600 dark:text-stone-400">
        Desk Crawler is in development. It will be installable from the TRMNL plugin marketplace once it is approved.
      </p>
      <nav aria-label="More" className="flex flex-wrap gap-4 text-sm underline underline-offset-4">
        <a href="/app">Companion</a>
        <a href="/help/trmnl">TRMNL help</a>
        <a href="/privacy">Privacy</a>
        <a href="/support">Support</a>
      </nav>
    </main>
  )
}
