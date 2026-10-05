# Verification and release quality

## Test layers

| Layer | Tool proposal | Proves |
| --- | --- | --- |
| Pure rules | Vitest, deterministic fixtures/property checks | Combat, sustain, travel/death boundaries, reward conservation, stat invariants |
| Convex integration | `convex-test` plus current supported scheduler/auth facilities | Ownership, receipts, atomic writes, job guards, ranks, retention |
| External protocol | HTTP fixtures and mock token/JWKS services | Request parsing, auth/lifecycle idempotency, invalid 200 token response, retries |
| Web end-to-end | Playwright + Clerk-supported testing approach | Onboarding, gear/biome/potion actions, auth redirects, accessibility states |
| Workers runtime | Production build and Workers-compatible local/staging run | Runtime compatibility, request-scoped auth/SSR, environment isolation |
| TRMNL live | Development plugin/instance + MCP screenshots and physical display | Actual integration, all layouts, server Liquid behavior, e-ink readability |
| Load/balance | Pure simulation harness + synthetic deployed Convex cohort | Gameplay distributions and capacity/read/write costs |

Select current compatible versions during foundation work. No application test suite is created during this documentation-only phase. Use meaningful invariants and outcomes rather than tests that copy formulas line-for-line.

## Simulator correctness matrix

- Same complete inputs/version/seed → identical result; cosmetic log changes do not alter reward stream.
- HP clamped 0..maximum; all numeric state finite/safe; gold/items cannot be negative; inventory within bounds.
- Boundary health at exactly 25%, 35% and 75%, zero/full potion stack, manual and automatic potion behavior.
- Resting tick cannot both heal and encounter; arrival/revival tick cannot also fight.
- Six-round retreat, first-strike kill, lethal trap/combat, safe-zone rescue, gold loss floor.
- Death at tick T revives exactly at T+8; long outage/duplicate evaluation does not change the logical deadline.
- Pause/resume supported states, no catch-up, invalid pause while dead/travelling rejected.
- XP crossing one/multiple levels; level-up HP gain and lethal-order rule.
- Luck (D35): every reward inside its template range; elite and jackpot rates at fixed draw positions; elites still respect Office rescue and death rules; luck never creates gear/potions; cosmetic variants never shift lucky draws.
- 30-slot baseline, one held gear, full-potion pre-generation gold fallback, overflow sleep including rare, copied-stat claim, next-tick wake/no catch-up, sleep inventory operations and equipment swap, item ownership, deletion of depleted stack.
- All weights total 100 (including new gear/potion/gold selection and fallback); every biome/monster/item ID resolves in its catalog version; older owned gear survives template retirement.
- Logs reflect net HP/gold and earned XP correctly, newest-first order and length limits.
- D48: all supported narrative catalogs remove displayed stat amounts without losing names/milestones/consequences; companion and all four device layouts show each nonzero delta once, including HP. Verify zero/net-positive HP with potion/level-up healing, death/retreat losses, legacy command compatibility, and sale/potion receipt retries. Stat rows remain visible outside narrative clamping and above the footer for ordinary/long/attention cases.

## Transaction and scheduler matrix

- Concurrent valid hero creation → exactly one current hero/starter kit, including pending drafts.
- Direct hero creation without an owned verified attempt → rejected with no writes; forged, expired, revoked and cross-owner attempts also fail.
- Pending hero → no earned XP/gold/logs, gameplay intents, rank input or population membership; public sample → no persistent game writes.
- Authenticated Save/recovery activates only the already prepared hero once; callback/first-screen/create races never duplicate kits, reset tick markers or grant rewards.
- Unauthorized cross-user item/query/connection operations rejected.
- Same successful operation receipt retried → same result without second sale/potion/log; changed arguments → conflict.
- Mutation failure after intended writes → no committed partial rewards or receipt.
- Duplicate coordinator same wall slot → one run/tick.
- Concurrent cron while fan-out active → no newer overlapping run.
- Duplicate page/sequence → no double hero evaluation/counters/next jobs.
- Hero created or activated during run → joins next run only, including an older pending hero; no pre-activation catch-up.
- Manual potion/equip concurrent with simulation → valid serialized result, no lost updates.
- Page failure/recovery at same cursor → same run/version, no duplicated progress.
- Quarantined hero does not block other valid heroes; explicit service-pause payload/log.
- Watchdog does not duplicate pending work; repeated deterministic failure blocks with evidence.
- Rolling deployment preserves pinned versions/drains correctly; unsupported version cannot silently run.
- Cleanup/account deletion cannot remove an active run/published rank generation; deletion masks copied names.

