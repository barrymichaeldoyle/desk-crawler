import { Show, SignInButton, useAuth } from '@clerk/tanstack-react-start'
import { PlatformHeader } from './platformHeader'

export { PlatformHeader }
import { Link, useLocation } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Button, LoadingState } from './ui'
import { OfflineNote } from './network'
import { SiteLinks } from './prose'
import { DeskCrawlerSignedOut } from './deskCrawlerPitch'

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
        <SiteLinks className="mx-auto w-full max-w-6xl px-3 py-6 min-[375px]:px-4" />
      </div>
    </div>
  )
}
