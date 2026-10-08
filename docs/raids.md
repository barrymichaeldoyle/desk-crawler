# Desk raids (D110)

Committed plan, 2026-10-08; built in five slices on 2026-10-08 and 2026-10-09, and live since the production switch to content v7 on 2026-10-09 ([evidence](evidence/raids.md)).

Source: a comment on Barry's plugin waiting-list post asked for multiplayer, "my TRMNL raiding (or getting raided) by other real devices". Barry's direction: raids are passive events that happen automatically; stances play a role (bold raids more often, a defensive stance wins more often); outcomes are purely random apart from the stance edge, so level and gear never make one hero stronger than another in a raid; the loser loses gold and more HP than the winner, who gains gold but still loses health; raids can kill; and there is no opting out. A player who does not want to lose raids picks a more defensive stance, which is the point: the stance choice carries more weight.

## What a player sees

- Logs speak from the hero's side, like every other story, and carry no amounts: the gold and HP changes sit beside the story as chips, as for every log line (D48). One morning Baz's device reads "Raided **Quill**'s desk while they were at lunch." with +14 gold and −9 HP, and Quill's, on its next adventure, "**Baz** raided the desk while nobody was looking." with −14 gold and −27 HP.
- A repelled raid reads the other way round: "Caught **Baz** raiding the desk and sent them packing." and "Caught red-handed at **Quill**'s desk and chased off."
- A raid that lands on a hero already low on HP can end in a knockout: the raid line stays the story and "Knocked out for 8 ticks." follows it, with the ordinary revival timer.
- The companion hero log shows raids with their own badge, the hero page shows the last five raids and a win/loss record, and the stance cards say what each stance does to raids.
- No push, email or device alert. No chat, no retaliation button, no trading, no setting. A raid is a story and a swing in gold and HP that every active hero is exposed to.

## Rules

### When a raid starts

