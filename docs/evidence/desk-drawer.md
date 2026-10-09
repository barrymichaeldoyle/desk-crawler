# Desk drawer: L1 rules and harness (P32)

Date: 2026-10-09 · Simulation version 1 · Content v8 (not active until the switch; production stays on v7 until then) · Harness: `pnpm balance --heroes 300 --days 30 --content v8 --drawer N` ([tools/balance/run.ts](../../tools/balance/run.ts)) · Local Node 24, pure simulator in memory, no database. Raw report for the chosen size: [balance-v8-desk-drawer-30-days.json](balance-v8-desk-drawer-30-days.json).

## What L1 built

- Content v8 = v7 plus `deskDrawer` rules ([v8.ts](../../packages/desk-crawler/src/content/v8.ts)): six slots, a first-use line for a loot find ("Bag full, so the {item} went in the desk drawer.") and a short one for a combat drop, so a full victory summary never trims it. The validator keeps the size from 1 to 8 (the 32-row read bound) and the lines to the `{item}` placeholder.
- Placement in apply step 10: a gear find that would overflow the bag goes in the drawer while it has a free slot, the hero keeps its status, and the find counts in `itemsFound` and the new `drawerFinds` counter. Only a find that arrives with the drawer full too is held, and the hero sleeps as before. The log detail carries `drawerFind: true` and a loot outcome's destination reads `drawer`, so the device can mark drawer finds.
- The drawer is `drawer?: string[]` on the hero, newest last. The bag count excludes drawer ids the way it already excludes the held id. Invariants: drawer ids are owned, unequipped, unheld gear, each listed once, within the catalog's size. The simulator can only add to the drawer through a `create` directive, never rewrite it.
- Waking from inventory sleep needs the held slot empty and room for the next find, in the bag or the drawer (`hasRoomForFind`).
- The harness's visit sells the drawer with the bag, and `--drawer N` tries other sizes.

## Gate

| Gate (from the [spec](../desk-drawer.md#work-slices)) | Result |
| --- | --- |
| v7 replays unchanged | Pass. The drawer draws no randomness and exists only under v8; the full existing simulator suite passes unchanged and the v7 run below matches the bag-ladder measurements |
| Seven-day time asleep under 30% at the chosen size | Pass at six: 46.1% → 25.7% |
| Three-day cohort stays near 0% | Pass: 3.8% → 0.2% |
| No find is ever lost | Pass. A property test over 40 random 1,500-tick runs with a player who sells, claims and resumes at random checks every created item stays owned until an intent sells it, the bag never exceeds its capacity, and every inventory sleep starts with a full drawer (`tests/sim/desk-drawer.test.ts`) |

## Size comparison

Share of 30 days asleep, median day of the first inventory sleep, and median day to level 8 (300 heroes per cohort):

| Cohort | v7 (no drawer) | Drawer 4 | **Drawer 6** | Drawer 8 |
| --- | --- | --- | --- | --- |
| Unattended asleep | 91.7% | 88.3% | 86.9% | 85.3% |
| Unattended first sleep | 2.3 d | 3.6 d | 4.0 d | 4.4 d |
| Three-day asleep | 3.8% | 0.7% | **0.2%** | 0.1% |
| Seven-day asleep | 46.1% | 31.7% | **25.7%** | 20.1% |
| Seven-day first sleep | 3.1 d | 4.0 d | 4.5 d | 5.0 d |
| Seven-day level 8 | 16.6 d | 14.8 d | **12.1 d** | 11.8 d |
| Seven-day drawer finds per hero | 0 | 15.7 | 23.3 | 30.3 |

Four misses the seven-day gate (31.7%). Six passes with room to spare, so it stays the size and eight isn't needed. Six also gives the unattended hero most of an extra day and a half before its first sleep, which is the "it kept going while I was away" moment the spec wants for players who check in rarely.

## Side effects

- Daily players never fill the bag, so nothing changes for them.
- Gold rises for the cohorts that used to sleep, because the hero adventures more: seven-day median gold on day 30 is 4,117 under v7 and 7,768 with a six-slot drawer. The harness sells every spare at each visit, so this is the upper bound; it brings bag and pouch purchases earlier for weekly players, which the ladders already allow.
- Seven-day heroes reach level 8 4.5 days sooner (16.6 → 12.1), closing about half of the gap to the three-day cohort (8.3).

## Not measured

The harness sells everything at each visit, including the drawer. Real players who keep gear in the bag will reach the drawer sooner and keep using it as overflow, which the property test covers for correctness but not for timing.
