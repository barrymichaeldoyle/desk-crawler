import { createRemoteJWKSet, jwtVerify } from 'jose'

const keys = createRemoteJWKSet(new URL('https://trmnl.com/.well-known/jwks.json'), { cooldownDuration: 30_000, cacheMaxAge: 10 * 60_000 })
export const MANAGEMENT_PROOF_MS = 10 * 60_000
export const INSTANCE_UUID = /^[0-9a-fA-F-]{8,64}$/

/** Verify on the backend; a browser-supplied UUID or timestamp is never authority. */
export async function verifyManagementJwt(jwt: string, uuid: string, clientId: string, now: number): Promise<number> {
  if (jwt.length > 4096 || !INSTANCE_UUID.test(uuid)) throw new Error('Invalid management proof')
  const { payload, protectedHeader } = await jwtVerify(jwt, keys, { algorithms: ['RS256'], audience: clientId, subject: uuid, currentDate: new Date(now), clockTolerance: 30, maxTokenAge: '2 minutes', requiredClaims: ['iat', 'exp'] })
  if (typeof protectedHeader.kid !== 'string' || !protectedHeader.kid || typeof payload.iat !== 'number' || !Number.isInteger(payload.iat)) throw new Error('Invalid management proof')
  return payload.iat * 1000
}
