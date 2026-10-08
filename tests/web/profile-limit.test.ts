import { describe, expect, it, vi } from 'vitest'
import { profileRateLimit, type RateLimiter } from '../../apps/web/src/server/profileLimit'

const request = (path: string, init: RequestInit & { ip?: string | null } = {}) => {
  const headers = new Headers(init.headers)
  if (init.ip !== null) headers.set('CF-Connecting-IP', init.ip ?? '203.0.113.7')
  return new Request(`https://trmnlgames.com${path}`, { ...init, headers })
}
const limiter = (success: boolean) => ({ limit: vi.fn<RateLimiter['limit']>(async () => ({ success })) })

describe('public hero page rate limit (D109)', () => {
  it('keys hero pages by visitor IP and answers 429 once the budget is spent', async () => {
    const allowed = limiter(true)
    expect(await profileRateLimit(request('/desk-crawler/heroes/Wren'), allowed)).toBeNull()
    expect(allowed.limit).toHaveBeenCalledWith({ key: 'profile:203.0.113.7' })
    const blocked = await profileRateLimit(request('/desk-crawler/heroes/Wren'), limiter(false))
    expect(blocked?.status).toBe(429)
    expect(blocked?.headers.get('Retry-After')).toBe('60')
  })

  it('leaves every other page, non-GET requests, missing IPs and local dev alone', async () => {
    const spent = limiter(false)
    for (const path of ['/', '/desk-crawler/heroes', '/desk-crawler/heroes/Wren/extra', '/app/desk-crawler']) expect(await profileRateLimit(request(path), spent)).toBeNull()
    expect(await profileRateLimit(request('/desk-crawler/heroes/Wren', { method: 'POST' }), spent)).toBeNull()
    expect(await profileRateLimit(request('/desk-crawler/heroes/Wren', { ip: null }), spent)).toBeNull()
    expect(await profileRateLimit(request('/desk-crawler/heroes/Wren'), undefined)).toBeNull()
    expect(spent.limit).not.toHaveBeenCalled()
  })
})
