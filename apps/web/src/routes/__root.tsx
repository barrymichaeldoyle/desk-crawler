import { ClerkProvider, useAuth } from '@clerk/tanstack-react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import type { ConvexQueryClient } from '@convex-dev/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { HeadContent, Link, Outlet, Scripts, createRootRouteWithContext, useRouteContext } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import type { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import type { ReactNode } from 'react'
import { SiteLinks } from '../lib/prose'
import { SITE_NAME, SITE_ORIGIN, seo } from '../lib/seo'
import appCss from '../styles.css?url'
import { NetworkProvider } from '../lib/network'
import { AnalyticsProvider } from '../lib/analyticsProvider'
import { useDeployWatch } from '../lib/deployWatch'

/** Server-only: read the Clerk session and mint a Convex token from the "convex" JWT template. */
const fetchClerkAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const { userId, getToken } = await auth()
  const token = userId ? await getToken({ template: 'convex' }) : null
  return { userId, token }
})

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
  convexClient: ConvexReactClient
  convexQueryClient: ConvexQueryClient
}>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ...seo({}).meta,
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:image', content: `${SITE_ORIGIN}/og.png` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: 'TRMNL Games: Pip the office warrior squares up to a Cable Serpent in the Server Room' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [
      // Both pixel faces are small latin subsets; preloading them keeps HUD text from reflowing when they swap in.
      { rel: 'preload', href: '/fonts/press-start-2p-latin.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
      { rel: 'preload', href: '/fonts/pixelify-sans-latin.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico', sizes: '16x16 32x32' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
    ],
  }),
  beforeLoad: async (ctx) => {
    // The session only matters for SSR, where it authenticates this request's Convex HTTP client.
    // In the browser the Convex socket is already signed in through Clerk, so client-side
    // navigations skip the server round trip that would otherwise delay every tab change.
    if (!import.meta.env.SSR) return { userId: null, token: null }
    const { userId, token } = await fetchClerkAuth()
    if (token) ctx.context.convexQueryClient.serverHttpClient?.setAuth(token)
    return { userId, token }
  },
  component: RootComponent,
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
})

function NotFound() {
  return (
    <main id="main" className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16">
      <h1 className="font-display text-3xl font-bold">This corridor is empty</h1>
      <p>There's no page at this address. It may have moved, or the link may be mistyped.</p>
      <p>
        <Link to="/" className="underline underline-offset-4">
          Back to the home page
        </Link>
      </p>
      <SiteLinks className="mt-4" />
    </main>
  )
}

function RootComponent() {
  const context = useRouteContext({ from: Route.id })
  useDeployWatch()
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={context.convexClient} useAuth={useAuth}>
        <NetworkProvider><Outlet /><AnalyticsProvider /></NetworkProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* Outside route head: HeadContent keeps only one meta per name. */}
        <meta name="theme-color" content="#15122b" />
        
      </head>
      <body className="antialiased">
        <a href="#main" className="sr-only border-2 border-night bg-gold px-4 py-3 font-semibold text-night focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50">
          Skip to content
        </a>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
