import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'

const CHECK_EVERY_MS = 30 * 60 * 1000
const RELOADED_KEY = 'tg_reloaded_for_build'

/** Reload once per deployed build: if a reload still served old code (a stale cache), don't keep reloading. */
const reloadOnce = (deployed: string) => {
  try {
    if (sessionStorage.getItem(RELOADED_KEY) === deployed) return
    sessionStorage.setItem(RELOADED_KEY, deployed)
  } catch {
    // No storage: reload anyway; the check runs only when the tab comes back into view.
  }
  window.location.reload()
}

/** True while the person is typing, so a reload never throws away what they entered. */
const typing = () => {
  const active = document.activeElement
  return active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement || (active instanceof HTMLElement && active.isContentEditable)
}

/**
 * A tab left open across a deploy keeps running the old bundle, so new art and layouts never reach it (a hero page
 * open since the morning still multiplied 1-bit scenes after D96 shipped). Compare this bundle's build id with the
 * deployed `/build.json` when the tab comes back into view and every half hour. Once they differ, the next in-app
 * navigation loads the page fresh, and returning to the tab reloads it (once per build) unless a field has focus.
 */
export function useDeployWatch() {
  const router = useRouter()
  useEffect(() => {
    const current = import.meta.env.VITE_BUILD_ID as string | undefined
    if (import.meta.env.DEV || !current) return
    let stale = false
    let deployedId = ''
    let checking = false
    const check = async () => {
      if (stale || checking || !navigator.onLine) return
      checking = true
      try {
        const response = await fetch('/build.json', { cache: 'no-store' })
        const deployed = response.ok ? ((await response.json()) as { id?: unknown }).id : undefined
        stale = typeof deployed === 'string' && deployed !== current
        if (stale) deployedId = deployed as string
      } catch {
        // Offline or mid-deploy: try again at the next check.
      } finally {
        checking = false
      }
    }
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (stale && !typing()) reloadOnce(deployedId)
      else void check().then(() => { if (stale && !typing()) reloadOnce(deployedId) })
    }
    const unsubscribe = router.subscribe('onBeforeNavigate', ({ toLocation, pathChanged }) => {
      if (stale && pathChanged) window.location.assign(toLocation.href)
    })
    const timer = window.setInterval(() => void check(), CHECK_EVERY_MS)
    document.addEventListener('visibilitychange', onVisible)
    void check()
    return () => {
      unsubscribe()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [router])
}
