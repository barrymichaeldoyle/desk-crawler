import { Show, UserButton } from '@clerk/tanstack-react-start'
import { Link } from '@tanstack/react-router'

/** The site header on every page: home link, My games, Account and the signed-in avatar. */
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
