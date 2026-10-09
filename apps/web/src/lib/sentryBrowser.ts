/** The browser SDK's two entry points, loaded on demand by lib/errorReporting so tree-shaking keeps the chunk small. */
export { captureException, init } from '@sentry/tanstackstart-react'
