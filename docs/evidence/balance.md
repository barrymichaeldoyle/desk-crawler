# Balance evidence — A03

Date: 2026-10-03 · Simulation version 1 · Harness: `pnpm balance --heroes 300 --days 45 --content <v1|v2>` (deterministic; fixed per-hero/tick seeds) · Environment: local Node 24, pure simulator in memory, no database.

Content v1 is the documented planning baseline. Content v2 is the harness-tuned catalog and is now `ACTIVE_CONTENT`. It changes only monster XP/gold ranges, loot-gold ranges and rarity weights (rare 5% → 2%, uncommon 25% → 28%); IDs, names, stats, formulas and narrative are unchanged. Luck (D35) is on in both runs.

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

## Interpretation and remaining tuning

- D24 pacing and D30 late-game targets are met by v2 for the occasional cohorts. Daily managers unlock Cafeteria slightly before day 8; D24 applies to occasional management, so this is accepted.
- Server Room deaths for the three-day cohort (1.7%) sit just under the 2–5% hypothesis, because these players arrive a little overleveled. Not changed: making tier 2 harder would mostly hurt daily players arriving at level 4.
- Cafeteria deaths are 7–9% of hero-days. Each costs eight ticks plus 10% gold, which keeps progress losses small, but it is the highest-risk zone; revisit if live data shows frustration.
- Elites are frequent enough (~1/day) to be a regular highlight rather than a rarity. Lower `elite.chancePct` if they feel routine on real screens.
- Potion supply and full-stack fallback were not separately reported yet; add them before launch.
- 90-day runs, undergeared arrivals and policy variants (no re-equip, safe farming) remain to be reported.

These are simulation results with harness policies, not observed player outcomes.
