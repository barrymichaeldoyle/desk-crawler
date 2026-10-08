# Desk raids (D110)

Committed plan, 2026-10-08. The first v1.2 social system after public profiles (D109): heroes raid each other's desks automatically, by chance, while their owners are away. Nothing about a raid needs a hand. Mechanics and sequence are confirmed; every number is a content-catalog value the harness tunes before the production switch, as with every system since D61.

Source: a comment on Barry's plugin waiting-list post asked for multiplayer, "my TRMNL raiding (or getting raided) by other real devices". Barry's direction: raids are passive events that happen automatically, stances play a role (bold raids more often, a defensive stance wins more often), everything stays chance driven, and the loser loses gold and more HP than the winner, who gains gold but still loses health.

## What a player sees

- One morning the device reads "Baz raided Quill's desk and left with 14 gold." and the other device, on its next adventure, "Quill's desk was raided by Baz: −14 gold, −9 HP."
- A repelled raid reads the other way round: "Quill caught Baz raiding and sent them packing: +6 gold" and "Baz's raid on Quill's desk failed: −6 gold, −11 HP."
- The companion hero log shows raids with their own badge, the hero page shows the last five raids and a win/loss record, and the stance cards say what each stance does to raids.
- Settings has a "Desk raids" toggle. Off means the hero neither raids nor can be raided. Default on: a raid is part of the passive game like a trap, and the toggle exists for players who would rather not meet anyone.
- No push, email or device alert. No chat, no retaliation button, no trading. A raid is never more than a story and a small swing in gold and HP.

## Rules

### When a raid starts

