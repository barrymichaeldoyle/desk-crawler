import { auth } from '@clerk/tanstack-react-start/server'
import { createServerFn } from '@tanstack/react-start'
import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'
import { ConvexError } from 'convex/values'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../convex/_generated/api'
import {
  INSTALL_COOKIE,
  INSTALL_FLOW_TTL_SECONDS,
  openPendingInstall,
  sealPendingInstall,
  validateCallbackUrl,
  validateInstallCode,
} from './installFlow'

const flowSecret = () => {
  const secret = process.env.INSTALL_FLOW_KEY
  if (!secret) throw new Error('INSTALL_FLOW_KEY is not configured')
  return secret
}

const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  // Server functions post to an internal path, so the cookie must cover the whole site.
  path: '/',
  maxAge: INSTALL_FLOW_TTL_SECONDS,
}

/** Capture TRMNL's redirect into the encrypted cookie. Returns whether the inputs were valid. */
export const captureInstall = createServerFn({ method: 'POST' })
  .inputValidator((input: { code: string; callback: string }) => input)
  .handler(async ({ data }) => {
    const code = validateInstallCode(data.code)
    const callbackUrl = validateCallbackUrl(data.callback)
    if (!code || !callbackUrl) return { ok: false as const }
    const sealed = await sealPendingInstall({ code, callbackUrl, expiresAt: Date.now() + INSTALL_FLOW_TTL_SECONDS * 1000 }, flowSecret())
    setCookie(INSTALL_COOKIE, sealed, cookieOptions)
    return { ok: true as const }
  })

/** Whether a pending install exists for this browser. Never returns the code. */
export const getPendingInstall = createServerFn({ method: 'GET' }).handler(async () => {
  const pending = await openPendingInstall(getCookie(INSTALL_COOKIE), flowSecret(), Date.now())
  return { pending: pending !== null, expiresAt: pending?.expiresAt ?? null }
})

export type FinishInstallResult = { ok: true; callbackUrl: string } | { ok: false; code: string; message: string }

/** Exchange and link through the Clerk-authenticated Convex action, then hand back the validated TRMNL callback. */
export const finishInstall = createServerFn({ method: 'POST' })
  .inputValidator((input: { publicAlias?: string; heroName?: string; timezone: string }) => input)
  .handler(async ({ data }): Promise<FinishInstallResult> => {
    const pending = await openPendingInstall(getCookie(INSTALL_COOKIE), flowSecret(), Date.now())
    if (!pending) return { ok: false, code: 'INSTALL_EXPIRED', message: 'This installation expired. Start again from TRMNL.' }
    const { userId, getToken } = await auth()
    const token = userId ? await getToken({ template: 'convex' }) : null
    if (!token) return { ok: false, code: 'UNAUTHENTICATED', message: 'Sign in to connect TRMNL.' }
    const convexUrl = process.env.VITE_CONVEX_URL ?? import.meta.env.VITE_CONVEX_URL
    const client = new ConvexHttpClient(convexUrl)
    client.setAuth(token)
    try {
      await client.action(api.trmnl.completeInstall, {
        code: pending.code,
        timezone: data.timezone,
        ...(data.publicAlias ? { publicAlias: data.publicAlias } : {}),
        ...(data.heroName ? { heroName: data.heroName } : {}),
      })
    } catch (error) {
      if (error instanceof ConvexError && typeof error.data === 'object' && error.data !== null) {
        const { code, message } = error.data as { code?: string; message?: string }
        return { ok: false, code: code ?? 'ERROR', message: message ?? 'Something went wrong. Please try again.' }
      }
      return { ok: false, code: 'ERROR', message: 'Something went wrong. Please try again.' }
    }
    deleteCookie(INSTALL_COOKIE, { path: cookieOptions.path })
    return { ok: true, callbackUrl: pending.callbackUrl }
  })
