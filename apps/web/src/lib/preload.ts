import type { QueryClient } from '@tanstack/react-query'

type EnsureOptions = Parameters<QueryClient['ensureQueryData']>[0]

/**
 * Fetch a signed-in page's Convex queries in its loader, so SSR renders the
 * game state instead of a loading placeholder while Clerk and the Convex
 * socket start up. The live subscription takes over after hydration.
 */
export async function preload(context: { queryClient: QueryClient; token?: string | null }, ...queries: Array<{ queryKey: readonly unknown[] }>): Promise<void> {
  if (!context.token) return
  // convexQuery() options are typed per result; ensureQueryData's generic defaults reject them by variance only.
  await Promise.all(queries.map((query) => context.queryClient.ensureQueryData(query as EnsureOptions)))
}