A raid is one more thing that can happen on an exploring tick. After sustain (simulation order steps 6 and 7 in [gameplay](gameplay.md#simulation-order)) and before the ordinary encounter roll (step 8), the simulator takes one draw from a new `raid` stream. If the draw is under the hero's launch chance and the adapter found a target, the raid is that tick's whole event and no ordinary encounter happens. Otherwise the tick continues exactly as today.

The launch chance comes from the raider's stance. Starting values, per exploring tick: cautious 5‰, balanced 10‰, bold 20‰. At 96 ticks a day a balanced hero that explores all day launches about one raid a day, a bold one about two, a cautious one every other day. The harness sets the final values so that a typical hero sees a raid, from either side, most days but not several times a day.

The draw exists only under a catalog with raid rules, so content v6 and earlier replay unchanged, seed by seed. The `raid` stream is new and the four existing streams keep their seeds and draw order, so the simulation version stays 1. Its draws have fixed positions: 1 launch (permille), 2 where to look in the pool, 3 the target's new pool position, 4 the contest. The adapter must know whether to look for a target before calling the pure core: the core exports a pure `planRaid(streams, stance, content)` that takes draws 1 to 3 and returns the two shards when the launch hits, and the core takes the same draws from the same seed, so the two can never disagree.

### Who gets raided

Any active hero. Since level and gear play no part in the outcome, there is no level group to respect: a starter can raid a level-12 veteran and win as often as anyone else, and a veteran raiding a starter finds little gold at that desk. Picking is one bounded indexed read on a new `raidPool` table: every active hero has one row carrying a random shard; the adapter takes the first row at or after `planRaid`'s shard (wrapping once), then reads the target hero itself, live. When the raid happens, the picked row moves to `planRaid`'s second shard in the same patch that sets `raidedAtTick`. A fixed shard would leave a hero behind a wide gap picked far more often: the harness measured times targeted over 30 days at p10 2 / p90 44 with fixed shards and p10 14 / p90 27 with the move.

A target is raidable when all of these hold at pick time, otherwise the raid draw is spent, nothing is logged and the tick continues with the ordinary encounter ("nobody was at that desk" costs nothing):

- active, not the raider, not suspended, quarantined or deleting;
- exploring or resting (dead, travelling, paused and sleeping heroes are out: nobody raids an empty desk or a hospital bed);
- not raided in the last 24 ticks (six hours), so one hero is never everyone's target. The pool row stores `raidedAtTick`, patched when it is picked.

Two heroes on one account can raid each other; it is chance either way and there is nothing to farm, since gold only moves.

### Who wins

One contest roll from the `raid` stream decides it. The odds are 50/50 moved only by the two stances. Level, XP, attack, defense, gear, affixes and effects play no part, so a hero is never stronger in a raid for having played longer or found better gear.

```
edge(stance): cautious +10, balanced 0, bold -5
chance = 50 + edge(raider stance) - edge(target stance)
the raider wins on a roll under this
```

That gives a range of 35 (bold raiding cautious) to 65 (cautious raiding bold). Cautious is the defensive stance from both sides of a raid: it helps when defending and when raiding, so the trade-off the stances already carry (cautious earns 90% XP and rests early, bold earns 115% and lives dangerously) now has a social side. Bold raids four times as often as cautious and wins less often; cautious raids rarely and wins more. The two edge values are catalog numbers.

### What changes hands

| | Loser | Winner |
| --- | --- | --- |
| Gold | loses `floor(5% of current gold)`, the same rule as a retreat | gains exactly that amount |
| HP | loses `ceil(30% of maximum HP)` | loses `ceil(10% of maximum HP)` |

Gold is moved, never created: the winner's gain is the loser's loss, so raids cannot inflate the economy and a hero with no gold is a dull target but a cheap one. Thrifty gear (D81) takes its five points off the raid gold loss like any other gold loss.

HP losses are shares of maximum HP, not current HP, so they do not shrink as a hero weakens: a raid can kill. Lethal raid damage resolves exactly like lethal encounter damage ([gameplay](gameplay.md#death-and-safe-biome-protection)): outside Office Cubicles the hero dies, loses the ordinary 10% knockout gold on top of the raid's 5%, drops its effects and waits eight ticks for revival; in Office Cubicles the safe-biome rescue applies as it does for any encounter. The winner can be knocked out too, by its 10%, if it was already that low. A raider that loses can go down as well: a bold hero explores down to its 20% rest threshold and a lost raid costs 30%. That is bold's risk, and the harness counts it. A target applies its raid before sustain, so a resting target can go down. The harness reports knockouts caused by raids per stance; the percentages are tuned against that, never the death rule.

### How each side applies it

The raider applies its result inside its own tick, through the ordinary apply path: gold and HP change, death resolves if it comes to that, counters move, one log entry tells the story.

The target is not evaluated in the raider's transaction. The raider's tick inserts one `raids` ledger row (raider, target, tick, outcome, gold moved, the HP shares, both public names with their name versions) with the pair-and-tick key as its identity, so a retried batch cannot insert it twice. At the target's next evaluation the adapter reads its oldest pending raid and passes it to the pure core as `incomingRaid`. The core applies it at the start of the evaluation, after expired effects drop and an expired choice resolves, before sustain, as that tick's whole event, the way a defaulted choice is (D79): gold moves by the ledger amount clamped to what the hero has, HP by the share of maximum HP, death resolves normally, counters move, one log entry tells the story from the target's side. The result says `raidApplied` and the adapter marks that row applied in the same transaction. One per evaluation is enough: a hero is picked only while exploring or resting and never twice in 24 ticks, so a second pending raid needs unusual timing, and it simply lands on the next tick. Like an expired choice, a raid lands only on an exploring or resting hero: a dead, paused, sleeping or travelling hero keeps it pending until it is back, and a revived hero takes it at half HP on the tick after revival. The harness reports how often that chain knocks a hero down twice (zero in R1's runs).

The clamp means a target that spent its gold between the raid and the application loses less than the raider gained. That gap is the only gold a raid can create; the harness reports it and it is expected to be negligible, since the window is one tick.

Side effects commit at most once for both parties: the raider's inside its evaluation under its `lastTick` guard, the target's through the ledger row's state. That is the v1.2 gate for meetings, met by construction.

### Counters, achievements, recap

Four grow-only counters on the hero: `raidsLaunched`, `raidsWon`, `raidsRepelled`, `raidsLost` (lost as the target). Achievement catalog version 3 appends two families: Office raider (raids won: 1, 10, 50) and Desk defender (raids repelled: 1, 10, 50). The morning stand-up recap (D83) gains one fact behind a raid mark: raids won and lost in the period, read from the counter differences like every other fact. A raid knockout counts in `deaths` like any other.

### Names and privacy

A raid shows the other hero's public name, the same name the leaderboards already show. The ledger stores both names with their public-name versions and the read path masks a mismatched version the way rank rows do, so a repaired abusive name never resurfaces in someone's log. A raid log line links to the other hero's public profile only when that profile is on (D109). Account deletion removes the pool row and the hero's ledger rows in the existing deletion job; the other party keeps its log line, which is its own history. The privacy policy gains one line: your hero's public name can appear in another player's adventure log, as it already can on the leaderboards.

## Deliberate limits

- No opting out. Every active hero raids and can be raided; the stance is the only lever, by design.
- No raid can be aimed. Players cannot choose a target, retaliate, or see who is raidable.
- No stat, level, gear, affix or effect changes the odds. The stance edge is the whole skill element.
- No gear, potions, XP or bag contents change hands or are lost.
- No notification of any kind. The device and the log are the whole surface.
- No guild or group raids: the weekly shared raid stays in v2.1 and reuses this ledger shape (stable ids, one row per contribution, applied once).
- No new stance. The three existing ones gain a raid dimension; their sustain thresholds and XP scales do not change.

## Work slices

Each slice ships on its own, keeps every earlier payload and template meaning, and preserves progress. Order is a commitment.

| Slice | Scope | Done when |
| --- | --- | --- |
| R1 Rules and harness (done 2026-10-08, [evidence](evidence/raids.md)) | Content v7 (`raids` rules, validator), pure core: `wantsRaid`, the contest resolver, the incoming-raid application with death, a `raid` log outcome variant with both perspectives, the four counters, narrative variants for the four cases from both sides plus the knockout wording (device-compact and full). Harness scenario with a synthetic pool measuring raids per hero-day, gold flow and the clamp gap, HP lost, knockouts caused by raids and the revival-then-raided chain, and the win rate per stance pairing. Evidence in `docs/evidence/raids.md` | v6 replays unchanged seed by seed; raids create no gold beyond the clamp gap; win rates match the stance table within sampling error; knockouts per hero-day rise by less than one point for cautious heroes; cautious, balanced and bold each still win on at least one measure |
| R2 Backend (built 2026-10-08; the production switch ran after R3 to R5, on 2026-10-09) | Schema: `raidPool` (hero, shard, `raidedAtTick`), `raids` ledger (pair-and-tick key, state pending/applied, indexes by raider, by target and state). Adapter: pre-draw, target pick, live eligibility check, ledger insert, pending application and marking. Pool maintenance on activation, suspension, quarantine, deletion. `raids.recent` query (last five, both directions, masked names). Production content switch to v7 between runs | Both sides' side effects commit once under duplicate workers and retries (tests); bounded reads per tick stay at one pool take, one target get and one pending take; the deletion runbook covers the two tables |
| R3 Companion (done 2026-10-08) | Hero log raid badge and lines, Raids card on the hero page (record and last five), stance cards state launch and win edges, help page section, privacy policy line | Phone previews pass per [companion QA](evidence/companion-phone-polish.md) conventions |
| R4 Device (done 2026-10-08, template v48) | Raid stories fit the four layouts and the X mashups, recap raid fact and mark, template version bump, preview sweep | Every layout case in the sweep renders the longest raid line without clipping |
| R5 Achievements and profile (done 2026-10-08) | Achievement catalog version 3 with the two families, public profile shows the raid record, `admin:engagement` reports raid counters, analytics doc updated | Rarity publishes for the new families; the profile projection stays public-safe |

R1 blocks the rest. R2 can start on the schema and adapter while R1's harness runs, but the production switch waits for R1's gate. R3 and R4 are independent of each other once R2's query exists. R5 is last so the families count real raids from day one of the switch.

## Numbers

R1's harness kept the starting values, since they pass the gate ([evidence](evidence/raids.md)): launch 5/10/20‰ for cautious/balanced/bold, edges +10/0/−5, a 5% gold loss for the loser, 30%/10% HP shares, a 24-tick target cooldown, and one incoming raid per evaluation. The production switch records them in the D110 row.
