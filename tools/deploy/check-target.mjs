// Refuses to deploy unless CONVEX_DEPLOY_KEY targets Desk Crawler production.
// Deploy keys look like "prod:<deployment>|<secret>"; only the prefix is read or printed.
const EXPECTED = 'prod:exciting-cormorant-948'
const key = process.env.CONVEX_DEPLOY_KEY ?? ''
const target = key.split('|')[0]
if (target !== EXPECTED) {
  console.error(`Refusing to deploy: CONVEX_DEPLOY_KEY targets "${target || 'nothing'}", expected "${EXPECTED}".`)
  process.exit(1)
}
console.log(`Deploy target OK: ${target}`)
