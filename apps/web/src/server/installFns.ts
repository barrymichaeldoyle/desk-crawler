import { isGameSlug, type GameSlug } from '@trmnl-games/platform'
import { auth } from '@clerk/tanstack-react-start/server'
import { createServerFn } from '@tanstack/react-start'
import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'
import { ConvexError } from 'convex/values'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@trmnl-games/backend/api'
import {
  installCookie,
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
  .inputValidator((input: { gameSlug: GameSlug; code: string; callback: string }) => input)
  .handler(async ({ data }) => {
    if (!isGameSlug(data.gameSlug)) return { ok: false as const }
    const code = validateInstallCode(data.code)
    const callbackUrl = validateCallbackUrl(data.callback)
    if (!code || !callbackUrl) return { ok: false as const }
    const sealed = await sealPendingInstall({ gameSlug: data.gameSlug, code, callbackUrl, expiresAt: Date.now() + INSTALL_FLOW_TTL_SECONDS * 1000 }, flowSecret())
    setCookie(installCookie(data.gameSlug), sealed, cookieOptions)
    return { ok: true as const }
  })

/** Whether a pending install exists for this browser. Never returns the code. */
export const getPendingInstall = createServerFn({ method: 'GET' })
  .inputValidator((input: { gameSlug: GameSlug }) => input)
  .handler(async ({ data }) => {
    if (!isGameSlug(data.gameSlug)) return { pending: false, expiresAt: null }
    const pending = await openPendingInstall(getCookie(installCookie(data.gameSlug)), flowSecret(), Date.now(), data.gameSlug)
    return { pending: pending !== null, expiresAt: pending?.expiresAt ?? null }
  })

export type FinishInstallResult = { ok: true; callbackUrl: string; reconnectionRequired?: true } | { ok: false; code: string; message: string }

/** Exchange and link through the Clerk-authenticated Convex action, then hand back the validated TRMNL callback. */
export const finishInstall = createServerFn({ method: 'POST' })
  .inputValidator((input: { gameSlug: GameSlug; publicAlias?: string; heroName?: string; analyticsConsent?: boolean }) => input)
  .handler(async ({ data }): Promise<FinishInstallResult> => {
    const pending = isGameSlug(data.gameSlug) ? await openPendingInstall(getCookie(installCookie(data.gameSlug)), flowSecret(), Date.now(), data.gameSlug) : null
    if (!pending) return { ok: false, code: 'INSTALL_EXPIRED', message: 'This installation expired. Start again from TRMNL.' }
    // Slow Cast installs arrive with its own plugin in slice S7; until then only Desk Crawler links.
    if (pending.gameSlug !== 'desk-crawler') return { ok: false, code: 'INSTALL_EXPIRED', message: 'This installation expired. Start again from TRMNL.' }
    const { userId, getToken } = await auth()
    const token = userId ? await getToken({ template: 'convex' }) : null
    if (!token) return { ok: false, code: 'UNAUTHENTICATED', message: 'Sign in to connect TRMNL.' }
    const convexUrl = process.env.VITE_CONVEX_URL ?? import.meta.env.VITE_CONVEX_URL
    const client = new ConvexHttpClient(convexUrl)
    client.setAuth(token)
    let reconnectionRequired: true | undefined
    try {
      const result = await client.action(api.trmnl.completeInstall, {
        code: pending.code,
        gameSlug: pending.gameSlug,
        analyticsConsent: data.analyticsConsent === true,
        // Legacy backend argument: no timezone preference is collected by the companion.
        timezone: 'UTC',
        ...(data.publicAlias ? { publicAlias: data.publicAlias } : {}),
        ...(data.heroName ? { heroName: data.heroName } : {}),
      })
      reconnectionRequired = result.reconnectionRequired
    } catch (error) {
      if (error instanceof ConvexError && typeof error.data === 'object' && error.data !== null) {
        const { code, message } = error.data as { code?: string; message?: string }
        return { ok: false, code: code ?? 'ERROR', message: message ?? 'Something went wrong. Please try again.' }
      }
      return { ok: false, code: 'ERROR', message: 'Something went wrong. Please try again.' }
    }
    // Preserve the validated return destination if the browser reloads before Save.
    if (!reconnectionRequired) deleteCookie(installCookie(pending.gameSlug), { path: cookieOptions.path })
    return { ok: true, callbackUrl: pending.callbackUrl, ...(reconnectionRequired ? { reconnectionRequired } : {}) }
  })
