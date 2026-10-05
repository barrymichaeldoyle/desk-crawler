# Desk Crawler

A passive multiplayer office RPG for your desk. A hero explores every 15 minutes, finds equipment, survives mishaps, and climbs a global leaderboard. Built exclusively for TRMNL: install the plugin to start your hero, watch the story on e-ink, and use the companion website for occasional decisions.

**Phase: review preparation.** The companion, Convex backend and TRMNL integration are live; the simulator, v4 narrative catalog, tests and balance harness are implemented. See [implementation status](docs/status.md) and [release checks](docs/evidence/release.md) for verified behavior and remaining gates. Run `pnpm install` then `pnpm check` and `pnpm balance`.

Confirmed on 2026-10-03:

- Month 1: one Warrior class, three office biomes, forgiving death and automatic revival.
- Public **Third Party marketplace plugin** with TRMNL OAuth from the first release.
- TRMNL-exclusive MVP: a verified saved installation activates the hero; the web app is its companion.
- Free gameplay; TRMNL Creator Fund is the intended sole MVP revenue source, subject to eligibility and actual payouts.
- TanStack Start + Vite + Clerk + Convex; Cloudflare Workers hosts the web app.
- Continuous integration and delivery; monthly themes group larger improvements. No separate beta program.
- Use existing Convex, Clerk, and Resend subscriptions; keep additional costs low.
- Email, Google and GitHub sign-in; required public pseudonyms; pause/resume without catch-up.
- Public GitHub repository from this folder; no fixed monthly extra-spend cap.
- Rolling 24-hour/seven-day XP ranking within level bands, published hourly; dormant heroes drop off recent boards. Seven-day view on TRMNL, both plus lifetime in the companion.
- Manage gear every three to seven days; retain the first overflow and sleep until deliberate resume (Resume can name the next biome; chosen gear sells in bulk). Start tuning at 30 slots/~five gear per day; slow the late-game gear curve and trim gold income.
- Bounded reward rolls plus rare elite foes and gold jackpots for a little luck.
- Gold reserved for later merchants; Barry initially handles private support and audited name repair. Following D40, game-progress deletion preserves the shared account; account deletion removes all game progress and the TRMNL Games Clerk account.
- Approved pacing/content targets, bounded return recap, owner incident alerts, daily backups and an early install-to-display milestone; [build refinements](docs/build-readiness.md).

Start with the [documentation index](docs/README.md), [MVP definition](docs/product.md), [decisions and open questions](docs/decisions.md), and [agent work packages](docs/work-packages.md).

Desk Crawler now runs on the shared TRMNL Games platform at `trmnlgames.com`. The monorepo/domain migration is complete; the [migration plan](docs/trmnl-games-migration.md) records the rollout and remaining review preparation.

The first release includes all four TRMNL layouts because Third Party marketplace publication requires them. The canonical flat player JSON remains a separate API contract; the marketplace endpoint returns markup plus merge variables.

Game constants, targets, and estimates are **planning proposals**, not measured outcomes. Platform facts have references in [research notes](docs/references.md). Future releases are direction, not instructions to build every feature now.

## Running locally

```sh
pnpm install
cp .env.example .env.local     # then fill in values (see comments)
npx convex dev                 # Convex backend, schema and functions
pnpm dev                       # web app on http://localhost:3000
pnpm check                     # typecheck + all tests
pnpm balance                   # balance harness (see docs/evidence/balance.md)
pnpm tsx tools/trmnl/preview.ts  # local TRMNL layout previews in .previews/
```

What is built and what remains: [implementation status](docs/status.md).

## Deploying

Cloudflare Workers Builds deploys production on every push to `main`:

- Build command: `pnpm build:deploy` (typecheck, tests, then `convex deploy` to `exciting-cormorant-948`, which runs `pnpm build` once the backend is live). Deploy command: `pnpm deploy:web` (companion on `trmnlgames.com`).
- Build variable (secret): `CONVEX_DEPLOY_KEY`. Non-production branch builds are off, because any build deploys production Convex.
- Public build values live in `.env.production`. Server secrets live on the platforms: Convex env (`npx convex env set --prod ...`) and Worker secrets (`npx wrangler secret put ...`: `CLERK_SECRET_KEY`, `INSTALL_FLOW_KEY`).
- Backend changes must stay additive: the old companion briefly runs against the new Convex functions before the Worker redeploys.

## Repository contents

| Path | Purpose |
| --- | --- |
| `LICENSE` | MIT for code; artwork, authored narrative content and the name/logo reserved |
| `docs/` | Product, gameplay, backend, API, UI, operations, QA, roadmap, and handoff plans |
| `docs/fixtures/` | Illustrative contract examples, not a live backend |
| `.agents/skills/trmnl/` | Official TRMNL agent skill and its upstream references |
| `memory/` | Project decisions recorded for continuity |

Read [AGENTS.md](AGENTS.md) before taking a work package.

Also useful: [TRMNL player experience](docs/trmnl-experience.md), [ranking](docs/ranking.md), [inventory](docs/inventory.md) and the [implementation evidence checklist](docs/evidence/README.md). Earlier planning reviews are in [docs/history](docs/history/final-review-2026-10-03.md). Tuning and technical evidence remain open.
