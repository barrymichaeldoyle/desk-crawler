import { ConvexError } from 'convex/values'
import { useMutation } from 'convex/react'
import type { FunctionReference } from 'convex/server'
import { useRef, useState } from 'react'
import { ExpiredSubmission, Submission } from './submission'
import { getFunctionName } from 'convex/server'
import { captureAnalytics, captureAnalyticsException } from './analytics'

/** User-safe message from a structured Convex error (api.md error contract). */
export function errorMessage(error: unknown): string {
  if (error instanceof ExpiredSubmission) return error.message
  if (error instanceof ConvexError && typeof error.data === 'object' && error.data !== null && 'message' in error.data) {
    return String((error.data as { message: unknown }).message)
  }
  return 'We could not confirm that action. Check your connection, then try the same action again.'
}

/**
 * Run a state-changing intent with a fresh operation ID per action, a pending
 * flag that blocks double clicks, and a readable error.
 */
export function useIntent<Args extends { operationId: string }>(fn: FunctionReference<'mutation', 'public', Args>) {
  const mutate = useMutation(fn)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submission] = useState(() => new Submission())
  const inFlight = useRef(false)
  async function run(args: Omit<Args, 'operationId'>, successMessage = 'Done. Your TRMNL will reflect this on its next refresh.'): Promise<boolean> {
    if (inFlight.current) return false
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('You are offline. Reconnect, then try again. No action was queued.')
      return false
    }
    inFlight.current = true
    setPending(true)
    setError(null)
    setMessage(null)
    try {
      const done = await submission.run(args, (input) => (mutate as unknown as (input: Args) => Promise<unknown>)(input as Args), (error) => error instanceof ConvexError)
      if (done) setMessage(successMessage)
      return done
    } catch (caught) {
      const code = caught instanceof ConvexError && caught.data && typeof caught.data === 'object' && 'code' in caught.data ? String(caught.data.code) : caught instanceof ExpiredSubmission ? 'SUBMISSION_EXPIRED' : 'UNKNOWN'
      captureAnalytics('intent failed', { intent: getFunctionName(fn), error_code: code })
      if (!(caught instanceof ConvexError) && !(caught instanceof ExpiredSubmission)) captureAnalyticsException(caught, 'intent')
      setError(errorMessage(caught))
      return false
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }
  return { run, pending, error, message, clearError: () => setError(null), clearFeedback: () => { setError(null); setMessage(null) } }
}

export const artUrl = (path: string) => `${import.meta.env.VITE_CONVEX_SITE_URL ?? ''}${path}`
