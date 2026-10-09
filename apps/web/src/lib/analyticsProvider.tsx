import { useUser } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { api } from '@trmnl-games/backend/api'
import { analyticsClient, analyticsConfigured, analyticsIdentityKey, captureAnalytics, CONSENT_EVENT, IDENTITY_EVENT, PREFERENCES_EVENT, readAnalyticsConsent, setAnalyticsConsent, setAnalyticsIdentity, stopAnalytics, type AnalyticsConsent } from './analytics'
import { startErrorReporting } from './errorReporting'
import { Button } from './ui'

/** Mounted inside Clerk/Convex. SSR and development never initialize analytics. */
export function AnalyticsProvider() {
  const { user, isLoaded } = useUser()
  const { data: me } = useQuery({ ...convexQuery(api.users.me, {}), enabled: isLoaded && !!user })
  const updateConsent = useMutation(api.users.setAnalyticsConsent)
  const pathname = useLocation({ select: (location) => location.pathname })
  const [consent, setConsent] = useState<AnalyticsConsent>(null)
  const [ready, setReady] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const revision = useRef(0)
  const lastPage = useRef('')
  useLayoutEffect(() => {
    const available = ready && isLoaded && consent === 'allowed' && (!user || (me !== undefined && me !== null)) && me?.user?.state !== 'deleting'
    setAnalyticsIdentity(!available ? undefined : user ? { id: user.id, email: user.primaryEmailAddress?.emailAddress ?? null, public_alias: me?.user?.publicAlias ?? null, hero_name: me?.hero?.name ?? null } : null)
    return () => setAnalyticsIdentity(undefined)
  }, [consent, isLoaded, me, ready, user])
  useEffect(() => {
    const refresh = () => { setConsent(readAnalyticsConsent()); setReady(true) }
    const open = () => setPreferencesOpen(true)
    refresh()
    window.addEventListener(CONSENT_EVENT, refresh)
    window.addEventListener('storage', refresh)
    window.addEventListener(PREFERENCES_EVENT, open)
    return () => { window.removeEventListener(CONSENT_EVENT, refresh); window.removeEventListener('storage', refresh); window.removeEventListener(PREFERENCES_EVENT, open) }
  }, [])
  // Sentry browser error reports share the Allow analytics choice (D113); it is checked again on every event.
  useEffect(() => { if (ready && consent === 'allowed') void startErrorReporting() }, [consent, ready])
  useEffect(() => {
    if (!ready || !isLoaded || !analyticsConfigured()) return
    const currentRevision = ++revision.current
    if (consent !== 'allowed') { stopAnalytics(); lastPage.current = ''; return }
    if (user && (me === undefined || me === null)) { stopAnalytics(); return }
    const deleting = me?.user?.state === 'deleting'
    if (deleting) { stopAnalytics(); return }
    void analyticsClient().then((sdk) => {
      if (!sdk || revision.current !== currentRevision) return
      const pageKey = `${pathname}:${user?.id ?? 'anonymous'}`
      if (lastPage.current !== pageKey) { sdk.capture('$pageview', { $current_url: `${window.location.origin}${pathname}`, $pathname: pathname }); lastPage.current = pageKey }
      sdk.startSessionRecording()
    }).catch(() => {})
  }, [consent, isLoaded, me, pathname, ready, user])
  useEffect(() => {
    if (!ready || !me?.user || me.user.state !== 'active' || !analyticsConfigured()) return
    const allowed = consent === 'allowed'
    if (allowed === me.user.analyticsConsent) return
    void updateConsent({ allowed }).catch(() => {})
  }, [consent, me, ready, updateConsent])
  // The standing "Analytics preferences" link lives in the site footer (SiteLinks); this only shows the consent panel.
  if (!ready || !analyticsConfigured() || (consent !== null && !preferencesOpen)) return null
  const choose = (value: 'allowed' | 'declined') => { setAnalyticsConsent(value); setPreferencesOpen(false) }
  // Pinned to the foot of the screen, so it is seen on arrival and when reopened from the footer, not after the page.
  return <aside aria-label="Analytics preferences" className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
    <div className="border-2 border-edge bg-panel p-3 sm:p-4 shadow-[0_0_0_4px_var(--color-night)]">
      <p className="font-semibold">Help us find problems</p>
      <p className="mt-2 text-sm">Allow usage analytics, error reports and masked session recordings? When signed in, these link to your account and email so we can help with support. You can play either way. <Link to="/privacy" className="underline underline-offset-4">Privacy details</Link></p>
      {/* One row of two equal answers: stacked, the panel covered about a third of a phone screen. */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3"><Button variant="secondary" className="px-2 sm:px-4" onClick={() => choose('allowed')}>Allow analytics</Button><Button variant="secondary" className="px-2 sm:px-4" onClick={() => choose('declined')}>No thanks</Button></div>
    </div>
  </aside>
}

export function useAnalyticsView(event: Parameters<typeof captureAnalytics>[0], properties: Parameters<typeof captureAnalytics>[1], enabled = true) {
  const [consent, setConsent] = useState(readAnalyticsConsent)
  const [identityKey, setIdentityKey] = useState(analyticsIdentityKey)
  const last = useRef('')
  const key = JSON.stringify(properties)
  useEffect(() => {
    const refresh = () => { setConsent(readAnalyticsConsent()); setIdentityKey(analyticsIdentityKey()) }
    refresh()
    window.addEventListener(CONSENT_EVENT, refresh)
    window.addEventListener(IDENTITY_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => { window.removeEventListener(CONSENT_EVENT, refresh); window.removeEventListener(IDENTITY_EVENT, refresh); window.removeEventListener('storage', refresh) }
  }, [])
  useEffect(() => {
    if (!enabled || !identityKey || consent !== 'allowed' || last.current === `${identityKey}:${event}:${key}`) return
    last.current = `${identityKey}:${event}:${key}`
    captureAnalytics(event, JSON.parse(key))
  }, [consent, enabled, event, identityKey, key])
}
