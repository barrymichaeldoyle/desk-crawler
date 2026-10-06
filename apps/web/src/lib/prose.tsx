import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

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

/** Footer links to the public pages. */
export function SiteLinks({ className = '' }: { className?: string }) {
  return (
    <nav aria-label="Site" className={`flex flex-wrap gap-4 text-sm underline underline-offset-4 ${className}`}>
      <Link to="/app">My games</Link>
      <Link to="/account">Account</Link>
      <Link to="/help/desk-crawler">TRMNL help</Link>
      <Link to="/support">Support</Link>
      <Link to="/privacy">Privacy</Link>
      <Link to="/terms">Terms</Link>
    </nav>
  )
}

export const SUPPORT_EMAIL = 'barry@barrymichaeldoyle.com'
/** One release status line, shared by the public pages and the companion's start card. */
export const RELEASE_STATUS = 'Free. Awaiting TRMNL marketplace review.'
/** Shown on the privacy and terms pages; bump whenever either changes. */
export const POLICY_UPDATED = '4 October 2026'
