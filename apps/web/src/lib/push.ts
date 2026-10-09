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

/**
 * Ask for permission (only ever from a tap), register the worker and subscribe. Returns the parts the backend
 * stores, or the reason it could not.
 */
export async function subscribePush(vapidPublicKey: string): Promise<{ endpoint: string; p256dh: string; auth: string } | 'denied' | 'failed'> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'failed'
  try {
    const registration = await navigator.serviceWorker.register(PUSH_WORKER, { scope: PUSH_SCOPE })
    await navigator.serviceWorker.ready
    const subscription = (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidPublicKey) }))
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
