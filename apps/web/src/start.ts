import { clerkMiddleware } from '@clerk/tanstack-react-start/server'
import { createMiddleware, createStart } from '@tanstack/react-start'
import { privateFlowResponse } from './server/privateFlowResponse'

const privateHandoffs = createMiddleware().server(async ({ request, next }) => {
  const result = await next()
  return { ...result, response: privateFlowResponse(request, result.response) }
})

export const startInstance = createStart(() => ({
  requestMiddleware: [privateHandoffs, clerkMiddleware()],
}))
