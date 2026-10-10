import { SignInButton } from '@clerk/tanstack-react-start'
import { Link } from '@tanstack/react-router'
import { RELEASE_STATUS } from './prose'
import { Button } from './ui'
import { useAnalyticsView } from './analyticsProvider'
import { WaitlistForm } from './waitlist'

/** The labelled sample screen shared by the public landing and the signed-out companion; it never creates a hero. */
export function SampleScreen({ caption }: { caption: string }) {
  return (
    <figure className="flex flex-col gap-3">
      <div className="rounded-[1.4rem] bg-[#3a3566] p-[clamp(0.5rem,2.5vw,1rem)]"><img
        src="/games/desk-crawler/screen-sample.png"
        alt="Example Desk Crawler screen on a TRMNL X: Pip explores the Server Room, with health, XP, equipment, adventure stories and weekly rankings."
        width={1200}
        height={900}
        className="block w-full rounded-md bg-white"
      /></div>
      <figcaption className="text-sm text-muted">{caption}</figcaption>
    </figure>
  )
}

/**
 * Signed-out view of the companion routes (D102). The screen's QR codes lead here, so a visitor who scanned someone
 * else's TRMNL learns what Desk Crawler is and that it needs a TRMNL before being asked to sign in.
 */
export function DeskCrawlerSignedOut() {
  useAnalyticsView('setup screen shown', { setup_state: 'signed_out' })
  return (
    <main id="main" className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-3">
        <h1 className="flex items-center gap-4 font-display text-3xl font-bold leading-tight sm:text-4xl"><img src="/games/desk-crawler/icon-192.png" alt="" width={64} height={64} className="size-12 [image-rendering:pixelated] sm:size-14" />Desk Crawler</h1>
        <p className="text-lg">An office RPG that plays itself on a TRMNL e-ink display.</p>
        <p className="text-muted">Every fifteen minutes a hero fights, finds loot or gets knocked out, and the screen shows what happened. Players open this companion every few days to sort gear and pick the next floor.</p>
      </header>
      <SampleScreen caption="Sample hero on a TRMNL X." />
      <section className="flex flex-col gap-3" aria-labelledby="play-heading">
        <h2 id="play-heading" className="font-display text-xl font-semibold">Want your own hero?</h2>
        <p>Desk Crawler needs a <a href="https://trmnl.com" className="underline underline-offset-4">TRMNL</a> display. Install the plugin from the TRMNL marketplace and your hero sets out from there.</p>
        <p className="text-sm text-muted">{RELEASE_STATUS}</p>
        <WaitlistForm source="pitch" />
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/games/desk-crawler" className="inline-flex min-h-11 items-center underline underline-offset-4">About Desk Crawler</Link>
          <Link to="/help/desk-crawler" className="inline-flex min-h-11 items-center underline underline-offset-4">Setup and TRMNL help</Link>
        </div>
      </section>
      <section className="flex flex-col gap-3 border-t border-rule pt-6" aria-labelledby="signin-heading">
        <h2 id="signin-heading" className="font-display text-xl font-semibold">Already playing?</h2>
        <p>Sign in to open your hero, bag and rankings.</p>
        <div><SignInButton mode="modal"><Button variant="secondary">Sign in</Button></SignInButton></div>
      </section>
    </main>
  )
}