## Leaderboard and payload matrix

See detailed [leaderboard tests](leaderboards.md). Include 0, 1, 4, 5, 100 and 101+ heroes; ties; null first rank/delta; outside-Top-100 rank; positive/negative deltas; live hero newer than cached rank; failed partial build; privacy masking.

Canonical payload cases: ready, empty logs/gear, dead, travelling, resting, paused, quarantined, stale run, missing generation, grouped recent score/window, retained-find sleeping/wake, newly created unranked hero and known unlinked installation. Assert documented field types/nulls, newest six logs, bounded names/text/bytes, allowed sprite URLs and absence of PII/tokens/seeds/internal IDs.

Screen contract asserts four correct envelope keys, object `merge_variables`, form body parsing, optional metadata fallback, bearer+UUID match and no simulation/intent writes. First-screen recovery may perform the authorized activation transaction before the read; repeated polls never advance/reset gameplay. A valid response must survive a telemetry failure. Do not validate only the illustrative JSON fixtures and call the HTTP protocol finished.

## OAuth/lifecycle matrix

- Valid/invalid/missing install code; 200 error body; token exchange timeout/retry; same code replay.
- Callback URL foreign host, alternate port, embedded credentials, dangerous scheme, huge input, double encoding and allowed extra callback params.
- Clerk sign-in/onboarding retains pending install flow; browser abandonment/restart; duplicate success callback.
- Known token cannot be relinked to another owner; instance UUID must belong to its grant.
- Success callback loss recovers through verified first-render/new instance, with no tombstone resurrection.
- Two instances, two physical displays, reinstall same/different UUID and token, uninstall only one.
- Management JWT bad signature/key/algorithm/audience/subject/expiration; JWKS key rotation; landing verified before sign-in delay; handoff expiry/replay and different owner.
- Local disconnect/revoke rejects stale screen requests but preserves hero and other instances; removing every instance after activation preserves progress, rank eligibility and companion controls.
- Account deletion denies display/mutation authority and clears retained copied identities.

## Layout screenshot matrix

Four layouts × representative data states: ordinary, long permitted names/logs, dead, travelling, empty board, unranked, unlinked, paused/sleeping/quarantined, stale. Verify OG monochrome and a larger supported display model in the live spike; unsupported orientations/device classes are not promised without testing.

Check at arm's-length scale: primary hero/status legible, text fits, HP/XP distinct, summary not clipped unpredictably, Top 5 readable where included, title bar present, no duplicate view wrapper, no arbitrary CSS/emoji (documented progress fill exception only), sprite pixels clear, content images correctly dithered. Read every generated screenshot rather than relying only on an automated “no overflow” flag.

## Balance harness

Initial harness: 1,000 seeded heroes × 500 ticks, repeatable scenario config and CSV/JSON summary. Larger periodic run: 30/90-day simulation with default policy, undergeared/unlocked cohorts, safe farmers and tier-appropriate players. Pure harness is fast; do not write those 500,000 outcomes to the real production database.

Report: level percentiles by elapsed ticks/days, XP/gold per hour, hero-day death probability with uncertainty, state-time fractions, rescue/retreat frequency, potion acquisition/consumption/full-stack gold fallback, useful upgrades, three-to-seven-day bag pressure/held-find sleep/wake distributions, and maximum stat values. Tune one set of content constants at a time and retain results/version.

Death percentage must name denominator: probability of >=1 death per eligible hero-day, not “2–5% of combats.” Report expected deaths per hero-day separately. Initial numerical targets are hypotheses; investigate failure instead of forcing a test to pass by redefining a cohort.

