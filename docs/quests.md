# Office to-do list: daily quests (P31)

Proposed 2026-10-09 for Barry's review and revised the same day with the open questions settled (see [Decisions taken in this revision](#decisions-taken-in-this-revision)). Approved and being built as D112 on 2026-10-09, as content v9: Q1 (rules and harness), Q2 (backend) and Q3 (companion and help) are done, [evidence](evidence/quests.md). [Changes while building](#changes-while-building) lists where the build differs from this spec. This spec is the v1.1 "Daily quests" stretch row in the [roadmap](roadmap.md). Its companions are the [desk drawer](desk-drawer.md) (P32) and [alerts](alerts.md) (P33).

Source: the original brief listed "three local-day quests, shards/keys" and parked them until the timezone, DST and abuse rules were designed ([source brief](source-brief.md)). Two product rules shape this design. [Product](product.md) rules out streak penalties, expiring rewards and daily login requirements, and [TRMNL experience](trmnl-experience.md) rules out urgency and streak pressure. A quest system that punishes a missed day breaks the game's promise, so this one doesn't.

## The idea in one paragraph

Every hero has an office to-do list of three small tasks, such as "Defeat 4 Paper Imps", "Find 2 pieces of gear" or "Explore the Server Room for 8 adventures". The hero works through them on its own as it adventures. When a task is done, the hero ticks it off on the device and gets a small gold reward. Each morning the stand-up hands out new tasks for any finished slots and the device says what they are. Unfinished tasks are never taken away and never cost anything. A player who never opens the companion still finishes tasks, because the list is written for where the hero actually is. A player who does open it can steer, for example by travelling to the biome a task names, or swap a task they dislike once a day.

## What a player sees

- **Device:** a finished task is a log line with its own checkbox glyph, such as "Ticked off: Defeat 4 Paper Imps.", with the gold as a chip beside it (D48). The morning refill is a log line too: "Stand-up: Dodge 3 traps. Win 10 fights." in full layouts and "Stand-up: 2 new tasks." where the line is compact, so the device shows the list once a day at the moment the Night recap appears (D84). The Night and Day recaps gain one fact, "2 tasks". The device shows no standing list, progress bars, countdown or reset time.
- **Companion:** a To-do card on the hero page lists the three tasks, each with a progress bar ("3/4"), its reward, a "Done" tick for a finished slot waiting for the morning, and a Swap link while today's swap is unused. A single line says when new tasks arrive ("New tasks at the 07:00 stand-up").
- **Help page:** a To-do list section explains that tasks never expire, the hero does them unattended, rewards are gold only, and swapping is optional.
- **Achievements:** the next catalog version adds a "Tasks done" family (1, 10, 50, 250) under Lifetime.

No alert, streak, bonus for finishing all three, or "come back tomorrow" message. A full list of finished tasks isn't an attention line either, because nothing is waiting on the player.

## Rules

### Tasks

A task is a catalog template plus a target. The content version that introduces the system adds `todo` rules: templates, target ranges, rewards and the refill hour. Templates only count things the pure core already resolves in a tick, so progress is exact and needs no extra reads:

| Kind | Example | Counts |
| --- | --- | --- |
| `defeat_monster` | Defeat 4 Paper Imps | combat wins against that monster |
| `defeat_any` | Win 10 fights | combat wins |
| `explore_biome` | Explore the Server Room for 8 adventures | exploring ticks spent in that biome |
| `find_gear` | Find 2 pieces of gear | gear finds, held finds and desk drawer finds included |
| `earn_gold` | Earn 150 gold on adventures | `goldEarned` from encounters (never sales, raids or task rewards) |
| `avoid_traps` | Dodge 3 traps | traps avoided |
| `elite` | Beat an elite | elite wins (offered from level 4; elites are 3% of fights, so about one a day) |

Generation is eligibility-aware and place-aware. A task names only a biome the hero has unlocked and a monster from an unlocked biome. Its target is sized so a typical exploring hero finishes it in about 4 to 16 hours. No two tasks on one list share a kind. Targets scale with the biome tier where the kind has one.

The list is written for where the hero is. **At least two of the three tasks are finishable where the hero stands**: biome-free, or naming the hero's current biome (or its pending destination when it is travelling). **At most one task names another unlocked biome**, and only once the hero has unlocked more than one. That one task is the invitation to travel; a hero that never travels still finishes two thirds of every list unattended, and the stale rule below swaps the third. Named monsters stay, because "Defeat 4 Paper Imps" has more charm than "Win 4 fights", and because a monster task names a biome, the two-of-three rule keeps most monster tasks local.

