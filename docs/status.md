# Implementation status

Updated 2026-10-05. Production companion is live at `trmnlgames.com` (TRMNL Games platform, Desk Crawler under `/app/desk-crawler`), Convex `exciting-cormorant-948`, the TRMNL Games Clerk production instance, TRMNL plugin 564. The old `desk-crawler.grandprixpicks.com` host no longer serves the companion. Review preparation resumes after the migration; [release evidence](evidence/release.md) records verified behavior and open checks.

Barry asked for shared infrastructure across future games on `trmnlgames.com` (D40). The [TRMNL Games migration plan](trmnl-games-migration.md) staged the monorepo, platform and domain work before final marketplace submission. This was a pre-launch migration with no public player base (D41). That exception does not relax progress preservation for later public releases.

Migration progress:

- M0–M3 done. Monorepo move, platform boundaries (two deletion levels, per-game handoff cookies) and the dev rehearsal ([platform rehearsal](evidence/platform-rehearsal.md)).
- M4 done. Clerk domain moved to `trmnlgames.com`, `main` deployed at 13:58 UTC, ticks continued on the new :00 slot, data backfilled and Barry's account rebound with hero "Baz" kept (decisions revisions 18–19). Email-code, Google and GitHub sign-in work on the new domain; plugin 564's installation, management and knowledge-base URLs point at `trmnlgames.com`; signed Clerk webhook delivered; prod `COMPANION_ORIGIN` unset, so QR codes use the `https://trmnlgames.com` default (revision 20). Fresh install → Save → Configure → render → uninstall passed as Baz with setting 495979 (revision 21).
- M5 review preparation. Domain/DNS/Worker/repository migration and preview coverage are complete. Production templates v24 and scene v4 include the October 5 log, sky and spacing changes ([spacing](evidence/log-spacing.md), [sky](evidence/scene-time.md)). Current local submission work adds the featured-image candidate, matching landing sample, clearer help, corrected listing/reviewer copy, extended balance reports and offline recovery preparation. Remaining: health/cost headroom, actual listing-image update, final installation recording/hosting and submission details. See the [current release checklist](evidence/release.md).

## Built and verified

Deployed on 2026-10-05 following Barry’s approval: D46 weekly permanent Desk keepsakes, template v21 device-only code footer and companion shelf; D47 content v4 with eighteen mishaps per biome, a second-cable callback and no third consecutive cable trip. Commit `6391c5d` is live on the existing production Convex and Worker, v4 is active for subsequent scheduled runs, and Baz’s progress is preserved. The signed-in shelf, preview code omission and successful TRMNL server render were verified. Barry waived the remaining physical glance, real claim and post-claim verification on 2026-10-05; those checks were not performed. See [playlist-retention evidence](evidence/playlist-retention.md).

| Package | State | Evidence |
| --- | --- | --- |
| A03 pure simulator + content | Done. v2 gameplay tuning, v4 narrative active, luck (D35), D29 Resume destination | Current simulator tests and extended [balance](evidence/balance.md) |
| A01 platform | V01 build/SSR/auth proven locally; protocol facts from the live install | [platform spikes](evidence/platform-spikes.md), [lifecycle](evidence/trmnl-lifecycle.md) |
| A02 foundation | Schema for every current table, Clerk auth config, users | Typecheck across app/core/Convex |
| A05 scheduler | Live since 20:58 UTC: guarded ticks, page chain, quarantine, dormant skip, watchdog incl. ranking stalls | convex-test tick matrix |
| A06 rankings | Hourly immutable publication of overall / 24h / 7d, level groups, deltas, cleanup | convex-test leaderboard matrix |
| A04 intents | Receipted, rate-limited: travel, potion, equip/unequip, sell, sellMany, claimHeld, resumeAdventures(+destination), pause/resume, legacy timezone compatibility, disconnect | convex-test intent matrix |
| A07 lifecycle | Install (encrypted flow cookie, code exchange, owner link, pending hero), Save → success webhook → one-time activation, uninstall tombstone, lost-callback recovery path, management landing with RS256 JWT verification | Live install by Barry; forged-JWT rejection |
| A08 payload | v1 payload incl. ranks, Top 5 with name masking, `rank_status`, `scene_url`/`scene_url_small` | Live TRMNL renders |
| A10 art + layouts | Hand-authored 1-bit pixel art (6 hero poses, 12 monsters, props, 3 backdrops), on-demand scene composer (`/art/scene/v4/...`), scene-window layouts for all four sizes | Current [scene](evidence/scene-time.md) and [layout](evidence/log-spacing.md) evidence |
| A09 companion | Shell, hero page (scene, stats, travel, potion, pause), bag (equip, bulk sell, claim, resume with destination), rankings (3 tabs), settings (pause, installations; timezone removed per D39), help/privacy/support pages | Playwright walkthrough with the Clerk test identity |
| A11 operations | Daily bounded retention cleanup; account deletion with durable purge, revocation hashes and Clerk user deletion | convex-test; live deletion ([evidence](evidence/deletion.md)) |
| D27 incident notices | One incident per stalled run, deduplicated alert + recovery via Resend with idempotency keys and bounded retries; production key configured, staging pair accepted by Resend | convex-test; [recovery](evidence/recovery.md), production Delivered event verified; live retry exhaustion open |
| D23 admin | Server-side allowlist, health view, audited name repair / suspend / restore / release / resume-run, owner name replacement | convex-test |
| Layout matrix | Template v24: 15 states × four sizes on OG and TRMNL X, 120 pages overflow-checked; D43 assigns layout/mashup coverage to previews | Current [spacing](evidence/log-spacing.md), historical [layouts](evidence/trmnl-layouts.md) |
| D25 return recap | Single server checkpoint, guarded visible acknowledgement | convex-test; live browser check |

