import { describe, expect, it } from 'vitest'
import { scrubSentryBreadcrumb, scrubSentryEvent, sentryOptions } from '../../apps/web/src/lib/sentry'

type ErrorEvent = Parameters<typeof scrubSentryEvent>[0]

describe('Sentry error report privacy boundary (D113)', () => {
  const event = (fields: Partial<ErrorEvent>): ErrorEvent => ({ type: undefined, ...fields })

  it('drops reports from development, local previews and other hosts', () => {
    expect(scrubSentryEvent(event({}))).toBeNull()
    for (const url of ['http://localhost:3000/app', 'http://127.0.0.1:8787/', 'https://trmnl-games.example.workers.dev/', 'not a url'])
      expect(scrubSentryEvent(event({ request: { url } }))).toBeNull()
  })

  it('keeps only the method and path of the request: no query, headers, cookies, body or identity', () => {
    const scrubbed = scrubSentryEvent(event({
      request: { method: 'POST', url: 'https://trmnlgames.com/connect/trmnl/desk-crawler/install?code=secret-code&installation_callback_url=https%3A%2F%2Ftrmnl.com', query_string: 'code=secret-code', headers: { cookie: 'session=secret', authorization: 'Bearer secret' }, cookies: { session: 'secret' }, data: { code: 'secret-code' } },
      user: { id: 'user_test', email: 'player@example.test', ip_address: '203.0.113.1' },
      server_name: 'worker',
    }))
    expect(scrubbed?.request).toEqual({ method: 'POST', url: 'https://trmnlgames.com/connect/trmnl/desk-crawler/install' })
    expect(scrubbed?.user).toBeUndefined()
    expect(scrubbed?.server_name).toBeUndefined()
  })

  it('scrubs credentials from messages, exceptions, breadcrumbs, extra data and tags', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.c2lnbmF0dXJl'
    const scrubbed = scrubSentryEvent(event({
      request: { url: 'https://trmnlgames.com/app' },
      message: `Failed https://trmnlgames.com/manage?jwt=${jwt}`,
      exception: { values: [{ type: 'Error', value: `bad token=secret-token and ${jwt}` }] },
      breadcrumbs: [{ category: 'navigation', data: { from: '/connect/trmnl/desk-crawler/install?code=secret-code', to: '/app' } }],
      extra: { callbackUrl: 'https://trmnl.com/callback', note: 'access_token: secret' },
      tags: { source: 'route' },
    }))
    const serialized = JSON.stringify(scrubbed)
    for (const secret of ['secret-code', 'secret-token', jwt, 'secret', 'trmnl.com/callback']) expect(serialized).not.toContain(secret)
    expect(scrubbed?.message).toBe('Failed https://trmnlgames.com/manage')
    expect(scrubbed?.tags).toEqual({ source: 'route' })
  })

  it('scrubs breadcrumbs as they are recorded', () => {
    const crumb = scrubSentryBreadcrumb({ category: 'fetch', message: 'GET https://trmnlgames.com/_serverFn/x?code=abc', data: { url: 'https://trmnlgames.com/x?jwt=abc', status_code: 500 } })
    expect(crumb).toEqual({ category: 'fetch', message: 'GET https://trmnlgames.com/_serverFn/x', data: { url: 'https://trmnlgames.com/x', status_code: 500 } })
  })

  it('collects no identity, cookies, headers, bodies, query strings or local variables, and leaves tracing off', () => {
    expect(sentryOptions.dataCollection).toEqual({ userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false, stackFrameVariables: false })
    expect(sentryOptions).not.toHaveProperty('tracesSampleRate')
  })
})
