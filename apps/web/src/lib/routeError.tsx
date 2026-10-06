import { Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from './ui'
import { captureAnalyticsException } from './analytics'

export function RouteError({ reset, error }: ErrorComponentProps) {
  const router = useRouter()
  const [retrying, setRetrying] = useState(false)
  const [retryFailed, setRetryFailed] = useState(false)
  useEffect(() => { captureAnalyticsException(error, 'route') }, [error])
  return <section aria-labelledby="page-error-title" className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10">
    <h1 id="page-error-title" className="font-display text-3xl font-bold">We couldn’t load this page</h1>
    <p role="alert">{retryFailed ? 'Still not loading. Try again, or get help below.' : 'Check your connection and try again.'}</p>
    <div className="flex flex-wrap gap-3">
      <Button pending={retrying} busyLabel="Trying again…" onClick={async () => { setRetrying(true); setRetryFailed(false); try { await router.invalidate(); reset() } catch { setRetryFailed(true) } finally { setRetrying(false) } }}>Try again</Button>
      <Link to="/app" className="inline-flex min-h-11 items-center px-4 font-semibold underline underline-offset-4">My games</Link>
      <Link to="/support" className="inline-flex min-h-11 items-center px-4 underline underline-offset-4">Get help</Link>
    </div>
  </section>
}