A task tracks progress only while the hero explores, and progress never goes down. Death, rest, travel, sleep and pause just stop it from moving. A finished task pays out in the same tick it completes, through the ordinary apply path. That reward line is the tick's extra log entry, after the encounter. It is never the tick's whole event, so tasks never take the place of an adventure.

### Rewards

Rewards are **gold only**, from a catalog table keyed by biome tier. The starting point is about 35 gold per task at tier 1, scaling with the loot table. The harness tunes it so three tasks a day add about 15% to a typical hero's daily gold (gate: 12% to 18%). Gold has three sinks today (bags, pouch, merchant), so more gold is a real reward, and it speeds the bag ladder for the players the [desk drawer](desk-drawer.md) is also helping.

Tasks award no XP. XP is what the boards rank, and any XP from tasks would make swaps and steering a small ranking lever, turning a calm list into something to optimise. With gold only, ranks stay purely about adventuring, nobody can gain a place on a board by managing a list, and the reward needs no board-impact tuning. The "Tasks done" achievement family is the recognition for the list itself.

This system adds no shards, keys or new currency. The brief's shards/keys would be a currency with nothing to spend it on, which the roadmap already rejects for salvage materials. A currency can come later when v2.0 gives it a use (gear upgrades or prestige).

### When new tasks arrive (the day boundary)

The design avoids the timezone, DST and abuse risks through three rules.

1. **New tasks fill only finished slots.** An unfinished task stays on the list. A missed day costs nothing, and refilling twice in one day can only replace finished slots, so the most anyone can gain is the reward of tasks they've already done.
2. **The refill happens at the hero's 07:00, the Night recap boundary (D75, D84).** The morning stand-up hands out the day's tasks. 07:00 local time comes from the last `utc_offset` TRMNL sent on a screen request. The screen route already parses it. New: the route stores it on the user when it changes (`users.trmnlUtcOffset`), with one small mutation that runs only when the value differs from the stored one. Without an offset the refill happens at 07:00 UTC, the same fallback as the recap (D106). The simulator takes the offset as part of the hero's input, so evaluation stays pure and deterministic, and the tick runner already reads the owner (`sim/runs/tick.ts`), so this adds no read.
3. **There must be at least 20 hours between refills.** Changing the TRMNL timezone, or a DST shift, can move the next 07:00 earlier, but never closer than 20 hours to the last refill. The worst case for someone gaming their timezone is a little over one refill a day, and rule 1 already limits what they gain to rewards for finished tasks. In practice the change is invisible to them.

The hero stores `todo.lastRefillTick`. The refill runs at the first exploring, resting or sleeping evaluation at or after the hero's next 07:00 that is also at least 80 ticks after the last refill. A paused or dead hero refills when it next takes part. Refilling doesn't need the player to visit, so an unattended hero gets new tasks every morning too. The refill tick's extra log line is the stand-up line above, so the only day the device says nothing is a day with no finished slot to refill.

### Swaps and stale tasks

- **Swap:** `heroes.swapTask(slot)` is a receipted intent. It replaces one unfinished task with a newly generated one of a different kind, and progress on the old task is dropped. A hero gets one swap per refill period, and an unused swap doesn't carry over. The swap draws from the hero's `quest` stream at the intent's tick position, so it is deterministic and can't be rerolled by retrying. A swap obeys the two-of-three place rule, so swapping the away-biome task yields a local one.
- **Stale tasks:** a task that has gone **two refills** without finishing is swapped automatically at the next refill. Tasks are sized for 4 to 16 hours, so two whole refill periods without progress means the hero can't reach it in practice, such as a Cafeteria task after the hero settled in the Office. Since the simulator does it on a schedule, it isn't something a player has to manage, and a list is never stuck for more than about two days.

### Determinism and versions

Task generation draws from a new `quest` stream. As with the D110 `raid` stream, each stream hashes on its own name, so the existing streams keep their seeds and replays of earlier content stay identical. The simulation version stays 1. The whole system exists only under a catalog with `todo` rules. It takes its own content version (v8 if it ships first, otherwise the one after the [desk drawer](desk-drawer.md)), so each system's replay gate stands alone. The first evaluation of each hero under that catalog fills its list with three tasks, which is the backfill, and it needs no migration job.

## Data

One optional hero field, with no new table:

```
todo?: {
  tasks: Array<{ templateId, params, target, progress, addedTick, refillsSeen, doneTick? }>  // exactly 3
  lastRefillTick: number
  swapUsedTick?: number
}
```

One optional user field: `trmnlUtcOffset?: number`, in seconds, written only on change. One counter: `tasksCompleted`. Reads per tick are unchanged and writes go into the hero patch the tick already makes. The payload adds nothing for the list. The task and stand-up log lines ride the existing `log`, and the recap fact rides the existing recap aggregation over counter differences.

