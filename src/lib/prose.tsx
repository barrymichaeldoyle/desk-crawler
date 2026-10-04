import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

export function ProsePage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <main id="main" className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-12 leading-relaxed [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_a]:underline">
      <Link to="/" className="font-semibold no-underline">
        Desk Crawler
      </Link>
      <h1 className="text-3xl font-bold">{title}</h1>
      {updated ? <p className="text-sm text-stone-600 dark:text-stone-400">Last updated {updated}</p> : null}
      {children}
      <SiteLinks className="mt-8 border-t border-stone-300 pt-4 dark:border-stone-700" />
    </main>
  )
}

/** Footer links to the public pages. */
export function SiteLinks({ className = '' }: { className?: string }) {
  return (
    <nav aria-label="Site" className={`flex flex-wrap gap-4 text-sm underline underline-offset-4 ${className}`}>
      <Link to="/app">Companion</Link>
      <Link to="/help/trmnl">TRMNL help</Link>
      <Link to="/support">Support</Link>
      <Link to="/privacy">Privacy</Link>
      <Link to="/terms">Terms</Link>
    </nav>
  )
}

export const SUPPORT_EMAIL = 'barry@barrymichaeldoyle.com'
/** Shown on the privacy and terms pages; bump whenever either changes. */
export const POLICY_UPDATED = '4 October 2026'
