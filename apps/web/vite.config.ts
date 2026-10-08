import { cloudflare } from '@cloudflare/vite-plugin'
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

export default defineConfig({
  resolve: { tsconfigPaths: true },
  define: { 'import.meta.env.VITE_BUILD_ID': JSON.stringify(BUILD_ID) },
  plugins: [cloudflare({ viteEnvironment: { name: 'ssr' } }), tailwindcss(), tanstackStart(), viteReact(), buildManifest()],
})
