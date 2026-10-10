/** Run the pinned official TRMNL linter against the authoritative TS templates: Desk Crawler's, then Slow Cast's. */
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { screenMarkup } from '@trmnl-games/desk-crawler/templates/screen'
import { screenMarkup as slowCastMarkup } from '@trmnl-games/slow-cast/templates/screen'
import { FRAMEWORK_VERSION } from '@trmnl-games/desk-crawler/templates/preview'
import { bundle, bundleConfig as config, requireBundle } from './bundle'

const args = process.argv.slice(2)
if (args.some((arg) => !['--install', '--json'].includes(arg)) || (args.includes('--install') && args.includes('--json'))) {
  console.error('Usage: pnpm lint:trmnl [--json] or pnpm lint:trmnl:setup')
  process.exit(2)
}

if (args.includes('--install')) {
  process.exit(bundle(['install']).status ?? 1)
}
requireBundle()

function lintGame(markup: Record<keyof typeof screenMarkup, string>, label: string): number {
  if (!args.includes('--json')) console.log(`${label}:`)
  const dir = mkdtempSync(join(tmpdir(), 'desk-crawler-trmnl-lint-'))
  try {
    mkdirSync(join(dir, 'src'))
    writeFileSync(join(dir, 'src/settings.yml'), `${readFileSync(join(config, 'settings.yml'), 'utf8')}\nframework_version: ${FRAMEWORK_VERSION}\n`)
    copyFileSync(join(config, '.trmnlp.yml'), join(dir, '.trmnlp.yml'))
    const layouts = {
      full: markup.markup,
      half_horizontal: markup.markup_half_horizontal,
      half_vertical: markup.markup_half_vertical,
      quadrant: markup.markup_quadrant,
    }
    for (const [name, text] of Object.entries(layouts)) {
      writeFileSync(join(dir, `src/${name}.liquid`), text)
    }
    return bundle(['exec', 'trmnlp', 'lint', '--dir', dir, '--format', args.includes('--json') ? 'json' : 'text']).status ?? 1
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const failed = [lintGame(screenMarkup, 'Desk Crawler'), lintGame(slowCastMarkup, 'Slow Cast')].some((status) => status !== 0)
process.exitCode = failed ? 1 : 0
