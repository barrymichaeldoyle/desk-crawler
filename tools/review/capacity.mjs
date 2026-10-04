import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
const deployment = 'precious-pheasant-866'
const cli = 'node_modules/convex/bin/main.js'
const output = '/private/tmp/desk-crawler-capacity'
mkdirSync(output, { recursive: true })
const run = (name, args = {}, extra = []) => {
  const p = spawnSync(process.execPath, [cli, 'run', name, JSON.stringify(args), '--deployment', deployment, ...extra], { encoding: 'utf8' })
  if (p.status !== 0) throw new Error(`${name}: ${p.stderr}`)
  return p.stdout.trim() ? JSON.parse(p.stdout) : null
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const logs = spawn(process.execPath, [cli, 'logs', '--deployment', deployment, '--history', '100', '--success', '--jsonl'])
let logText = ''; logs.stdout.on('data', chunk => { logText += chunk }); logs.stderr.on('data', () => {})
const reports = process.argv.includes('--1000-only') && existsSync(`${output}/results.json`) ? JSON.parse(readFileSync(`${output}/results.json`, 'utf8')) : []
try {
  for (const n of process.argv.includes('--1000-only') ? [1000] : [100, 1000]) {
    const existing = run('reviewValidation:summary').heroes
    if (existing > n) throw new Error('Use a fresh disposable preview for this cohort')
    for (let offset = existing; offset < n; offset += 20) {
      run('reviewValidation:seed', { offset, count: Math.min(20, n - offset) })
      if (offset % 100 === 0) console.log(`Seeded ${Math.min(offset + 20, n)}/${n}`)
    }
    run('reviewValidation:prepareRun')
    const began = Date.now()
    const runId = run('sim/runs/tick:startTick')
    // Actual authenticated intents race with the real scheduled page chain.
    const commands = await Promise.all(Array.from({ length: 10 }, (_, j) => new Promise(resolve => {
      const i = j * 6, subject = `user_synthetic${i.toString().padStart(4, '0')}`
      const p = spawn(process.execPath, [cli, 'run', 'heroes:pause', JSON.stringify({ operationId: `capacity-${n}-${i}` }), '--deployment', deployment, '--identity', JSON.stringify({ subject, issuer: 'https://review.invalid', tokenIdentifier: `https://review.invalid|${subject}` })])
      let text = ''; p.stdout.on('data', c => { text += c }); p.stderr.on('data', c => { text += c }); p.on('close', code => resolve({ index: i, code, result: text.trim() }))
    })))
    let summary
    for (let poll = 0; poll < 120; poll++) {
      summary = run('reviewValidation:summary')
      if (summary.run?.state === 'completed') break
      if (summary.run?.state === 'blocked') throw new Error('Synthetic run blocked')
      await sleep(500)
    }
    if (summary.run?.state !== 'completed') throw new Error('Synthetic run timed out')
    // Completed/old workers are sequence-guarded no-ops.
    const beforeDuplicate = summary
    run('sim/runs/tick:simulateBatch', { runId, expectedSequence: 0 })
    const afterDuplicate = run('reviewValidation:summary')
    if (beforeDuplicate.run.processed !== afterDuplicate.run.processed || beforeDuplicate.world.tick !== afterDuplicate.world.tick || beforeDuplicate.sample.lifetimeXp !== afterDuplicate.sample.lifetimeXp) throw new Error('Duplicate changed progress')
    const times = [], bytes = [], statuses = []
    for (let request = 0; request < 50; request++) {
      const i = request % 10, start = performance.now()
      const response = await fetch(`https://${deployment}.convex.site/trmnl/v1/screen`, { method: 'POST', headers: { Authorization: `Bearer review-token-${i}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ user_uuid: `00000000-0000-4000-8000-${i.toString(16).padStart(12, '0')}` }) })
      const body = await response.text()
      times.push(performance.now() - start); bytes.push(Buffer.byteLength(body)); statuses.push(response.status)
      if (response.status !== 200 || !JSON.parse(body).merge_variables) throw new Error(`Screen response ${response.status}`)
    }
    const sorted = times.toSorted((a,b) => a-b)
    const report = { n, measuredAt: new Date().toISOString(), runMs: summary.run.finishedAt - summary.run.startedAt, clientElapsedMs: Date.now() - began, summary, commands, duplicateNoop: true, screen: { requests: times.length, all200: statuses.every(x => x === 200), p50Ms: sorted[Math.ceil(sorted.length * .5)-1], p95Ms: sorted[Math.ceil(sorted.length * .95)-1], meanBytes: bytes.reduce((a,b) => a+b,0)/bytes.length, maxBytes: Math.max(...bytes), timesMs: times } }
    reports.push(report)
    writeFileSync(`${output}/results.json`, JSON.stringify(reports, null, 2))
    console.log(JSON.stringify({ n, runMs: report.runMs, processed: summary.run.processed, quarantined: summary.run.quarantined, boards: summary.boards, screen: { p50Ms: report.screen.p50Ms, p95Ms: report.screen.p95Ms, maxBytes: report.screen.maxBytes }, commandFailures: commands.filter(c => c.code !== 0).length }))
  }
  run('reviewValidation:seedCleanup')
  const cleanupStart = Date.now(); run('maintenance:cleanup')
  const expiredQuery = 'return (await ctx.db.query("tickLogs").withIndex("by_at", q => q.lt("at", Date.now()-96*3600000)).take(1)).length;'
  for (let j = 0; j < 20; j++) {
    const p = spawnSync(process.execPath, [cli, 'run', '--inline-query', expiredQuery, '--deployment', deployment], { encoding:'utf8' })
    if (p.status !== 0) throw new Error(p.stderr)
    if (JSON.parse(p.stdout) === 0) { console.log(`Expired cleanup drained in ${Date.now()-cleanupStart}ms`); break }
    await sleep(250)
  }
  run('reviewValidation:pause')
  await sleep(500)
} finally {
  logs.kill('SIGTERM')
  writeFileSync(`${output}/logs.jsonl`, (existsSync(`${output}/logs.jsonl`) ? readFileSync(`${output}/logs.jsonl`, 'utf8') : '') + logText)
}
