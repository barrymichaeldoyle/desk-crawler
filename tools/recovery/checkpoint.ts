/** Offline recovery preparation. Never connects to or mutates a deployment. */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync, realpathSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

type Row = Record<string, unknown>
export type RecoveryTables = Readonly<Record<string, readonly Row[]>>
export interface Checkpoint {
  version: 1
  sourceDeployment: string
  snapshotAtMs: number
  identityHashes: string[]
  tokenHashes: string[]
  instanceHashes: string[]
  gameDeletions: { identityHash: string; beforeMs: number }[]
}
const hash = (text: string) => createHash('sha256').update(text).digest('hex')
export const authHash = (identity: string) => hash(`auth:${identity}`)
const installationHash = (tokenHash: string, uuid: string) => hash(`instance:${tokenHash}:${uuid}`)
const string = (row: Row, field: string): string => {
  const value = row[field]
  if (typeof value !== 'string' || !value) throw new Error(`Invalid or missing ${field}`)
  return value
}
const time = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('Invalid timestamp')
  return value
}
const rows = (tables: RecoveryTables, name: string) => {
  const result = tables[name]
  if (!result) throw new Error(`Missing ${name} table; provide an explicit empty table if it has no rows`)
  return result
}

/** Keep minimal denial evidence, including deletion requests whose purge has not finished. */
export function captureCheckpoint(tables: RecoveryTables, sourceDeployment: string, snapshotAtMs: number): Checkpoint {
  time(snapshotAtMs)
  if (!/^[a-z0-9-]+$/.test(sourceDeployment)) throw new Error('Invalid source deployment')
  const users = new Map(rows(tables, 'users').map(row => [string(row, '_id'), row]))
  const grants = new Map(rows(tables, 'trmnlGrants').map(row => [string(row, '_id'), row]))
  const identities = new Set(rows(tables, 'revokedAuthIdentities').map(row => string(row, 'identityHash')))
  const tokens = new Set(rows(tables, 'revokedTrmnlCredentials').map(row => string(row, 'tokenHash')))
  for (const user of users.values()) if (user.state === 'deleting') identities.add(authHash(string(user, 'tokenIdentifier')))
  const gameDeletions = new Map<string, number>()
  for (const job of rows(tables, 'gameDeletionJobs')) {
    if (job.gameSlug !== 'desk-crawler') throw new Error('Unsupported game deletion scope')
    const owner = users.get(string(job, 'userId'))
    if (!owner) continue // Fully deleted accounts are covered by identity tombstones.
    const identity = authHash(string(owner, 'tokenIdentifier'))
    const before = time(job.createdAt)
    if (before > snapshotAtMs) throw new Error('Deletion is newer than the declared snapshot')
    gameDeletions.set(identity, Math.max(gameDeletions.get(identity) ?? 0, before))
  }
  for (const grant of grants.values()) {
    const owner = users.get(string(grant, 'userId'))
    const identity = owner ? authHash(string(owner, 'tokenIdentifier')) : null
    if (grant.state === 'revoked' || !owner || (identity && identities.has(identity)) || (identity && time(grant.createdAt) <= (gameDeletions.get(identity) ?? -1))) tokens.add(string(grant, 'tokenHash'))
  }
  const instances = new Set<string>()
  for (const instance of rows(tables, 'trmnlInstances')) {
    if (!['active', 'disconnected', 'uninstalled'].includes(string(instance, 'state'))) throw new Error('Unsupported installation state')
    if (instance.state === 'active') continue
    const grant = grants.get(string(instance, 'grantId'))
    // Purged grants have already been captured as token tombstones.
    if (grant) instances.add(installationHash(string(grant, 'tokenHash'), string(instance, 'uuid')))
  }
  const checkpoint: Checkpoint = { version: 1, sourceDeployment, snapshotAtMs, identityHashes: [...identities].sort(), tokenHashes: [...tokens].sort(), instanceHashes: [...instances].sort(), gameDeletions: [...gameDeletions].map(([identityHash, beforeMs]) => ({ identityHash, beforeMs })).sort((a, b) => a.identityHash.localeCompare(b.identityHash)) }
  validateCheckpoint(checkpoint)
  return checkpoint
}

