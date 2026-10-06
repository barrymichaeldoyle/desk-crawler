/** Keep credentials private on initial redirects as well as the eventual page. */
export function privateFlowResponse(request: Request, response: Response): Response {
  const path = new URL(request.url).pathname.replace(/\/$/, '')
  if (path !== '/account/delete' && !path.startsWith('/connect/trmnl/')) return response
  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'private, no-store')
  headers.set('Referrer-Policy', 'no-referrer')
  headers.set('X-Robots-Tag', 'noindex')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}
