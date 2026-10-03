# Final planning review — questions and remaining specification work

> **Historical record.** Superseded by the current specifications and [decisions](../decisions.md). Kept for context; do not implement from this file.

Reviewed 2026-10-03, after planning revision 3. This supplements the [earlier review](review-2026-10-03.md). Findings below are open questions or proposed refinements unless explicitly confirmed in [decisions](../decisions.md). Documentation work only; no application code, provisioning, live installation or publication.

The review findings and original validation below are historical. The [revision 4 disposition](#approval-disposition--revision-4) records Barry's subsequent approval and the current validation.

The core engineering approach is coherent: server-authoritative intents, a pure versioned simulator, guarded logical runs, immutable rank generations and bounded display queries. The remaining work is mainly product policy, concrete operational contracts and unresolved platform evidence. The plan is ready for further decisions, but not yet a frozen implementation brief.

## Product choices reviewed with Barry

| ID | Gap / implication | Specific decision | Affected work |
| --- | --- | --- | --- |
| F01 | Lifetime level/XP rewards accumulated time; newcomers may have little prospect of reaching the visible leaders | **Barry confirmed XP earned among similar-level heroes, with both rolling 24-hour and seven-day views.** Define groups, ties, new-player eligibility and which view supplies device Top 5/own rank; decide whether lifetime remains a companion alternative; [ranking proposal](../ranking.md) | A00/A03/A05/A06/A08/A09/A10/A11; O09 |
| F02 | Passive survival works, but equipment and biome progression need companion visits. The old full-bag rule auto-sells every find, including rare upgrades | **Barry confirmed occasional manual management and preserving new finds.** Set management cadence, bounded storage and sleep/XP behavior. Suggested 24-hour inactivity sleep is still a discussion option; [inventory proposal](../inventory.md) | A03/A04/A09; O10 |
| F03 | Gold has no purchase/use in Month 1; sale rewards and death penalties affect an otherwise accumulating counter | Accept gold as a reserve for the Month 2 merchant, or move one small spending mechanic into MVP? Recommendation: retain the reserve and explain it, rather than add an unplanned economy | A00/A03/A09; Month 2 scope |
| F04 | Three biomes can be exhausted well before later monthly content. A few narrative variants may repeat many times daily | What should still feel interesting after 30 days: accumulating progress, gear optimization, recent competition, or more authored variety? Which first-level/unlock pacing targets take priority if tuning conflicts? | A03/A10; balance/content acceptance |
| F05 | Fund eligibility is still unproven, and disconnected heroes keep costing money. An eligible plugin can also earn zero | **Barry chose to decide after measured costs.** What spend increase should trigger a discussion, and who owns the monthly review? Existing no-fixed-cap decisions remain in force; any inventory sleep/progression amendment must be explicit | O04/O05/O11/V10; A01/A11/A12 |
| F06 | Deletion scope and returning-player rights remain undecided; deleting local credentials cannot establish external revocation | Delete game data only or Clerk identity too? May a returning player start fresh using the same TRMNL account? What minimal revoked-token hash retention is acceptable? Technical feasibility must be demonstrated before promising a policy | O07/V09; A07/A11/A09 |
| F07 | Names are technically validated, but the content policy, support owner and recovery path are unspecified; normal rename is absent | Choose basic banned content/impersonation rules, report/support channel, admin owner and expected response window. Should admins force a replacement pseudonym while preserving progress? How should accidental duplicate Clerk accounts be handled? | O08; A02/A07/A09/A11/A12 |
| F08 | Infrastructure choices and supported physical-display proof are still placeholders | Domain, GitHub owner/name/license, dedicated service applications, actual subscription tiers/headroom, launch-size expectation, available TRMNL models and Developer Edition/license entitlement | O01/O02/O04/O05/O06/V07/V08; A01/A02/A10/A11/A12 |

F02 calculation: starting gear leaves 18 bag slots. If every tick explores Office and every combat wins, expected gear arrivals are `0.30 × 0.80 + 0.30 × 0.15 = 0.285/tick`, or about 27/day. Expected capacity is reached in about 16 hours without selling. Rest, losses and other behavior change this; this is arithmetic from proposals, not a simulation result. Bag saturation belongs in the measured balance acceptance, not only an overflow unit test.

F04 refinement: define harness policies explicitly. A completely unattended starter, a player who equips upgrades occasionally, and a player who immediately chooses an unlocked biome are different cohorts. Avoid reporting their average as one passive-play experience. The content floor also needs a precise interpretation of “four variants”: four per encounter per biome or four shared variants.

## Engineering refinements that do not need product-level field choices

| ID | Hole / concrete failure case | Required specification and evidence |
| --- | --- | --- |
| E01 | Recent ranking cannot be reconstructed from 72-hour logs if its period is seven days, and current/previous board snapshots are also insufficient | Once O09 is settled, define bounded score storage/expiry, boundary semantics, outages, pause/quarantine, tie-breaks and atomic publication for every board. Specify public board identity/period/score and qualify `rank_delta`. Update cost estimates and fixtures; never scan a player's entire history per poll |
| E02 | Account purge is called resumable, but its durable phase/cursor, scheduled-job reference and recovery ownership are absent from the model | Specify a bounded deletion workflow checkpoint and idempotent phases; resume after programmer failure/deploy/provider failure. Define completion when a blocked rank build references the user, and how privacy masking survives missing/deleted users |
| E03 | Public-name repair/suspension and release activation require audit, but no complete administrative API/audit-storage contract exists | Define guarded mask/suspend/restore/name-repair operations and audit actor/reason/action/time/result/retention. Separate suspension from voluntary pause and hero quarantine; prevent an accidental admin edit from resetting progress |
| E04 | “Alert after five minutes” has no channel/recipient, while email alerts are explicitly unconfigured | Choose recipient/channel, deduplication/cooldown, recovery notification and ownership. Test a stalled run reaches the owner; an admin dashboard alone requires someone to inspect it. Set cost/cleanup warning thresholds without implying a new spending cap |
| E05 | Backup/restore is mentioned, but whole-database rollback can revive deleted accounts, reuse operation IDs or replay already rewarded ticks | Define backup cadence/retention, acceptable data loss and recovery time, safe restore into isolation, reconciliation of revocation/deletion, receipts and world/run state before resuming. Test synthetic restore; record a deliberate recovery decision |
| E06 | Install attempts expire after 20 minutes; one-shot callbacks may be lost or delayed, and the documented callback has no app-generated attempt nonce | Under V06, test an old unknown-UUID success event arriving during a newer attempt on the same reused grant, competing tabs and Save after expiry. Document what authenticates the particular saved instance and the safe explicit recovery path when correlation cannot be proven; pending intent alone does not prove callback freshness |
| E07 | The 40 KiB envelope is transmitted on every screen request, but the cost table does not explicitly quantify those response bytes; average load also misses clustered refresh traffic | At 1,000 continuously polling instances, 2.88 million × 40 KiB is about 110 GiB/month before sprites/retries. Measure actual envelope bytes, response-volume billing where applicable, index/storage costs and burst concurrency. This is a budget ceiling scenario, not observed traffic or a price quote |
| E08 | Three sign-in methods are specified, but provider switching, different emails and loss/deletion of an auth identity are not covered by journeys/tests | Add same-Clerk-subject provider-switch tests and different-email/account-mismatch guidance. Choose recovery/support behavior without merging by imported TRMNL email; cover Clerk-side identity changes/deletion according to O07 |
| E09 | Work packages assign timezone to A04 while A02 owns `users.ts`; A11 owns admin modules while A09's route list includes `/admin` | Give explicit file/function ownership for settings, admin UI, deletion checkpoints and the new board contracts before delegation. Update the dependency graph and traceability after O09; do not silently treat new scoring work as covered by the old overall-board package |
| E10 | Month 1 includes four layouts, several environments, runtime/protocol spikes, auth/lifecycle, balance/load reports and external approval, with no delivery-owner/availability assumption | Estimate work after A01 and O09, identify the critical path and set a scope-priority order. Keep marketplace approval separate from a coding estimate. No extra feature should be added solely to resolve a cosmetic gap |

## Current official-source checks

TRMNL's [August fund report](https://trmnl.com/blog/creator-fund-08-2026) still describes relative playlist/display-based rewards and a 50-connection threshold; the [fund announcement](https://trmnl.com/blog/creator-fund) excludes comics. Neither establishes this Third Party game's eligibility. V10 remains open.

The [installation protocol](https://docs.trmnl.com/go/plugin-marketplace/plugin-installation-flow) documents repeated code/token reuse, a non-expiring token, Save completion and a one-shot success webhook. Its sample identifies the saved UUID but has no Desk Crawler attempt identifier. E06 is an inference about correlation, to be resolved by evidence rather than a claimed exploit in an implementation.

The [screen protocol](https://docs.trmnl.com/go/plugin-marketplace/plugin-screen-generation-flow) confirms the four-layout envelope and Liquid merge variables. [Convex limits](https://docs.convex.dev/production/state/limits) distinguish per-transaction and deployment-concurrency limits and account for database indexes; measured capacity/cost remains necessary. Neither the 25-hero page nor the 1,000-hero scenario is a demonstrated capacity claim.

[Clerk account linking](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/account-linking) can connect OAuth methods through verified email and supports adding a different email to an existing account. This makes provider-switch testing relevant; it does not authorize Desk Crawler to merge distinct game owners.

## Local validation

- Read all project planning documents and the vendored skill/relevant workflow reference.
- Checked 183 relative Markdown file links across 27 project documents before additions, then 200 file links and one fragment link across 30 documents after the new review/proposals: no missing paths/fragment targets. A subsequent 228-file-link check passed after adding affected-document amendment notices.
- Parsed all nine JSON fixtures; checked bounded arrays/text, unlinked privacy/null fields, stat/percentage proposals, ordinal Top 5/rank bounds, log ordering and tick relationships: passed. Sizes 1,024–3,287 bytes, below 8 KiB.
- Recomputed Git blob hashes for the skill and its three references: all match the provenance records. This verifies local integrity against recorded hashes, not a fresh upstream download.
- No runtime, live protocol, rendering, hardware, load, balance or revenue gate is closed by these checks. Existing lifetime-board fixtures will need revision once the recent board is specified.

Next planning step: settle the owner questions, then amend decisions and affected contracts/work packages together. Technical spikes remain work for the implementation phase after Barry authorizes it.

## Approval disposition — revision 4

Barry approved all six recommended defaults. F01/F02/F03/F06/F07 product choices are now D18–D23; O07–O10 resolved. Seven-day grouped device ranks, both recent views plus lifetime companion, retained first-overflow sleep/manual wake, gold reserve, game + dedicated Clerk deletion and owner-run audited moderation are current policy. Earlier unresolved text above records findings at review time, not current decision status.

E01–E03 now have documented bounded score/publication, deletion checkpoint and name-version/audit contracts; their implementation evidence remains required. E07 response-volume/cost factors and E09 file ownership are specified. Alert recipient/channel, restore evidence, live callback/token-reuse proof, measured balance/capacity, launch resources and measured-cost funding remain open. This approval is planning only.

Revision 4 local validation passed across 32 project Markdown files, including AGENTS.md: 233 relative file links and three fragment links, all 13 canonical TRMNL JSON fixtures (largest 3,754 bytes), and the separate exact-cutoff XP-window example. Fixture checks cover text/array bounds, privacy/null fields, stat arithmetic, captured groups/scores, sleep/held-find/wake state and tick relationships. All four vendored skill/reference hashes still match recorded provenance. These checks establish documentation consistency, not live runtime, render or balance evidence.

## Approval disposition — revision 5

Barry endorsed all five final [build refinements](../build-readiness.md), D24–D28. F04 has pacing cohorts/content floor/ongoing goals; E04 has owner email, incident deduplication and recovery-notice policy; E05 has daily/pre-migration backups, loss/duration targets and an isolated reconciliation drill; E10 has an early real installation-to-display milestone. The bounded recap covers seven-day returns without extending detailed logs. Addresses, subscription entitlement and the independent post-backup deletion/revocation recovery source still need configuration/implementation evidence. Funding remains a measured-cost decision. No application coding or external action was initiated.

Revision 5 local validation: 33 project Markdown files, 261 relative file links and nine fragment links passed; all 14 existing JSON fixtures parse and the 13 canonical TRMNL fixtures remain below 8 KiB. Four vendored skill/reference hashes match recorded provenance. D24–D28 and the new recap error/API/schema ownership were checked for consistency. No simulator, delivery, backup/restore, platform or hardware evidence is claimed.
