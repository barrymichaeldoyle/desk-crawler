# Platform spikes — A01 (in progress)

Started 2026-10-03 after Barry authorized implementation. Gates V01–V04/V06/V07 stay open until every row below has evidence.

## V01 — TanStack Start + Vite on Workers (build and SSR proven locally; auth pending)

| Check | Result |
| --- | --- |
| Scaffold | Cloudflare C3 delegates to `@tanstack/cli@0.71.0 create --deployment cloudflare --framework react`. `pnpm dlx` timed out downloading `@tanstack/create` on this network; `npx` worked. Demo routes/devtools dropped |
| Versions | Node 24.15, pnpm 11.17, TypeScript 6.0.3 (7.0 native compiler deliberately not adopted yet), Vite 8.3.2, `@tanstack/react-start` 1.168.60, `@tanstack/react-router` 1.170.41, React 19.3.0, `@cloudflare/vite-plugin` 1.62.5, Wrangler 4.147.0, workerd 1.20261001.1, Tailwind 4.3.3 |
| Production build | `pnpm build` builds client and SSR (Workers) environments; server bundle ~735 kB raw / ~152 kB gzip before any Clerk/Convex code |
| Local Workers runtime | `pnpm preview` runs the build in workerd: `GET /` 200 with server-rendered HTML; unknown route 404 |
| Clerk + Convex auth across SSR/reload | **Pending:** needs a dedicated Clerk development instance and Convex dev deployment |
| Deployed Worker on `desk-crawler.grandprixpicks.com` | **Pending:** needs `wrangler login` and Barry's go-ahead for the first deploy/DNS |
| Free-plan CPU fit | **Pending:** measure SSR CPU on a deployed Worker before deciding on Workers Paid |

pnpm needed `allowBuilds` for `esbuild`/`workerd` and a longer `fetchTimeout` (`pnpm-workspace.yaml`) on this connection.

## V02/V03/V06/V07 — TRMNL protocol

Pending: needs a development Third Party plugin registered under Barry's Developer Edition account, pointed at a Convex dev deployment.

## V04 — Index ordering and cohort pagination

Pending: Convex foundation (A02).
