import { readFileSync, writeFileSync } from 'node:fs'
const directory = '/private/tmp/desk-crawler-capacity'
const reports = JSON.parse(readFileSync(`${directory}/results.json`, 'utf8'))
const lines = readFileSync(`${directory}/logs.jsonl`, 'utf8').split('\n').flatMap(line => { try { return [JSON.parse(line)] } catch { return [] } })
const completions = [...new Map(lines.filter(x => x.kind === 'Completion').map(x => [x.executionId, x])).values()]
const percentile = (values, p) => values.toSorted((a,b) => a-b)[Math.ceil(values.length*p)-1] ?? 0
function aggregate(rows) {
  return { calls: rows.length, executionMs: rows.reduce((s,x)=>s+x.executionTime*1000,0), userExecutionMs: rows.reduce((s,x)=>s+(x.cachedResult ? 0 : x.userExecutionTime ?? 0)*1000,0), p95ExecutionMs: percentile(rows.map(x=>x.executionTime*1000),.95), p95UserExecutionMs: percentile(rows.filter(x=>!x.cachedResult).map(x=>(x.userExecutionTime??0)*1000),.95), readBytes: rows.reduce((s,x)=>s+x.usageStats.databaseReadBytes,0), writeBytes: rows.reduce((s,x)=>s+x.usageStats.databaseWriteBytes,0), readDocuments: rows.reduce((s,x)=>s+x.usageStats.databaseReadDocuments,0), writeDocuments: rows.reduce((s,x)=>s+x.usageStats.databaseWriteDocuments,0), conflictRetries: rows.reduce((s,x)=>s+(x.occInfo?.retryCount??0),0) }
}
const result = reports.map(report => {
  const run = report.summary.run
  const inRun = completions.filter(x => x.timestamp*1000>=run.startedAt && x.timestamp*1000<=run.finishedAt+500)
  const afterRun = completions.filter(x=>x.timestamp*1000>=run.finishedAt && x.timestamp*1000<=Date.parse(report.measuredAt))
  return { n:report.n, measuredAt:report.measuredAt, runMs:report.runMs, processed:run.processed, eligible:run.eligible, quarantined:run.quarantined, boards:report.summary.boards, inventorySampleRows:report.summary.sample.itemCount, retainedBucketSample:report.summary.sample.buckets, duplicateNoop:report.duplicateNoop, commands:{submitted:report.commands.length, accepted:report.commands.filter(x=>x.code===0).length, rejected:report.commands.filter(x=>x.code!==0).map(x=>({index:x.index,code:x.result.includes('INVALID_STATE')?'INVALID_STATE':'OTHER'})), conflictRetries:aggregate(inRun.filter(x=>x.identifier==='heroes:pause')).conflictRetries}, simulation:aggregate(inRun.filter(x=>x.identifier==='sim/runs/tick:simulateBatch')), ranking:aggregate(inRun.filter(x=>x.identifier==='leaderboard:buildBatch')), screen:{requests:report.screen.requests,all200:report.screen.all200,p50Ms:report.screen.p50Ms,p95Ms:report.screen.p95Ms,meanBytes:report.screen.meanBytes,maxBytes:report.screen.maxBytes,http:aggregate(afterRun.filter(x=>x.identifier==='POST /trmnl/v1/screen')),payload:aggregate(afterRun.filter(x=>x.identifier==='trmnlPayload:forInstance'))} }
})
writeFileSync('docs/evidence/capacity-results.json', JSON.stringify({ date:'2026-10-04',deployment:'precious-pheasant-866',simulationVersion:1,contentVersion:'v2',templateVersionDuringMeasurement:11,cohorts:result },null,2)+'\n')
console.log(JSON.stringify(result,null,2))
