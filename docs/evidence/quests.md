# To-do list: build evidence (P31, D112)

Date: 2026-10-09 · Simulation version 1 · Content v9 (not active until the switch; production stays on v8 until then) · Harness: `pnpm balance --heroes 300 --days 30 --content v9` ([tools/balance/run.ts](../../tools/balance/run.ts)) · Local Node 24, pure simulator in memory, no database. Raw report: [balance-v9-todo-30-days.json](balance-v9-todo-30-days.json).

## What Q1 built

- Content v9 = v8 plus `todo` rules ([v9.ts](../../packages/desk-crawler/src/content/v9.ts)): seven templates with target ranges by biome tier, rewards of 5, 16 and 30 gold by tier, the 07:00 refill hour, an 80-tick (20-hour) floor, a stale swap after two refills, a 34% chance that a biome task names another unlocked biome when the list allows one, and plural monster names. The validator checks one template per kind, three kinds at level 1, a target for every tier a biome task can name, label placeholders, positive rewards and the floor's bounds.
- The pure core ([todo.ts](../../packages/desk-crawler/src/sim/core/todo.ts)) runs after the tick's own story and draws only from the new `quest` stream. Progress is read from the counters the tick moved, plus the encounter's gold for `earn_gold`, so it needs no extra state and moves only while the hero explores. A finished task pays its gold in the same tick and logs a `todo` line after the story. The first evaluation under v9 fills the list (the backfill). After that, the stand-up refills finished slots, and any task unfinished for two waking refills, at the first exploring, resting or sleeping evaluation at or after the hero's local 07:00, at least 20 hours after the last stand-up.
- The simulator takes the tick's wall slot and the owner's UTC offset as inputs, so it stays pure. The tick runner passes `run.wallSlot` and writes the extra lines with the next log sequence numbers. The owner's offset arrives with Q2.
- Invariants check a stored list under v9: three tasks of distinct known kinds, progress within target, done exactly at target, biome and monster fields that match the kind. Output validation checks that to-do lines move gold only, fit the summary budget, and that `tasksCompleted` grows by the tasks ticked off.

## Gate

| Gate (from the [spec](../quests.md#work-slices)) | Result |
| --- | --- |
| Earlier content replays unchanged seed by seed | Pass. For 900 seeded ticks across fresh, Server Room and resting heroes, v9's story, item directives, disposition, deltas and hero state equal v8's, apart from task gold and the list (`tests/sim/todo.test.ts`). The `quest` seed hashes on its own name, so the other five seeds are unchanged (`tests/sim/core-units.test.ts`) |
| Unattended heroes finish at least two tasks on most days | Pass on the days they adventure: 92.7% of awake hero-days. Across all days it is 12.4%, because an unattended hero sleeps on a full bag 86.8% of the month (v8 behaviour, unchanged). A sleeping hero can't progress |
| Gold added stays within 12% to 18% | Pass for typical players: daily 13.9%, three-day 13.9%, seven-day 14.4%, undergeared 14.9%. Extremes: a hero farming the Office 11.9%, unattended 15.7% |
| Timezone-change abuse stays at or under 1.25 refills a day | Pass: 1.167. The abuser moves the TRMNL clock four hours forward every morning, wrapping from +14 to −12. Honest heroes refill 1.033 times a day (the first fill plus one a day) |

## Per cohort (300 heroes, 30 days)

| Cohort | Tasks per hero-day | Per awake hero-day | Days awake | Days with 2+ (awake) | Task gold vs other gold | Stale swaps per task written | Refills per day |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Unattended | 0.4 | 3.0 | 13.2% | 92.7% | 15.7% | 0.7% | 1.033 |
| Daily | 2.5 | 2.5 | 100% | 86.1% | 13.9% | 7.9% | 1.033 |
| Three-day | 2.5 | 2.5 | 99.8% | 86.3% | 13.9% | 7.8% | 1.033 |
| Seven-day | 2.0 | 2.5 | 74.7% | 85.1% | 14.4% | 7.8% | 1.033 |
| Undergeared three-day | 2.4 | 2.4 | 99.9% | 84.7% | 14.9% | 7.9% | 1.033 |
| Office farming three-day | 2.5 | 2.5 | 99.8% | 90.1% | 11.9% | 7.5% | 1.033 |
| Daily, timezone abuse | 2.8 | 2.8 | 100% | 91.6% | 15.7% | 8.5% | 1.167 |

An unattended hero finishes three tasks on the days it is awake because it never leaves the Office, so every task is local.

## Time to finish by kind (daily cohort)

Hours from a task being written to being ticked off, including rest and travel:

| Kind | p10 | Median | p90 | Finished |
| --- | --- | --- | --- | --- |
| Find gear | 1 | 5.75 | 16.25 | 3,615 |
| Explore a biome | 4.75 | 7.25 | 10 | 2,536 |
| Defeat a named monster | 2.5 | 7.5 | 15.75 | 2,463 |
| Dodge traps | 1.5 | 7.75 | 22 | 3,580 |
| Win fights | 4.75 | 8 | 11.75 | 3,708 |
| Earn gold | 4.75 | 8.25 | 12.25 | 3,780 |
| Beat an elite | 1.75 | 11.75 | 33.25 | 2,545 |

Every median is inside the spec's 4 to 16 hours. Dodging traps and elites have long tails because each depends on one rare roll (traps are 10% to 15% of encounters and a quarter are dodged; elites are 3% of fights). The stale swap catches the tail.

## What the harness changed

- **Rewards:** the spec's 35 gold at tier 1 added 58% to 110% gold, because encounters pay only about 75 gold a day there. 5/16/30 is about 6% of a tier's daily encounter gold per task.
- **Stale swaps while asleep:** at first, 71% of an unattended hero's tasks were stale-swapped, because its list kept rotating while it slept. Mornings slept through on a full bag no longer age a task: 0.7%.
- **Pacing is unchanged:** tasks pay no XP, so level 8 lands on the same median day as v8 (daily 7.9, three-day 8.3, seven-day 12.1). End-of-month median gold rises about 11% (daily 14,054 to 15,673), which brings bag purchases slightly earlier.

## Not measured

The harness doesn't swap tasks or steer toward an away task. Visiting cohorts travel to the hardest unlocked biome as before. A player who follows the away task will finish more tasks, which the 20-hour floor and the gold-only reward keep small.

## Q2 backend

- `users.trmnlUtcOffset` holds the last offset a TRMNL screen request sent. The payload query compares it with the stored value and returns the owner's id only when it differs, so the screen route calls `trmnl.recordUtcOffset` once per change, not per request. The mutation rechecks and bounds the value, and a missing or invalid offset never clears it. The privacy policy lists it.
- The tick passes `owner.trmnlUtcOffset` and the run's wall slot to the simulator. The owner document is already read for the current-hero check, so the stand-up adds no read per tick, and the list rides the hero patch the tick already makes.
- `heroes.swapTask(slot)` is a receipted intent: same operation id, same result, no second swap; a new id after a swap gets `SWAP_USED` until the next refill. It draws from the hero's `quest` stream at the world's current tick, so it can't be rerolled.
- `heroes.mine` returns the list with labels, progress, rewards, done flags, the place rule's local flag, whether the swap is free and the next stand-up time, once the world runs v9.

Tests: `tests/convex/todo.test.ts` (first-tick fill and log order, nothing under v8, the stored offset moving the stand-up, offset writes only on change, duplicate swap receipts, refusals, the hero query).
