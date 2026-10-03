# Implementation status

Updated 2026-10-03 (night). Live on the Convex dev deployment `superb-bobcat-74` with Barry's TRMNL X; app runs locally (`pnpm dev`), not yet deployed to Cloudflare.

## Built and verified

| Package | State | Evidence |
| --- | --- | --- |
| A03 pure simulator + content | Done. v2 catalog active, luck (D35), D29 Resume destination | 23 pure tests, [balance](evidence/balance.md) |
| A01 platform | V01 build/SSR/auth proven locally; protocol facts from the live install | [platform spikes](evidence/platform-spikes.md), [lifecycle](evidence/trmnl-lifecycle.md) |
| A02 foundation | Schema for every current table, Clerk auth config, users | Typecheck across app/core/Convex |
| A05 scheduler | Live since 20:58 UTC: guarded ticks, page chain, quarantine, dormant skip, watchdog incl. ranking stalls | convex-test tick matrix |
| A06 rankings | Hourly immutable publication of overall / 24h / 7d, level groups, deltas, cleanup | convex-test leaderboard matrix |
| A04 intents | Receipted, rate-limited: travel, potion, equip/unequip, sell, sellMany, claimHeld, resumeAdventures(+destination), pause/resume, timezone, disconnect | convex-test intent matrix |
| A07 lifecycle | Install (encrypted flow cookie, code exchange, owner link, pending hero), Save → success webhook → one-time activation, uninstall tombstone, lost-callback recovery path, management landing with RS256 JWT verification | Live install by Barry; forged-JWT rejection |
| A08 payload | v1 payload incl. ranks, Top 5 with name masking, `rank_status`, `scene_url`/`scene_url_small` | Live TRMNL renders |
| A10 art + layouts | Hand-authored 1-bit pixel art (6 hero poses, 12 monsters, props, 3 backdrops), on-demand scene composer (`/art/scene/v2/...`), scene-window layouts for all four sizes | Real TRMNL X renders |
| A09 companion | Shell, hero page (scene, stats, travel, potion, pause), bag (equip, bulk sell, claim, resume with destination), rankings (3 tabs), settings (timezone, pause, installations), help/privacy/support pages | Playwright walkthrough with the Clerk test identity |
| A11 operations | Daily bounded retention cleanup; account deletion with durable purge, revocation hashes and Clerk user deletion | convex-test; live deletion ([evidence](evidence/deletion.md)) |
| D27 incident notices | One incident per stalled run, deduplicated alert + recovery via Resend with idempotency keys and bounded retries; disabled until `RESEND_API_KEY` is set on Convex | convex-test |
| D23 admin | Server-side allowlist, health view, audited name repair / suspend / restore / release / resume-run, owner name replacement | convex-test |
| Layout matrix | Local framework preview of ten states × four sizes (template v7) | [layouts](evidence/trmnl-layouts.md) |
| D25 return recap | Single server checkpoint, guarded visible acknowledgement | convex-test; live browser check |

## Deliberate differences from the plan

- `trmnl.completeInstall` prepares the pending hero in the same transaction as the grant link (no separate `heroes.create` call), so a half-finished install cannot leave a hero without an attempt.
- The management handoff is a sealed 10-minute HttpOnly cookie instead of a `trmnlManagementHandoffs` table; the TRMNL JWT is still verified on landing, and ownership is checked by Clerk identity.
- Install attempts do not store a browser `flowHash`; the encrypted flow cookie carries the browser binding.
- Payload v1 gains optional `scene_url` and `scene_url_small` (additive). Progress bars use framework 3.4 `content/track/fill` with the documented inline width.
- `DEV_SEED_ENABLED` gates an internal-only dev seeding function used for browser checks. Never set it on production.

## Remaining before public release

- Clerk `user.deleted` webhook reconciliation (V09).
- Set `RESEND_API_KEY` on Convex to turn on incident/recovery emails (barry@barrymichaeldoyle.com from `desk-crawler@grandprixpicks.com`, D27/D38), then send one staging test.
- Production: Convex prod deployment, Clerk production instance with Google/GitHub OAuth credentials, Workers deploy on `desk-crawler.grandprixpicks.com`, **daily backups enabled** (the privacy page states this), `DEV_SEED_ENABLED` unset, plugin URLs switched from localhost/dev, real plugin icon.
- V06 lifecycle matrix live: uninstall, second instance, reinstall, expired attempt, wrong owner, lost callback.
- Confirm template v7 and scene art v3 on the real TRMNL X; mashups beside other plugins; art polish after Barry's review.
- Capacity measurement at 100/1,000 heroes (V05) and the zero-revenue cost report; Creator Fund eligibility (V10).
- Marketplace review package and submission (needs Barry's explicit go-ahead).
