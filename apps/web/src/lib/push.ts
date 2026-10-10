/**
 * Browser side of P33 hero alerts: what this browser can do, its push subscription, and a plain device label.
 * The worker's scope is the companion only and it caches nothing.
 */

export const PUSH_WORKER = '/push-sw.js'
export const PUSH_SCOPE = '/app/'

/** `ios-install`: iOS Safari outside a Home Screen install, where web push cannot work (iOS 16.4+ needs the install). */
export type PushSupport = 'checking' | 'ready' | 'denied' | 'ios-install' | 'unsupported'

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

export function pushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'checking'
  if (isIos() && !isStandalone()) return 'ios-install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return 'ready'
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i)
  return bytes
}

const toBase64url = (buffer: ArrayBuffer | null) => (buffer === null ? '' : btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''))

/** This browser's existing subscription, without prompting. */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== 'ready') return null
  const registration = await navigator.serviceWorker.getRegistration(PUSH_SCOPE)
  return (await registration?.pushManager.getSubscription()) ?? null
}

/** How long one step of setting up alerts may take before the button gives up and offers a retry. */
export const PUSH_STEP_MS = 15_000

/** Reject after `ms`, so a browser step that never settles cannot leave the button spinning. */
function within<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out')), ms)
    promise.then((value) => { clearTimeout(timer); resolve(value) }, (error: unknown) => { clearTimeout(timer); reject(error) })
  })
}

/**
 * Register the worker and wait for this registration's own worker to activate. `navigator.serviceWorker.ready` is not
 * used: on a first registration it waited for a worker controlling the page and, in Chrome on a Mac (2026-10-10),
 * never settled, leaving Settings on "Allowing…" until a reload.
 */
export async function activeRegistration(container: ServiceWorkerContainer = navigator.serviceWorker): Promise<ServiceWorkerRegistration> {
  const registration = await container.register(PUSH_WORKER, { scope: PUSH_SCOPE })
  if (registration.active) return registration
  const worker = registration.installing ?? registration.waiting
  if (worker === null) throw new Error('no worker')
  await new Promise<void>((resolve, reject) => {
    const check = () => {
      if (worker.state === 'activated') resolve()
      else if (worker.state === 'redundant') reject(new Error('worker redundant'))
    }
    worker.addEventListener('statechange', check)
    check()
  })
  return registration
}

/**
 * Ask for permission (only ever from a tap), register the worker and subscribe. Returns the parts the backend
 * stores, or the reason it could not. Every step is bounded, so the caller always hears back.
 */
export async function subscribePush(vapidPublicKey: string, container: ServiceWorkerContainer = navigator.serviceWorker, stepMs = PUSH_STEP_MS): Promise<{ endpoint: string; p256dh: string; auth: string } | 'denied' | 'failed'> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'failed'
  try {
    const registration = await within(activeRegistration(container), stepMs)
    const subscription = (await within(registration.pushManager.getSubscription(), stepMs)) ?? (await within(registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidPublicKey) }), stepMs))
    const p256dh = toBase64url(subscription.getKey('p256dh'))
    const auth = toBase64url(subscription.getKey('auth'))
    if (!p256dh || !auth) return 'failed'
    return { endpoint: subscription.endpoint, p256dh, auth }
  } catch {
    return 'failed'
  }
}

/** Matches the backend's `endpointFingerprint`, so Settings can mark this device in the list. */
export async function endpointFingerprint(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`push:${endpoint}`))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

/** "Chrome on Android", "Safari on iPhone": enough to tell devices apart, nothing more. */
export function deviceLabel(userAgent = navigator.userAgent): string {
  const device = /iPhone/.test(userAgent) ? 'iPhone' : /iPad/.test(userAgent) ? 'iPad' : /Android/.test(userAgent) ? 'Android' : /Mac OS X/.test(userAgent) ? 'Mac' : /Windows/.test(userAgent) ? 'Windows' : /Linux/.test(userAgent) ? 'Linux' : 'this device'
  const browser = /Edg\//.test(userAgent) ? 'Edge' : /Firefox\//.test(userAgent) ? 'Firefox' : /SamsungBrowser\//.test(userAgent) ? 'Samsung Internet' : /Chrome\//.test(userAgent) || /CriOS\//.test(userAgent) ? 'Chrome' : /Safari\//.test(userAgent) ? 'Safari' : 'Browser'
  return `${browser} on ${device}`
}
