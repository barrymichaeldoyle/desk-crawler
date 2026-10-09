import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { analyticsOptions, beforeAnalyticsSend, intentAnalytics, readAnalyticsConsent, scrubAnalyticsValue, setAnalyticsIdentity, setAnalyticsConsent } from '../../apps/web/src/lib/analytics'

describe('support analytics privacy boundary', () => {
  const storage = new Map<string, string>()
  beforeEach(() => {
    storage.clear()
    setAnalyticsIdentity(null)
    vi.stubGlobal('window', { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) }, dispatchEvent: vi.fn(), location: { href: 'https://trmnlgames.com/app/desk-crawler' } })
  })
  afterEach(() => { vi.stubGlobal('window', { localStorage: { setItem: vi.fn() }, dispatchEvent: vi.fn() }); setAnalyticsConsent('declined'); vi.unstubAllGlobals() })
  const event = (properties: object) => ({ event: '$exception', properties } as NonNullable<Parameters<typeof beforeAnalyticsSend>[0]>)
  it('starts without consent and drops captures until an explicit allow choice', () => {
    expect(readAnalyticsConsent()).toBeNull()
    expect(beforeAnalyticsSend(event({ email: 'player@example.test' }))).toBeNull()
    storage.set('tg_analytics_consent_v1', 'allowed')
    expect(beforeAnalyticsSend(event({ email: 'player@example.test', distinct_id: 'user_test' }))?.properties).toMatchObject({ email: 'player@example.test', distinct_id: 'user_test' })
    storage.set('tg_analytics_consent_v1', 'declined')
    expect(beforeAnalyticsSend(event({}))).toBeNull()
  })
  it('keeps the SDK project token that ingestion requires while scrubbing nested tokens', () => {
    storage.set('tg_analytics_consent_v1', 'allowed')
    const properties = beforeAnalyticsSend(event({ token: 'phc_project', distinct_id: 'user_test', $set: { token: 'secret-token' } }))?.properties
    expect(properties).toMatchObject({ token: 'phc_project', distinct_id: 'user_test' })
    expect(properties?.$set).toEqual({})
  })
  it('drops every capture while a raw TRMNL install or management credential is in the URL', () => {
    storage.set('tg_analytics_consent_v1', 'allowed')
    for (const query of ['code=secret-code', 'jwt=secret-jwt', 'token=deletion-proof', 'installation_callback_url=https%3A%2F%2Ftrmnl.com']) {
      window.location.href = `https://trmnlgames.com/connect/trmnl/desk-crawler/install?${query}`
      expect(beforeAnalyticsSend(event({}))).toBeNull()
    }
  })
  it('stays silent while the signed-in identity is loading or account deletion is pending', () => {
    storage.set('tg_analytics_consent_v1', 'allowed')
    setAnalyticsIdentity(undefined)
    expect(beforeAnalyticsSend(event({}))).toBeNull()
    setAnalyticsIdentity({ id: 'user_test', email: 'player@example.test', public_alias: null, hero_name: null })
    expect(beforeAnalyticsSend(event({ distinct_id: 'user_test' }))).not.toBeNull()
  })
  it('honors withdrawal even when browser storage refuses the update', () => {
    storage.set('tg_analytics_consent_v1', 'allowed')
    vi.stubGlobal('window', { localStorage: { getItem: () => 'allowed', setItem: () => { throw new Error('Storage blocked') } }, dispatchEvent: vi.fn(), location: { href: 'https://trmnlgames.com/app/desk-crawler' } })
    setAnalyticsConsent('declined')
    expect(readAnalyticsConsent()).toBe('declined')
    expect(beforeAnalyticsSend(event({}))).toBeNull()
  })
  it('scrubs nested replay URLs, exception frames, callbacks and credentials without removing support identity', () => {
    const cleaned = scrubAnalyticsValue({ email: 'player@example.test', distinct_id: 'user_123', error_code: 'INSTALL_EXPIRED', jwt: 'secret-jwt', tokenHash: 'secret-hash', $set: { public_alias: 'Player', callbackUrl: 'secret-callback' }, $exception_list: [{ value: 'Failed at https://trmnlgames.com/install?code=secret-code#secret-hash', frames: [{ filename: 'https://trmnlgames.com/assets/app.js?jwt=secret-jwt' }] }], snapshot: { attributes: { href: 'https://trmnl.com/plugin_settings/new?code=secret-code', src: 'https://trmnlgames.com/image.png?token=secret-token' } } })
    expect(JSON.stringify(cleaned)).not.toContain('secret-')
    expect(cleaned).toMatchObject({ distinct_id: 'user_123', email: 'player@example.test', error_code: 'INSTALL_EXPIRED', $set: { public_alias: 'Player' } })
  })
  it('blocks network and console capture and masks inputs, text and sensitive DOM attributes', () => {
    expect(analyticsOptions).toMatchObject({ autocapture: false, capture_pageview: false, capture_performance: false, enable_recording_console_log: false, session_recording: { maskAllInputs: true, maskTextSelector: '*', recordHeaders: false, recordBody: false } })
    expect(analyticsOptions.session_recording?.maskCapturedNetworkRequestFn?.({ name: 'secret' } as never)).toBeNull()
    expect(analyticsOptions.session_recording?.maskAttributeFn?.('href', 'https://trmnl.com/install?code=secret', undefined)).toBe('https://trmnl.com/install')
    expect(analyticsOptions.session_recording?.maskAttributeFn?.('data-token', 'secret', undefined)).toBe('[redacted]')
  })
})

describe('v1.1 intent analytics', () => {
  it('names the measured choices and carries only their catalog id', () => {
    expect(intentAnalytics('heroes:setStance', { stance: 'bold' })).toEqual(['stance changed', { stance: 'bold' }])
    expect(intentAnalytics('heroes:choose', { optionId: 'chip_in' })).toEqual(['decision made', { option_id: 'chip_in' }])
    expect(intentAnalytics('inventory:buyOffer', { offerId: 'potions' })).toEqual(['merchant purchase', { offer: 'potions' }])
    expect(intentAnalytics('inventory:buyPouch', { tierId: 'lunchbox' })).toEqual(['pouch bought', { tier: 'lunchbox' }])
    expect(intentAnalytics('inventory:buyBag', { tierId: 'tote' })).toEqual(['bag bought', { tier: 'tote' }])
  })
  it('ignores other intents and never forwards other arguments', () => {
    expect(intentAnalytics('inventory:sellMany', { itemIds: ['a'] })).toBeNull()
    expect(intentAnalytics('heroes:setStance', { stance: 'bold', operationId: 'op' })?.[1]).toEqual({ stance: 'bold' })
  })
})

describe('Slow Cast analytics (D115)', () => {
  it('maps Slow Cast intents to their events with no personal data', () => {
    expect(intentAnalytics('slowCast/anglers:sellCatches', { catchIds: ['a', 'b', 'c'] })).toEqual(['fish sold', { count: '3' }])
    expect(intentAnalytics('slowCast/anglers:buyNextRod', {})).toEqual(['tackle bought', { item: 'rod' }])
    expect(intentAnalytics('slowCast/anglers:buyBaitTubs', { bait: 'worms', tubs: 2 })).toEqual(['tackle bought', { item: 'worms' }])
    expect(intentAnalytics('slowCast/anglers:travelTo', { waterId: 'river_bend' })).toEqual(['water changed', { water: 'river_bend' }])
    expect(intentAnalytics('slowCast/anglers:chooseBait', { bait: 'bread' })).toEqual(['bait changed', { bait: 'bread' }])
    expect(intentAnalytics('slowCast/anglers:pause', {})).toBeNull()
  })
})
