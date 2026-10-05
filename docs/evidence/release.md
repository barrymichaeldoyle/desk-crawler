# Release preparation — 2026-10-05

**Submission preparation is substantially complete, but the application is not ready to send.** The recording/hosted video and listing updates remain open. Owner/sender and promotion answer are confirmed. Recovery and remaining live edge cases remain launch gates. This pass prepared local code, assets, tools and docs; it did not deploy, alter a listing, publish media or contact reviewers.

## Release identity

| Artifact | Current deployed state | Local submission candidate |
| --- | --- | --- |
| Base source | `df3f8f6b9ee7e6dacd3c507ca51b4eeaec22a8ec` | Local changes on top, not deployed |
| Hero schema / simulator / gameplay numbers | 1 / 1 / v2 tuning | Unchanged |
| Active narrative/catalog | v4 | Unchanged |
| TRMNL template / art | v24 / scene v4 | Unchanged; fictional marketing sample generated from these sources |
| Plugin | 564, `desk_crawler`, Third Party, development | Review package prepared |
| Companion | https://trmnlgames.com, `/app/desk-crawler` | Updated landing sample and help |
| Backend | `exciting-cormorant-948` | No backend/schema changes in this preparation pass |

The current deployed version is recorded in [log-spacing](log-spacing.md) and [scene-time](scene-time.md). Older v11/v12 checks are historical, not outstanding candidate work.

## Verified evidence

- New-domain install → Save → Configure → render → uninstall passed on 2026-10-04, preserving the original hero and installation (decisions revision 21).
- Templates v24: all 120 local pages (15 states × four layouts × OG/X) were checked for text crossing the footer; all eight ordinary layouts and selected long-story captures were inspected ([spacing evidence](log-spacing.md)). D43 assigns layout/mashup coverage to previews.
- The v24 installation server render succeeded at 14:18:36 UTC on 2026-10-05 (1,109 ms, 24.6 KB). Signed-in production companion and live X preview were inspected. This is not a new physical-display acceptance claim.
- Daily production backups are configured with seven-day retention. The earlier isolated synthetic restore and replay checks are recorded in [recovery](recovery.md). A production test notice from alerts@trmnlgames.com has a Resend Delivered event; live retry exhaustion is still open.
- Existing [100/1,000-hero capacity](capacity.md) and zero-payout forecasts remain the measured baseline; actual shared subscription headroom is unmeasured.
- This preparation pass adds [current balance reporting](balance.md), protected offline recovery checkpoint tools and a [reconciliation runbook](../release/recovery-runbook.md). These do not claim a new cloud restore.
- The [submission preparation evidence](submission-preparation.md) records current tests/build, browser checks and their limits.

## Submission checklist

| Item | State |
| --- | --- |
| Listing name, categories, lifecycle URLs and knowledge-base URL | Prepared in [review package](../release/review-package.md); verify saved listing before submission |
| Description | 33-character description saved and verified on 2026-10-05: `A quiet office RPG for your TRMNL`; games + entertainment categories saved. Live editor currently allows 50 characters; published docs say 35 |
| Featured image | [v24 candidate](../release/featured-image.png) prepared and visually inspected; upload/regenerate and verify actual install page still needed |
| Install video | [Recording checklist](../release/recording-checklist.md) ready; first-signup recording and reviewer-accessible hosting still needed |
| Reviewer testing | Supported reviewer-owned email/Google/GitHub signup documented; no owner credentials or auth bypass |
| Review email | Draft updated for keepsakes and bag sleep; Barry confirmed owner/sender barry@barrymichaeldoyle.com and no promotion commitment. Video URL remains open |
| Author entitlement | Developer Edition recorded under D37; confirm the account is licensed and not in a BYOD free trial |
| Submit for Review and email | Not performed; explicit authorization required |
| Creator Fund | Current public rules and zero-payout assessment recorded; ask TRMNL to confirm this Third Party game's eligibility/onboarding in the submission email |

TRMNL's [current Going Live instructions](https://docs.trmnl.com/go/plugin-marketplace/going-live) require Submit for Review followed by an email with plugin ID, matching owner/sender, public benefit, installation video, testing access and promotion answer. [Plugin Creation](https://docs.trmnl.com/go/plugin-marketplace/plugin-creation) specifies a 35-character description.

## Launch gates still open

| Gate | Remaining work |
| --- | --- |
| Independent post-snapshot deletion/revocation evidence | Approve and configure ongoing protected capture, reconcile its uncovered interval, apply denial evidence and prove an isolated live restore without source access. Offline capture/planning tests pass; live gate remains open |
| Interrupted work and delivery failure | Restore in-flight scheduler/deletion/ranking work, replay command receipts, and exercise live alert failure/retry exhaustion safely |
| Lifecycle/deletion edge cases | Expired/abandoned attempts, wrong owner, delayed callbacks, reinstall/returning-player credentials and provider-initiated deletion through real flows; automated coverage is supporting evidence |
| Operational costs/health | Inspect actual subscription headroom and post-migration health; decide funding with zero assumed payouts |
| Balance interpretation | Extended v4 reports are complete; early Cafeteria deaths and late upgrade saturation need an explicit tuning decision, not a silent numeric patch |
| Marketplace approval | External review; submission does not establish approval or Creator Fund qualification |

Keep these gates visible even though the submission form does not request them. Approval can lead to soft launch.

## Waivers and display limits

D43 makes rendered previews the all-layout/mashup gate; Barry does not need to repeat each physical view. The D46 physical glance, real claim and post-claim checks were explicitly waived on 2026-10-05, not passed ([evidence](playlist-retention.md)); do not reopen them as submission prerequisites. Later v24 physical-screen readability remains unobserved. Theme/text-scale/outage behavior is not certified merely by an ordinary full-layout render.

No additional production deployment is necessary for the unchanged device templates in this pass. Publishing the new companion help/sample requires a separately approved push/deployment: `main` triggers the production Convex and Worker pipeline.
