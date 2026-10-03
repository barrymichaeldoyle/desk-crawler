# Approved refinements before building

Barry approved these refinements (D24–D28, D30). They refine the implementation brief; measured targets are not player promises. [Decisions](decisions.md) govern approval.

## Progression and content

Measure an occasional-management cohort that reviews gear, equips available upgrades and selects the hardest unlocked biome every three days, and a separate seven-day cohort. Use explicit deterministic policies and seeded distributions, not a blended average. Report an unattended starter separately, including inventory sleep.

Initial balance targets: first level gain during the first day; Server Room unlock around days 2–4; Cafeteria Depths unlock around days 8–14. Count elapsed time from verified activation under healthy scheduled service. Distinguish level unlock from actual travel: a player may visit later. Report median and p10/p90 times, deaths, useful upgrades and sleep; do not make every seed satisfy a fixed deadline. Evaluate pacing and three-to-seven-day management together. Record conflicts and tune before launch rather than changing death, manual travel or held-find policies implicitly.

Content floor: four authored monsters per biome (12 total), and four summary variants for each of combat, loot, trap and rest in each biome (48 total). Variants may interpolate outcome facts but must remain accurate for wins, retreats and deaths; required lifecycle/sleep/level-up summaries are additional, as are at least one elite-victory and one jackpot variant per biome (D35). Keep cosmetic randomness separate from encounter/reward streams. After all three biomes unlock, gear improvement and recent competition provide the initial ongoing goals. Test the 30/90-day experience without assuming monthly future content will arrive on schedule.

### Pre-harness arithmetic check — 2026-10-03

A throwaway Monte Carlo (not committed; 300 heroes × 30 days per cohort) applied the [gameplay](gameplay.md) rules as written. Monster templates were approximated as four evenly spaced values in each tier range. Managed cohorts equip the best eligible gear, sell everything else and move to the hardest unlocked biome on each visit. **This is an indication for A03, not balance evidence.** The real harness and authored templates decide.

| Signal | Indicative result | Against target |
| --- | --- | --- |
| First level gain | Median ~5 hours | Meets D24 (day 1) |
| Server Room unlock (level 4) | Median 1.7 days, p90 2.0, the same for every cohort (Office XP only) | Slightly early against days 2–4 |
| Cafeteria unlock (level 8) | Daily 5.5 days; three-day 6.3 days; seven-day 9.5 days* | Daily/three-day cohorts are early against days 8–14 |
| Server Room deaths | ~0 per exploring hero-day | Far below the 2–5% hero-day hypothesis |
| Cafeteria deaths | ~0.07–0.12 per exploring hero-day | Plausible; measure undergeared arrivals |
| Gear finds | ~4.8/day managed; first inventory sleep median 5.6 days unattended | Meets the ~5/day and 3–7-day cadence baseline |
| Inventory sleep share | Three-day cohort ~0%; seven-day ~15–19%; unattended ~81% of the month, never leaving the Office | Expected by D19; see ranking note below |
| Best-in-slot gear (rare tier 3, both slots) | Median day 17 (daily) to 21 (three-day) | Gear improvement stops being a goal by week 3 |
| Retained gold, day 30 | Median ~24,000 (three-day cohort) | No MVP sink; future merchant prices must absorb this (D21) |

\* Only once a sleeping hero can pick its next biome during the same visit. Under the current contract, `changeBiome` rejects `sleeping` heroes and wake waits for the next tick. Seven-day players are nearly always asleep when they return, so they stay in their old biome until a later visit (Cafeteria median 15 days in that model).

Ranking note: XP rewards are fixed per biome and not scaled by level, so heroes in the same biome earn almost the same XP per day. Within a recent-XP group, rank differences come mainly from downtime: inventory sleep, death and travel. The recent boards therefore reward more frequent management, which creates mild pressure to visit. Report this per cohort in balance evidence.

Approved tuning direction (D30): A03 slows the gear curve so the three-day cohort reaches best-in-slot around days 35–45, and trims gold income so retained balances suit a Month 2 merchant. Candidate levers: rare and tier-3 drop rates, the loot gold share and sale values. Keep the ~5 gear/day cadence baseline unless the harness shows a conflict. Also correct the early Cafeteria unlock and the too-safe Server Room against D24 and the death hypothesis. Never reset or devalue existing gold (D21).

## A compact return summary

The companion hero screen shows level gains and earned XP since its previous acknowledged visit, current unequipped bag gear available to review, any held find, and current pause/sleep/death/service state. State the baseline date and offer the relevant next action. This is a progress summary, not a reconstruction of every encounter; 72-hour detailed log retention remains unchanged.