function validateCheckpoint(value: unknown): asserts value is Checkpoint {
  if (!value || typeof value !== 'object') throw new Error('Invalid checkpoint')
  const row = value as Row
  if (row.version !== 1 || typeof row.sourceDeployment !== 'string' || !/^[a-z0-9-]+$/.test(row.sourceDeployment)) throw new Error('Unsupported checkpoint')
  const snapshotAt = time(row.snapshotAtMs)
  const validHash = (entry: unknown) => typeof entry === 'string' && /^[a-f0-9]{64}$/.test(entry)
  for (const key of ['identityHashes', 'tokenHashes', 'instanceHashes']) if (!Array.isArray(row[key]) || !(row[key] as unknown[]).every(validHash)) throw new Error(`Invalid ${key}`)
  if (!Array.isArray(row.gameDeletions)) throw new Error('Invalid game deletions')
  for (const entry of row.gameDeletions as unknown[]) {
    if (!entry || typeof entry !== 'object') throw new Error('Invalid game deletion')
    const deletion = entry as Row
    if (!validHash(deletion.identityHash) || time(deletion.beforeMs) > snapshotAt) throw new Error('Invalid game deletion')
  }
}

/** AES-GCM detects wrong keys and tampering. Keep the key outside the database and repository. */
export function sealCheckpoint(checkpoint: Checkpoint, key: Buffer): Buffer {
  validateCheckpoint(checkpoint)
  if (key.length !== 32) throw new Error('Recovery key must contain 32 bytes')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(Buffer.from('desk-crawler-recovery-v1'))
  const body = Buffer.concat([cipher.update(JSON.stringify(checkpoint)), cipher.final()])
  return Buffer.concat([Buffer.from('DCR1'), iv, cipher.getAuthTag(), body])
}

export function openCheckpoint(bytes: Buffer, key: Buffer): Checkpoint {
  if (key.length !== 32 || bytes.length < 33 || bytes.subarray(0, 4).toString() !== 'DCR1') throw new Error('Invalid protected checkpoint')
  const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(4, 16))
  decipher.setAAD(Buffer.from('desk-crawler-recovery-v1'))
  decipher.setAuthTag(bytes.subarray(16, 32))
  const value: unknown = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(32)), decipher.final()]).toString())
  validateCheckpoint(value)
  return value
}

/** Produce a bounded-by-export review plan. It deliberately never grants permission to reopen serving. */
export function planRecovery(tables: RecoveryTables, checkpoint: Checkpoint, sourceDeployment: string, recoveryCutoffMs: number) {
  validateCheckpoint(checkpoint)
  time(recoveryCutoffMs)
  if (checkpoint.sourceDeployment !== sourceDeployment) throw new Error('Checkpoint source does not match the restored source')
  if (checkpoint.snapshotAtMs > recoveryCutoffMs) throw new Error('Checkpoint is newer than the recovery cutoff')
  const identities = new Set(checkpoint.identityHashes)
  const tokens = new Set(checkpoint.tokenHashes)
  const gameCutoffs = new Map(checkpoint.gameDeletions.map(row => [row.identityHash, row.beforeMs]))
  const users = rows(tables, 'users')
  const deniedUsers = new Set(users.filter(row => identities.has(authHash(string(row, 'tokenIdentifier')))).map(row => string(row, '_id')))
  const gameUsers = new Map(users.filter(row => gameCutoffs.has(authHash(string(row, 'tokenIdentifier')))).map(row => [string(row, '_id'), gameCutoffs.get(authHash(string(row, 'tokenIdentifier')))!]))
  const heroes = rows(tables, 'heroes')
  const deniedHeroes = heroes.filter(row => deniedUsers.has(string(row, 'userId')) || time(row.createdAt) <= (gameUsers.get(string(row, 'userId')) ?? -1)).map(row => string(row, '_id'))
  const grants = rows(tables, 'trmnlGrants')
  // Capture tokens for a newly denied owner/game even when their original purge was unfinished.
  for (const grant of grants) if (deniedUsers.has(string(grant, 'userId')) || time(grant.createdAt) <= (gameUsers.get(string(grant, 'userId')) ?? -1)) tokens.add(string(grant, 'tokenHash'))
  const grantsById = new Map(grants.map(row => [string(row, '_id'), row]))
  const denyGrantIds = grants.filter(row => tokens.has(string(row, 'tokenHash'))).map(row => string(row, '_id'))
  const instanceHashes = new Set(checkpoint.instanceHashes)
  const denyInstanceIds = rows(tables, 'trmnlInstances').filter(row => {
    const grant = grantsById.get(string(row, 'grantId'))
    return !grant || tokens.has(string(grant, 'tokenHash')) || instanceHashes.has(installationHash(string(grant, 'tokenHash'), string(row, 'uuid')))
  }).map(row => string(row, '_id'))
  return {
    version: 1,
    sourceDeployment,
    servingMayResume: false,
    checkpointAtMs: checkpoint.snapshotAtMs,
    uncoveredWindowMs: recoveryCutoffMs - checkpoint.snapshotAtMs,
    instructions: 'Keep endpoints, intents and new ticks disabled. Apply identity/token tombstones first; deny owners and affected game profiles; purge listed progress through bounded deletion jobs; disconnect listed installations. Independently reconcile the uncovered interval and interrupted work before an operator approves reopening.',
    revokeIdentityHashes: [...identities].sort(),
    revokeTokenHashes: [...tokens].sort(),
    denyUserIds: [...deniedUsers].sort(),
    purgeHeroIds: deniedHeroes.sort(),
    gameDeletionCutoffs: [...gameUsers].map(([userId, beforeMs]) => ({ userId, beforeMs })),
    denyGrantIds: denyGrantIds.sort(),
    denyInstanceIds: denyInstanceIds.sort(),
  }
}

