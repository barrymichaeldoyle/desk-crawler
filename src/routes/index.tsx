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

      <section aria-labelledby="sample-heading" className="rounded-lg border-2 border-stone-900 bg-white p-5 font-mono text-stone-900 dark:border-stone-300">
        <h2 id="sample-heading" className="mb-3 text-xs uppercase tracking-widest text-stone-500">
          Sample screen · not a real hero
        </h2>
        <p className="text-xl font-bold">Steve · Level 5 Warrior</p>
        <p>Exploring the Server Room · HP 142/148</p>
        <ul className="mt-3 flex flex-col gap-1 text-sm">
          <li>12:13 Unplugged a Cable Serpent. +14 XP, +5 gold.</li>
          <li>11:58 Found a Rare Keyboard Mace.</li>
          <li>11:43 Cooled off by the air conditioning. +30 HP.</li>
        </ul>
      </section>

      <p className="text-stone-600 dark:text-stone-400">
        Desk Crawler is in development. It will be installable from the TRMNL plugin marketplace once it is approved.
      </p>
    </main>
  )
}
