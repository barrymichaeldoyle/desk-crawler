import { openJson } from './installFlow'

export const DELETION_COOKIE = 'tg_account_deletion'
export const DELETION_COOKIE_SECONDS = 30 * 60
export const validDeletionLinkToken = (token: string) => /^[a-f0-9]{64}$/.test(token)

export async function openDeletionLink(cookie: string | undefined, key: string, now: number): Promise<{ token: string; expiresAt: number } | null> {
  const value = await openJson(cookie, key)
  if (!value || typeof value !== 'object' || !('token' in value) || typeof value.token !== 'string' || !validDeletionLinkToken(value.token) || !('expiresAt' in value) || typeof value.expiresAt !== 'number' || value.expiresAt <= now) return null
  return { token: value.token, expiresAt: value.expiresAt }
}
