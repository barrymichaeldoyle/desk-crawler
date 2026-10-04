/** Repeat a synthetic restore only on the dedicated, paused recovery preview. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const target = 'usable-snail-909'
const snapshot = '/private/tmp/desk-crawler-synthetic-backup.zip'
const cli = 'node_modules/convex/bin/main.js'
function command(args) {
  const p = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' })
  if (p.status !== 0) throw new Error(p.stderr)
  return p.stdout
}
const run = (name, args = {}, extra = []) => {
  const output = command(['run', name, JSON.stringify(args), '--deployment', target, ...extra]).trim()
  return output ? JSON.parse(output) : null
}
const before = run('reviewValidation:summary')
assert.equal(before.world.paused, true)
assert.equal(before.world.active, null)
const bytes = readFileSync(snapshot)
const began = Date.now()
command(['import', snapshot, '--deployment', target, '--replace', '-y'])
const importMs = Date.now() - began
const restored = run('reviewValidation:summary')
assert.deepEqual(restored.world, before.world)
assert.deepEqual(restored.sample, before.sample)
assert.deepEqual(restored.boards, before.boards)
assert.equal(restored.heroes, 1000)
assert.equal(restored.run.state, 'completed')
run('sim/runs/tick:simulateBatch', { runId: restored.run._id, expectedSequence: 0 })
const afterDuplicate = run('reviewValidation:summary')
assert.deepEqual(afterDuplicate.world, restored.world)
assert.deepEqual(afterDuplicate.sample, restored.sample)
// A manually preserved synthetic post-snapshot checkpoint; no provider deletion.
run('reviewValidation:revoke', { index: 0 })
const response = await fetch(`https://${target}.convex.site/trmnl/v1/screen`, {
  method: 'POST', headers: { Authorization: 'Bearer review-token-0', 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ user_uuid: '00000000-0000-4000-8000-000000000000' }),
})
assert.equal(response.status, 404)
const evidence = { date: new Date().toISOString(), source: 'precious-pheasant-866', target, snapshotBytes: bytes.length, snapshotSha256: createHash('sha256').update(bytes).digest('hex'), importMs, verificationAndCheckpointMs: Date.now() - began - importMs, heroes: restored.heroes, world: restored.world, sample: restored.sample, boards: restored.boards, duplicateNoop: true, postSnapshotCheckpoint: 'manually preserved synthetic checkpoint; independent production source remains unproven', revokedScreenStatus: response.status }
writeFileSync('docs/evidence/recovery-results.json', JSON.stringify(evidence, null, 2) + '\n')
console.log(JSON.stringify(evidence, null, 2))
