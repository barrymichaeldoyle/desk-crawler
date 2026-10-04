# Implementation status

Updated 2026-10-04. Production companion is live at `trmnlgames.com` (TRMNL Games platform, Desk Crawler under `/app/desk-crawler`), Convex `exciting-cormorant-948`, the TRMNL Games Clerk production instance, TRMNL plugin 564. The old `desk-crawler.grandprixpicks.com` host no longer serves the companion. Review preparation resumes after the migration; [release evidence](evidence/release.md) records verified behavior and open checks.

Barry asked for shared infrastructure across future games on `trmnlgames.com` (D40). The [TRMNL Games migration plan](trmnl-games-migration.md) staged the monorepo, platform and domain work before final marketplace submission. This was a pre-launch migration with no public player base (D41). That exception does not relax progress preservation for later public releases.

Migration progress:

- M0–M3 done. Monorepo move, platform boundaries (two deletion levels, per-game handoff cookies) and the dev rehearsal ([platform rehearsal](evidence/platform-rehearsal.md)).
- M4 done. Clerk domain moved to `trmnlgames.com`, `main` deployed at 13:58 UTC, ticks continued on the new :00 slot, data backfilled and Barry's account rebound with hero "Baz" kept (decisions revisions 18–19). Email-code, Google and GitHub sign-in work on the new domain; plugin 564's installation, management and knowledge-base URLs point at `trmnlgames.com`; signed Clerk webhook delivered; prod `COMPANION_ORIGIN` unset, so QR codes use the `https://trmnlgames.com` default (revision 20). Fresh install → Save → Configure → render → uninstall passed as Baz with setting 495979 (revision 21).
- M5 in progress. Preview pass done: all 88 cases pass after template v15 fixed OG full-layout clipping ([layout evidence](evidence/trmnl-layouts.md)); v15 is local until pushed. Done: old-domain DNS removed (no redirect needed), Worker and repository renamed to `trmnl-games` (revision 22). Remaining: cost/health monitoring, marketplace featured image and reviewer recording on the new URLs.
## Built and verified

| Package | State | Evidence |
| --- | --- | --- |
| A03 pure simulator + content | Done. v2 catalog active, luck (D35), D29 Resume destination | 23 pure tests, [balance](evidence/balance.md) |
| A01 platform | V01 build/SSR/auth proven locally; protocol facts from the live install | [platform spikes](evidence/platform-spikes.md), [lifecycle](evidence/trmnl-lifecycle.md) |
| A02 foundation | Schema for every current table, Clerk auth config, users | Typecheck across app/core/Convex |
| A05 scheduler | Live since 20:58 UTC: guarded ticks, page chain, quarantine, dormant skip, watchdog incl. ranking stalls | convex-test tick matrix |
| A06 rankings | Hourly immutable publication of overall / 24h / 7d, level groups, deltas, cleanup | convex-test leaderboard matrix |
| A04 intents | Receipted, rate-limited: travel, potion, equip/unequip, sell, sellMany, claimHeld, resumeAdventures(+destination), pause/resume, legacy timezone compatibility, disconnect | convex-test intent matrix |
| A07 lifecycle | Install (encrypted flow cookie, code exchange, owner link, pending hero), Save → success webhook → one-time activation, uninstall tombstone, lost-callback recovery path, management landing with RS256 JWT verification | Live install by Barry; forged-JWT rejection |
| A08 payload | v1 payload incl. ranks, Top 5 with name masking, `rank_status`, `scene_url`/`scene_url_small` | Live TRMNL renders |
| A10 art + layouts | Hand-authored 1-bit pixel art (6 hero poses, 12 monsters, props, 3 backdrops), on-demand scene composer (`/art/scene/v2/...`), scene-window layouts for all four sizes | Real TRMNL X renders |
| A09 companion | Shell, hero page (scene, stats, travel, potion, pause), bag (equip, bulk sell, claim, resume with destination), rankings (3 tabs), settings (pause, installations; timezone removed per D39), help/privacy/support pages | Playwright walkthrough with the Clerk test identity |
| A11 operations | Daily bounded retention cleanup; account deletion with durable purge, revocation hashes and Clerk user deletion | convex-test; live deletion ([evidence](evidence/deletion.md)) |
| D27 incident notices | One incident per stalled run, deduplicated alert + recovery via Resend with idempotency keys and bounded retries; production key configured, staging pair accepted by Resend | convex-test; [recovery](evidence/recovery.md), delivery-event check still open |
| D23 admin | Server-side allowlist, health view, audited name repair / suspend / restore / release / resume-run, owner name replacement | convex-test |
| Layout matrix | Local framework preview of ten states × four sizes on OG and TRMNL X (template v8), overflow-checked; companion QR on setup and full bag | [layouts](evidence/trmnl-layouts.md) |
| D25 return recap | Single server checkpoint, guarded visible acknowledgement | convex-test; live browser check |

