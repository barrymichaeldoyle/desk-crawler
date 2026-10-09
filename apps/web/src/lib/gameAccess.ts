import { convexQuery } from '@convex-dev/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { api } from '@trmnl-games/backend/api'
import type { GameSlug } from '@trmnl-games/platform'

/** The games this viewer can see, with each one's lifecycle status (slow-cast.md "Architecture"). */
export const gamesQuery = convexQuery(api.platform.list, {})

/**
 * Route loader gate for a game that may not be live. A hidden or preview game answers with the
 * ordinary not-found page for everyone but admins, so its routes cannot be probed for.
 */
export async function requireOpenGame(context: { queryClient: QueryClient }, slug: GameSlug): Promise<void> {
  const listing = await context.queryClient.ensureQueryData(gamesQuery)
  if (!listing.games.some((game) => game.slug === slug && game.canOpen)) throw notFound()
}
