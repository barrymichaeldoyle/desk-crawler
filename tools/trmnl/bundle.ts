/** Runs the pinned `trmnl_preview` bundle (tools/trmnl/lint/Gemfile) under Ruby 4, via mise when the default Ruby is older. */
import { spawnSync, type SpawnSyncOptions } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = fileURLToPath(new URL('../../', import.meta.url))
export const bundleConfig = join(root, 'tools/trmnl/lint')

const rubyVersion = spawnSync('ruby', ['-e', 'print RUBY_VERSION'], { encoding: 'utf8' })
const useMise = rubyVersion.status !== 0 || Number(rubyVersion.stdout.split('.')[0]) < 4
const command = useMise ? 'mise' : 'bundle'
const prefix = useMise ? ['exec', 'ruby@4.0.7', '--', 'bundle'] : []
const env = {
  ...process.env,
  BUNDLE_GEMFILE: join(bundleConfig, 'Gemfile'),
  BUNDLE_PATH: join(root, '.trmnl-lint/gems'),
  BUNDLE_FROZEN: 'true',
  BUNDLE_APP_CONFIG: join(root, '.trmnl-lint/bundle'),
}

export function bundle(bundleArgs: string[], options: SpawnSyncOptions = {}) {
  const result = spawnSync(command, [...prefix, ...bundleArgs], { cwd: root, stdio: 'inherit', ...options, env: { ...env, ...options.env } })
  if (result.error) {
    console.error('The pinned trmnl_preview bundle requires Ruby 4+ and Bundler, or mise with Ruby 4.0.7 installed.')
    console.error(result.error.message)
  }
  return result
}

/** Exits with setup instructions unless the pinned bundle is installed. */
export function requireBundle() {
  const check = bundle(['check'], { stdio: 'pipe' })
  if (check.status === 0) return
  if (check.stdout) process.stderr.write(check.stdout)
  if (check.stderr) process.stderr.write(check.stderr)
  console.error('Install the pinned trmnl_preview bundle with: pnpm lint:trmnl:setup')
  process.exit(1)
}
