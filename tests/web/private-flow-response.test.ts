import { describe, expect, it } from 'vitest'
import { privateFlowResponse } from '../../apps/web/src/server/privateFlowResponse'

describe('credential handoff response privacy', () => {
  it.each(['/account/delete?token=secret', '/account/delete/?token=secret', '/connect/trmnl/desk-crawler/install?code=secret', '/connect/trmnl/desk-crawler/manage?jwt=secret'])('protects the initial redirect at %s without losing its cookie or destination', path => {
    const response = privateFlowResponse(new Request('https://trmnlgames.com' + path), new Response(null, { status: 307, headers: { Location: '/clean', 'Set-Cookie': 'sealed=proof; HttpOnly; Secure', 'Cache-Control': 'public, max-age=3600' } }))
    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('/clean')
    expect(response.headers.get('Set-Cookie')).toBe('sealed=proof; HttpOnly; Secure')
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex')
  })
  it('keeps streamed private HTML and error responses private, while leaving public pages and assets alone', async () => {
    for (const status of [200, 400, 500]) {
      const response = privateFlowResponse(new Request('https://trmnlgames.com/account/delete'), new Response('content', { status }))
      expect(await response.text()).toBe('content')
      expect(response.status).toBe(status)
      expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    }
    for (const path of ['/', '/assets/app.js', '/account/deleted', '/help/desk-crawler']) {
      const original = new Response('public', { headers: { 'Cache-Control': 'public, max-age=3600' } })
      expect(privateFlowResponse(new Request('https://trmnlgames.com' + path), original)).toBe(original)
    }
  })
})
