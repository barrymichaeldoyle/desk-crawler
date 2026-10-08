/** Cloudflare Workers rate-limiting binding (wrangler.jsonc `ratelimits`). */
export type RateLimiter = { limit(options: { key: string }): Promise<{ success: boolean }> }

const PROFILE_PATH = /^\/desk-crawler\/heroes\/[^/]+\/?$/

/**
 * Public hero pages (D109) are the one public page keyed by a guessable name, so
 * each visitor IP gets a budget of server-rendered loads (60 a minute, set in
 * wrangler.jsonc). Returns a 429 to send instead, or null to carry on. Without
 * the binding (local dev) or a client IP, the request passes.
 */
export async function profileRateLimit(request: Request, limiter: RateLimiter | undefined): Promise<Response | null> {
  if (!limiter || request.method !== 'GET' || !PROFILE_PATH.test(new URL(request.url).pathname)) return null
  const ip = request.headers.get('CF-Connecting-IP')
  if (!ip) return null
  const { success } = await limiter.limit({ key: `profile:${ip}` })
  if (success) return null
  return new Response('Too many hero pages at once. Try again in a minute.', {
    status: 429,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '60', 'Cache-Control': 'no-store' },
  })
}
