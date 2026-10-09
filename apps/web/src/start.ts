import { clerkMiddleware } from '@clerk/tanstack-react-start/server'
import { captureException } from '@sentry/cloudflare'
import { createMiddleware, createStart } from '@tanstack/react-start'
import { privateFlowResponse } from './server/privateFlowResponse'
import { permanentSlashRedirect } from './server/slashRedirect'
import { profileRateLimit, type RateLimiter } from './server/profileLimit'

/** Permanent trailing-slash redirects, and private headers on credential handoffs. */
const shapeResponse = createMiddleware().server(async ({ request, next }) => {
  const result = await next()
  return { ...result, response: privateFlowResponse(request, permanentSlashRedirect(request, result.response)) }
})

/** Per-IP budget for public hero pages (D109); the binding exists only in the deployed Worker. */
const limitProfiles = createMiddleware().server(async ({ request, next }) => {
  const { env } = await import('cloudflare:workers')
  return (await profileRateLimit(request, env.PROFILE_LIMITER as RateLimiter | undefined)) ?? next()
})

/**
 * Report an uncaught request or server-function error to Sentry (D113), then rethrow it unchanged. The `.server()`
 * bodies never reach the browser bundle, so the Sentry SDK only loads there after Allow analytics (lib/errorReporting).
 */
function reportAndRethrow(error: unknown, type: string): never {
  captureException(error, { mechanism: { type, handled: false } })
  throw error
}
const reportRequestErrors = createMiddleware().server(async ({ next }) => {
  try { return await next() } catch (error) { reportAndRethrow(error, 'auto.middleware.tanstackstart.request') }
})
const reportFunctionErrors = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  try { return await next() } catch (error) { reportAndRethrow(error, 'auto.middleware.tanstackstart.server_function') }
})

// The reporters come first so they see every error the later middleware and handlers throw.
export const startInstance = createStart(() => ({
  requestMiddleware: [reportRequestErrors, limitProfiles, shapeResponse, clerkMiddleware()],
  functionMiddleware: [reportFunctionErrors],
}))
