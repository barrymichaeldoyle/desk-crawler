# Balance evidence — A03

## Current release: v4, 2026-10-05

Simulation version 1; active content v4 retains v2 gameplay tuning. The harness runs the real pure simulator locally, without a database or network. It uses deterministic per-hero/tick PRNG streams (the production SHA-256 seed derivation is not reproduced), staggered visit times and the v4 bounded recent-story context. These are policy simulations, not observed player outcomes. Gameplay numbers were not changed during this pass.

Reproduction:

```sh
pnpm balance --heroes 1000 --ticks 500 --content v4 --json docs/evidence/balance-v4-500-ticks.json
pnpm balance --heroes 300 --days 30 --content v4 --json docs/evidence/balance-v4-30-days.json
pnpm balance --heroes 300 --days 90 --content v4 --json docs/evidence/balance-v4-90-days.json
```

All six cohorts ran for each report: unattended, daily, three-day, seven-day, undergeared three-day (never re-equips), and safe-farming three-day (stays in Office Cubicles). Managed visits equip eligible upgrades, claim/sell spares, resume and choose the hardest unlocked destination, except for the two named variants. Raw reports: [500 ticks](balance-v4-500-ticks.json), [30 days](balance-v4-30-days.json), [90 days](balance-v4-90-days.json). Measured run times were 53.815s, 83.325s and 247.858s. The 500-tick run covers about 5.2 days; its final XP day is partial and its seven-day field contains only available days. XP ratio formatting was normalized after the runs to two decimals, with `null` when p10 is zero, matching the final harness; simulation outputs were unchanged.

**Death reporting correction:** the old report below scaled encounter ticks into days and did not count distinct days with deaths. Its percentages must not be interpreted as daily death probabilities. The current denominator is hero-days with at least one exploring/resting tick in that biome. Multiple deaths on one day count once for probability; death frequency is separately reported. Never-visited biomes produce `null`, not zero. Wilson 95% intervals are descriptive; repeated days per seeded hero are correlated, so these are not independent-player confidence forecasts. Three harness tests cover potion conservation, distinct death-day counting, zero-XP ratios and deterministic policy behavior.

| Cohort | Level 8 median days | Level at day 90, median | Best-in-slot median days (p10 / p90) | Reached best-in-slot by day 90 |
| --- | ---: | ---: | --- | ---: |
| Daily | 7.9 | 32 | 36.6 (19.0 / 71.4) | 284/300 |
| Three-day | 8.3 | 32 | 42.2 (24.1 / 75.8) | 282/300 |
| Seven-day | 11.4 | 28 | 56.8 (35.6 / >90) | 246/300 |
| Undergeared three-day | 8.8 | 28 | >90 | 0/300 |
| Safe-farming three-day | 18.4 | 14 | >90 | 0/300 |
| Unattended | >90 | 5 | >90 | 0/300 |

The occasional cohorts still meet the level-8 days 8–14 target, and three-day best-in-slot median remains within days 35–45. Those medians hide wide tails: 18 three-day heroes had not reached best-in-slot after 90 days. Safe farming materially slows progress; gear management matters most during the early dangerous-zone transition.

| Cohort | Server Room death-day probability, 30 days | Cafeteria death-day probability, 30 days (descriptive 95%) | Cafeteria, whole 90-day run |
| --- | ---: | --- | ---: |
| Daily | 1.7% | 13.3% (12.5–14.1%) | 3.6% |
| Three-day | 1.4% | 12.0% (11.2–12.9%) | 2.7% |
| Seven-day | 0.2% | 20.2% (18.7–21.9%) | 2.6% |
| Undergeared three-day | 6.6% | 80.8% (79.2–82.3%) | 15.8% |