## Deliberate limits

- Tasks never expire with lost rewards, never stack beyond three, and never require a visit.
- No streak bonus, all-three bonus or login reward.
- No XP from tasks, so the boards stay about adventuring.
- No paid or gold-bought rerolls. The one free swap is the whole lever.
- No task asks for something outside the hero's own adventure, such as "sell 5 items", "visit the companion" or "check your TRMNL". Tasks reward the game, not engagement.
- No social tasks ("win 2 raids") in this version. Raids are pure chance with no opt-out, so a raid task would reward luck and could feel like a nudge to pick the bold stance.

## Work slices

| Slice | Scope | Done when |
| --- | --- | --- |
| Q1 Rules and harness | `todo` rules and validator, the `quest` stream, place-aware generation, progress, completion, refill with the 20-hour floor, stale swap, `tasksCompleted`, the task and stand-up log variants (device-compact and full). Harness reports: tasks finished per hero-day by cohort (unattended, daily, three-day, seven-day), extra gold share, time to finish by kind, stale-swap rate | Earlier content replays unchanged seed by seed; unattended heroes finish at least two tasks on most days; gold added stays within 12% to 18%; timezone-change abuse in the harness stays at or under 1.25 refills a day |
| Q2 Backend | Hero field, `users.trmnlUtcOffset` written on change from the screen route, `heroes.swapTask` receipted intent, the hero query returns the list | Duplicate swap receipts can't swap twice; no extra reads per tick; offset writes happen only on change (test) |
| Q3 Companion and help | To-do card, swap flow, help section, analytics `task swapped` (template id only) | Phone previews pass at 390 wide |
| Q4 Device | Checkbox glyph, task and stand-up log lines fit all four layouts and the X mashups, recap fact, template bump, preview sweep | The longest task line and a three-task stand-up line render without clipping in every sweep case |
| Q5 Achievements | Next catalog version with Tasks done | Rarity publishes for the new family |

## Decisions taken in this revision

Barry asked on 2026-10-09 for the three stretch specs to be revised for the best gameplay, with the open questions settled rather than left for him.

1. **Name: To-do list and tasks.** The game already speaks office (stand-up, retro, Desk Crawler), and "quests" would be the one fantasy word on the screen. The roadmap row keeps the brief's "Daily quests" title for traceability.
2. **Rewards are gold only.** Gold is the reward players can spend, it helps the bag ladder, and keeping XP out of tasks keeps the boards about adventuring and removes the only way to turn swaps into a ranking lever. The board-share gate from the first draft is gone because there is nothing to gate.
3. **Tasks name monsters, and the list is place-aware.** Two of three tasks are finishable where the hero stands and at most one names another biome, so the charm of named monsters costs an unattended hero nothing. Stale swap moves from three refills to two for the same reason.
4. **Added the stand-up log line**, so the device shows the day's tasks once, at the same moment the Night recap appears.

## Changes while building

The harness and the build changed these points, each for a measured or structural reason:

1. **Rewards are 5, 16 and 30 gold** by biome tier, not 35 at tier 1. Encounters pay about 75 gold a day at tier 1, so 35 a task added 58% to 110%. At 5/16/30, three tasks add 13.9% to 14.4% for daily, three-day and seven-day players. The extremes are 11.9% for a hero farming the Office and 15.7% for an unattended one ([evidence](evidence/quests.md)).
2. **The 20-hour floor is measured from the last stand-up's 07:00, not the refill tick.** Measured from the tick, a hero that came back from a pause at 23:00 would refill at 23:00, then 19:00, 15:00 and 11:00 before getting back to 07:00. Anchored on the stand-up it was due at, a late refill never delays the next morning. The abuse bound is unchanged at one refill per 20 hours of wall time. The list stores `lastStandupAt` (UTC milliseconds of that 07:00) beside `lastRefillTick`, and the simulator takes the tick's wall slot as input, so it stays pure.
3. **A morning slept through on a full bag doesn't age a task.** Otherwise an unattended hero's list churned every two days while it couldn't move (71% of its tasks were stale-swapped). The refill still runs and still fills finished slots.
4. **Task shape.** `params` became explicit `biomeId` and `monsterId` fields, and each task stores its `reward` when written, so a later catalog never changes what a written task pays.
5. **Labels** are short enough that most stand-ups name every task: "Explore the Server Room for 16 adventures", "Earn 50 gold adventuring", "Beat an elite". A line that would exceed the 90-character summary falls back to the count ("Stand-up: 3 new tasks."), and the log detail keeps every label for layouts with room.
6. **Elite tasks** are offered from level 4 in the Server Room and Cafeteria Depths only. In the Office an elite takes about 28 hours of exploring.
