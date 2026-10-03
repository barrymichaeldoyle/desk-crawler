/**
 * Pending TRMNL install flow (trmnl.md "Installation flow"). The code and
 * callback live only in a short-lived AES-GCM encrypted HttpOnly cookie; they
 * never reach client JavaScript, local storage or logs.
 */
export const INSTALL_COOKIE = 'dc_trmnl_install'
export const INSTALL_FLOW_TTL_SECONDS = 20 * 60

export interface PendingInstall {
  readonly code: string
  readonly callbackUrl: string
  readonly expiresAt: number
}

/** Exact TRMNL host over HTTPS: no credentials, no foreign port, bounded length. Prevents open redirects. */
export function validateCallbackUrl(raw: string): string | null {
  if (raw.length === 0 || raw.length > 2048) return null
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.hostname !== 'trmnl.com' || url.port !== '' || url.username !== '' || url.password !== '') return null
  return url.toString()
}

export function validateInstallCode(raw: string): string | null {
  return raw.length > 0 && raw.length <= 512 && /^[\w.~-]+$/.test(raw) ? raw : null
}

const b64 = {
  encode: (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  decode: (text: string) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
}

async function flowKey(secret: string): Promise<CryptoKey> {
  const raw = b64.decode(secret)
  if (raw.length !== 32) throw new Error('INSTALL_FLOW_KEY must be 32 bytes, base64url encoded')
  return await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

/** Seal any small JSON value with AES-GCM (install flow and management handoff cookies). */
export async function sealJson(value: unknown, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(value))
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await flowKey(secret), plaintext))
  return `${b64.encode(iv)}.${b64.encode(sealed)}`
}

export async function openJson(cookie: string | undefined, secret: string): Promise<unknown> {
  if (!cookie) return null
  const [ivText, sealedText] = cookie.split('.')
  if (!ivText || !sealedText) return null
  try {
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64.decode(ivText) }, await flowKey(secret), b64.decode(sealedText))
    return JSON.parse(new TextDecoder().decode(plaintext)) as unknown
  } catch {
    return null
  }
}

export const sealPendingInstall = (value: PendingInstall, secret: string) => sealJson(value, secret)

export async function openPendingInstall(cookie: string | undefined, secret: string, now: number): Promise<PendingInstall | null> {
  const value = (await openJson(cookie, secret)) as PendingInstall | null
  if (value === null || typeof value.code !== 'string' || typeof value.callbackUrl !== 'string' || typeof value.expiresAt !== 'number') return null
  return value.expiresAt > now ? value : null
}
