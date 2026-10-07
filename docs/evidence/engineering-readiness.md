# Engineering checks — 2026-10-05

Barry requested the separate engineering checks and the `No effect` log polish. Four backend defects were reproduced and fixed locally; the candidate passed 187 tests, workspace typechecks, the production web build and Wrangler dry run. Recovery, lifecycle and failed-delivery checks ran on the two existing disposable previews. **October 6 follow-up:** Barry authorized production rollout. Commit `c8daeaa86e63264a812e563e7a7f948c9d6143b1` deployed successfully to the existing backend and companion; [deployment evidence](engineering-deploy.md) records live verification. The following October 5 measurements retain their original scope.

Sanitized measurements: [engineering-results.json](engineering-results.json). Production was read-only. Preview source: `precious-pheasant-866`; restore target: `usable-snail-909`. Both have synthetic players, empty crons and closed/paused worlds after the checks. No real player was deleted, reviewer contacted, marketplace entry submitted or email delivered during this pass.

## Audit coverage and findings

Applied the Convex authz, reviewer, advisor and insights procedures, followed by fixes and affected checks. Official Convex MCP tools were unavailable; official CLI insights, function metadata and completion logs supplied the live evidence. The code scan covered 59 registered functions, including 35 public functions. All had argument/return validators; public queries had no wall-clock reads or unbounded `collect`. Manual review checked identity derivation, admin authorization, ownership of item/connection IDs, bulk-sale arrays, bounded parent access and private/public projections. The two apparent database-filter findings were array filters after bounded reads. No confirmed authorization leak was found; this is not a penetration-test guarantee.

| Severity / normalized identity | Confirmed defect | Fix and evidence | Capability |
| --- | --- | --- | --- |
| High / `simulationRuns:pagination` | An exported in-flight native cursor failed on another deployment with `Failed to parse cursor`; the restored worker could not advance | Portable index-key pagination, pinned by an additive version field on new runs/publications. Existing rows retain native pagination. The repeated cloud restore passed | convex-expert / convex-verify |
| High / `deletion:deleteProviderUser` | A thrown fetch escaped before recording retry state, leaving the durable purge at provider phase | Catch network failures and record backoff; terminal provider results are ignored. Reproduce-then-pass test covers throw → retry → success and late result | convex-expert / convex-verify |
| Medium / `incidents:sendNotice` | Late actions/results could retry or overwrite an exhausted notice | Require pending state and attempts below three in sender and recorder. Live alert and recovery each exhausted exactly three failed attempts; late sender/result calls preserved the terminal records | convex-expert / convex-verify |
| Medium / `leaderboard:buildBatch` | Generation Top 100 documents were reread/patched for each hero's rank increment | Accumulate counters/entries and flush once per page/cohort. A 205-hero, multiple-cohort test checks exact ranks, Top 100 and totals; live ranking bytes are below | convex-expert / convex-advisor |
| Low / seven public query identities below | `v.any()` return validators provide weak runtime contract enforcement | Existing auth/projection checks remain; exact return validators are a nonblocking follow-up | convex-reviewer |

The seven low findings are `admin:health`, `admin:findUser`, `heroes:mine`, `heroes:recentLog`, `heroes:returnSummary`, `inventory:mine`, `leaderboard:view`. They are type-contract weaknesses, not evidence of unauthorized disclosure. No other candidates were counted as defects.

Backend defect score, with one portable-pagination root cause counted once: before **53 = 100 − (2×15) − (2×5) − (7×1)**; tested candidate **93 = 100 − (7×1)**. This is a code/preview defect score. It does not certify production rollout, provider delivery, funding or the operational gates below. The October 6 release ships those four fixes; the seven low contract findings remain.

## Isolated recovery and failure checks

An older 2,622,012-byte synthetic snapshot was restored in **28.461 seconds**. A newer AES-256-GCM checkpoint was derived from a consistent source export at **20:53:14.598 UTC**, sealed with a separate key, and the newer raw export was removed. Planning and restore used only the older snapshot plus protected checkpoint; no source query occurred during those steps. Network access to the source was not physically disabled.

