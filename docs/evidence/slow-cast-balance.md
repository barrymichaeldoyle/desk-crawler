# Slow Cast balance evidence (S1)

Recorded 2026-10-09 for D115. The [harness](../../tools/balance/slowcast.ts) runs the real pure core (`packages/slow-cast`, content v1, simulation version 1) for 200 anglers per policy over 30 days, with the shared forecast from a per-angler world seed. Rerun with `pnpm balance:slowcast`; add `-- --json` for the full report.

## Policies

- **Daily:** visits once a day at 19:00 local. Sells the whole cooler, buys bait for about two coolers of kept fish, then upgrades in order (Cool Box, Waders at level 4, Fibreglass Rod, Chest Cooler, Carbon Rod, Pier Permit at level 8, Dockside Crate, Beachcaster), saving for the next when it cannot afford it. Moves to River Bend once it can, and to the Pier once it has the permit and the Carbon Rod. Bait on the hook: worms at the Millpond, maggots at River Bend, ragworm at the Pier.
- **Three-day:** the same, every third day.
- **Never:** never opens the companion after setup. Fishes the starter tub, then a bare hook, at the Millpond.
- **Epic checks:** for each epic, 50 anglers with every upgrade fish its water with its bait for 30 days, selling and restocking every tick, so only the species window limits the catch.

## Gates

| Gate | Value | Target | Result |
| --- | --- | --- | --- |
| Millpond fish a day, first two days (daily player) | 12.5 | 10 to 14 | Pass |
| Days to level 4 (daily player) | 2.27 | 2 to 3 | Pass |
| Days to reach the Harbour Pier (daily player) | 10.8 | 10 to 16 | Pass |
| Hours to fill the Bucket the first time | 10.88 | 8 to 14 | Pass |
| Hours to fill the Dockside Crate at the last week's catch rate (daily player) | 41.14 | 36 to 60 | Pass |
| Bait spend as a share of fish sales (daily player) | 0.17 | 0.15 to 0.4 | Pass |
| Days to reach River Bend (three-day player) | 6.8 | 3 to 12 | Pass |
| Days to reach the Harbour Pier (three-day player) | 24.8 | 14 to 30 | Pass |
| Level after 30 days, never visiting | 8 | 4 to 99 | Pass |
| Species logged after 30 days, never visiting | 7 | 3 to 99 | Pass |
| Share catching a Golden Carp in 30 days at its water | 0.66 | 0.5 to 1 | Pass |
| Share catching a Salmon in 30 days at its water | 0.84 | 0.5 to 1 | Pass |
| Share catching a Thornback Ray in 30 days at its water | 0.6 | 0.5 to 1 | Pass |

The last two "three-day" gates were added during S1: the first harness showed a three-day player never reaching River Bend, which the spec's gates did not check.

## Outcomes after 30 days (medians)

| Policy | Level | Species logged | Rod tier | Cooler tier | Fish a day, last week | River Bend day | Pier day |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Daily | 11 | 17 | 4 | 4 | 14 | 3.8 | 10.8 |
| Three-day | 11 | 15 | 3 | 3 | 11.64 | 6.8 | 24.8 |
| Never | 8 | 7 | 1 | 1 | 5.14 | not reached | not reached |

## Changes from the first draft

Each change came from a failing gate, in the order the harness found them.

1. **Bait is used by kept fish and ones that get away, not by every cast.** The draft's one unit per cast cost 96 units a day while a Bucket sells 6 fish, so bait took 99% of sales. A per-bite rule still wasted bait on fish released from a full cooler, which kept three-day players at the Millpond; a released fish now leaves the bait on. A quiet cast never uses bait.
2. **Bait tubs hold 12 fish and cost more** (worms 25, bread 20, maggots 30, spinner 240 for 72, ragworm 60, mackerel strip 75), with a 72-unit cap per bait. Bait is now 17% of a daily player's sales, inside the 15% to 40% target.
3. **Prices ×2.5 and XP ×2 for every species, and River Bend a further ×1.4.** At the draft's numbers level 4 took 5.4 days and nobody reached the Pier in 30 days; River Bend's jump from the Millpond was too small to fund the Pier.
4. **Millpond base bite 13%** (draft 16%), once bait no longer ran out: 12.5 fish a day.
5. **Cheaper early ladder:** Fibreglass Rod 250, Carbon Rod 700, Waders 250, Pier Permit 900, Cool Box 60, Chest Cooler 300. **Cooler sizes 6, 12, 18, 24** (draft 6, 10, 16, 24).
6. **Epic windows.** Golden Carp feeds at dawn and dusk in clear or overcast weather with its own draw weight of 22 (draft: dawn, clear, weight 10; 22% caught one). Salmon feeds at dawn and dusk in the rain (draft: any time in the rain; every angler caught one). Thornback Ray takes overcast or fog at night (draft: overcast only).
7. **Whiting and Pike** follow the draft's table literally: Whiting takes only ragworm; Pike's "overcast" in the draft's time column was dropped, so it feeds at dawn and dusk in any weather.

## Known limits

- A daily player owns every item by about day 15 and banks gold after that (3,160 at day 30). The sinks after the ladder are the next content release and the fly box, which is cosmetic. This is accepted for the MVP: the logbook, records and epics carry the month after the ladder.
- The never-visiting angler logs 7 species and reaches level 8 by catching and releasing, so it ranks on XP as decided (released fish earn full XP).
- The epic shares come from 50 anglers each and move by about ±0.1 between seeds.
