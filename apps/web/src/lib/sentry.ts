import type { Breadcrumb, ErrorEvent } from '@sentry/tanstackstart-react'
import { scrubAnalyticsText, scrubAnalyticsValue } from './analytics'

/** Public ingest key for the `trmnl-games` Sentry project (D113). Safe to ship: it can only submit events. */
export const SENTRY_DSN = 'https://2a8e9aa1794a981433d256ab0c409126@o299144.ingest.us.sentry.io/4512227006808064'
const PRODUCTION_ORIGIN = 'https://trmnlgames.com'

/** Shared by the Worker and the browser: no request bodies, headers, cookies, query strings, credentials or identity. */
export const sentryOptions = {
  dsn: SENTRY_DSN,
  environment: 'production',
  release: import.meta.env.VITE_BUILD_ID as string,
  dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false, stackFrameVariables: false },
  // Errors only. No tracesSampleRate, so tracing stays off and no trace headers are added to outgoing requests;
  // PostHog keeps the consented session recordings.
}

/** Drops events from development, local previews and other hosts, then strips anything that could carry a credential or a person. */
export function scrubSentryEvent(event: ErrorEvent): ErrorEvent | null {
  const location = event.request?.url ? safeUrl(event.request.url) : null
  if (!location || location.origin !== PRODUCTION_ORIGIN) return null
  const method = event.request?.method
  event.request = { ...(method ? { method } : {}), url: `${location.origin}${location.pathname}` }
  delete event.user
  delete event.server_name
  if (event.message) event.message = scrubAnalyticsText(event.message)
  for (const exception of event.exception?.values ?? []) if (exception.value) exception.value = scrubAnalyticsText(exception.value)
  if (event.breadcrumbs) event.breadcrumbs = event.breadcrumbs.map(scrubSentryBreadcrumb)
  if (event.extra) event.extra = scrubAnalyticsValue(event.extra) as NonNullable<ErrorEvent['extra']>
  if (event.tags) event.tags = scrubAnalyticsValue(event.tags) as NonNullable<ErrorEvent['tags']>
  if (event.transaction) event.transaction = scrubAnalyticsText(event.transaction)
  return event
}

export function scrubSentryBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  const scrubbed = { ...breadcrumb }
  if (scrubbed.message) scrubbed.message = scrubAnalyticsText(scrubbed.message)
  if (scrubbed.data) scrubbed.data = scrubAnalyticsValue(scrubbed.data) as NonNullable<Breadcrumb['data']>
  return scrubbed
}

function safeUrl(value: string) {
  try { return new URL(value) } catch { return null }
}
