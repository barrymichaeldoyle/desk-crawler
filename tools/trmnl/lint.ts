/** Run the pinned official TRMNL linter against the authoritative TS templates. */
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { screenMarkup } from '@trmnl-games/desk-crawler/templates/screen'
import { FRAMEWORK_VERSION } from '@trmnl-games/desk-crawler/templates/preview'

const root = fileURLToPath(new URL('../../', import.meta.url))
const config = join(root, 'tools/trmnl/lint')
const args = process.argv.slice(2)
if (args.some((arg) => !['--install', '--json'].includes(arg)) || (args.includes('--install') && args.includes('--json'))) {
  console.error('Usage: pnpm lint:trmnl [--json] or pnpm lint:trmnl:setup')
  process.exit(2)
}

const rubyVersion = spawnSync('ruby', ['-e', 'print RUBY_VERSION'], { encoding: 'utf8' })
const useMise = rubyVersion.status !== 0 || Number(rubyVersion.stdout.split('.')[0]) < 4
const command = useMise ? 'mise' : 'bundle'
const prefix = useMise ? ['exec', 'ruby@4.0.7', '--', 'bundle'] : []
const env = {
  ...process.env,
  BUNDLE_GEMFILE: join(config, 'Gemfile'),
  BUNDLE_PATH: join(root, '.trmnl-lint/gems'),
  BUNDLE_FROZEN: 'true',
  BUNDLE_APP_CONFIG: join(root, '.trmnl-lint/bundle'),
}

function run(bundleArgs: string[], quiet = false): number {
  const result = spawnSync(command, [...prefix, ...bundleArgs], { cwd: root, env, stdio: quiet ? 'pipe' : 'inherit' })
  if (quiet && result.status !== 0) {
    if (result.stdout) process.stderr.write(result.stdout)
    if (result.stderr) process.stderr.write(result.stderr)
  }
  if (result.error) {
    console.error('TRMNL lint requires Ruby 4+ and Bundler, or mise with Ruby 4.0.7 installed.')
    console.error(result.error.message)
  }
  return result.status ?? 1
}

if (args.includes('--install')) {
  process.exit(run(['install']))
}
if (run(['check'], true) !== 0) {
  console.error('Install the pinned linter with: pnpm lint:trmnl:setup')
  process.exit(1)
}

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
  process.exitCode = run(['exec', 'trmnlp', 'lint', '--dir', dir, '--format', args.includes('--json') ? 'json' : 'text'])
} finally {
  rmSync(dir, { recursive: true, force: true })
}
