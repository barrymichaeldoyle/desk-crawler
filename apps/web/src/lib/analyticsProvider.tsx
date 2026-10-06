import { useUser } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { api } from '@trmnl-games/backend/api'
import { analyticsClient, analyticsConfigured, analyticsIdentityKey, captureAnalytics, CONSENT_EVENT, IDENTITY_EVENT, readAnalyticsConsent, setAnalyticsConsent, setAnalyticsIdentity, stopAnalytics, type AnalyticsConsent } from './analytics'
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
    refresh()
    window.addEventListener(CONSENT_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => { window.removeEventListener(CONSENT_EVENT, refresh); window.removeEventListener('storage', refresh) }
  }, [])
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
  if (!ready || !analyticsConfigured()) return null
  const choose = (value: 'allowed' | 'declined') => { setAnalyticsConsent(value); setPreferencesOpen(false) }
  return <aside aria-label="Analytics preferences" className="mx-auto w-full max-w-3xl px-4 py-4">
    {consent === null || preferencesOpen ? <div className="border-2 border-edge bg-panel p-4">
      <p className="font-semibold">Help us find problems</p>
      <p className="mt-2 text-sm">Allow usage analytics, error reports and masked session recordings? When signed in, these link to your account and email so we can help with support. You can play either way. <Link to="/privacy" className="underline underline-offset-4">Privacy details</Link></p>
      <div className="mt-3 flex flex-wrap gap-3"><Button variant="secondary" onClick={() => choose('allowed')}>Allow analytics</Button><Button variant="secondary" onClick={() => choose('declined')}>No thanks</Button></div>
    </div> : <button type="button" className="min-h-11 text-sm underline underline-offset-4" onClick={() => setPreferencesOpen(true)}>Analytics preferences</button>}
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
