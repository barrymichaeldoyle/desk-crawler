import { clerkMiddleware } from '@clerk/tanstack-react-start/server'
import { createMiddleware, createStart } from '@tanstack/react-start'
import { privateFlowResponse } from './server/privateFlowResponse'
import { permanentSlashRedirect } from './server/slashRedirect'

/** Permanent trailing-slash redirects, and private headers on credential handoffs. */
const shapeResponse = createMiddleware().server(async ({ request, next }) => {
  const result = await next()
  return { ...result, response: privateFlowResponse(request, permanentSlashRedirect(request, result.response)) }
})

export const startInstance = createStart(() => ({
  requestMiddleware: [shapeResponse, clerkMiddleware()],
}))