The 90-day averages hide the early Cafeteria difficulty. In the first 500 ticks, Server Room probability is 3.2% daily, 3.0% three-day and 18.1% undergeared; the seven-day policy has not visited it yet. Knockouts cost eight ticks and 10% of current gold while retaining XP/gear, but the early rates deserve an explicit acceptance or tuning decision before launch. These results do not justify silently making all encounters easier or resetting progress.

| Cohort, first 30 days | Potions found / used / full-stack fallbacks per hero-day | Final potions p10 / median / p90 |
| --- | --- | --- |
| Daily | 4.4 / 3.9 / 0.4 | 9 / 18 / 20 |
| Three-day | 4.1 / 3.9 / 0.8 | 2 / 10 / 20 |
| Seven-day | 2.6 / 2.5 / 1.7 | 0 / 5 / 14 |
| Undergeared three-day | 2.9 / 2.5 / 2.4 | 8 / 20 / 20 |
| Safe-farming three-day | 0.6 / 0 / 5.1 | 20 / 20 / 20 |
| Unattended | 0.6 / 0 / 0.5 | 20 / 20 / 20 |

Potion acquisition is counted from loot outcomes, including a find that cancels same-tick consumption and leaves no net item directive. The conservation test proves starting stack + finds − uses = final stack. Supply is adequate at the median but seven-day managers can run dry in the early period. By day 90, managed median stacks have reached 20; full-stack fallback becomes common. Rescue/retreat metrics are present in the raw reports and zero for these policies.

Unattended heroes first sleep at median day 5.6 (p10 4.3 / p90 6.8). Their time asleep rises from 81.4% across 30 days to 93.8% across 90 days. Seven-day managers sleep for 15.9% and 16.0%, respectively. Daily and three-day managers avoid bag sleep under this idealized sell-all-spares policy; real players may retain more gear.

Useful eligible gear finds per hero-day drop from 0.5 / 0.8 / 1.3 over 30 days (daily / three-day / seven-day) to 0.2 / 0.3 / 0.5 over 90 days. Equipped upgrade counts average 8.9 / 7.8 / 6.3 by day 30 and 9.7 / 8.9 / 8.3 by day 90. “Useful” means better than the equipped item at the time of finding it; duplicate candidates can count before the next visit. These figures expose late upgrade saturation in the current three-biome catalog, rather than proving indefinite progression variety.

At day 90, the three-day cohort's last-24h XP is p10 1,645 / median 1,947 / p90 2,318; seven-day XP is 12,955 / 13,907 / 14,763. Seven-day managers have weekly median 11,431 (about 18% lower), with p10 9,309 / p90 13,640. The long window smooths luck, while bag downtime remains visible. This harness does not publish or validate the app's immutable per-level-group leaderboard generations; that proof belongs to ranking tests and capacity evidence.

Completed: extended runs, undergeared/safe policies, potion and upgrade reporting, corrected death units and uncertainty. Remaining: accept or adjust early dangerous-zone difficulty and late upgrade saturation, using an additive, progress-preserving balance release if changed. No numerical tuning was deployed.

## Historical v1 → v2 comparison, 2026-10-03

Date: 2026-10-03 · Simulation version 1 · Harness: `pnpm balance --heroes 300 --days 45 --content <v1|v2>` (deterministic; fixed per-hero/tick seeds) · Environment: local Node 24, pure simulator in memory, no database.

Content v1 is the documented planning baseline. Content v2 was the harness-tuned active catalog at the time. It changes only monster XP/gold ranges, loot-gold ranges and rarity weights (rare 5% → 2%, uncommon 25% → 28%); IDs, names, stats, formulas and narrative are unchanged. Luck (D35) is on in both runs. The current v4 catalog retains that gameplay tuning.

## Policies

Visits happen at a fixed per-hero time of day. Each visit equips the best eligible gear, claims and sells everything else (`sellMany`), and moves to the hardest unlocked biome; a sleeping hero uses Resume with destination (D29). The unattended hero never visits. 300 heroes × 45 days per cohort. Percentiles include heroes who never got there (shown as `>45`).