D24 pacing report: distinct three-day/seven-day gear-management/travel cohorts, first-level gain in day 1, Server Room unlock around days 2–4, Cafeteria unlock around days 8–14. Report p10/median/p90 and censored/not-yet-unlocked heroes, separately from actual travel times. Include unattended starter, inventory sleep and 30/90-day useful-upgrade/competition experience. D26 catalog validation requires 12 monsters and 48 encounter variants plus lifecycle summaries, with truthful outcomes and independent cosmetic RNG.

## Capacity harness

Use synthetic staging cohorts at 100 and 1,000 heroes, bounded max bags, different states and concurrent command activity. Measure complete tick + ranking duration, per-page CPU/read/write bytes, mutation conflict retries, cleanup lag and screen p50/p95. Test duplicate/failure recovery under load. Use actual invocation counts to estimate the existing plans' headroom.

Load tests must not flood Barry's real TRMNL account. Most requests hit mocked/local contract routes or synthetic Convex instances; live TRMNL calls are for protocol and screenshot checks within account allowances.

## Definition of done per work package

Delivered files obey ownership, documented behavior matches implementation, relevant tests/build pass, known limitations are recorded, and dependent contracts/fixtures are updated. Evidence includes commands/outcomes and relevant measurements, not just “tested.” No feature is done because a generated code listing looks plausible.

## First release versus ongoing changes

First public release requires the product acceptance table, one real install/manage/render/uninstall demonstration and all four tested layouts. It does not require a beta program or 10 players/devices running for a week.

After launch, tests scale with change: pure balance changes require balance/core checks; schema changes require migration/transaction checks; layout changes require screenshot matrix; auth/lifecycle changes require protocol/end-to-end checks. Avoid rerunning expensive live screenshots for unchanged art/layouts. Main can deliver passing changes continuously.

## TRMNL experience and recovery checks

D46 keepsakes: prove device-envelope-only code delivery, current/previous-week grace sharing one owner/week cap, successful and failed-guess receipts, concurrent claims, no gameplay writes, multi-installation behavior and both deletion paths. Inspect the shelf on desktop/phone and all four footer layouts on OG/X. Localized next-code copy must derive its weekday from the UTC reset timestamp without a timezone suffix. Mocked companion fixtures and local framework renders do not replace an authorized live render/claim check.

- Actual Save → preview → hardware path, mixed playlist and mashup; HTTP success is not display success.
- Slower refresh/sleep preserves progress; no cron-aligned display/overnight fetch promises.
- Physical-scale five-second glance: clear hero/state/story and service warnings; no clock, date or timezone label in any layout (D39). Check selected font bundles, dark/theme changes and larger text; cut detail first.
- Maximum names/instance/item/monster text, 90-code-point logs, 120-character attention, large valid stats/ranks; HP 0, XP 0%, both 100%, missing optional fields, unavailable sprite.
- Story works after hours away; companion dates follow browser local time across midnight/DST/half-hour offsets. Six logs are not a daily digest.
- Allocated tick ahead of hero revival/arrival evaluation: positive evaluated-tick ETA or pending wording, never invented transition. Old paused/dead progress alone is not stale. Missing first completion eventually becomes stale.
- Reachable run failure returns delayed/service payload; endpoint/asset/Liquid outage records actual TRMNL behavior. Cached images cannot dynamically acquire our warning.
- Delayed callbacks after disconnect/uninstall stay tombstoned without current targeted repair. Test pending expiry, competing tabs, restart, grant revocation and callback-loss recovery under V06.
- Revocation denies future payloads; UI explains cached-image limits. Telemetry failures do not fail valid payloads.
- Each returned string works without shared-template registration or TRMNL globals. One instance displays correctly across models without server selection from representative metadata.
- No timezone preference is collected or shown; legacy timezone changes affect formatting only; expired unknown-outcome intents do not automatically consume another potion. Quarantine preserves settings/disconnect/deletion access.

