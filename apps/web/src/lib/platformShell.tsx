import { Show, SignInButton, UserButton } from '@clerk/tanstack-react-start'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Button } from './ui'

export function PlatformHeader() {
  return (
    <header className="border-b border-stone-300 dark:border-stone-800">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5">
      <Link to="/" className="flex items-center gap-2 font-semibold"><img src="/favicon.svg" alt="" width={20} height={20} className="[image-rendering:pixelated]" />TRMNL Games</Link>
      <nav aria-label="Platform" className="flex items-center gap-4 text-sm">
        <Link to="/app" className="underline underline-offset-4">My games</Link>
        <Link to="/account" className="underline underline-offset-4">Account</Link>
        <Show when="signed-in"><UserButton appearance={{ elements: { avatarBox: { filter: 'grayscale(1)' } } }} /></Show>
      </nav>
      </div>
    </header>
  )
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />
      <Show when="signed-out">
        <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10">
          <h1 className="text-2xl font-bold">Your TRMNL Games companion</h1>
          <p>Sign in to manage your games and account.</p>
          <SignInButton mode="modal"><Button>Sign in</Button></SignInButton>
        </main>
      </Show>
      <Show when="signed-in">{children}</Show>
    </div>
  )
}