## Results: v1 baseline → v2 tuned

| Measure | Target | v1 | v2 |
| --- | --- | --- | --- |
| First level gain (all cohorts) | Day 1 (D24) | Median 0.2 days | Median 0.3 days |
| Server Room unlock, level 4 (all cohorts) | Days 2–4 (D24) | 1.5 (p10 1.2, p90 1.9) | **2.5 (p10 2.1, p90 2.9)** |
| Cafeteria unlock, level 8: three-day | Days 8–14 (D24) | 6.0 | **8.3 (p10 7.8, p90 9.3)** |
| Cafeteria unlock: seven-day | Days 8–14 | 9.2 | **11.4** |
| Cafeteria unlock: daily (not an occasional cohort) | — | 5.0 | 7.9 |
| Best-in-slot gear: three-day | Days 35–45 (D30) | 24.3 | **42.2** |
| Best-in-slot gear: seven-day | — | 35.3 | >45 (84/300 by day 45) |
| Retained gold at day 30: three-day | Trimmed (D30) | 25,044 | **12,319** |
| Retained gold at day 30: seven-day | — | 18,551 | 6,329 |
| Server Room deaths per exploring hero-day: daily / three-day / seven-day | 2–5% hypothesis | 2.7% / 0.1% / 0% | 2.1% / 1.7% / 0.3% |
| Cafeteria deaths per exploring hero-day: daily / three-day / seven-day | Occasional, explainable | 7.2% / 6.3% / 2.6% | 9.0% / 7.2% / 9.4% |
| Gear found per day (managed) | ~5 | 4.8–4.9 | 4.8 |
| First inventory sleep, unattended | 3–7-day cadence | Median 5.6 days | Median 5.6 days |
| Time asleep: seven-day / unattended | Expected under D19 | — | 15.6% / 87.6% |

Level 12 (v2): three-day median 17.6 days, seven-day 24.6. Final level at day 45: daily 24, three-day 23, seven-day 19.

## Luck (D35, v2)

| Measure | Value |
| --- | --- |
| Elite victories per active hero-day | ~1.2 (daily/three-day) |
| Jackpot share of all gold earned | ~3% |
| XP in the last 24 hours, active cohorts | p10 1,689 · median 2,013 · p90 2,375 (p90/p10 1.41) |
| XP in the last 7 days, daily/three-day | p10 13,015 · median 14,020 · p90 14,889 (p90/p10 1.14) |
| XP in the last 7 days, seven-day cohort | p10 9,087 · median 11,519 · p90 14,057 (p90/p10 1.55) |

The 24-hour board has visible luck-driven spread. The seven-day board remains mostly decided by downtime: seven-day managers trail daily/three-day managers by about 18% at the median because of inventory sleep. That is the expected cost of D19, not luck.

## Historical interpretation and follow-ups

This original interpretation is retained for provenance. Its death-rate conclusions are superseded by the corrected metrics above; its requested potion, policy and 90-day reports are now complete.

- D24 pacing and D30 late-game targets are met by v2 for the occasional cohorts. Daily managers unlock Cafeteria slightly before day 8; D24 applies to occasional management, so this is accepted.
- Server Room deaths for the three-day cohort (1.7%) sit just under the 2–5% hypothesis, because these players arrive a little overleveled. Not changed: making tier 2 harder would mostly hurt daily players arriving at level 4.
- Cafeteria deaths are 7–9% of hero-days. Each costs eight ticks plus 10% gold, which keeps progress losses small, but it is the highest-risk zone; revisit if live data shows frustration.
- Elites are frequent enough (~1/day) to be a regular highlight rather than a rarity. Lower `elite.chancePct` if they feel routine on real screens.
- Potion supply and full-stack fallback were not separately reported yet; add them before launch.
- 90-day runs, undergeared arrivals and policy variants (no re-equip, safe farming) remain to be reported.

These are simulation results with harness policies, not observed player outcomes.
