/** Run the pinned official TRMNL linter against the authoritative TS templates. */
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { screenMarkup } from '@trmnl-games/desk-crawler/templates/screen'
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

const dir = mkdtempSync(join(tmpdir(), 'desk-crawler-trmnl-lint-'))
try {
  mkdirSync(join(dir, 'src'))
  writeFileSync(join(dir, 'src/settings.yml'), `${readFileSync(join(config, 'settings.yml'), 'utf8')}\nframework_version: ${FRAMEWORK_VERSION}\n`)
  copyFileSync(join(config, '.trmnlp.yml'), join(dir, '.trmnlp.yml'))
  const layouts = {
    full: screenMarkup.markup,
    half_horizontal: screenMarkup.markup_half_horizontal,
    half_vertical: screenMarkup.markup_half_vertical,
    quadrant: screenMarkup.markup_quadrant,
  }
  for (const [name, markup] of Object.entries(layouts)) {
    writeFileSync(join(dir, `src/${name}.liquid`), markup)
  }
  process.exitCode = bundle(['exec', 'trmnlp', 'lint', '--dir', dir, '--format', args.includes('--json') ? 'json' : 'text']).status ?? 1
} finally {
  rmSync(dir, { recursive: true, force: true })
}
