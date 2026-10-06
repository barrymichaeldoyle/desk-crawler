import { hmac } from '@noble/hashes/hmac.js'
import { sha256 } from '@noble/hashes/sha2.js'

export const DELETION_LINK_TTL_MS = 30 * 60_000
export const DELETION_EMAIL_ATTEMPTS = 3

/** Reproducible only on the server, so retries never store or log the raw link. */
export function deletionToken(key: string, request: { _id: string; tokenIdentifier: string; expiresAt: number }): string {
  const encode = new TextEncoder()
  const mac = hmac(sha256, encode.encode(key), encode.encode(JSON.stringify(['account-deletion-v1', request._id, request.tokenIdentifier, request.expiresAt])))
  return Array.from(mac, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export const validDeletionToken = (token: string) => /^[a-f0-9]{64}$/.test(token)

/** Only the verified primary address supplied by Clerk can receive the link. */
export function verifiedPrimaryEmail(body: unknown): { id: string; address: string } | null {
  if (!body || typeof body !== 'object' || !('primary_email_address_id' in body) || !('email_addresses' in body) || !Array.isArray(body.email_addresses)) return null
  const email = body.email_addresses.find((row: unknown) => row && typeof row === 'object' && 'id' in row && row.id === body.primary_email_address_id)
  if (!email || typeof email.id !== 'string' || typeof email.email_address !== 'string' || email.verification?.status !== 'verified') return null
  return { id: email.id, address: email.email_address }
}
