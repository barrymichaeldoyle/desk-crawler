import { ConvexError } from 'convex/values'

/** Stable error codes from api.md. */
export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'ACCOUNT_UNAVAILABLE'
  | 'GAME_UNAVAILABLE'
  | 'HERO_EXISTS'
  | 'HERO_NOT_FOUND'
  | 'INVALID_INPUT'
  | 'ALIAS_TAKEN'
  | 'INVALID_STATE'
  | 'INSTALL_INVALID'
  | 'TRMNL_REQUIRED'
  | 'CONNECTION_CONFLICT'
  | 'CONNECTION_UNAVAILABLE'
  | 'SERVICE_PAUSED'
  | 'RATE_LIMITED'
  | 'OPERATION_CONFLICT'
  | 'BIOME_LOCKED'
  | 'ITEM_NOT_AVAILABLE'
  | 'ITEM_EQUIPPED'
  | 'ITEM_HELD'
  | 'BAG_FULL'
  | 'HELD_ITEM_PENDING'
  | 'LEVEL_REQUIREMENT'
  | 'NO_POTION'
  | 'FULL_HP'
  | 'RECAP_CHANGED'

const RETRYABLE = new Set<ErrorCode>(['RATE_LIMITED'])

/** Structured, user-safe error: `{ code, message, retryable }`. Never includes tokens or identities. */
export const appError = (code: ErrorCode, message: string) => new ConvexError({ code, message, retryable: RETRYABLE.has(code) })
