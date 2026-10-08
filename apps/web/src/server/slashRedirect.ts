/**
 * The router strips a trailing slash with a temporary (307) redirect. That move is permanent, so send 308: search
 * engines then fold the slashed URL into the canonical one instead of keeping both.
 */
export function permanentSlashRedirect(request: Request, response: Response): Response {
  if (response.status !== 307) return response
  const from = new URL(request.url)
  if (from.pathname === '/' || !from.pathname.endsWith('/')) return response
  const location = response.headers.get('Location')
  if (!location) return response
  const to = new URL(location, from)
  if (to.origin !== from.origin || to.pathname !== from.pathname.replace(/\/+$/, '') || to.search !== from.search) return response
  return new Response(response.body, { status: 308, statusText: 'Permanent Redirect', headers: response.headers })
}
