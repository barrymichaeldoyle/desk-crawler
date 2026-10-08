import { clerkMiddleware } from '@clerk/tanstack-react-start/server'
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

export const startInstance = createStart(() => ({
  requestMiddleware: [limitProfiles, shapeResponse, clerkMiddleware()],
}))
