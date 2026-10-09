import { hmac } from '@noble/hashes/hmac.js'
import { sha256 } from '@noble/hashes/sha2.js'
import type { Id } from '../_generated/dataModel'
import type { QueryCtx } from '../_generated/server'
import { isDeskCrawler } from './gameProfile'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function keepsakeDigest(tokenHash: string, userId: string, week: number, tag: string) {
  const encode = new TextEncoder()
  return hmac(sha256, encode.encode(tokenHash), encode.encode(JSON.stringify([tag, userId, week])))
}

/** Six-digit owner/week code (D73), keyed with a private installation hash. Never returned to the companion. */
export function keepsakeCode(tokenHash: string, userId: string, week: number, tag = 'desk-keepsake-v2'): string {
  const digest = keepsakeDigest(tokenHash, userId, week, tag)
  const value = new DataView(digest.buffer, digest.byteOffset, 4).getUint32(0) % 1_000_000
  const code = String(value).padStart(6, '0')
  return `${code.slice(0, 3)} ${code.slice(3)}`
}

/** 40-bit letter code shown before D73. Accepted until `LETTER_CODES_UNTIL`, never generated for screens. */
export function letterKeepsakeCode(tokenHash: string, userId: string, week: number): string {
  const digest = keepsakeDigest(tokenHash, userId, week, 'desk-keepsake-v1')
  let bits = 0
  let value = 0
  let code = ''
  for (const byte of digest.slice(0, 5)) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      code += ALPHABET[(value >>> bits) & 31]
    }
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`
}

/** One shared code across every active installation. Historical tombstones cannot crowd out active instances. */
export async function keepsakeGrant(ctx: QueryCtx, userId: Id<'users'>) {
  const instance = await ctx.db.query('trmnlInstances')
    .withIndex('by_userId_and_state', (q) => q.eq('userId', userId).eq('state', 'active'))
    .order('desc').first()
  if (!instance || !isDeskCrawler(instance)) return null
  const grant = await ctx.db.get(instance.grantId)
  return grant && isDeskCrawler(grant) && grant.userId === userId && grant.state === 'active' ? grant : null
}

/** Slow Cast's weekly fly code (D115): the keepsake code under its own tag, keyed with the Slow Cast installation. */
export const flyCode = (tokenHash: string, userId: string, week: number) => keepsakeCode(tokenHash, userId, week, 'slow-cast-fly-v1')

export const normalizedKeepsakeCode = (code: string) => code.trim().toUpperCase().replace(/[\s-]/g, '')
