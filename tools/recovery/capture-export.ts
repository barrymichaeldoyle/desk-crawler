/** Read-only consistent export -> minimal encrypted checkpoint; never deploys or restores. */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, chmodSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { captureCheckpoint, sealCheckpoint, type RecoveryTables } from './checkpoint'

const args = process.argv.slice(2)
const flag = (name: string) => {
  const index = args.indexOf(name)
  const value = args[index + 1]
  if (index < 0 || !value || value.startsWith('--')) throw new Error(`Missing ${name}`)
  return value
}
const source = flag('--source')
if (!/^[a-z0-9-]+$/.test(source)) throw new Error('Provide an explicit deployment name')
const output = resolve(flag('--out'))
const repository = realpathSync(resolve(import.meta.dirname, '../..'))
const parent = realpathSync(dirname(output))
const location = relative(repository, parent)
if (location !== '..' && !location.startsWith('../')) throw new Error('Checkpoint output must be outside the repository')
const keyHex = process.env.RECOVERY_CHECKPOINT_KEY
if (!keyHex || !/^[a-fA-F0-9]{64}$/.test(keyHex)) throw new Error('Set a private 32-byte hexadecimal RECOVERY_CHECKPOINT_KEY')
// A deployment key takes precedence over CLI selection. Refuse a mismatched key.
const deployKey = process.env.CONVEX_DEPLOY_KEY
if (deployKey && deployKey.split('|')[0]?.split(':').at(-1) !== source) throw new Error('Deployment key does not match --source')
const require = createRequire(import.meta.url)
const cli = join(dirname(require.resolve('convex/package.json')), 'bin/main.js')
const scratch = mkdtempSync(join(tmpdir(), 'desk-crawler-checkpoint-'))
chmodSync(scratch, 0o700)
try {
  const archive = join(scratch, 'snapshot.zip')
  // A deploy key names its own deployment (checked against --source above); naming it again makes the CLI look the
  // deployment up through the dashboard API, which a deploy key cannot authenticate against.
  const result = spawnSync(process.execPath, [cli, 'export', ...(deployKey ? [] : ['--deployment', source]), '--path', archive], {
    cwd: repository, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
  })
  // The CLI's own message (auth, deployment or network) is the only clue a scheduled run leaves; it never contains the key.
  if (result.status !== 0) throw new Error(`Convex export failed; no checkpoint was written. CLI said: ${(result.stderr || result.stdout || String(result.error ?? '')).trim().slice(-1500)}`)
  chmodSync(archive, 0o600)
  const timestamp = result.stderr.match(/Created snapshot export at timestamp (\d+)/)?.[1]
  if (!timestamp) throw new Error('Snapshot timestamp was not provided; refusing to use download time')
  const snapshotAtMs = Number(BigInt(timestamp) / 1_000_000n)
  const listing = spawnSync('unzip', ['-Z1', archive], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 })
  if (listing.status !== 0) throw new Error('Snapshot listing failed')
  const entries = new Set(listing.stdout.split('\n'))
  const tables: RecoveryTables = Object.fromEntries([
    'users', 'trmnlGrants', 'trmnlInstances', 'revokedAuthIdentities', 'revokedTrmnlCredentials', 'gameDeletionJobs',
  ].map(name => {
    const entry = `${name}/documents.jsonl`
    // Convex omits empty tables from exports. Supply an explicit empty table.
    if (!entries.has(entry)) return [name, []]
    const table = spawnSync('unzip', ['-p', archive, entry], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 })
    if (table.status !== 0) throw new Error(`Cannot read ${name}`)
    return [name, table.stdout.split('\n').filter(line => line.trim()).map(line => {
      try {
        const row: unknown = JSON.parse(line)
        if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Invalid row')
        return row as Record<string, unknown>
      } catch {
        // JSON parser errors may include private row excerpts; keep diagnostics minimal.
        throw new Error(`Invalid ${name} snapshot row`)
      }
    })]
  }))
  const checkpoint = captureCheckpoint(tables, source, snapshotAtMs)
  const protectedBytes = sealCheckpoint(checkpoint, Buffer.from(keyHex, 'hex'))
  writeFileSync(output, protectedBytes, { mode: 0o600, flag: 'wx' })
  console.log(JSON.stringify({ source, snapshotAt: new Date(snapshotAtMs).toISOString(), bytes: protectedBytes.length,
    sha256: createHash('sha256').update(protectedBytes).digest('hex') }))
} finally {
  rmSync(scratch, { recursive: true, force: true })
}