## Deliberate differences from the plan

- `trmnl.completeInstall` prepares the pending hero in the same transaction as the grant link (no separate `heroes.create` call), so a half-finished install cannot leave a hero without an attempt.
- The management handoff is a sealed 10-minute HttpOnly cookie instead of a `trmnlManagementHandoffs` table; the TRMNL JWT is still verified on landing, and ownership is checked by Clerk identity.
- Install attempts do not store a browser `flowHash`; the encrypted flow cookie carries the browser binding.
- Payload v1 gains optional `scene_url`, `scene_url_small`, `scene_url_large`, `scene_url_medium` and `qr_url`/`qr_url_large`/`qr_label` (additive). Progress bars use framework 3.4 `content/track/fill` with the documented inline width.
- `DEV_SEED_ENABLED` gates an internal-only dev seeding function used for browser checks. Never set it on production.

## Remaining before submission and public release

The [current release checklist](evidence/release.md) is the gate source. Install/manage/render/uninstall on trmnlgames.com, all four preview layouts under D43, current v24 rendering, capacity measurements, backups and the delivered test alert are recorded.

Submission work:

- [Featured image](release/featured-image.png): current v24 fictional sample prepared locally; upload/regenerate the actual listing and verify its install page after approval.
- [Video plan](release/recording-checklist.md): capture a from-scratch installation including first signup, Save and first adventure, then host at an approved reviewer-accessible URL. The existing returning-owner slideshow is supporting evidence.
- [Review package](release/review-package.md): corrected 33-character description and accurate bag-sleep/keepsake copy; listing changes remain unsaved externally.
- [Review email](review-email.md): owner/sender barry@barrymichaeldoyle.com and no promotion commitment confirmed; hosted video URL remains open. Author license/BYOD-trial state needs checking. Submit for Review and sending the email require explicit approval.

Engineering launch gates remain: independent protected post-snapshot deletion/revocation capture and a live restore using it, restored interrupted work/receipt replay, remaining live lifecycle/deletion and alert failure scenarios, actual shared-plan headroom/funding, and the tuning decisions raised by the extended balance report. Local recovery tools prepare encrypted evidence and a denial plan, but do not apply writes or approve reopening. See the [recovery runbook](release/recovery-runbook.md).

D43 does not require Barry to check every physical layout. D46's physical/claim/post-claim verification was waived, not performed; the waiver remains respected. All external deployment, listing, media publication and submission actions remain separate approvals.

## Latest preparation completed

- Production app, plugin lifecycle/screen URLs, Clerk environment and Resend key are configured. The production Clerk deletion webhook's trailing comma was corrected; a signed synthetic event delivered successfully.
- Daily production backups at 09:03 UTC, seven-day retention; Oct 4 backup completed. Isolated synthetic import took 27.276 seconds, plus 6.051 seconds for verification/checkpoint replay: [recovery evidence](evidence/recovery.md).
- 100/1,000-hero runs and screen latency met targets. The zero-payout scenario forecast identifies approximately $45/month additional Convex I/O/egress at 1,000 continuously polling instances with otherwise unused allowances: [capacity evidence](evidence/capacity.md).
- Approved simpler logo/favicon implemented; new TRMNL plugin icon saved. Local app/touch/social assets generated and inspected.
- [Review email](review-email.md) and [installation screenshot video](evidence/install-demo/README.md) prepared, not sent or published. Current candidate validation is recorded in [submission preparation](evidence/submission-preparation.md).