A raid is one more thing that can happen on an exploring tick. After sustain (simulation order steps 6 and 7 in [gameplay](gameplay.md#simulation-order)) and before the ordinary encounter roll (step 8), the simulator takes one draw from a new `raid` stream. If the draw is under the hero's launch chance and the adapter found a target, the raid is that tick's whole event and no ordinary encounter happens. Otherwise the tick continues exactly as today.

The launch chance comes from the raider's stance. Starting values, per exploring tick: cautious 5‰, balanced 10‰, bold 20‰. At 96 ticks a day a balanced hero that explores all day launches about one raid a day, a bold one about two, a cautious one every other day. The harness sets the final values so that a typical hero sees a raid, from either side, most days but not several times a day.

The draw exists only under a catalog with raid rules, so content v6 and earlier replay unchanged, seed by seed. The `raid` stream is new and the four existing streams keep their draw order, so the simulation version stays 1. The adapter must know whether to look for a target before calling the pure core: the core exports a pure `wantsRaid(streams, stance, content)` that takes the first `raid` draw, and the core's own first `raid` draw is the same number, so the two can never disagree.

### Who gets raided

The target comes from the raider's own level group, the same recent-XP group as its seven-day board, so a level-12 hero in best-in-slot gear never raids a level-2 starter. Picking is one bounded indexed read on a new `raidPool` table: every raidable hero has one row carrying its level group and a fixed random shard; the adapter draws a shard from the `raid` stream and takes the first row at or after it in that group (wrapping once). It then reads the target hero itself, live.

A target is raidable when all of these hold at pick time, otherwise the raid draw is spent, nothing is logged and the tick continues with the ordinary encounter ("nobody was at that desk" costs nothing):

- active, not the raider, not suspended, quarantined or deleting, raids not turned off;
- exploring or resting (dead, travelling, paused and sleeping heroes are out: nobody raids an empty desk or a hospital bed);
- not raided in the last 24 ticks (six hours), so one hero is never the whole group's target. The pool row stores `raidedAtTick`, patched when it is picked.

A level group with nobody else in it just never produces raids. Two heroes on one account can raid each other; it is chance either way and there is nothing to farm, since gold only moves.

### Who wins

One contest roll from the `raid` stream decides it. Everything is chance; stats and stances move the odds and never settle them.

```
power      = attack + floor(defense / 2)          for each side, with affixes and effects applied as in combat
spread     = clamp(raiderPower - targetPower, -15, +15)
base       = 50 + 2 * spread                      so stats move the odds by at most 30 points
stanceEdge = edge(raider stance) - edge(target stance)
               edge: cautious +10, balanced 0, bold -5
chance     = clamp(base + stanceEdge, 15, 85)     the raider wins on a roll under this
```

Cautious is the defensive stance: it helps both when defending and when raiding, so the trade-off the stances already carry (cautious earns 90% XP and never knocks out, bold earns 115% and lives dangerously) now has a social side. Bold raids twice as often as balanced but wins a little less often; cautious raids rarely and wins more. Every value is a catalog number.

### What changes hands

| | Loser | Winner |
| --- | --- | --- |
| Gold | loses `floor(5% of current gold)`, the same rule as a retreat | gains exactly that amount |
| HP | loses `ceil(30% of current HP)`, never below 1 HP | loses `ceil(10% of current HP)`, never below 1 HP |

Gold is moved, never created: the winner's gain is the loser's loss, so raids cannot inflate the economy and a hero with no gold is a dull target but a cheap one. A raid never kills: both sides keep at least 1 HP, so a raid cannot start a revival timer or trigger the knockout gold loss. The real risk is going into the next encounter low on HP, which the stances' sustain thresholds handle as they do after any trap. Thrifty gear (D81) takes its five points off the raid gold loss like any other gold loss. The harness checks how many knockouts the HP losses cause downstream and tunes the percentages against that.

### How each side applies it

The raider applies its result inside its own tick, through the ordinary apply path: gold and HP change, counters move, one log entry tells the story.

The target is not evaluated in the raider's transaction. The raider's tick inserts one `raids` ledger row (raider, target, tick, outcome, gold moved, the HP percentages, both public names with their name versions) with the pair-and-tick key as its identity, so a retried batch cannot insert it twice. At the target's next evaluation the adapter reads its pending raids (at most three, oldest first) and passes them to the pure core as inputs. The core applies them at the start of the evaluation, after expired effects drop and before sustain, as that tick's whole event, the way a defaulted choice is (D79): gold moves by the ledger amount clamped to what the hero has, HP by the percentage of current HP with the 1 HP floor, counters move, one log entry tells the story from the target's side. The adapter marks the rows applied in the same transaction. A dead hero leaves its raids pending until the evaluation that revives it. Paused and sleeping heroes are evaluated on publication runs, so a raid against a hero that paused after being picked lands within the hour.

The clamp means a target that spent its gold between the raid and the application loses less than the raider gained. That gap is the only gold a raid can create; the harness reports it and it is expected to be negligible, since the window is one tick.

Side effects commit at most once for both parties: the raider's inside its evaluation under its `lastTick` guard, the target's through the ledger row's state. That is the v1.2 gate for meetings, met by construction.

### Counters, achievements, recap

Four grow-only counters on the hero: `raidsLaunched`, `raidsWon`, `raidsRepelled`, `raidsLost` (lost as the target). Achievement catalog version 3 appends two families: Office raider (raids won: 1, 10, 50) and Desk defender (raids repelled: 1, 10, 50). The morning stand-up recap (D83) gains one fact behind a raid mark: raids won and lost in the period, read from the counter differences like every other fact.

### Names and privacy

A raid shows the other hero's public name, the same name the leaderboards already show. The ledger stores both names with their public-name versions and the read path masks a mismatched version the way rank rows do, so a repaired abusive name never resurfaces in someone's log. A raid log line links to the other hero's public profile only when that profile is on (D109). Turning raids off removes the pool row at once; past log lines stay, as they are the hero's own history. Account deletion removes the pool row and the hero's ledger rows in the existing deletion job. The privacy policy gains one line: with raids on, your hero's public name can appear in another player's adventure log.

## Deliberate limits

- No raid can be aimed. Players cannot choose a target, retaliate, or see who is raidable.
- No gear, potions, XP or bag contents change hands or are lost.
- No notification of any kind. The device and the log are the whole surface.
- No guild or group raids: the weekly shared raid stays in v2.1 and reuses this ledger shape (stable ids, one row per contribution, applied once).
- No new stance. The three existing ones gain a raid dimension; their sustain thresholds and XP scales do not change.

## Work slices

Each slice ships on its own, keeps every earlier payload and template meaning, and preserves progress. Order is a commitment.

| Slice | Scope | Done when |
| --- | --- | --- |
| R1 Rules and harness | Content v7 (`raids` rules, validator), pure core: `wantsRaid`, the contest resolver, the incoming-raid application, a `raid` log outcome variant with both perspectives, the four counters, narrative variants for the four cases from both sides (device-compact and full). Harness scenario with a synthetic pool measuring raids per hero-day, gold flow and the clamp gap, HP lost, knockouts within three ticks of a raid, and the win rate per stance pairing. Evidence in `docs/evidence/raids.md` | v6 replays unchanged seed by seed; raids create no gold beyond the clamp gap; knockouts per hero-day rise by less than half a point for every stance; no stance pairing wins outside 15–85%; cautious, balanced and bold each still win on at least one measure |
| R2 Backend | Schema: `raidPool` (hero, level group, shard, `raidedAtTick`), `raids` ledger (pair-and-tick key, state pending/applied, indexes by raider, by target and state). Adapter: pre-draw, target pick, live eligibility check, ledger insert, pending application and marking. `heroes.setRaids` (receipted, maintains the pool row), pool maintenance on activation, level-group change, suspension, deletion. `raids.recent` query (last five, both directions, masked names). Production content switch to v7 between runs | Both sides' side effects commit once under duplicate workers and retries (tests); bounded reads per tick stay at one pool take, one target get and one pending take; the deletion runbook covers the two tables |
| R3 Companion | Hero log raid badge and lines, Raids card on the hero page (record and last five), stance cards state launch and win edges, Settings toggle, help page section, privacy policy line | Phone previews pass per [companion QA](evidence/companion-phone-polish.md) conventions; the toggle is receipted and idempotent |
| R4 Device | Raid stories fit the four layouts and the X mashups, recap raid fact and mark, template version bump, preview sweep | Every layout case in the sweep renders the longest raid line without clipping |
| R5 Achievements and profile | Achievement catalog version 3 with the two families, public profile shows the raid record, `admin:engagement` reports raid counters, analytics doc updated | Rarity publishes for the new families; the profile projection stays public-safe |

R1 blocks the rest. R2 can start on the schema and adapter while R1's harness runs, but the production switch waits for R1's gate. R3 and R4 are independent of each other once R2's query exists. R5 is last so the families count real raids from day one of the switch.

## Open numbers for the harness

Launch chances per stance, the power spread and its cap, the stance edges, the 15–85 clamp, the 5% gold rule, the 30%/10% HP rule, the 24-tick target cooldown and the three-raid application bound. The harness run that settles them is the R1 gate; its evidence names the final values and the production switch records them in the D110 row.
