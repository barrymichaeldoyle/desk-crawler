# Balance evidence — A03

## Content v3 stances (D76), 2026-10-07

First v1.1 system. Each stance replaces the three sustain thresholds and scales victory XP: cautious 65 / 50 / 90% at 90% XP, balanced 50 / 35 / 75% at 100% (the v2 constants, so an unchosen hero is unchanged), bold 35 / 20 / 60% at 115% XP. The XP scale came from measurement: with thresholds alone, cautious reached level 12 faster than balanced (15.1 against 15.9 days for the three-day cohort) with no knockouts, and bold was slower on every measure (18.3 days, 13.3% Cafeteria death days), so there was no reason to pick anything but cautious. The scale turns the three into a triangle.

Reproduction (deterministic, 300 heroes, all six cohorts, every hero on one stance):

```sh
pnpm balance --heroes 300 --days 30 --content v3 --stance cautious --json docs/evidence/balance-v3-stance-cautious-30-days.json
pnpm balance --heroes 300 --days 30 --content v3 --stance balanced --json docs/evidence/balance-v3-stance-balanced-30-days.json
pnpm balance --heroes 300 --days 30 --content v3 --stance bold --json docs/evidence/balance-v3-stance-bold-30-days.json
```

The balanced report equals the v2 report seed for seed (the stance tests also prove it per tick), so the v2 column below is the balanced one.

| Cohort | Level 8 median day: cautious / balanced / bold | Level 12: cautious / balanced / bold | Cafeteria death-day %: cautious / balanced / bold | Time resting | Last-24h XP median | Potions left at day 30 |
| --- | --- | --- | --- | --- | --- | --- |
| Daily | 9.1 / 7.8 / **7.2** | 14.9 / 13.0 / **12.7** | **0.6** / 2.9 / 11.7 | 5.2 / 2.7 / 1.2% | 1,731 / 1,967 / **2,243** | 3 / 18 / 20 |
| Three-day | 11.3 / 9.2 / **8.3** | 17.6 / 15.9 / 16.5 | **0.8** / 3.0 / 10.2 | 5.2 / 2.5 / 0.8% | 1,714 / 1,965 / **2,239** | 2 / 10 / 18 |
| Seven-day | 22.2 / 16.8 / **15.9** | >30 / 30.0 / >30 | **1.6** / 7.6 / 30.1 | 2.0 / 1.1 / 0.2% | 1,325 / 1,767 / **2,029** | 0 / 0 / 5 |
| Undergeared three-day | 11.8 / 9.6 / 9.5 | 23.9 / 25.7 / 29.6 | 19.7 / 47.2 / 78.7 | 9.1 / 2.8 / 0.2% | 1,286 / 1,323 / 213 | 0 / 1 / 20 |

How to read it: bold is the fastest way through the early levels and earns about 14% more XP a day while it stays alive, at three to four times the knockout rate; past level 12 the knockouts (eight ticks dead, 10% of gold) eat into the gain for the three-day cohort. Cautious almost never goes down and keeps healthier, but spends every potion it finds and levels 10–20% slower. A weekly bold manager loses 30% of its Cafeteria days to knockouts; that is the stance doing what it says, and the companion card says so. Nothing changes for unattended or safe-farming heroes, since they never fight in the Cafeteria. Gold at day 30 moves by under 10% in either direction.

Deployment: the catalog shipped beside v2 in `a752564` (Workers build green) and the live world switched to v3 at 15:25 UTC on 2026-10-07 with `npx convex run world:setActiveContentVersion '{"contentVersion":"v3"}' --prod`, answering `{"from":"v2","to":"v3"}`. Content v4 (D77/D78) adds the pouch ladder and the merchant on top: a 300-hero, 30-day run with no stance ([report](balance-v4-merchant-30-days.json)) puts the three-day cohort at level 8 on day 9.1 and level 12 on day 15.7 (v3 balanced: 9.2 and 15.9) and the seven-day cohort at 16.7 and 29.6 (16.8 and 30.0), so losing six of a hundred loot draws to a merchant the harness never buys from costs nothing measurable; a real player who buys potions does better than that.

