import { cpSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const destination = '/private/tmp/desk-crawler-review-validation'
mkdirSync(destination, { recursive: true })
cpSync('apps/backend/convex', `${destination}/convex`, { recursive: true })
cpSync('package.json', `${destination}/package.json`)
try { symlinkSync(resolve('node_modules'), `${destination}/node_modules`, 'dir') } catch (error) { if (error.code !== 'EEXIST') throw error }
writeFileSync(`${destination}/convex/reviewValidation.ts`, readFileSync('tools/review/preview-functions.ts.txt'))
// No automatic ticks, watchdogs, or cleanup in a restored disposable database.
writeFileSync(`${destination}/convex/crons.ts`, "import { cronJobs } from 'convex/server'\nexport default cronJobs()\n")
const notices = `${destination}/convex/incidents.ts`
writeFileSync(notices, readFileSync(notices, 'utf8').replace('subject,\n', "subject: `[STAGING] ${subject}`,\n"))
console.log(`Prepared isolated checkout: ${destination}; production source untouched.`)