Denial evidence covered two account identities, one game-deletion cutoff, three grants and four installations. Actual restored HTTP routes returned 404 for account-deleted, game-deleted and disconnected credentials, while an unaffected second installation and owner returned 200. Owner queries denied deleted progress. Replaying a successful potion receipt returned the original result without changing hero state. Account/game purges were interrupted by another export/import and resumed through the real bounded purge workers. Three old heroes were purged; unaffected progress survived. Synthetic identities had no Clerk accounts, so a guarded fixture acknowledged that fact after reaching provider phase. **This does not prove real Clerk provider deletion.**

The initial in-flight simulation restore exposed the native-cursor defect. After the fix, a fresh run with `paginationVersion: 1` was exported at **25 processed heroes** and imported into the other preview in **31.913 seconds**. The actual watchdog and simulation workers finished **1,000 processed / 997 eligible / zero quarantined**. Ranking was then interrupted after its first page, exported/imported again, and resumed by the watchdog/workers. Overall and seven-day populations were 997; the 24-hour population was 591. All boards were ready, the old publication stayed visible until promotion, and completed simulation/ranking replay was a no-op. Validation took **129.452 seconds**, including two imports and operator orchestration; this is not a production RTO guarantee.

An invalid preview-only Resend key exercised actual HTTP failures and scheduled backoff. Both alert and recovery records ended failed at attempt 3. Late sender and successful-result replays did not change attempts, timestamps or terminal state. The invalid key and temporary recipient were removed. Network-failure/provider-retry behavior also passed locally with controlled fetch failures; no real Clerk deletion request was made by the drill.

## Lifecycle and health

Actual preview callback/screen routes proved expired attempts acknowledge a delayed callback without activating the pending hero and continue returning 404 for its screen. A fresh attempt recovered a lost callback through its first screen request, returning all four layout keys and merge variables. Reinstall with a fresh UUID preserved hero and inventory; the tombstoned old UUID stayed 404. A foreign owner's token was refused by both callback and screen. The extra synthetic lifecycle account was purged afterward.

CLI-injected synthetic identities verify backend scoping; they do not verify a signed Clerk JWT, real TRMNL OAuth exchange or provider-originated event delivery. The earlier real ordinary install → Save → Configure → render → uninstall remains valid historical evidence. A controlled real-provider expiry/reinstall/deletion check still needs its own fixture authorization.

Production's 72-hour insights returned no reported issues. A fresh, deduplicated sample of **101 completion records from 21:00:06 to 21:36:12 UTC**, after the 20:18 deployment, had **zero errors and zero conflict retries**. The earlier one-point invariant check showed completed tick 152, no active run or blocked deletion jobs, and three ready boards. Low real traffic means these observations cannot establish large-scale health.

The production backup dashboard was rechecked: October 5's daily tables-only backup completed at **09:03 UTC in one second**. The next backup is October 6 at 09:03 UTC; the existing seven-day retention remains configured. No backup setting, production export or restore was changed.

## Capacity and subscription headroom

On the 1,000-row synthetic source, the candidate's complete tick used 41 simulation calls, **27,672,195 read / 7,356,217 write bytes** and 2,968 ms total user execution. Ranking used 26 calls, **3,858,311 read / 2,002,266 write bytes** and 985 ms user execution. No selected worker errors or conflict retries were recorded. This run was deliberately parked, so elapsed wall time is not a throughput benchmark. Compared with October 4's 60,992,486 ranking read bytes, the observed reduction is large; cohort eligibility, recent-board population and content differ, so it is not a controlled percentage speedup.

The signed-in dashboards were inspected on October 5 without changing plans:

| Service | Observed plan and usage | Implication |
| --- | --- | --- |
| Convex team | Professional, $25/member/month, one member; Sep 8–Oct 8 cycle. 2.6M/25M calls, 14.21/50 GB database I/O, 4.3/250 GB-hour action compute, 163.75 MB/50 GB database storage, 17/300 deployments | Approximately 22.4M calls and 35.79 GB I/O remain in this cycle across all projects. Warning at $2 additional usage; disable threshold at $5 |
| Cloudflare | Workers Free; 426 invocations, zero errors and 1.25k asset requests in the preceding 24 hours. CPU chart p50 43.07 ms / p99 66.39 ms; current version had four requests, median 44.07 ms | The [free CPU allowance is 10 ms](https://developers.cloudflare.com/workers/platform/limits/). Occasional overrun flexibility explains why this is not observed failure; sustained enforcement is a launch risk. Workers Paid starts at $5/month |
| Clerk | Pro annual, $240/year; 1/50,000 retained users for TRMNL Games, 1/3 workspace seats. Sep 27–Oct 27 usage period | Roughly 49,999 included users remain for this app. The user allowance is per application, not one shared workspace pool ([pricing](https://clerk.com/pricing)) |
| Resend | Transactional Pro, $20/month; 92/50,000 emails, 3/10 domains, 10 requests/second, pay-as-you-go disabled | Approximately 49,908 emails remain; incident retries alone are not near the allowance |

Using the same 30-day 1,000-hero/1,000-installation scenario as [capacity](capacity.md), candidate worker measurements plus the previous measured screen cost imply **218.21 GB database I/O and 64.27 GB envelope egress**. At [current Convex rates](https://www.convex.dev/pricing), this is about **$35.35/month additional** with otherwise unused allowances, or **$38.20** if only today's 35.79 GB I/O headroom is available and egress allowance is otherwise unused. These combine different measurements, omit several services/operations and are scenario estimates. They exceed the current $5 disable threshold. Independent checkpoint capture is additional. Zero Creator Fund payout is assumed; launch population and spending limits still need a funding decision.

## Log polish and validation

D53: when recorded HP/XP/gold/potion changes are all zero, the shared stats row says **No effect**. The narrative remains “Took a coffee break anyway.” Nonzero changes and `+1 healing potion` retain their labels; legacy entries without deltas remain unknown. Companion and device use the same presenter. Gameplay, rewards and retained log documents are unchanged.

`pnpm check` passed **187 tests in 29 files** and all workspace typechecks at 23:39 SAST. `pnpm build` and the web package's `wrangler deploy --dry-run` passed; the existing TanStack `.inputValidator()` deprecation warnings remain. Eight OG/X coffee-break previews were generated with `--no-effect`; DOM/bounds checks found the line visible above the footer in all four layouts on both models. The OG full preview was visually inspected. This is local render evidence, not a new live production/device render.

The guarded preview controls are [engineering-functions.ts.txt](../../tools/review/engineering-functions.ts.txt), outside the production function directory. Use the existing scratch-preview preparation, copy the harness only to these named previews, disable crons, and park dispatch while driving actual workers. Never deploy the harness or inject synthetic identities into production.

## Remaining actions

1. Production rollout of the four fixes and D53 was authorized and completed on October 6; see [live deployment evidence](engineering-deploy.md). Schema additions are optional; existing runs drain with their original pagination. Do not roll back to code that cannot understand new portable cursors while work is active.
2. (Workflows checked in and scheduled on 2026-10-07; the owner's two environment secrets start captures.) Approve/configure independent checkpoint storage, key custody, cadence and monitoring. [capture-export.ts](../../tools/recovery/capture-export.ts) passed a real preview capture: 700 encrypted bytes, actual snapshot time 21:39:29.739 UTC, mode 0600 and successful authenticated decryption. The [capture workflow](../../.github/workflows/protected-checkpoint.yml) is scheduled; captures await the owner's environment secrets.
3. Approve a controlled real-provider fixture for provider-originated deletion and expiry/reinstall flow; reconcile the checkpoint's uncovered interval before reopening a disaster restore. Legacy in-flight native-cursor backups require a separately proven recovery procedure.
4. Decide launch scale, Worker plan and Convex spending thresholds with zero payout assumed; decide the numerical tuning questions from [balance](balance.md). No plan, spend limit or gameplay number was changed.
5. Tighten the seven permissive public return validators as a lower-priority contract improvement. Marketplace recording/hosting/submission are separate from these engineering checks.

D43 preview coverage and D46 waived physical/claim checks remain respected. Tests do not reopen waived prerequisites or certify waived checks as passed.
