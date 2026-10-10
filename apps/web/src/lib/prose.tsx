import { Link } from '@tanstack/react-router'
import { useEffect, useState, type ReactNode } from 'react'
import { analyticsConfigured, openAnalyticsPreferences } from './analytics'
import { PlatformHeader } from './platformHeader'

/**
 * A public reading page under the site header. `contents` adds a jump list of its sections under the title, for pages
 * long enough to need one; each entry's id must match its section heading's id.
 */
export function ProsePage({ title, updated, contents, children }: { title: string; updated?: string; contents?: ReadonlyArray<readonly [string, string]>; children: ReactNode }) {
  return (
    <>
      <PlatformHeader />
      <main id="main" className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10 leading-relaxed [&_h2]:mt-6 [&_h2]:scroll-mt-6 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-gold-ink [&_li]:ml-5 [&_li]:list-disc [&_a]:underline">
        <h1 className="font-display text-4xl font-bold">{title}</h1>
        {updated ? <p className="text-sm text-muted">Last updated {updated}</p> : null}
        {contents ? (
          <nav aria-labelledby="contents-title" className="window px-3 pt-3 pb-2 min-[375px]:px-4 sm:px-5">
            <h2 id="contents-title" className="!mt-0 !text-xl">On this page</h2>
            {/* Two columns even on phones, so twenty sections stay about half a screen; each link keeps a 44px row so it is an easy tap. */}
            <ul className="mt-1 grid grid-cols-2 gap-x-4 sm:gap-x-6">
              {contents.map(([id, label]) => <li key={id} className="!ml-0 !list-none"><a href={`#${id}`} className="flex min-h-11 items-center py-1 text-sm leading-snug underline-offset-4">{label}</a></li>)}
            </ul>
          </nav>
        ) : null}
        {children}
        <SiteLinks className="mt-8 border-t border-rule pt-4" />
      </main>
    </>
  )
}

/** Shared footer with public links, unofficial status and author credit. */
export function SiteLinks({ className = '' }: { className?: string }) {
  return (
    <footer className={`flex flex-col gap-4 text-sm ${className}`}>
      {/* Each link is a 44px tap target; the rows sit close because the targets carry their own height. */}
      <nav aria-label="Site" className="flex flex-wrap gap-x-4 underline underline-offset-4 [&>*]:inline-flex [&>*]:min-h-11 [&>*]:items-center">
        <Link to="/app">My games</Link>
        <Link to="/account">Account</Link>
        <Link to="/help/desk-crawler">TRMNL help</Link>
        <Link to="/support">Support</Link>
        <Link to="/feedback">Feedback</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <AnalyticsLink />
      </nav>
      <div className="flex flex-col gap-2 text-muted">
        <p>Unofficial companion site. Not operated by <a href="https://trmnl.com" className="underline underline-offset-4">TRMNL</a>.</p>
        <p>
          Built by <a href="https://barrymichaeldoyle.com" className="underline underline-offset-4">Barry Michael Doyle</a>.{' '}
          <a href="https://www.linkedin.com/in/barry-michael-doyle-11369683/" className="underline underline-offset-4">LinkedIn</a>{' · '}
          <a href="https://x.com/barrymdoyle" className="underline underline-offset-4">X</a>
        </p>
        <p>Also for TRMNL: <a href="https://trmnl.com/recipes/485545" className="underline underline-offset-4">Formula 1 Race Weekend</a>, powered by <a href="https://grandprixpicks.com" className="underline underline-offset-4">GrandPrixPicks.com</a>.</p>
        <p><a href="https://github.com/barrymichaeldoyle/trmnl-games" className="underline underline-offset-4">Source on GitHub</a></p>
      </div>
    </footer>
  )
}

/** Reopens the analytics consent panel; shown only where analytics can run, after hydration so SSR markup matches. */
function AnalyticsLink() {
  const [shown, setShown] = useState(false)
  useEffect(() => setShown(analyticsConfigured()), [])
  return shown ? <button type="button" className="underline underline-offset-4" onClick={openAnalyticsPreferences}>Analytics preferences</button> : null
}

export const SUPPORT_EMAIL = 'barry@barrymichaeldoyle.com'
/** One release status line, shared by the public pages and the companion's start card. */
export const RELEASE_STATUS = 'Free. Awaiting TRMNL marketplace review.'
/** Shown on the privacy and terms pages; bump whenever either changes. */
export const POLICY_UPDATED = '8 October 2026'
/** The privacy policy alone changed on 9 October 2026 (D110: public names in other players' raid stories). */
export const PRIVACY_UPDATED = '9 October 2026'
