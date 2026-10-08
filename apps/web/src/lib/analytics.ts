import type { PostHog, PostHogConfig, CaptureResult } from 'posthog-js'

export type AnalyticsConsent = 'allowed' | 'declined' | null
export type AnalyticsIdentity = { id: string; email: string | null; public_alias: string | null; hero_name: string | null } | null
export const CONSENT_KEY = 'tg_analytics_consent_v1'
export const CONSENT_EVENT = 'tg:analytics-consent'
export const IDENTITY_EVENT = 'tg:analytics-identity'
/** The site footer's link asks the provider to reopen the consent panel. */
export const PREFERENCES_EVENT = 'tg:analytics-preferences'
export const openAnalyticsPreferences = () => window.dispatchEvent(new Event(PREFERENCES_EVENT))
export type AnalyticsEvent = 'installation started' | 'installation submitted' | 'installation connected' | 'installation failed' | 'setup screen shown' | 'setup help opened' | 'companion ready' | 'management opened' | 'management account mismatch' | 'account switched' | 'intent failed' | 'stance changed' | 'decision made' | 'merchant purchase' | 'pouch bought' | 'bag bought' | 'waitlist joined' | 'feedback sent'
let volatileConsent: AnalyticsConsent = null

export function readAnalyticsConsent(): AnalyticsConsent {
  if (typeof window === 'undefined') return null
  if (volatileConsent !== null) return volatileConsent
  try {
    const value = window.localStorage.getItem(CONSENT_KEY)
    return value === 'allowed' || value === 'declined' ? value : null
  } catch { return null }
}

export function setAnalyticsConsent(value: Exclude<AnalyticsConsent, null>) {
  try { window.localStorage.setItem(CONSENT_KEY, value); volatileConsent = null } catch { volatileConsent = value }
  window.dispatchEvent(new Event(CONSENT_EVENT))
  if (value === 'declined') {
    client?.stopSessionRecording()
    client?.opt_out_capturing()
    client?.reset(true)
  }
}

/** Strip every URL's search/hash, including nested URLs in exception messages and replay attributes. */
export function scrubAnalyticsText(value: string): string {
  return value
    .replace(/https?:\/\/[^\s"'<>]+/g, (raw) => {
      try { const url = new URL(raw); return `${url.origin}${url.pathname}` } catch { return '[url]' }
    })
    .replace(/\b(code|jwt|access_token|token|installation_callback_url|authorization|cookie|secret)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g, '[redacted]')
}

const privateKey = /^(code|jwt|token|access_token|authorization|cookie|secret|installation_callback_url|callbackUrl|tokenIdentifier|tokenHash)$/i
export function scrubAnalyticsValue(value: unknown): unknown {
  if (typeof value === 'string') return scrubAnalyticsText(value)
  if (Array.isArray(value)) return value.map(scrubAnalyticsValue)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !privateKey.test(key)).map(([key, item]) => [key, scrubAnalyticsValue(item)]))
  return value
}

export function beforeAnalyticsSend(event: CaptureResult | null): CaptureResult | null {
  if (!event || identity === undefined || readAnalyticsConsent() !== 'allowed' || hasSensitiveLocation()) return null
  // The SDK's top-level `token` is the public project key ingestion requires; the SDK drops any event whose hook removes it.
  const { token, ...properties } = event.properties ?? {}
  const scrubbed = scrubAnalyticsValue(properties) as CaptureResult['properties']
  return { ...event, properties: token === undefined ? scrubbed : { ...scrubbed, token } }
}

