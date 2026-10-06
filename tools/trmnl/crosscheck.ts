/**
 * Cross-checks the preview's Liquid engine (liquidjs) against Ruby Liquid with
 * TRMNL's filters, as built by the pinned `trmnlp`. Every preview fixture set is
 * rendered by both engines from the same context and the markup must match
 * exactly. Ruby runs with strict filters, so a filter liquidjs knows but TRMNL
 * lacks fails here instead of silently passing through on TRMNL. Neither engine
 * replaces the live TRMNL render check.  Usage: pnpm crosscheck:trmnl
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { Liquid } from 'liquidjs'
import { screenMarkup } from '@trmnl-games/desk-crawler/templates/screen'
import type { PreviewLayout } from '@trmnl-games/desk-crawler/templates/preview'
import { bundle, requireBundle, root } from './bundle'

/** Preview flag sets that together cover every fixture state, with and without a keepsake code. */
const FIXTURE_SETS = [['--recap'], ['--recap', '--keepsakes'], ['--potion-finds'], ['--no-effect'], ['--marketing']]

requireBundle()

const dir = mkdtempSync(join(tmpdir(), 'desk-crawler-trmnl-crosscheck-'))
try {
  const cases: Array<{ id: string; layout: PreviewLayout; context: Record<string, unknown> }> = []
  for (const flags of FIXTURE_SETS) {
    const file = join(dir, 'contexts.json')
    const preview = spawnSync('pnpm', ['exec', 'tsx', 'tools/trmnl/preview.ts', ...flags, '--dump-contexts', file], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] })
    if (preview.status !== 0) throw new Error(`preview ${flags.join(' ')} failed`)
    const dumped = JSON.parse(readFileSync(file, 'utf8')) as Array<{ name: string; layout: PreviewLayout; context: Record<string, unknown> }>
    cases.push(...dumped.map(({ name, layout, context }) => ({ id: `${flags.join(' ')} ${name} ${layout}`, layout, context })))
  }

  // TRMNL renders in UTC; the preview's liquidjs and the Ruby process both use it.
  const ruby = bundle(['exec', 'ruby', join(root, 'tools/trmnl/crosscheck.rb')], {
    input: JSON.stringify({ templates: screenMarkup, cases }),
    stdio: ['pipe', 'pipe', 'inherit'],
    maxBuffer: 256 * 1024 * 1024,
    env: { TZ: 'UTC' },
  })
  if (ruby.status !== 0) throw new Error('Ruby render failed')
  const rubyHtml = JSON.parse(ruby.stdout.toString()) as Record<string, string>

  const liquid = new Liquid({ timezoneOffset: 0 })
  const out = join(root, '.previews/crosscheck')
  rmSync(out, { recursive: true, force: true })
  let mismatches = 0
  for (const { id, layout, context } of cases) {
    const js = await liquid.parseAndRender(screenMarkup[layout], context)
    const rb = rubyHtml[id] ?? 'RUBY ERROR: no output'
    if (js === rb) continue
    mismatches++
    const at = [...js].findIndex((char, i) => char !== rb[i])
    const offset = at < 0 ? Math.min(js.length, rb.length) : at
    console.error(`\n✗ ${id} (first difference at ${offset})`)
    console.error(`  liquidjs: ${JSON.stringify(js.slice(Math.max(0, offset - 80), offset + 80))}`)
    console.error(`  ruby:     ${JSON.stringify(rb.slice(Math.max(0, offset - 80), offset + 80))}`)
    mkdirSync(out, { recursive: true })
    const base = join(out, id.replace(/[^\w]+/g, '_'))
    writeFileSync(`${base}.liquidjs.html`, js)
    writeFileSync(`${base}.ruby.html`, rb)
  }
  console.log(mismatches ? `\n${mismatches} of ${cases.length} renders differ; full outputs in .previews/crosscheck/` : `${cases.length} renders identical in liquidjs and Ruby Liquid (trmnlp)`)
  process.exitCode = mismatches ? 1 : 0
} finally {
  rmSync(dir, { recursive: true, force: true })
}
