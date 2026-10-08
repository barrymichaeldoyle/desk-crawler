import { Show, SignInButton, UserButton, useAuth } from '@clerk/tanstack-react-start'
import { Link, useLocation } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Button, LoadingState } from './ui'
import { OfflineNote } from './network'
import { SiteLinks } from './prose'
import { DeskCrawlerSignedOut } from './deskCrawlerPitch'

export function PlatformHeader() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5">
      <Link to="/" className="flex min-h-11 items-center gap-2 font-display text-lg font-semibold"><img src="/favicon.svg" alt="" width={24} height={24} className="[image-rendering:pixelated]" />TRMNL Games</Link>
      <nav aria-label="Platform" className="flex items-center gap-3 text-sm">
        <Link to="/app" className="inline-flex min-h-11 items-center underline underline-offset-4">My games</Link>
        <Link to="/account" className="inline-flex min-h-11 items-center underline underline-offset-4">Account</Link>
        {/* Clerk's avatar button is client-only; its 28px slot is reserved so the links beside it never shift when it appears. */}
        <span className="inline-flex size-7 shrink-0 items-center justify-center"><Show when="signed-in"><UserButton userProfileProps={{ appearance: { elements: { profileSection__danger: { display: 'none' } } } }} /></Show></span>
      </nav>
      </div>
    </header>
  )
}

export function AuthShell({ children }: { children: ReactNode }) {
  const { isLoaded } = useAuth()
  // The screen's QR codes open these routes, often on a stranger's phone: explain the game before asking for a sign-in (D102).
  const deskCrawler = useLocation({ select: (location) => location.pathname.startsWith('/app/desk-crawler') })
  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />
      <OfflineNote />
      {!isLoaded ? <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8"><LoadingState label="Checking your sign-in…" /></main> : null}
      <Show when="signed-out">
        {deskCrawler ? <DeskCrawlerSignedOut /> : <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10">
          <h1 className="font-display text-3xl font-bold">Your TRMNL Games companion</h1>
          <p>Sign in to manage your games and account.</p>
          <SignInButton mode="modal"><Button>Sign in</Button></SignInButton>
        </main>}
      </Show>
      <Show when="signed-in">{children}</Show>
      <div className="mt-auto border-t border-rule">
        <SiteLinks className="mx-auto w-full max-w-6xl px-4 py-6" />
      </div>
    </div>
  )
}