## Content v2 sustain thresholds (D71), 2026-10-07

Barry asked for the two open balance questions to be decided and tuned before submission. Both were re-measured on the release catalog v1 first, because the earlier numbers below came from v4, before the D61 bag ladder and the D66 gear split.

**What the re-measurement showed.** Early Cafeteria knockouts were worse than the v4 report, not better: death-day probability in the first 30 days was 10.8% (daily), 10.5% (three-day) and 31.5% (seven-day), against 13.3 / 12.0 / 20.2% on v4. The bag ladder sends weekly managers into the Cafeteria later (level 8 at day 16.9, was 11.4) and poorer: they arrive with no potions (final count p10 0, median 5) because a six-slot Paper Bag puts them to sleep for almost half the month (47.7% sleeping). Daily and three-day managers were unaffected on the way in but still knocked out roughly one day in ten.

**Why.** It is arithmetic, not bad luck. A level-8 hero has 184 HP and, in tier-2 gear, takes about 25 HP a round from a Leftovers Hydra over a four- or five-round fight: 100–125 HP from one encounter. The v1 hero drank a potion only below 35% (64 HP) and rested only below 25%, so it kept walking into a tier-3 fight it could not survive. By level 12 the same fight costs about 65 HP and the problem disappears on its own, which is why the 90-day averages looked acceptable.

**Decision.** Content v2 raises the automatic potion threshold from 35% to 50% and the rest threshold from 25% to 35%. Nothing else changes: monsters, rewards, gear, rarities, trap damage and the bag ladder are byte-for-byte v1, so owned items and runs pinned to v1 keep their meaning. Weakening the tier-3 monsters instead (tested at 90% attack) helped less and would have changed the late game permanently; the chosen change makes the hero more careful rather than the office safer. Late upgrade saturation is accepted for v1.0: three gear tiers run out of upgrades around day 40 by design, v1.1 affixes/Epic and v2.0 upgrades are the planned answer, and the v1.0.x retention trigger stays.

Reproduction (deterministic, 300 heroes, all six cohorts):

```sh
pnpm balance --heroes 300 --days 30 --content v1 --json docs/evidence/balance-v1-30-days.json
pnpm balance --heroes 300 --days 90 --content v1 --json docs/evidence/balance-v1-90-days.json
pnpm balance --heroes 300 --days 30 --content v2 --json docs/evidence/balance-v2-30-days.json
pnpm balance --heroes 300 --days 90 --content v2 --json docs/evidence/balance-v2-90-days.json
```

| Cohort | Cafeteria death-day %, first 30 days: v1 → v2 | Cafeteria, 90 days: v1 → v2 | Server Room, 30 days: v1 → v2 | Time dead, 30 days: v1 → v2 |
| --- | --- | --- | --- | --- |
| Daily | 10.8 → **2.9** | 2.9 → 0.8 | 0.8 → 0.0 | 0.7% → 0.2% |
| Three-day | 10.5 → **3.0** | 2.3 → 0.7 | 0.6 → 0.0 | 0.5% → 0.2% |
| Seven-day | 31.5 → **7.6** | 3.0 → 0.9 | 0.2 → 0.0 | 0.3% → 0.1% |
| Undergeared three-day | 81.8 → 47.2 | 16.2 → 8.1 | 5.1 → 0.6 | 1.8% → 1.5% |

Knockouts remain possible and still cost eight ticks and 10% of gold; a never-re-equipping hero is still punished, which is the intended signal that gear matters. The seven-day figure is bounded by potion supply (median potions at day 30 drop from 5 to 0 because the hero now uses them), which the v1.1 potion pouch addresses.

