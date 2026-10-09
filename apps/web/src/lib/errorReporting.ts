import { captureAnalyticsException, readAnalyticsConsent } from './analytics'
import { scrubSentryBreadcrumb, scrubSentryEvent, sentryOptions } from './sentry'

type SentryBrowser = typeof import('./sentryBrowser')
let loading: Promise<SentryBrowser | null> | null = null

/** Browser error reports go to Sentry (D113) under the same Allow analytics choice as PostHog, on the production site only. */
const reportingConfigured = () => import.meta.env.PROD && typeof window !== 'undefined' && window.location.origin === 'https://trmnlgames.com'

/** Loads and starts the browser SDK once, after consent. Withdrawal is honoured per event in beforeSend. */
export function startErrorReporting(): Promise<SentryBrowser | null> {
  // The SSR check is constant per bundle, so the Worker build drops the SDK import entirely.
  if (import.meta.env.SSR || !reportingConfigured() || readAnalyticsConsent() !== 'allowed') return Promise.resolve(null)
  loading ??= import('./sentryBrowser').then((Sentry) => {
    Sentry.init({
      ...sentryOptions,
      // No release-health sessions: nothing is sent unless an error is.
      integrations: (defaults) => defaults.filter((integration) => integration.name !== 'BrowserSession'),
      beforeSend: (event) => readAnalyticsConsent() === 'allowed' ? scrubSentryEvent(event) : null,
      beforeBreadcrumb: scrubSentryBreadcrumb,
    })
    return Sentry
  }).catch(() => { loading = null; return null })
  return loading
}

/** An error the app caught itself (route error screen, failed intent or installation), sent to both PostHog and Sentry. */
export function reportError(error: unknown, source: string) {
  captureAnalyticsException(error, source)
  void startErrorReporting().then((Sentry) => { Sentry?.captureException(error, { tags: { source, game: 'desk-crawler' } }) })
}
