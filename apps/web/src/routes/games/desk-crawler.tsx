import { Link, createFileRoute } from '@tanstack/react-router'
import { RELEASE_STATUS, SiteLinks } from '../../lib/prose'
import { BUTTON_PRIMARY, LINK_BUTTON } from '../../lib/ui'
import { seo } from '../../lib/seo'

export const Route = createFileRoute('/games/desk-crawler')({ head: () => seo({ title: 'Desk Crawler', path: '/games/desk-crawler', description: 'An office RPG that plays itself on your TRMNL e-ink display.' }), component: Landing })

/** Public landing. The screen below is a static, labelled sample; it never creates a hero. */
function Landing() {
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-10 px-4 py-16">
      <header className="flex flex-col gap-3">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold no-underline"><img src="/favicon.svg" alt="" width={24} height={24} className="[image-rendering:pixelated]" />TRMNL Games</Link>
        <h1 className="flex items-center gap-4 font-display text-4xl font-bold leading-tight sm:text-5xl"><img src="/games/desk-crawler/icon-192.png" alt="" width={64} height={64} className="size-14 [image-rendering:pixelated] sm:size-16" />Desk Crawler</h1>
        <p className="text-lg text-muted">
          An office RPG that plays itself on your TRMNL. Every fifteen minutes your hero fights a Stapler Mimic, finds a Keyboard Mace or gets knocked out, and the screen on
          your desk shows what happened. Every few days you open the companion to sort gear and pick the next floor.
        </p>
      </header>

      <figure className="flex flex-col gap-3">
        <div className="rounded-[1.4rem] bg-[#3a3566] p-[clamp(0.5rem,2.5vw,1rem)]"><img
          src="/games/desk-crawler/screen-sample.png"
          alt="Example Desk Crawler screen on a TRMNL X: Pip explores the Server Room, with health, XP, equipment, adventure stories and weekly rankings."
          width={1200}
          height={900}
          className="block w-full rounded-md bg-white"
        /></div>
        <figcaption className="text-sm text-muted">Sample hero on a TRMNL X. Your own hero starts when you install the plugin and save it in TRMNL.</figcaption>
      </figure>

      <div className="flex flex-col gap-4">
        <p className="text-muted">{RELEASE_STATUS}</p>
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/app/desk-crawler" className={`${LINK_BUTTON} ${BUTTON_PRIMARY}`}>Open the companion</Link>
          <Link to="/help/desk-crawler" className="inline-flex min-h-11 items-center underline underline-offset-4">Setup and TRMNL help</Link>
        </div>
      </div>
      <SiteLinks />
    </main>
  )
}
