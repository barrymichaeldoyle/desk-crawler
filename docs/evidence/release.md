# Release preparation — 2026-10-05

**Submission preparation is substantially complete, but the application is not ready to send.** Listing updates, companion deployment and author-entitlement verification are complete; the recording/hosted video remains open. Owner/sender is confirmed, and Barry plans to promote TRMNL at launch. [Engineering checks](engineering-readiness.md) now prove synthetic cloud recovery, interrupted work, failed-notice exhaustion and lifecycle edges; four fixes and `No effect` were [deployed on October 6](engineering-deploy.md). Ongoing production capture, real-provider verification and funding decisions remain launch gates. No review submission, media publication or reviewer contact was performed.

## Release identity

| Artifact | Current deployed state | Local submission candidate |
| --- | --- | --- |
| Source | `c8daeaa86e63264a812e563e7a7f948c9d6143b1` | Deployed October 6 at 07:37:53 UTC; [release evidence](engineering-deploy.md) |
| Hero schema / simulator / gameplay numbers | 1 / 1 / v2 tuning | Unchanged |
| Active narrative/catalog | v4 | Unchanged |
| TRMNL template / art | v24 / scene v4 | Unchanged; fictional marketing sample generated from these sources |
| Plugin | 564, `desk_crawler`, Third Party, development | Review package prepared |
| Companion | https://trmnlgames.com, `/app/desk-crawler` | Updated landing sample, help and potion-find labels live |
| Backend | `exciting-cormorant-948` | Deployed candidate adds optional pagination versions, portable cursors, deletion/notice guards and ranking cost fix; D53 shared log polish |

The current deployed version is recorded in [log-spacing](log-spacing.md) and [scene-time](scene-time.md). Older v11/v12 checks are historical, not outstanding candidate work.

## Verified evidence

- New-domain install → Save → Configure → render → uninstall passed on 2026-10-04, preserving the original hero and installation (decisions revision 21).
- Templates v24: all 120 local pages (15 states × four layouts × OG/X) were checked for text crossing the footer; all eight ordinary layouts and selected long-story captures were inspected ([spacing evidence](log-spacing.md)). D43 assigns layout/mashup coverage to previews.
- The v24 installation server render succeeded at 14:18:36 UTC on 2026-10-05 (1,109 ms, 24.6 KB). Signed-in production companion and live X preview were inspected. This is not a new physical-display acceptance claim.
- Daily production backups are configured with seven-day retention. A production test notice has a Resend Delivered event. The October 5 [engineering pass](engineering-readiness.md) adds an independent-checkpoint synthetic restore, interrupted deletion/simulation/ranking recovery, potion receipt replay and actual preview retry exhaustion.
- [100/1,000-hero capacity](capacity.md) remains the historical baseline. Current worker measurements and actual Convex/Cloudflare/Clerk/Resend plan headroom are recorded in [engineering checks](engineering-readiness.md); funding decisions remain open.
- [Current balance reporting](balance.md), checkpoint export/capture tooling, an inactive hourly workflow template and the updated [reconciliation runbook](../release/recovery-runbook.md) are ready for review. No ongoing production capture is configured.
- The [submission preparation evidence](submission-preparation.md) records current tests/build, browser checks and their limits.

## Submission checklist

| Item | State |
| --- | --- |
| Listing name, categories, lifecycle URLs and knowledge-base URL | Saved fields verified; categories updated, existing lifecycle/help URLs remain correct ([evidence](listing-polish-deploy.md)) |
| Description | 33-character description saved and verified on 2026-10-05: `A quiet office RPG for your TRMNL`; games + entertainment categories saved. Live editor currently allows 50 characters; published docs say 35 |
| Featured image | Regenerated from the existing live installation; new 800×480 image verified on the actual install page ([evidence](listing-polish-deploy.md)). Fictional candidate remains the landing sample |
| Install video | [Recording checklist](../release/recording-checklist.md) ready; first-signup recording and reviewer-accessible hosting still needed |
| Reviewer testing | Supported reviewer-owned email/Google/GitHub signup documented; no owner credentials or auth bypass |
| Review email | Draft updated for keepsakes and bag sleep; owner/sender barry@barrymichaeldoyle.com confirmed. Barry plans to promote TRMNL at launch; channels/timing unspecified. Video URL remains open |
| Author entitlement | Complete: registered TRMNL X, Developer Perks available and lifetime TRMNL+ observed in the signed-in account ([evidence](author-entitlement.md)) |
| Submit for Review and email | Not performed; explicit authorization required |
| Creator Fund | Current public rules and zero-payout assessment recorded; ask TRMNL to confirm this Third Party game's eligibility/onboarding in the submission email |

TRMNL's [current Going Live instructions](https://docs.trmnl.com/go/plugin-marketplace/going-live) require Submit for Review followed by an email with plugin ID, matching owner/sender, public benefit, installation video, testing access and promotion answer. [Plugin Creation](https://docs.trmnl.com/go/plugin-marketplace/plugin-creation) specifies a 35-character description.

## Launch gates still open

| Gate | Remaining work |
| --- | --- |
| Production rollout | Complete: four backend fixes and D53 deployed with Barry’s approval on October 6 ([evidence](engineering-deploy.md)) |
| Independent post-snapshot deletion/revocation evidence | Isolated synthetic restore with independent encrypted evidence passed without source queries during planning/restore. Approve/configure ongoing protected production capture and monitoring; reconcile the uncovered interval before reopening |
| Interrupted work and delivery failure | Synthetic cloud simulation/ranking/deletion continuation, potion receipt replay and live alert/recovery exhaustion passed. Actual Clerk provider failure/deletion is not certified; legacy in-flight native cursors remain a recovery limitation |
| Lifecycle/deletion edge cases | Actual preview routes passed expired attempts, delayed callback, wrong owner, lost callback, tombstone and fresh-UUID reinstall checks. Signed real-provider OAuth/JWT/deletion delivery remains open |
| Operational costs/health | Actual headroom and post-deploy logs inspected. Choose launch scale/Worker plan and Convex spending threshold with zero assumed payouts; current $5 disable threshold is below the 1,000-installation scenario |
| Balance interpretation | Extended v4 reports are complete; early Cafeteria deaths and late upgrade saturation need an explicit tuning decision, not a silent numeric patch |
| Marketplace approval | External review; submission does not establish approval or Creator Fund qualification |

Keep these gates visible even though the submission form does not request them. Approval can lead to soft launch.

## Waivers and display limits

D43 makes rendered previews the all-layout/mashup gate; Barry does not need to repeat each physical view. The D46 physical glance, real claim and post-claim checks were explicitly waived on 2026-10-05, not passed ([evidence](playlist-retention.md)); do not reopen them as submission prerequisites. Later v24 physical-screen readability remains unobserved. Theme/text-scale/outage behavior is not certified merely by an ordinary full-layout render.

Barry authorized the listing update and companion deployment. The existing production pipeline deployed the polish and D52 read-only query changes; the original installation rendered successfully afterward ([evidence](listing-polish-deploy.md)). Device templates remain v24. Further submission, media publication and reviewer contact require their own authorization.