function readTables(directory: string, names: string[]): RecoveryTables {
  return Object.fromEntries(names.map(name => [name, readFileSync(resolve(directory, name, 'documents.jsonl'), 'utf8').split('\n').filter(line => line.trim()).map(line => {
    const row: unknown = JSON.parse(line)
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error(`Invalid ${name} row`)
    return row as Row
  })]))
}

function main() {
  const argv = process.argv.slice(2)
  const flag = (name: string) => { const index = argv.indexOf(name); if (index < 0 || !argv[index + 1] || argv[index + 1]!.startsWith('--')) throw new Error(`Missing ${name}`); return argv[index + 1]! }
  const keyHex = process.env.RECOVERY_CHECKPOINT_KEY
  if (!keyHex || !/^[a-fA-F0-9]{64}$/.test(keyHex)) throw new Error('Set RECOVERY_CHECKPOINT_KEY to a private 32-byte hexadecimal key')
  const key = Buffer.from(keyHex, 'hex')
  const source = flag('--source')
  const directory = flag('--tables-dir')
  const output = resolve(flag('--out'))
  // Check the resolved parent, including symlinks. Refuse to commit private evidence by accident.
  const parent = realpathSync(resolve(output, '..'))
  const repository = realpathSync(resolve(import.meta.dirname, '../..'))
  const inside = relative(repository, parent)
  if (inside !== '..' && !inside.startsWith('../')) throw new Error('Recovery output must be outside the repository')
  if (argv[0] === 'capture') {
    const tables = readTables(directory, ['users', 'trmnlGrants', 'trmnlInstances', 'revokedAuthIdentities', 'revokedTrmnlCredentials', 'gameDeletionJobs'])
    const checkpoint = captureCheckpoint(tables, source, Number(flag('--snapshot-at-ms')))
    writeFileSync(output, sealCheckpoint(checkpoint, key), { mode: 0o600, flag: 'wx' })
    console.log('Protected checkpoint written outside the repository. No deployment was accessed.')
  } else if (argv[0] === 'plan') {
    const checkpoint = openCheckpoint(readFileSync(flag('--checkpoint')), key)
    const plan = planRecovery(readTables(directory, ['users', 'heroes', 'trmnlGrants', 'trmnlInstances']), checkpoint, source, Number(flag('--recovery-cutoff-ms')))
    writeFileSync(output, JSON.stringify(plan, null, 2) + '\n', { mode: 0o600, flag: 'wx' })
    console.log(`Review plan written. Uncovered interval: ${plan.uncoveredWindowMs}ms. Serving remains denied; no deployment was accessed.`)
  } else throw new Error('Use capture or plan; see docs/release/recovery-runbook.md')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