## Deliberate differences from the plan

- `trmnl.completeInstall` prepares the pending hero in the same transaction as the grant link (no separate `heroes.create` call), so a half-finished install cannot leave a hero without an attempt.
- The management handoff is a sealed 10-minute HttpOnly cookie instead of a `trmnlManagementHandoffs` table; the TRMNL JWT is still verified on landing, and ownership is checked by Clerk identity.
- Install attempts do not store a browser `flowHash`; the encrypted flow cookie carries the browser binding.
- Payload v1 gains optional `scene_url`, `scene_url_small`, `scene_url_large`, `scene_url_medium` and `qr_url`/`qr_url_large`/`qr_label` (additive). Progress bars use framework 3.4 `content/track/fill` with the documented inline width.
- `DEV_SEED_ENABLED` gates an internal-only dev seeding function used for browser checks. Never set it on production.

## Remaining before public release

Updated 2026-10-04 after the M4 cutover and the v15/v16 preview pass. Release gates from [product](product.md#first-public-release-acceptance) and [quality](quality.md#first-release-versus-ongoing-changes):

| Gate | State |
| --- | --- |
| Real install, manage, render, uninstall | Done on `trmnlgames.com` (decisions revision 21) |
| Four layouts, worst-case states | Done through previews (D43), v15/v16; [layout evidence](evidence/trmnl-layouts.md). Live X render shows the next-tick line |
| Strings work without TRMNL globals | Done in v16: the only `trmnl.*` use moved to a merge variable |
| Capacity and zero-payout costs | Done ([capacity](evidence/capacity.md)) |
| Creator Fund (V10) | Public rules checked ([creator fund](evidence/creator-fund.md)); TRMNL confirmation is asked in the review email; payout setup is in Barry's TRMNL account tab |
| Marketplace approval | The review itself |

Submission materials:

- **Featured image:** "Generate marketplace preview" was triggered from setting 495747 on 2026-10-04, but the install page still showed the old sample afterwards. Barry to check the plugin page, and regenerate or upload a current render if it is still old.
- **Video:** record a from-scratch install with a brand-new account ([script](release/review-package.md#install-video-script-90-seconds-no-audio)). It needs a fresh sign-up, so Barry records it; then host it at a reviewer-accessible URL (Barry approves publication).
- **Review email:** [draft](review-email.md) updated with correct testing steps. Barry fills in the owner email (must match the sender), video URL and promotion answer, and confirms the TRMNL account is not on a BYOD free trial.
- **Submit:** Barry clicks Submit for Review in My Plugins and sends the email.

Operational hardening (not reviewer-facing, recommended before wider promotion): V06 live lifecycle variants (expired/abandoned attempt, wrong owner, delayed callbacks), and the post-backup deletion/revocation recovery proof. Cloudflare Workers Builds deploys on push to `main`; a push is a production action.

## Latest preparation completed

- Production app, plugin lifecycle/screen URLs, Clerk environment and Resend key are configured. The production Clerk deletion webhook's trailing comma was corrected; a signed synthetic event delivered successfully.
- Daily production backups at 09:03 UTC, seven-day retention; Oct 4 backup completed. Isolated synthetic import took 27.276 seconds, plus 6.051 seconds for verification/checkpoint replay: [recovery evidence](evidence/recovery.md).
- 100/1,000-hero runs and screen latency met targets. The zero-payout scenario forecast identifies approximately $45/month additional Convex I/O/egress at 1,000 continuously polling instances with otherwise unused allowances: [capacity evidence](evidence/capacity.md).
- Approved simpler logo/favicon implemented; new TRMNL plugin icon saved. Local app/touch/social assets generated and inspected.
- [Review email](review-email.md) and [installation screenshot video](evidence/install-demo/README.md) prepared, not sent or published. Current tests/typechecks (71 tests) and production build pass.