function hasSensitiveLocation() {
  return typeof window !== 'undefined' && /(?:[?&#])(code|jwt|token|installation_callback_url|access_token)=/i.test(window.location.href)
}

export const analyticsOptions: Partial<PostHogConfig> = {
  defaults: '2026-05-30',
  person_profiles: 'identified_only',
  persistence: 'localStorage',
  autocapture: false,
  capture_pageview: false,
  capture_pageleave: false,
  capture_dead_clicks: false,
  capture_heatmaps: false,
  capture_performance: false,
  capture_exceptions: { capture_unhandled_errors: true, capture_unhandled_rejections: true, capture_console_errors: false },
  enable_recording_console_log: false,
  save_referrer: false,
  store_google: false,
  save_campaign_params: false,
  disable_surveys: true,
  advanced_disable_feature_flags: true,
  before_send: beforeAnalyticsSend,
  get_current_url: () => typeof window === 'undefined' ? '' : `${window.location.origin}${window.location.pathname}`,
  session_recording: {
    maskAllInputs: true,
    maskTextSelector: '*',
    blockSelector: '[data-analytics-private], .cl-rootBox, .cl-modalContent, .cl-userButtonPopoverCard, input[type="hidden"], input[type="file"], script',
    maskAttributeFn: (name, value) => /^(href|src|action)$/i.test(name) ? scrubAnalyticsText(value) : /^(value|data-.*|title|alt)$/i.test(name) ? '[redacted]' : value,
    maskCapturedNetworkRequestFn: () => null,
    recordHeaders: false,
    recordBody: false,
    captureCanvas: { recordCanvas: false },
  },
}

let client: PostHog | null = null
let loading: Promise<PostHog | null> | null = null
let identity: AnalyticsIdentity | undefined
let identifiedProperties = ''

/** The auth provider publishes identity before route effects capture events. Unknown/deleting accounts stay silent. */
export function setAnalyticsIdentity(value: AnalyticsIdentity | undefined) {
  const previous = analyticsIdentityKey()
  identity = value
  if (value === undefined) client?.stopSessionRecording()
  else if (client) synchronizeIdentity(client)
  if (previous !== analyticsIdentityKey() && typeof window !== 'undefined') window.dispatchEvent(new Event(IDENTITY_EVENT))
}

export const analyticsIdentityKey = () => identity === undefined ? '' : identity?.id ?? 'anonymous'

function synchronizeIdentity(sdk: PostHog) {
  const distinctId = sdk.get_distinct_id()
  // Clerk IDs use user_; a persisted previous account must never receive a new visitor's events.
  if (distinctId?.startsWith('user_') && distinctId !== identity?.id) { sdk.reset(true); identifiedProperties = '' }
  if (identity) {
    const key = JSON.stringify(identity)
    if (key !== identifiedProperties) {
      const { id, ...properties } = identity
      sdk.identify(id, properties)
      identifiedProperties = key
    }
  } else identifiedProperties = ''
}

export const analyticsConfigured = () => Boolean(import.meta.env.VITE_POSTHOG_PROJECT_TOKEN && import.meta.env.PROD && typeof window !== 'undefined' && window.location.origin === 'https://trmnlgames.com')

export async function analyticsClient(): Promise<PostHog | null> {
  if (!analyticsConfigured() || identity === undefined || readAnalyticsConsent() !== 'allowed' || hasSensitiveLocation()) return null
  if (client) { if (client.has_opted_out_capturing()) client.opt_in_capturing(); synchronizeIdentity(client); return client }
  if (!loading) loading = import('posthog-js').then(({ default: posthog }) => {
    if (identity === undefined || readAnalyticsConsent() !== 'allowed' || hasSensitiveLocation()) return null
    posthog.init(import.meta.env.VITE_POSTHOG_PROJECT_TOKEN, { ...analyticsOptions, api_host: import.meta.env.VITE_POSTHOG_HOST, ui_host: 'https://eu.posthog.com' })
    posthog.register({ environment: 'production', app: 'trmnl-games' })
    client = posthog
    synchronizeIdentity(posthog)
    return posthog
  }).catch(() => null).finally(() => { loading = null })
  return loading
}

/** Analytics is optional: never delay navigation, submission or game state for it. */
export function captureAnalytics(event: AnalyticsEvent, properties: Record<string, string | boolean | number | null> = {}) {
  void analyticsClient().then((sdk) => {
    if (readAnalyticsConsent() === 'allowed' && !hasSensitiveLocation()) sdk?.capture(event, { game: 'desk-crawler', ...properties })
  }).catch(() => {})
}

/** v1.1 choices worth measuring: intent → event and the one catalog id argument it may carry. */
const INTENT_EVENTS: Record<string, [AnalyticsEvent, string, string]> = {
  'heroes:setStance': ['stance changed', 'stance', 'stance'],
  'heroes:choose': ['decision made', 'optionId', 'option_id'],
  'inventory:buyOffer': ['merchant purchase', 'offerId', 'offer'],
  'inventory:buyPouch': ['pouch bought', 'tierId', 'tier'],
  'inventory:buyBag': ['bag bought', 'tierId', 'tier'],
}

export function intentAnalytics(intent: string, args: Record<string, unknown>): [AnalyticsEvent, Record<string, string>] | null {
  const entry = INTENT_EVENTS[intent]
  if (!entry) return null
  const [event, arg, property] = entry
  return [event, typeof args[arg] === 'string' ? { [property]: args[arg] } : {}]
}

export function captureAnalyticsException(error: unknown, source: string) {
  const safe = new Error(scrubAnalyticsText(error instanceof Error ? error.message : 'Unknown application error'))
  if (error instanceof Error) { safe.name = error.name; if (error.stack) safe.stack = scrubAnalyticsText(error.stack) }
  void analyticsClient().then((sdk) => { if (readAnalyticsConsent() === 'allowed') sdk?.captureException(safe, { source, game: 'desk-crawler' }) }).catch(() => {})
}

export function stopAnalytics() {
  client?.stopSessionRecording()
  client?.opt_out_capturing()
  client?.reset(true)
  identifiedProperties = ''
}
