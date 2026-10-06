import { ConvexQueryClient } from '@convex-dev/react-query'
import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { ConvexReactClient } from 'convex/react'
import { routeTree } from './routeTree.gen'
import { RouteError } from './lib/routeError'

/**
 * Called once per request on the server and once in the browser, so the Convex
 * client and any auth token set on it are request-scoped (architecture.md).
 */
export function getRouter() {
  const convexUrl = import.meta.env.VITE_CONVEX_URL
  if (!convexUrl) throw new Error('VITE_CONVEX_URL is not set')
  const convex = new ConvexReactClient(convexUrl, { unsavedChangesWarning: false })
  const convexQueryClient = new ConvexQueryClient(convex)
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        throwOnError: true,
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
  })
  convexQueryClient.connect(queryClient)

  const router = createRouter({
    routeTree,
    context: { queryClient, convexClient: convex, convexQueryClient },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultErrorComponent: RouteError,
  })
  setupRouterSsrQueryIntegration({ router, queryClient })
  if (typeof window !== 'undefined') recoverFromStaleChunks()
  return router
}

/**
 * A deploy replaces the hashed asset files, so a tab opened before it fails to
 * load the next route's chunk and the click silently does nothing. Vite reports
 * that as `vite:preloadError`; one full reload picks up the new build.
 */
function recoverFromStaleChunks() {
  const KEY = 'trmnl-games.chunk-reload'
  window.addEventListener('vite:preloadError', (event) => {
    // At most one automatic reload a minute, so a genuinely broken chunk cannot loop.
    let recently = false
    try {
      recently = Date.now() - Number(window.sessionStorage.getItem(KEY) ?? 0) < 60_000
      if (!recently) window.sessionStorage.setItem(KEY, String(Date.now()))
    } catch {
      // Storage unavailable: a single reload is still the best recovery.
    }
    if (recently) return
    event.preventDefault()
    window.location.reload()
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
