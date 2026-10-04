/**
 * Clerk webhook signature check (Svix scheme): HMAC-SHA256 over
 * `${id}.${timestamp}.${body}` with the base64 key after `whsec_`, compared
 * against every `v1,` signature in the header. Timestamps outside five minutes
 * are refused so a captured delivery cannot be replayed later.
 */
const TOLERANCE_SECONDS = 5 * 60

export type SvixHeaders = { id: string | null; timestamp: string | null; signature: string | null }

const fromBase64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0))
const toBase64 = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes)))

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function verifySvix(secret: string, headers: SvixHeaders, body: string, nowMs: number): Promise<boolean> {
  const { id, timestamp, signature } = headers
  if (!id || !timestamp || !signature || !secret.startsWith('whsec_')) return false
  const seconds = Number(timestamp)
  if (!Number.isInteger(seconds) || Math.abs(nowMs / 1000 - seconds) > TOLERANCE_SECONDS) return false
  const key = await crypto.subtle.importKey('raw', fromBase64(secret.slice('whsec_'.length)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const expected = toBase64(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${timestamp}.${body}`)))
  return signature.split(' ').some((part) => part.startsWith('v1,') && constantTimeEqual(part.slice(3), expected))
}
