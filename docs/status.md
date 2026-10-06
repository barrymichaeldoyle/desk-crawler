# Implementation status

Updated 2026-10-06. Production companion is live at `trmnlgames.com` (TRMNL Games platform, Desk Crawler under `/app/desk-crawler`), Convex `exciting-cormorant-948`, the TRMNL Games Clerk production instance, TRMNL plugin 564. The old `desk-crawler.grandprixpicks.com` host no longer serves the companion. Review preparation resumes after the migration; [release evidence](evidence/release.md) records verified behavior and open checks.

The latest [engineering pass](evidence/engineering-readiness.md) completed authz/reviewer/health/cost checks, actual subscription inspection and isolated recovery/lifecycle/failure rehearsals. Four reproduced backend defects are deployed; D53 shows `No effect` for known zero-delta logs. The candidate passes 187 tests, typechecks, build and Worker dry run; it was [deployed with approval on October 6](evidence/engineering-deploy.md). Ongoing protected capture, real-provider fixtures and funding/tuning decisions remain open. The [hourly capture template](../tools/recovery/checkpoint-workflow.yml.txt) is prepared but inactive.

Barry asked for shared infrastructure across future games on `trmnlgames.com` (D40). The [TRMNL Games migration plan](trmnl-games-migration.md) staged the monorepo, platform and domain work before final marketplace submission. This was a pre-launch migration with no public player base (D41). That exception does not relax progress preservation for later public releases.

Migration progress:

- M0–M3 done. Monorepo move, platform boundaries (two deletion levels, per-game handoff cookies) and the dev rehearsal ([platform rehearsal](evidence/platform-rehearsal.md)).
- M4 done. Clerk domain moved to `trmnlgames.com`, `main` deployed at 13:58 UTC, ticks continued on the new :00 slot, data backfilled and Barry's account rebound with hero "Baz" kept (decisions revisions 18–19). Email-code, Google and GitHub sign-in work on the new domain; plugin 564's installation, management and knowledge-base URLs point at `trmnlgames.com`; signed Clerk webhook delivered; prod `COMPANION_ORIGIN` unset, so QR codes use the `https://trmnlgames.com` default (revision 20). Fresh install → Save → Configure → render → uninstall passed as Baz with setting 495979 (revision 21).
- M5 review preparation. Domain/DNS/Worker/repository migration and preview coverage are complete. Production templates v26 and scene v4 include the October 5 log, sky and spacing changes ([spacing](evidence/log-spacing.md), [sky](evidence/scene-time.md)). Authorized listing updates and companion polish are deployed from `392829c`, including the landing sample, clearer help and D52 potion-find labels; the actual listing image was regenerated and verified ([release evidence](evidence/listing-polish-deploy.md)). Extended balance reports and offline recovery preparation are complete. Health/cost headroom and isolated engineering rehearsals are now recorded; remaining: ongoing capture/provider/funding decisions, final recording/hosting and submission authorization. See the [current release checklist](evidence/release.md).

## Built and verified

Deployed on 2026-10-05 following Barry’s approval: D46 weekly permanent Desk keepsakes, template v21 device-only code footer and companion shelf; D47 content v4 with eighteen mishaps per biome, a second-cable callback and no third consecutive cable trip. Commit `6391c5d` is live on the existing production Convex and Worker, v4 is active for subsequent scheduled runs, and Baz’s progress is preserved. The signed-in shelf, preview code omission and successful TRMNL server render were verified. Barry waived the remaining physical glance, real claim and post-claim verification on 2026-10-05; those checks were not performed. See [playlist-retention evidence](evidence/playlist-retention.md).

| Package | State | Evidence |
| --- | --- | --- |
| A03 pure simulator + content | Done. One release catalog v1 (D63) with harness tuning, the D45/D47 narrative, D61 bag ladder, luck (D35), D29 Resume destination. Local, pending the reset-first deployment | Current simulator tests and extended [balance](evidence/balance.md) |
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
| D27 incident notices | One incident per stalled run, deduplicated alert + recovery via Resend with idempotency keys and bounded retries; production key configured, staging pair accepted by Resend | convex-test; [recovery](evidence/recovery.md), production Delivered event verified; preview retry exhaustion passed in [engineering checks](evidence/engineering-readiness.md) |
| D23 admin | Server-side allowlist, health view, audited name repair / suspend / restore / release / resume-run, owner name replacement | convex-test |
| Layout matrix | Production v26 includes D54 recap and D55 tighter log rows. 25 states × four sizes × OG/X, 200 settled previews checked; D43 assigns coverage to previews | Deployed [recap](evidence/activity-recap.md) and [log rows](evidence/log-density.md) |
| D54 device recap | Deployed with approval: rolling 12-hour summary, milestones, recent stories, bounded indexed reads, partial labels and additive combat rarity annotation. Server render/delivery and natural tick 202 verified | [Recap evidence](evidence/activity-recap.md) |
| D57 bottom recap and wider rank | Deployed v28: full-width X recap line, 6/4/2 columns, 20% smaller standing bag QR and ordinal/context fitting. 202 tests, lint/build and 256 previews pass; actual X server image, eight live-data previews and natural tick 222 verified with progress preserved | [Recap line](evidence/recap-ribbon.md) |
| D56 adaptive device history | Deployed v27: bag label above QR in the divider, recap below QR and narrower ranking on X full; all layouts fit complete recent entries to available height. 202 tests and 256 OG/X checks pass; production pipeline, actual X server image and natural tick 218 passed with progress preserved | [Adaptive layout](evidence/adaptive-log-layout.md) |
| D55 compact device logs | Deployed v26: closer story/stat rows and three stories on X full/side. 202 tests and 200 layout checks pass; live preview, server image and natural tick 203 verified | [Log density](evidence/log-density.md) |
| D25 return recap | Single server checkpoint, guarded visible acknowledgement | convex-test; live browser check |

