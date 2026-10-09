import * as Sentry from '@sentry/cloudflare'
import handler from '@tanstack/react-start/server-entry'
import { scrubSentryBreadcrumb, scrubSentryEvent, sentryOptions } from './lib/sentry'

/** The Worker entry (wrangler `main`): TanStack Start's handler, reporting uncaught server errors to Sentry (D113). */
export default Sentry.withSentry(
  () => ({ ...sentryOptions, enabled: import.meta.env.PROD, beforeSend: scrubSentryEvent, beforeBreadcrumb: scrubSentryBreadcrumb }),
  handler,
)