Use the [evidence checklist](evidence/README.md). Documentation fixtures are review inputs, not screenshots or test results.

Additional release checks: paginated connections stay bounded with many historical instances; deletion immediately denies all reads via owner state while revocation continues in batches; deleted-account tokens/codes cannot reactivate grants after purge (V09); approved D22/D23 policies match actual auth/public-name behavior.

First-release acceptance also requires redacted V10 findings for the selected Third Party game/category and current payout qualification, plus measured costs assuming zero payouts. The threshold is not a launch-population requirement. Planning samples/mock confirmations do not establish installation proof or close the existing live installation/render gates.

## Ranking, inventory, deletion and moderation proofs

- Wall-slot XP credited to the correct hour accumulator once; hourly-bucket 24-hour/seven-day exclusive-start/inclusive-end expiry, <=168 retained buckets, fold at publication and after a missed publication, sleep/pause/quarantine expiry, no duplicate recovery credit (D31).
- Publication only on the last slot of each UTC hour plus one catch-up after >60 minutes without publication; non-publication runs write no rank inputs and complete without a ranking phase.
- Dormant heroes (D32): skipped without writes between publications, left out of recent boards/populations only when window XP is zero, kept on lifetime, return with null delta; `rank_status` and stale logic correct for them.
- Current-level groups/new zero scores/promotion carry and null delta; published own cohort cannot come from newer live stats; selected group count and global count stay distinct.
- Publish both grouped recent views plus lifetime together; failure in the final view keeps the previous set readable.
- Full bag continues until a find, which is held with original stats; finish earned effects once, then no XP/encounter/heal/log spam. Claim requires space and cannot equip/sell held gear beforehand; Resume requires empty held slot/free bag slot and wakes next eligible tick.
- Capacity alone/24-hour browser inactivity/hardware sleep never trigger gameplay sleep; wake/claim/sale receipts and tick races conserve gear/XP.
- D29: Resume with destination departs on the wake tick with no encounter and arrives the following tick; locked/current destination rejected; changing the pending destination before wake; `sellMany` is all-or-nothing, rejects duplicates/equipped/held/foreign items, conserves gold and stays within one receipt.
- Dedicated-Clerk deletion retries after lost browser/provider errors, checkpoint recovery after deploy, old TRMNL token/code and stale Clerk JWT denial after purge, signed Clerk user.deleted reconciliation and minimal revocation retention under V09.
- Duplicate/delayed/out-of-order provider events cannot undo deletion; failed webhook delivery has a documented recovery path under V09.
- Admin temporary names/repair/version mismatch never leak old names, alter XP or create ordinary rename; missing owner masks copied fields. Restore/suspend privileges are server-controlled and audited.

Planning fixtures include sleeping, scheduled wake and rank-window/group examples. Fixture arithmetic is not simulator/render/capacity proof.

## Recap, alert, backup and first-path proofs

- Return recap after seven days works without expired logs; lifetime-XP/level deltas, first visit/pending nulls, <=32 inventory rows and a single checkpoint. A visible-page acknowledgement is guarded and idempotent, stale sequence cannot hide new progress, concurrent tabs cannot regress the baseline, and no SSR/prefetch/hidden-tab/device request updates it. Recap never changes rewards, logs, rank or eligibility.
- Five-minute stalled-run detection creates one incident and deduplicated alert; repeated watchdog checks do not send new alerts. Completion queues one recovery notice. Exercise failure/unknown delivery, retry exhaustion/admin visibility and safe staging recipient; delivery failure never blocks game recovery.
- Verify daily/pre-migration backup completion, entitlement/retention and observed backup age; isolated restore recovers code/config/scheduled jobs separately, reconciles post-snapshot deletions/revocations, receipts, tick/run guards and rank publication. No deleted-account resurrection or duplicate rewards; record measured restore duration/loss against the one-business-day/roughly-one-day baseline.
- Early staging install → Save → activated hero → scheduled encounter → coherent three-view rank publication → authorized payload → physical display, with all four minimal layouts. This milestone does not replace full release gates.
