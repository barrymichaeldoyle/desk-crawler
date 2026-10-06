import { auth } from '@clerk/tanstack-react-start/server'
import { createServerFn } from '@tanstack/react-start'
import { deleteCookie, getCookie, setCookie, setResponseHeader } from '@tanstack/react-start/server'
import { ConvexHttpClient } from 'convex/browser'
import { ConvexError } from 'convex/values'
import { api } from '@trmnl-games/backend/api'
import { sealJson } from './installFlow'
import { DELETION_COOKIE, DELETION_COOKIE_SECONDS, openDeletionLink, validDeletionLinkToken } from './deletionFlow'

const key = () => {
  if (!process.env.INSTALL_FLOW_KEY) throw new Error('INSTALL_FLOW_KEY is not configured')
  return process.env.INSTALL_FLOW_KEY
}

/** GET/loader only captures a link into a sealed cookie; it never starts deletion. */
export const captureDeletionLink = createServerFn({ method: 'POST' })
  .validator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    setResponseHeader('Cache-Control', 'no-store')
    if (!validDeletionLinkToken(data.token)) return { ok: false }
    const sealed = await sealJson({ token: data.token, expiresAt: Date.now() + DELETION_COOKIE_SECONDS * 1000 }, key())
    setCookie(DELETION_COOKIE, sealed, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: DELETION_COOKIE_SECONDS })
    return { ok: true }
  })

export const pendingDeletionLink = createServerFn({ method: 'GET' }).handler(async () => {
  setResponseHeader('Cache-Control', 'no-store')
  return { pending: Boolean(await openDeletionLink(getCookie(DELETION_COOKIE), key(), Date.now())) }
})

/** Same-account Clerk auth plus single-use, unexpired email proof and an explicit POST. */
export const confirmAccountDeletion = createServerFn({ method: 'POST' })
  .validator((input: { operationId: string; confirm: 'DELETE' }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; message: string }> => {
    setResponseHeader('Cache-Control', 'no-store')
    if (data.confirm !== 'DELETE') return { ok: false, message: 'Type DELETE to confirm.' }
    const pending = await openDeletionLink(getCookie(DELETION_COOKIE), key(), Date.now())
    if (!pending) return { ok: false, message: 'That deletion link expired. Request a new one from Account.' }
    const { userId, getToken } = await auth()
    const authToken = userId ? await getToken({ template: 'convex' }) : null
    if (!authToken) return { ok: false, message: 'Sign in with the account that requested this email.' }
    const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL ?? import.meta.env.VITE_CONVEX_URL)
    client.setAuth(authToken)
    try {
      await client.mutation(api.deletion.requestDeletion, { operationId: data.operationId, confirm: 'DELETE', token: pending.token })
      deleteCookie(DELETION_COOKIE, { path: '/' })
      return { ok: true }
    } catch (error) {
      if (error instanceof ConvexError && error.data && typeof error.data === 'object' && 'message' in error.data && typeof error.data.message === 'string') return { ok: false, message: error.data.message }
      return { ok: false, message: 'We couldn’t confirm deletion. Check your connection and try again.' }
    }
  })
