/**
 * Pull a real hero's device payload from a deployment (production by default) into
 * .previews/live-payload.json, where the dev gallery (/dev/desk-crawler, scenario
 * "live") renders it through the local templates. Read-only: it runs the owner
 * preview query `trmnlPayload:mine` as that user with the Convex CLI's admin
 * `--identity`, so it shows what the companion preview shows (no keepsake code).
 *
 * Usage: pnpm pull:trmnl [--alias <public alias>] [--deployment <name>] [--utc-offset <seconds>] [--watch [seconds]]
 * Without --alias the deployment must have exactly one user.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const option = (name) => {
  const index = args.indexOf(name)
  return index >= 0 ? (args[index + 1]?.startsWith('--') ? '' : (args[index + 1] ?? '')) : undefined
}
const alias = option('--alias')
const deployment = option('--deployment')
const target = deployment ? ['--deployment', deployment] : ['--prod']
const utcOffset = Number(option('--utc-offset') ?? -new Date().getTimezoneOffset() * 60)
const watch = option('--watch')
const interval = watch === undefined ? 0 : Number(watch || 60)
const OUT = '.previews/live-payload.json'

const convex = (...rest) => execFileSync('npx', ['convex', ...rest, ...target], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 << 20 })

function findIdentity() {
  const users = JSON.parse(convex('data', 'users', '--limit', '10000', '--format', 'jsonArray'))
  const normalized = alias?.trim().toLowerCase()
  const matches = normalized ? users.filter((user) => user.normalizedAlias === normalized || user.publicAlias.toLowerCase() === normalized) : users
  if (matches.length !== 1) throw new Error(normalized ? `no single user with alias "${alias}" (${matches.length} found)` : `${users.length} users: pass --alias <public alias>`)
  const { tokenIdentifier, publicAlias } = matches[0]
  const split = tokenIdentifier.indexOf('|')
  return { publicAlias, identity: JSON.stringify({ tokenIdentifier, issuer: tokenIdentifier.slice(0, split), subject: tokenIdentifier.slice(split + 1) }) }
}

const { publicAlias, identity } = findIdentity()

function pull() {
  const now = Math.floor(Date.now() / 60_000) * 60_000
  const payload = JSON.parse(convex('run', 'trmnlPayload:mine', JSON.stringify({ now, utcOffset }), '--identity', identity))
  if (payload === null) throw new Error(`${publicAlias} has no active hero`)
  mkdirSync('.previews', { recursive: true })
  writeFileSync(OUT, JSON.stringify({ alias: publicAlias, deployment: deployment ?? 'prod', now, utcOffset, payload }, null, 2))
  console.log(`${new Date(now).toISOString()} ${publicAlias}: ${payload.hero_name} Lv ${payload.level} (${payload.status}) -> ${OUT}`)
}

pull()
if (interval > 0) setInterval(() => { try { pull() } catch (error) { console.error(error.message) } }, interval * 1000)
