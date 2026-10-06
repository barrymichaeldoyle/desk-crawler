# Implementation evidence checklist

[Engineering checks](engineering-readiness.md) records the October 5 audit, four reproduced/fixed backend defects, 187 passing tests, isolated checkpoint reconciliation and portable worker restore, real preview lifecycle/failure checks, production log health and measured subscription headroom. The fixes and D53 `No effect` polish await deployment; ongoing capture and real-provider verification remain open.

Live implementation evidence is available, with remaining acceptance checks recorded in [release preparation](release.md). The latest pass adds [capacity measurements](capacity.md), [synthetic recovery](recovery.md), [Creator Fund findings](creator-fund.md) and an [installation walkthrough](install-demo/README.md). The TRMNL Games migration [rehearsal](platform-rehearsal.md) records the M1 gate and the dev-instance run. A successful individual check does not close its entire matrix. Do not create invented success reports.

| Artifact | Owner | Required content |
| --- | --- | --- |
| `platform-spikes.md` | A01 | Exact app/runtime versions; SSR/auth; lifecycle shapes/media types/keys; token/UUID reuse and callback loss; index proof; developer access |
| `trmnl-lifecycle.md` | A07 | Install, pending/Save activation, direct API denial, callback/first-screen races, abandonment/expiry, second instance/reinstall, wrong owner, delayed callbacks, targeted repair, manage/uninstall; redacted outcomes |
| `trmnl-layouts.md` + images | A10 | Real merge-variable sample/hash, template version, actual framework/font/runtime, four layouts, model/bit depth/orientation/theme/text scale, case and screenshot result |
| `trmnl-hardware.md` | A10/A12 | Physical model (TRMNL X, D37)/firmware/settings, photo/readability, Save → preview → visible screen, mashup, slow refresh/sleep, outage/revocation observation |
| `balance.md` | A03 | Seed/config/versions, cohorts/ticks, distributions/uncertainty, three-to-seven-day bag pressure, useful upgrades/sleep, both recent windows/groups and tuning outcome |
| `first-path.md` | Lead + A02–A10 | Early real install/Save → activated hero → scheduled encounter → coherent three-view ranks → authorized payload → physical display; minimal onboarding/four layouts; not full launch proof |
| `return-summary.md` | A04/A09 | First visit/seven-day return, bounded checkpoint/inventory, lifetime XP, stale-sequence/tab/retry guards, no hidden/SSR/device acknowledgement or gameplay effects |
| `recovery.md` | A11 | Backup entitlement/cadence/retention/completion, isolated synthetic restore, code/config/jobs, post-snapshot deletion/revocation source, receipts/run/rank reconciliation, observed loss/duration, deduped incident/recovery notices and failed-delivery behavior |
| `capacity.md` | A11 | 100/1,000-hero environment, CPU/bytes/invocations/latency, 32-row bags, <=672 score slots/hero, all three ranking views, cleanup/conflicts/retries/response bytes and measured cost/headroom |
| `deletion.md` | A07/A11 | V09 replay attempts after completed purge, dedicated-Clerk purge/checkpoint recovery, replay-safe returning-player proof, minimal revocation and disclosed lifetime |
| `creator-fund.md` | A01/A12 | Dated V10 type/category eligibility, owner requirements, current payout qualification, evidence source and zero-payout cost assessment; no invented revenue |
| `release.md` | A12 | Commit/schema/content/template versions, gate checklist, supported matrix, reviewer access/video, limitations, approval and authorization |

Artifacts identify date, environment, command/action and observed result. Scrub secrets and identities before storing them in this public repository; never commit imported profile data from raw callbacks.

[Playlist retention and narrative callbacks](playlist-retention.md) records D46/D47 additions, automated checks, production deployment and preview/live-render evidence. Barry explicitly waived the remaining D46 physical glance, claim and post-claim checks on 2026-10-05; those checks are waived, not passed.

[Separate story and stat changes](log-presentation.md) records D48's shared companion/device presentation, command deltas, compatibility checks, local layout verification and production release. The signed-in companion and live TRMNL preview are verified; physical-display acceptance remains unverified.

[Log layout and name wrapping](log-layout.md) records D49's grouped names, time/change row, separators, centered device gear labels and production release. Signed-in companion, live TRMNL preview and post-deployment installation rendering are verified; physical-display acceptance remains unverified.

[Local day/night window](scene-time.md) records D50's daytime artwork, timezone selection, immutable image compatibility and production release. The live companion's daytime scene and post-deployment installation rendering are verified; physical-display acceptance remains unverified.

[Compact log spacing](log-spacing.md) records D51's narrower story gutters, independent time/stat widths and production release alongside D50. Signed-in companion, live TRMNL preview and post-deployment installation rendering are verified; physical-display acceptance remains unverified.

[Submission preparation](submission-preparation.md) records current companion phone/desktop inspections, local help/sample improvements, review artifacts, 176 passing tests and successful builds. [Balance](balance.md) now includes current six-policy 30/90-day reports and corrected death-day units. [Protected checkpoint results](recovery-checkpoint-results.json) and [recovery](recovery.md) prove source-independent offline planning while keeping live recovery gates open.

[Listing and companion deployment](listing-polish-deploy.md) records the subsequently authorized production release, saved listing fields and regenerated image verified on the install page. [Potion-find labels](potion-find.md) records D52, 181 passing tests, 24 device previews and the live existing-history verification.

[Author entitlement](author-entitlement.md) records the read-only TRMNL X/Developer Perks account verification and Barry's revised launch-promotion answer. No purchase or review submission was performed.

An editor preview does not replace the Third Party envelope test or physical display evidence. Apply the explicit D43 preview coverage decision and D46 waiver in [decisions](../decisions.md); do not describe waived evidence as passed or reopen it as a prerequisite.

Review submission is prepared first. Account changes, reviewer contact, sending credentials, deployment and publication follow the user's authorization.