| Cohort, 90 days | Level 12 median day: v1 → v2 | Best-in-slot median day: v1 → v2 | Reached by day 90 | Gold at day 90: v1 → v2 | Last-24h XP, median |
| --- | --- | --- | --- | --- | --- |
| Daily | 13.8 → 13.0 | 36.9 → 36.8 | 288 → 288 | 57,246 → 57,499 | unchanged |
| Three-day | 18.0 → 15.9 | 42.9 → 42.2 | 283 → 284 | 54,158 → 55,389 | unchanged |
| Seven-day | 35.8 → 30.0 | 70.7 → 63.6 | 193 → 210 | 27,273 → 29,278 | unchanged |

Pacing targets hold: level 8 medians are unchanged (7.8 / 9.2 / 16.8 days), the three-day best-in-slot stays inside the D30 window of days 35–45, gold rises 0.4–7% because fewer knockouts forfeit it, and daily XP is identical. Potion use rises from 3.7 to 4.0 a day for managed cohorts in the first month and is unchanged over 90 days, when stacks sit at 20 anyway. Resting share rises from about 1.5% to 2.7% of ticks. Unattended and safe-farming cohorts never leave the Office Cubicles and are unaffected.

Variants tried and rejected (200 heroes, 30 days, scratch runs): potion 50% alone (8.0 / 6.9 / 19.9%), potion 45% alone (8.3 / 7.7 / 18.9%), rest 35% alone (7.7 / 8.1 / 24.1%), tier-3 attack ×0.9 (5.1 / 4.8 / 14.3%), potion 45% with tier-3 attack ×0.9 (2.8 / 3.3 / 7.0%, but faster levelling and permanently easier late game). The two thresholds together were the only content-only change that fixed all three managed cohorts without touching the authored monsters.

**Known and accepted, for v1.0.x to watch (D61 starting points):** weekly managers reach level 8 at day 16.8 against the D24 target of 8–14 and sleep 46% of their first month with the small starting bags. This is the bag ladder trading early pace for a visible first-day loop, not a v2 regression; the live three-day/seven-day sleep share decides whether the ladder's early tiers need loosening.

Deployment: the catalog ships beside v1 and the live world switches between runs with `npx convex run world:setActiveContentVersion '{"contentVersion":"v2"}' --prod` ([operations](../operations.md)). Done with Barry's approval: `cf4b76b` passed the Workers build and the switch returned `{"from":"v1","to":"v2"}` at 23:41 UTC on 2026-10-06, after tick 259. Natural tick 260 (23:45 UTC) completed on `v2` with the live hero preserved. Rollback is the same command with `v1`.

## Gear stat split (D66), 2026-10-06

Same-tier items no longer share stats: each template carries a stat offset (starter pair at the tier stat, tier-1 partners +1, tier-2/3 pairs ±1). That halves the chance that a rare drop is the top item in its slot, so rare weight doubles (common 70 / uncommon 26 / rare 4, was 70/28/2) to keep the per-find chance of a best-in-slot rare at 2%. The harness's best-in-slot target now includes the top template's offset.

Reproduction: `pnpm balance --heroes 300 --days 90 --content v1 --json docs/evidence/balance-v1-gear-split-90-days.json`

| Cohort | Best-in-slot median days: before → split only → split + 4% rare | Reached by day 90 | Level 8 median | Cafeteria death-day % |
| --- | --- | --- | --- | --- |
| Daily | 36.8 → 58.1 → 36.9 | 290 → 220 → 288 | 7.9 → 7.8 | 3.6 → 2.9 |
| Three-day | 42.5 → 66.6 → 42.9 | 288 → 202 → 283 | 9.5 → 9.3 | 2.7 → 2.3 |
| Seven-day | 77.1 → >90 → 70.7 | 202 → 103 → 193 | 17.2 → 16.9 | 3.9 → 3.0 |

The three-day cohort stays inside the D30 window of days 35–45. Slightly better average gear trims Cafeteria death days, and end gold rises about 2% (three-day median 53,054 → 54,158). Undergeared, safe-farming and unattended cohorts are unchanged.

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

Completed: extended runs, undergeared/safe policies, potion and upgrade reporting, corrected death units and uncertainty. The two questions this report left open, early dangerous-zone difficulty and late upgrade saturation, were decided on 2026-10-07 (D71, top of this file).

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
