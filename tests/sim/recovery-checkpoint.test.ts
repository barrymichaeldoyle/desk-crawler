import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { authHash, captureCheckpoint, openCheckpoint, planRecovery, sealCheckpoint, type RecoveryTables } from '../../tools/recovery/checkpoint'

const account = 'issuer|deleted-account'
const game = 'issuer|game-only'
const token = 'a'.repeat(64)
const otherToken = 'b'.repeat(64)
const gameToken = 'c'.repeat(64)
const restored: RecoveryTables = {
  users: [{ _id: 'u1', tokenIdentifier: account }, { _id: 'u2', tokenIdentifier: 'issuer|kept' }, { _id: 'u3', tokenIdentifier: game }],
  heroes: [{ _id: 'h1', userId: 'u1', createdAt: 10 }, { _id: 'h2', userId: 'u2', createdAt: 10 }, { _id: 'h3', userId: 'u3', createdAt: 10 }, { _id: 'h4', userId: 'u3', createdAt: 80 }],
  trmnlGrants: [{ _id: 'g1', userId: 'u1', tokenHash: token, createdAt: 10, state: 'active' }, { _id: 'g2', userId: 'u2', tokenHash: otherToken, createdAt: 10, state: 'active' }, { _id: 'g3', userId: 'u3', tokenHash: gameToken, createdAt: 10, state: 'active' }],
  trmnlInstances: [{ _id: 'i1', grantId: 'g1', uuid: 'deleted', state: 'active' }, { _id: 'i2', grantId: 'g2', uuid: 'disconnected', state: 'active' }, { _id: 'i3', grantId: 'g2', uuid: 'kept', state: 'active' }, { _id: 'i4', grantId: 'g3', uuid: 'game', state: 'active' }],
}
const source: RecoveryTables = {
  users: [restored.users![1]!, restored.users![2]!],
  trmnlGrants: [restored.trmnlGrants![1]!],
  trmnlInstances: [{ ...restored.trmnlInstances![1]!, state: 'disconnected' }, restored.trmnlInstances![2]!],
  revokedAuthIdentities: [{ identityHash: authHash(account) }],
  revokedTrmnlCredentials: [{ tokenHash: token }, { tokenHash: gameToken }],
  gameDeletionJobs: [{ userId: 'u3', gameSlug: 'desk-crawler', createdAt: 50, state: 'completed' }],
}

describe('independent recovery checkpoint', () => {
  it('recovers denial evidence from a protected file with no access to source data', () => {
    const key = randomBytes(32)
    const protectedBytes = sealCheckpoint(captureCheckpoint(structuredClone(source), 'synthetic-source', 100), key)
    expect(protectedBytes.toString()).not.toContain(account)
    const checkpoint = openCheckpoint(protectedBytes, key)
    expect(JSON.stringify(checkpoint)).not.toContain('issuer|')
    const plan = planRecovery(structuredClone(restored), checkpoint, 'synthetic-source', 120)
    expect(plan.denyUserIds).toEqual(['u1'])
    expect(plan.purgeHeroIds).toEqual(['h1', 'h3'])
    expect(plan.denyInstanceIds).toEqual(['i1', 'i2', 'i4'])
    expect(plan.denyGrantIds).toEqual(['g1', 'g3'])
    expect(plan.servingMayResume).toBe(false)
    expect(plan.uncoveredWindowMs).toBe(20)
    expect(plan).toEqual(planRecovery(restored, checkpoint, 'synthetic-source', 120))
  })

  it('captures a deletion immediately, before the credential purge finishes', () => {
    const pending = { ...source, users: [{ ...restored.users![0]!, state: 'deleting' }, restored.users![1]!, restored.users![2]!], trmnlGrants: restored.trmnlGrants!, revokedAuthIdentities: [], revokedTrmnlCredentials: [] }
    const checkpoint = captureCheckpoint(pending, 'synthetic-source', 100)
    expect(checkpoint.identityHashes).toContain(authHash(account))
    expect(checkpoint.tokenHashes).toEqual([token, gameToken])
  })

  it('rejects wrong keys, tampering, missing tables and a mismatched source', () => {
    const key = randomBytes(32)
    const checkpoint = captureCheckpoint(source, 'synthetic-source', 100)
    const bytes = sealCheckpoint(checkpoint, key)
    expect(() => openCheckpoint(bytes, randomBytes(32))).toThrow()
    bytes[bytes.length - 1] = bytes[bytes.length - 1]! ^ 1
    expect(() => openCheckpoint(bytes, key)).toThrow()
    expect(() => captureCheckpoint({}, 'synthetic-source', 100)).toThrow('Missing users')
    expect(() => planRecovery(restored, checkpoint, 'production', 120)).toThrow('source does not match')
    expect(() => planRecovery(restored, checkpoint, 'synthetic-source', 90)).toThrow('newer than')
  })

  it('never approves reopening even with a checkpoint at the exact cutoff', () => {
    const checkpoint = captureCheckpoint(source, 'synthetic-source', 100)
    expect(planRecovery(restored, checkpoint, 'synthetic-source', 100)).toMatchObject({ servingMayResume: false, uncoveredWindowMs: 0 })
  })
})
