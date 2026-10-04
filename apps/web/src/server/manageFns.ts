import { games, isGameSlug, type GameSlug } from '@trmnl-games/platform'
import { manageCookie, MANAGE_HANDOFF_SECONDS as HANDOFF_SECONDS, INSTANCE_UUID as UUID, openManagement } from './manageFlow'
import { createServerFn } from '@tanstack/react-start'
import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { sealJson } from './installFlow'

/**
 * TRMNL management landing (trmnl.md "Management and uninstall"). The two-minute
 * RS256 JWT is verified immediately on landing against TRMNL's JWKS (signature,
 * key ID, expiry, audience = our Client ID, subject = instance UUID). Only then
 * is a 10-minute sealed handoff created, so the flow survives Clerk sign-in.
 */
const JWKS = createRemoteJWKSet(new URL('https://trmnl.com/.well-known/jwks.json'), { cooldownDuration: 30_000, cacheMaxAge: 10 * 60_000 })

const secret = () => {
  const value = process.env.INSTALL_FLOW_KEY
  if (!value) throw new Error('INSTALL_FLOW_KEY is not configured')
  return value
}

export const captureManagement = createServerFn({ method: 'POST' })
  .inputValidator((input: { gameSlug: GameSlug; uuid: string; jwt: string }) => input)
  .handler(async ({ data }) => {
    if (!isGameSlug(data.gameSlug)) return { ok: false as const }
    const clientId = process.env[games[data.gameSlug].clientIdEnv]
    if (!clientId || !UUID.test(data.uuid) || data.jwt.length > 4096) return { ok: false as const }
    try {
      await jwtVerify(data.jwt, JWKS, { algorithms: ['RS256'], audience: clientId, subject: data.uuid, clockTolerance: 30 })
    } catch {
      return { ok: false as const }
    }
    setCookie(manageCookie(data.gameSlug), await sealJson({ gameSlug: data.gameSlug, uuid: data.uuid, expiresAt: Date.now() + HANDOFF_SECONDS * 1000 }, secret()), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: HANDOFF_SECONDS,
    })
    return { ok: true as const }
  })

/** The verified instance UUID from the handoff, or null when absent/expired. */
export const getManagedInstance = createServerFn({ method: 'GET' })
  .inputValidator((input: { gameSlug: GameSlug }) => input)
  .handler(async ({ data }) => {
    const value = isGameSlug(data.gameSlug) ? await openManagement(getCookie(manageCookie(data.gameSlug)), secret(), Date.now(), data.gameSlug) : null
    return { uuid: value?.uuid ?? null }
  })

export const endManagement = createServerFn({ method: 'POST' })
  .inputValidator((input: { gameSlug: GameSlug }) => input)
  .handler(async ({ data }) => {
    if (isGameSlug(data.gameSlug)) deleteCookie(manageCookie(data.gameSlug), { path: '/' })
    return { ok: true }
  })
