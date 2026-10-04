import { ConvexError } from 'convex/values'
import { useMutation } from 'convex/react'
import type { FunctionReference } from 'convex/server'
import { useState } from 'react'

/** User-safe message from a structured Convex error (api.md error contract). */
export function errorMessage(error: unknown): string {
  if (error instanceof ConvexError && typeof error.data === 'object' && error.data !== null && 'message' in error.data) {
    return String((error.data as { message: unknown }).message)
  }
  return 'Something went wrong. Please try again.'
}

/**
 * Run a state-changing intent with a fresh operation ID per action, a pending
 * flag that blocks double clicks, and a readable error.
 */
export function useIntent<Args extends { operationId: string }>(fn: FunctionReference<'mutation', 'public', Args>) {
  const mutate = useMutation(fn)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function run(args: Omit<Args, 'operationId'>): Promise<boolean> {
    if (pending) return false
    setPending(true)
    setError(null)
    try {
      await (mutate as unknown as (input: Args) => Promise<unknown>)({ ...args, operationId: crypto.randomUUID() } as Args)
      return true
    } catch (caught) {
      setError(errorMessage(caught))
      return false
    } finally {
      setPending(false)
    }
  }
  return { run, pending, error, clearError: () => setError(null) }
}

export const artUrl = (path: string) => `${import.meta.env.VITE_CONVEX_SITE_URL ?? ''}${path}`
