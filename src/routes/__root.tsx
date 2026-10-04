import { ClerkProvider, useAuth } from '@clerk/tanstack-react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import type { ConvexQueryClient } from '@convex-dev/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { HeadContent, Link, Outlet, Scripts, createRootRouteWithContext, useRouteContext } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import type { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import type { ReactNode } from 'react'
import { SITE_NAME, SITE_ORIGIN, seo } from '../lib/seo'
import appCss from '../styles.css?url'

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
      { property: 'og:image:alt', content: 'Desk Crawler: a pixel-art office warrior faces an elite Legacy Mainframe in the Server Room' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
    ],
  }),
  beforeLoad: async (ctx) => {
    const { userId, token } = await fetchClerkAuth()
    // During SSR, authenticate this request's Convex HTTP client only.
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
      <h1 className="text-3xl font-bold">This corridor is empty</h1>
      <p>There's no page at this address. It may have moved, or the link may be mistyped.</p>
      <p className="flex flex-wrap gap-4 underline underline-offset-4">
        <Link to="/">Home</Link>
        <Link to="/app">Companion</Link>
        <Link to="/help/trmnl">TRMNL help</Link>
      </p>
    </main>
  )
}

function RootComponent() {
  const context = useRouteContext({ from: Route.id })
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={context.convexClient} useAuth={useAuth}>
        <Outlet />
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
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#fafaf9" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0c0a09" />
      </head>
      <body className="bg-stone-50 text-stone-900 antialiased dark:bg-stone-950 dark:text-stone-100">
        <a href="#main" className="sr-only rounded-md bg-stone-900 px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 dark:bg-stone-100 dark:text-stone-900">
          Skip to content
        </a>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
