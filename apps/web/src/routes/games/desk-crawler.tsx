import { Link, createFileRoute } from '@tanstack/react-router'
import { SiteLinks } from '../../lib/prose'
import { BUTTON_PRIMARY } from '../../lib/ui'
import { BIOME_BANDS } from '../../lib/palette'
import { Hearts } from '../app/desk-crawler/-gameScreen'
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

      <SampleScreen />

      <section aria-labelledby="sample-heading" className="flex flex-col gap-3">
        <h2 id="sample-heading" className="font-display text-3xl font-bold">On your TRMNL</h2>
        <div className="rounded-[1.4rem] bg-[#3a3566] p-[clamp(0.5rem,2.5vw,1rem)]"><img
          src="/games/desk-crawler/screen-sample.png"
          alt="Example Desk Crawler screen on a TRMNL X: Pip explores the Server Room, with health, XP, equipment, adventure stories and weekly rankings."
          width={1200}
          height={900}
          loading="lazy"
          className="block w-full rounded-md bg-white"
        /></div>
        <p className="text-sm text-muted">Illustrative hero and rankings. Your own adventure begins after you connect the plugin and click Save in TRMNL.</p>
      </section>

      <p className="text-muted">
        Desk Crawler is still in development. It will appear in the TRMNL plugin directory after review.
      </p>
      <Link to="/app/desk-crawler" className={`inline-flex min-h-11 self-start items-center px-4 ${BUTTON_PRIMARY}`}>Open Desk Crawler companion</Link>
      <SiteLinks />
    </main>
  )
}

/** A sample game screen in the companion's style: the device's fight scene in colour under a small HUD. Fictional hero. */
function SampleScreen() {
  const bands = BIOME_BANDS.server_room!
  return (
    <figure className="flex flex-col gap-2">
      <div className="relative overflow-hidden border-4 border-night">
        <div aria-hidden="true" className="absolute inset-0 grid grid-rows-[18%_14%_40%_28%]">
          {bands.map((colour, i) => <div key={i} style={{ background: colour }} />)}
        </div>
        <img src="/games/desk-crawler/scene-sample.png" alt="Pip the office warrior squares up to a Cable Serpent in the Server Room" width={760} height={200} className="relative block w-full pt-14 mix-blend-multiply [image-rendering:pixelated] sm:pt-16" />
        <div className="absolute top-2 left-2 flex items-center gap-2 border-[3px] border-night bg-night/85 px-2.5 py-1.5 label-px sm:top-3 sm:left-3">
          <span>Pip <span className="text-gold-ink">Lv5</span></span>
          <Hearts hp={118} maxHp={148} />
        </div>
        <p className="absolute top-2 right-2 border-[3px] border-night bg-night/85 px-2.5 py-1.5 label-px text-gold-ink sm:top-3 sm:right-3">640 gold</p>
      </div>
      <figcaption className="text-sm text-muted">Sample hero. Your hero’s adventure plays out here in the companion and on your TRMNL.</figcaption>
    </figure>
  )
}
