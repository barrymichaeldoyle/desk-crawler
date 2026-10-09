import type { QueryCtx } from '../_generated/server'
import { appError } from './errors'
import { sha256Hex } from './hash'

/**
 * Admin authority (D23) comes only from the server-side ADMIN_TOKEN_IDENTIFIERS
 * allowlist, never from client data. Returns a short audit reference, or null.
 */
/** Whether a verified identity is on the admin allowlist; for paths that carry the identity as an argument. */
export function isAdminIdentity(tokenIdentifier: string): boolean {
  return (process.env.ADMIN_TOKEN_IDENTIFIERS ?? '').split(',').map((s) => s.trim()).filter(Boolean).includes(tokenIdentifier)
}

export async function adminRef(ctx: QueryCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (identity === null || !isAdminIdentity(identity.tokenIdentifier)) return null
  return sha256Hex(`admin:${identity.tokenIdentifier}`).slice(0, 16)
}

export async function requireAdmin(ctx: QueryCtx): Promise<string> {
  const ref = await adminRef(ctx)
  if (ref === null) throw appError('UNAUTHENTICATED', 'Admin access required.')
  return ref
}
