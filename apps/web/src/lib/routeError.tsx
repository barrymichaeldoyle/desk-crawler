import { Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from './ui'

export function RouteError({ reset }: ErrorComponentProps) {
  const router = useRouter()
  const [retrying, setRetrying] = useState(false)
  const [retryFailed, setRetryFailed] = useState(false)
  return <section aria-labelledby="page-error-title" className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10">
    <h1 id="page-error-title" className="font-display text-3xl font-bold">We couldn’t load this page</h1>
    <p role="alert">{retryFailed ? 'This page still isn’t available. You can try again or contact support; your hero’s progress is safe.' : 'Check your connection and try again. Reloading this page won’t reset your hero’s progress.'}</p>
    <div className="flex flex-wrap gap-3">
      <Button pending={retrying} busyLabel="Trying again…" onClick={async () => { setRetrying(true); setRetryFailed(false); try { await router.invalidate(); reset() } catch { setRetryFailed(true) } finally { setRetrying(false) } }}>Try again</Button>
      <Link to="/app" className="inline-flex min-h-11 items-center px-4 font-semibold underline underline-offset-4">My games</Link>
      <Link to="/support" className="inline-flex min-h-11 items-center px-4 underline underline-offset-4">Get help</Link>
    </div>
  </section>
}
