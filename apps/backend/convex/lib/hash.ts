import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'

/** SHA-256 hex digest. Synchronous and runtime-neutral (queries, mutations, actions, HTTP actions). */
export const sha256Hex = (value: string): string => bytesToHex(sha256(new TextEncoder().encode(value)))
