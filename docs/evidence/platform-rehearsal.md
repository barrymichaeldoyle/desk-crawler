# TRMNL Games migration rehearsal (M3)

2026-10-04, after commits `1a6d229` (monorepo move) and `ab315f8` (M2 boundaries). Environment: Convex dev deployment `superb-bobcat-74`, Clerk development instance, web companion run locally with `pnpm dev` (Vite + Cloudflare plugin). Production (`exciting-cormorant-948`, Clerk production, plugin 564) was not touched. A synthetic `+clerk_test` identity was created and then deleted; no real player data was used.

## M1 gate

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Up to date, one root lockfile |
| `pnpm typecheck` (four workspace projects + simulator config) | Pass |
| `pnpm test` | 71 tests at the move; 81 after M2/M3 |
| `pnpm build` (web Worker) | Pass |
| `npx convex codegen --typecheck enable` from `convex.json` (`apps/backend/convex`) | Bundled the workspace packages; generated files byte-identical |
| `pnpm balance` and `pnpm balance --content v2` versus the pre-move commit | Identical apart from the wall-clock `seconds` field |

## Backend on dev

- `npx convex dev --once` deployed the new layout. Schema changes are additive (new `deskCrawlerProfiles`/`gameDeletionJobs`, optional `gameSlug`/`scope`).
- `platformMigration:backfill` per table, paginated to `isDone`: users 1, trmnlGrants 1, trmnlInstallAttempts 1, trmnlInstances 1, operationReceipts 0 migrated. A second pass migrated 0.
- Scheduler after deploy: the 12:43 UTC slot ran tick 64 on the new code and completed (2 heroes processed, run state `completed`). The previous publication (11:58) stayed current until the next hourly slot.

## Credentials and public endpoints (dev `.convex.site`)

| Request | Status |
| --- | --- |
| Screen without bearer / unknown token / wrong media type / duplicate `user_uuid` / malformed UUID | 404 each (fail closed, no detail) |
| Uninstall and install-success with unknown token | 404 |
| Clerk webhook without a valid Svix signature | 401 |
| QR `app` and `bag` at scales 3 and 7 | 200; decoded with jsQR to `https://trmnlgames.com/app/desk-crawler` and `…/app/desk-crawler/inventory` |
| QR with a non-allowlisted target | 404 |

## Companion (local, against dev)

| Route or action | Result |
| --- | --- |
| `/`, `/games/desk-crawler`, `/help/desk-crawler`, `/privacy`, `/terms`, `/support`, `/app`, `/app/desk-crawler/*`, `/account`, `/admin`, `/connect/trmnl/desk-crawler/{install,manage}` | 200; unknown path 404 |
| Install link with a non-TRMNL callback URL | 307 to `?invalid=true`; nothing sealed |
| Management link with a forged JWT | 307 to `?invalid=true` |
| Fresh sign-up (email code) | Signed in; Account shows "Pick a public name when you connect your first game" |
| Library and hero page with a seeded hero | Library lists Desk Crawler; scene, stats, travel and log render |
| Intents: resume, equip upgrade | Applied reactively |
| Rankings | Renders; new hero waits for the next ranked update |
| Delete Desk Crawler progress | Job completed; hero/items gone; account and public name kept; profile active with no hero; page shows "Start on TRMNL" |
| Delete TRMNL Games account | Signed out to `/`; user row removed; Clerk user returns 404 |

The hero was seeded with `devSeed:seedTestHero`; `DEV_SEED_ENABLED` was set only for that call and removed immediately.

## Fixed during the rehearsal

- Library showed "Adventuring" for a paused hero. `users.me` now returns the hero status and the library labels paused, knocked-out and bag-full heroes.
- A signed-in identity without a game was told to contact support to delete it, although `requestDeletion` supports that case. The account page now offers deletion to every signed-in user (test added).
- Companion pages server-rendered only a "Loading…" placeholder and waited 3–5 seconds for Clerk and the Convex socket. Route loaders now preload each page's queries with the request's Convex token; raw SSR HTML of `/app`, `/app/desk-crawler`, the bag, settings and `/account` contains the player's data and no loading state.
- `sitemap.xml`, `robots.txt` and the web manifest still named the old domain, paths and Desk Crawler; they now describe TRMNL Games at `trmnlgames.com`.

## Open for the cutover (M4), not fixed here

- Clerk's sign-in dialog shows the application name and logo "Desk Crawler". Rename the Clerk application during the Clerk domain change.
- Platform favicon, touch icons and social card are copies of the Desk Crawler artwork. A TRMNL Games mark needs a design decision.
- Incident email sender remains `desk-crawler@grandprixpicks.com` by design (D38) until a separately approved change.
- Not exercisable without TRMNL: real install → Save → render → manage → uninstall against new routes, physical X delivery and all four layouts. These stay in the M4/M5 checklist.