## Deliberate differences from the plan

- `trmnl.completeInstall` prepares the pending hero in the same transaction as the grant link (no separate `heroes.create` call), so a half-finished install cannot leave a hero without an attempt.
- The management handoff is a sealed 10-minute HttpOnly cookie instead of a `trmnlManagementHandoffs` table; the TRMNL JWT is still verified on landing, and ownership is checked by Clerk identity.
- Install attempts do not store a browser `flowHash`; the encrypted flow cookie carries the browser binding.
- Payload v1 gains optional `scene_url`, `scene_url_small`, `scene_url_large`, `scene_url_medium` and `qr_url`/`qr_url_large`/`qr_label` (additive). Progress bars use framework 3.4 `content/track/fill` with the documented inline width.
- `DEV_SEED_ENABLED` gates an internal-only dev seeding function used for browser checks. Never set it on production.

## Remaining before submission and public release

The [current release checklist](evidence/release.md) is the gate source. Install/manage/render/uninstall on trmnlgames.com, all four preview layouts under D43, current v26 server rendering, capacity measurements, backups and the delivered test alert are recorded.

Submission work:

- Listing image regenerated from the original installation and verified on the actual install page. The fictional [sample](release/featured-image.png) is deployed on the landing page ([evidence](evidence/listing-polish-deploy.md)).
- Install video: done 2026-10-07. Barry recorded and hosted it; the link is in his email draft.
- [Review package](release/review-package.md): 33-character description and games/entertainment categories saved and verified; accurate bag-sleep/keepsake help is deployed.
- [Review email](review-email.md): owner/sender barry@barrymichaeldoyle.com confirmed; Barry plans to promote TRMNL at launch, with channels/timing unspecified. Author-entitlement check complete ([evidence](evidence/author-entitlement.md)); the final draft with the video link is done (2026-10-07) and Barry will send it himself after Submit for Review.

Engineering launch gates remain: configure ongoing independent protected capture and monitoring; prove the controlled real-provider deletion/expiry/reinstall paths; decide funding/spending thresholds. The balance questions are decided (D71): content v2 raises the potion/rest thresholds to 50%/35% and late upgrade saturation is accepted for v1.0; v2 is local until deployed and switched. Isolated cloud denial reconciliation, interrupted work/receipt replay, preview lifecycle edges and alert failure exhaustion passed. No recovery tool approves reopening. See the [recovery runbook](release/recovery-runbook.md).

D43 does not require Barry to check every physical layout. D46's physical/claim/post-claim verification was waived, not performed; the waiver remains respected. The authorized listing and companion release are complete. Media publication, submission and further external actions require their own authorization.

## Latest preparation completed

- Production app, plugin lifecycle/screen URLs, Clerk environment and Resend key are configured. The production Clerk deletion webhook's trailing comma was corrected; a signed synthetic event delivered successfully.
- Daily production backups at 09:03 UTC, seven-day retention; Oct 4 backup completed. Isolated synthetic import took 27.276 seconds, plus 6.051 seconds for verification/checkpoint replay: [recovery evidence](evidence/recovery.md).
- 100/1,000-hero runs and screen latency met targets. The zero-payout scenario forecast identifies approximately $45/month additional Convex I/O/egress at 1,000 continuously polling instances with otherwise unused allowances: [capacity evidence](evidence/capacity.md).
- Approved simpler logo/favicon implemented; new TRMNL plugin icon saved. Local app/touch/social assets generated and inspected.
- [Review email](review-email.md) and [installation screenshot video](evidence/install-demo/README.md) prepared, not sent or published. Current candidate validation is recorded in [submission preparation](evidence/submission-preparation.md).

D58 [layout polish](evidence/layout-polish.md) is prepared locally as template v29: QR in all four views, better OG history density and space below X full dividers. 205 tests, official markup lint, build and 256 OG/X previews pass. Production remains v28; rollout and actual server-image checks are pending.
