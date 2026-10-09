import type { QueryCtx } from '../_generated/server'
import { appError } from './errors'
import { sha256Hex } from './hash'

/**
 * Admin authority (D23) comes only from the server-side ADMIN_TOKEN_IDENTIFIERS
 * allowlist, never from client data. Returns a short audit reference, or null.
 */
export async function adminRef(ctx: QueryCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity()
  const allowed = (process.env.ADMIN_TOKEN_IDENTIFIERS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (identity === null || !allowed.includes(identity.tokenIdentifier)) return null
  return sha256Hex(`admin:${identity.tokenIdentifier}`).slice(0, 16)
}

export async function requireAdmin(ctx: QueryCtx): Promise<string> {
  const ref = await adminRef(ctx)
  if (ref === null) throw appError('UNAUTHENTICATED', 'Admin access required.')
  return ref
}
