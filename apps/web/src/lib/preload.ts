import type { QueryClient } from '@tanstack/react-query'

type EnsureOptions = Parameters<QueryClient['ensureQueryData']>[0]

/**
 * Fetch a signed-in page's Convex queries in its loader, so SSR renders the
 * game state instead of a loading placeholder while Clerk and the Convex
 * socket start up. In the browser the same call runs over the signed-in
 * socket, so a tab change shows the previous page until the next one has its
 * data instead of flashing a skeleton. The live subscription takes over after.
 */
export async function preload(context: { queryClient: QueryClient; token?: string | null }, ...queries: Array<{ queryKey: readonly unknown[] }>): Promise<void> {
  // Signed out on the server: nothing to fetch, and the shell shows the sign-in prompt.
  if (import.meta.env.SSR && !context.token) return
  // convexQuery() options are typed per result; ensureQueryData's generic defaults reject them by variance only.
  // A failure here is not fatal: the page's own useQuery retries it and reports through the route error boundary.
  await Promise.allSettled(queries.map((query) => context.queryClient.ensureQueryData(query as EnsureOptions)))
}
