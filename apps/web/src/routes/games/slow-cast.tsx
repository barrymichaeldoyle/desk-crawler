import { Link, createFileRoute } from '@tanstack/react-router'
import { games } from '@trmnl-games/platform'
import { requireOpenGame } from '../../lib/gameAccess'
import { PlatformHeader } from '../../lib/platformHeader'
import { SiteLinks } from '../../lib/prose'
import { seo } from '../../lib/seo'
import { BUTTON_SECONDARY, LINK_BUTTON } from '../../lib/ui'

/** Slow Cast's public game page (slow-cast.md "Companion"). Hidden with the game until it is live (D115). */
export const Route = createFileRoute('/games/slow-cast')({
  loader: ({ context }) => requireOpenGame(context, 'slow-cast'),
  head: () => seo({ title: 'Slow Cast', path: '/games/slow-cast', description: 'Slow Cast is a fishing game that plays itself on your TRMNL: your angler casts every fifteen minutes and the screen shows the catch.', index: false }),
  component: () => (
    <>
      <PlatformHeader />
      <main id="main" className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10">
        <header className="flex flex-col gap-3">
          <h1 className="flex items-center gap-4 font-display text-4xl font-bold leading-tight sm:text-5xl"><img src="/games/slow-cast/icon-192.png" alt="" width={64} height={64} className="size-14 [image-rendering:pixelated] sm:size-16" />{games['slow-cast'].name}</h1>
          <p className="text-lg text-muted">
            {games['slow-cast'].description} Every fifteen minutes your angler casts. The species depends on the water, the bait, the hour and the weather, and the screen on your desk shows what bit. Every day or two you open the companion to sell the cooler, restock bait and buy a stronger rod for heavier fish.
          </p>
        </header>
        <figure className="flex flex-col gap-2">
          <img src="/games/slow-cast/sample.png" alt="A sample Slow Cast screen: an angler holding a barbel at River Bend at dusk, the week's top five and the latest catches" width={780} height={460} className="w-full border-2 border-edge bg-white [image-rendering:pixelated]" />
          <figcaption className="text-sm text-muted">Sample angler on a TRMNL OG. Your own angler starts when you install the plugin and save it in TRMNL.</figcaption>
        </figure>
        <ul className="flex flex-col gap-2 [&_li]:ml-5 [&_li]:list-disc">
          <li>Three waters and thirty species to log, from minnows to a thornback ray.</li>
          <li>Weather shared by every angler at a water, changing every six hours.</li>
          <li>Bait never spoils. When the cooler is full, new catches are released instead of lost.</li>
        </ul>
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/help/slow-cast" className={`${LINK_BUTTON} ${BUTTON_SECONDARY}`}>How it plays</Link>
          <Link to="/app/slow-cast" className="inline-flex min-h-11 items-center underline underline-offset-4">Open companion</Link>
        </div>
        <SiteLinks />
      </main>
    </>
  ),
})