Store one optional `companionVisitBaseline` on the hero: `{ at, level, lifetimeXp, logSequence }`, captured by the server. No growing visit history or per-item reviewed flags. `heroes.returnSummary` reads the own user/hero and bounded inventory (maximum 32 rows); its result includes the nullable baseline, observed level/lifetime XP/log sequence, nullable level/XP deltas, bag/unequipped counts, held name and current status/wake/simulation state. No historical-log scan. First visit/pending activation shows welcome/setup rather than invented accumulated deltas. XP earned uses lifetime XP, never current-level XP differences or a claim about current rolling rank.

After the summary is visibly rendered in an active browser page, `heroes.recordCompanionVisit(expectedLogSequence, operationId)` captures current server values only if the observed log sequence still matches. The client submits no reward/stat values. Mismatch returns `RECAP_CHANGED` without changing the baseline; refresh/render before a bounded retry. Receipt replay returns the original acknowledgement; a fresh visit can update the checkpoint time even if no progress occurred. Newer baselines never move backwards. Keep the displayed recap stable for that visit even when acknowledgement updates reactive data. Duplicate tabs/retries cannot hide newly earned, unrendered progress. Suspended/deleting owners cannot acknowledge; paused/sleeping/quarantined owners can. This mutation changes no game eligibility, reward, log or rank fields.

TRMNL polling, SSR/prefetch and hidden tabs never acknowledge a visit. Acknowledgement is a browser presentation checkpoint, not evidence of human attention. Delete it with the hero; show an honest unavailable recap if restored state cannot validate it. See [API](api.md), [data model](data-model.md) and [companion](companion.md).

## Operational alerts

Barry receives an initial email when a logical run has made no progress for five minutes, and one recovery notice when that run completes. Deduplicate by run/incident and notice type; later failed checks do not repeatedly email the same open incident. Store bounded delivery state and explicit retries; retry transport failures, not new incident creation. Provider idempotency/unknown-delivery behavior must be measured before claiming exactly-once delivery. Failed/exhausted delivery is visible in admin health; watchdog recovery never depends on email success.

Use the existing email subscription when configured, with a verified sender, delivering to barry@barrymichaeldoyle.com (D36). Sender-domain verification remains setup work. Include public-safe incident/time/version/recovery status, no tokens, profiles or replay-input dumps. A new stalled run is a new incident. Keep player reminders deferred. No message is sent during planning; isolated tests/restores use a safe test destination or disabled delivery.

## Backup and recovery baseline

Plan daily production backups with seven-day retention, plus a completed backup before schema/data migrations. Aim to restore service within one business day; a daily snapshot can entail roughly one day of lost progress. These are engineering targets, not an SLA, zero-loss guarantee or routine balance rollback. Confirm subscription entitlement, costs, actual snapshot timing and restore performance before launch. [Convex backup documentation](https://docs.convex.dev/database/backup-restore) documents daily retention and the Pro requirement; backups omit code, environment variables and scheduled functions.

The restore drill uses synthetic data and an isolated deployment with simulation and outgoing delivery disabled. Restore supported code/catalog versions and configuration separately. Reconcile receipts, world/run guards, scheduled continuations, rank publication, companion checkpoint and version availability. Recover deletion/revocation records newer than the snapshot from an independent protected source or authoritative provider evidence; deny uncertain identities/credentials until reconciled. An old game backup cannot prove that a newer deletion never happened. A11 must specify and demonstrate this recovery source, retention and access before launch.

Resume only after invariants pass and the operator records the recovery decision/loss window. Do not blindly replay completed ticks, resurrect deleted accounts or treat a database import as a complete restore. Document remaining lost progress; compensation is a separate audited decision. Restrict backup access, expire copies according to policy, and disclose that live-data deletion does not instantly erase historical snapshots. Record `docs/evidence/recovery.md`.

## First implementation milestone

After coding is requested, complete required runtime/auth/protocol spikes, then connect the smallest valid staging path through A02–A10, including minimal A09 onboarding: real installation and Save, one prepared/activated hero, one deterministic scheduled encounter, coherent publication of all three rank views, authorized payload and visible physical screen. Use minimal authored content and minimal readable versions of all four required layouts; the complete catalog remains necessary for release.

Record actual display/settings and redacted install-to-display evidence in `docs/evidence/first-path.md`. Do this before bulk content authoring and broad companion polish. This milestone proves integration order, not public release readiness: recovery, deletion, load/cost, complete content and marketplace approval remain release gates. The lead coordinates shared files; packages do not request agents automatically.

Remaining setup choices: dedicated service environments, alert sender domain, Resend tier and headroom, a possible Workers Paid upgrade, and available TRMNL hardware/entitlements. Domain, repository, license and support/alert address are settled (D33/D34/D36). Funding stays a measured-cost decision under O11.
