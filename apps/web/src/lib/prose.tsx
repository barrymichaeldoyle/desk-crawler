import { Link } from '@tanstack/react-router'
import { useEffect, useState, type ReactNode } from 'react'
import { analyticsConfigured, openAnalyticsPreferences } from './analytics'

export function ProsePage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <main id="main" className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-12 leading-relaxed [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-gold-ink [&_li]:ml-5 [&_li]:list-disc [&_a]:underline">
      <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold no-underline">
        <img src="/favicon.svg" alt="" width={24} height={24} className="[image-rendering:pixelated]" />
        TRMNL Games
      </Link>
      <h1 className="font-display text-4xl font-bold">{title}</h1>
      {updated ? <p className="text-sm text-muted">Last updated {updated}</p> : null}
      {children}
      <SiteLinks className="mt-8 border-t border-rule pt-4" />
    </main>
  )
}

/** Shared footer with public links, unofficial status and author credit. */
export function SiteLinks({ className = '' }: { className?: string }) {
  return (
    <footer className={`flex flex-col gap-4 text-sm ${className}`}>
      <nav aria-label="Site" className="flex flex-wrap gap-4 underline underline-offset-4">
        <Link to="/app">My games</Link>
        <Link to="/account">Account</Link>
        <Link to="/help/desk-crawler">TRMNL help</Link>
        <Link to="/support">Support</Link>
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
export const POLICY_UPDATED = '6 October 2026'
