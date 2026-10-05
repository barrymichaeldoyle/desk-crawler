import { hmac } from '@noble/hashes/hmac.js'
import { sha256 } from '@noble/hashes/sha2.js'
import type { Id } from '../_generated/dataModel'
import type { QueryCtx } from '../_generated/server'
import { isDeskCrawler } from './gameProfile'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
/** 40-bit owner/week code, keyed with a private installation hash. Never returned to the companion. */
export function keepsakeCode(tokenHash: string, userId: string, week: number): string {
  const encode = new TextEncoder()
  const digest = hmac(sha256, encode.encode(tokenHash), encode.encode(JSON.stringify(['desk-keepsake-v1', userId, week])))
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

export const normalizedKeepsakeCode = (code: string) => code.trim().toUpperCase().replace(/[\s-]/g, '')
