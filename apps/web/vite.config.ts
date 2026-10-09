import { cloudflare } from '@cloudflare/vite-plugin'
import { sentryTanstackStart } from '@sentry/tanstackstart-react/vite'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * One id per build: the commit Workers Builds deploys, else the build time. The bundle carries it and `/build.json`
 * publishes it, so a tab left open across a deploy can tell its code is old (lib/deployWatch).
 */
const BUILD_ID = process.env.WORKERS_CI_COMMIT_SHA || `local-${Date.now()}`
const buildManifest = (): Plugin => ({
  name: 'build-manifest',
  generateBundle() {
    if (this.environment.name === 'client') this.emitFile({ type: 'asset', fileName: 'build.json', source: JSON.stringify({ id: BUILD_ID }) })
  },
})

/**
 * Source maps for Sentry (D113): only when the build has SENTRY_AUTH_TOKEN (Workers Builds). The maps are uploaded under
 * the same release the SDKs report (BUILD_ID) and deleted afterwards, so neither the Worker nor the site serves them.
 */
const sentrySourceMaps = (): Plugin[] => process.env.SENTRY_AUTH_TOKEN
  ? sentryTanstackStart({ org: 'barry-michael-doyle', project: 'trmnl-games', release: { name: BUILD_ID }, autoInstrumentMiddleware: false, telemetry: false })
  : []

export default defineConfig({
  resolve: { tsconfigPaths: true },
  define: { 'import.meta.env.VITE_BUILD_ID': JSON.stringify(BUILD_ID) },
  plugins: [cloudflare({ viteEnvironment: { name: 'ssr' } }), tailwindcss(), tanstackStart(), viteReact(), buildManifest(), ...sentrySourceMaps()],
})
