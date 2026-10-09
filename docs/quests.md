# Office to-do list: daily quests (P31)

Proposed 2026-10-09 for Barry's review; not approved, nothing built. This spec is the v1.1 "Daily quests" stretch row in the [roadmap](roadmap.md). Its companions are [lost-and-found](lost-and-found.md) (P32) and [alerts](alerts.md) (P33).

Source: the original brief listed "three local-day quests, shards/keys" and parked them until the timezone, DST and abuse rules were designed ([source brief](source-brief.md)). Two product rules shape this design. [Product](product.md) rules out streak penalties, expiring rewards and daily login requirements, and [TRMNL experience](trmnl-experience.md) rules out urgency and streak pressure. A quest system that punishes a missed day breaks the game's promise, so this one doesn't.

## The idea in one paragraph

Every hero has an office to-do list of three small tasks, such as "Defeat 4 Paper Imps", "Find 2 pieces of gear" or "Explore the Server Room for 8 adventures". The hero works through them on its own as it adventures. When a task is done, the hero ticks it off on the device and gets a small reward. Each morning the stand-up hands out new tasks for any finished slots. Unfinished tasks are never taken away and never cost anything. A player who never opens the companion still finishes tasks. A player who does open it can steer, for example by travelling to the biome a task names, or swap a task they dislike once a day.

## What a player sees

- **Device:** a finished task is a log line with its own checkbox glyph, such as "Ticked off: Defeat 4 Paper Imps.", with the reward as chips beside it (D48). The Night and Day recaps gain one fact, "2 tasks". The device shows no list, progress bars, countdown or reset time.
- **Companion:** a To-do card on the hero page lists the three tasks, each with a progress bar ("3/4"), its reward, a "Done" tick for a finished slot waiting for the morning, and a Swap link while today's swap is unused. A single line says when new tasks arrive ("New tasks at the 07:00 stand-up").
- **Help page:** a To-do list section explains that tasks never expire, the hero does them unattended, and swapping is optional.
- **Achievements:** catalog version 4 adds a "Tasks done" family (1, 10, 50, 250) under Lifetime.

No alert, streak, bonus for finishing all three, or "come back tomorrow" message. A full list of finished tasks isn't an attention line either, because nothing is waiting on the player.

## Rules

### Tasks

A task is a catalog template plus a target. Content v8 adds `todo` rules: templates, target ranges, rewards and the refill hour. Templates only count things the pure core already resolves in a tick, so progress is exact and needs no extra reads:

| Kind | Example | Counts |
| --- | --- | --- |
| `defeat_monster` | Defeat 4 Paper Imps | combat wins against that monster |
| `defeat_any` | Win 10 fights | combat wins |
| `explore_biome` | Explore the Server Room for 8 adventures | exploring ticks spent in that biome |
| `find_gear` | Find 2 pieces of gear | gear finds, held finds and lost-and-found finds included |
| `earn_gold` | Earn 150 gold on adventures | `goldEarned` from encounters (never sales, raids or task rewards) |
| `avoid_traps` | Dodge 3 traps | traps avoided |
| `elite` | Beat an elite | elite wins (offered from level 4; elites are 3% of fights, so about one a day) |

Generation is eligibility-aware. A task names only a biome the hero has unlocked and a monster from an unlocked biome. Its target is sized so a typical exploring hero finishes it in about 4 to 16 hours. No two tasks on one list share a kind. At least one of the three is biome-free, so a hero that never travels still finishes most of its list. Targets scale with the biome tier where the kind has one.

A task tracks progress only while the hero explores, and progress never goes down. Death, rest, travel, sleep and pause just stop it from moving. A finished task pays out in the same tick it completes, through the ordinary apply path: gold, plus a small amount of XP. That reward line is the tick's extra log entry, after the encounter. It is never the tick's whole event, so tasks never take the place of an adventure.

### Rewards

Rewards are gold and XP from catalog tables keyed by biome tier. The starting point is about 25 gold and 15 XP per task at tier 1, scaling with the loot table. The harness tunes them so three tasks a day add about 10% to a typical hero's daily gold and under 5% to its XP. Task XP counts toward the recent boards like any other XP. Keeping it small protects the boards from becoming a quest race.

This system adds no shards, keys or new currency. The brief's shards/keys would be a currency with nothing to spend it on, which the roadmap already rejects for salvage materials. A currency can come later when v2.0 gives it a use (gear upgrades or prestige). Gold has three sinks today (bags, pouch, merchant), so more gold is a real reward.

### When new tasks arrive (the day boundary)

The design avoids the timezone, DST and abuse risks through three rules.

1. **New tasks fill only finished slots.** An unfinished task stays on the list. A missed day costs nothing, and refilling twice in one day can only replace finished slots, so the most anyone can gain is the reward of tasks they've already done.
2. **The refill happens at the hero's 07:00, the Night recap boundary (D75, D84).** The morning stand-up hands out the day's tasks. 07:00 local time comes from the last `utc_offset` TRMNL sent on a screen request. The screen route already parses it. New: the route stores it on the user when it changes (`users.trmnlUtcOffset`), with one small mutation that runs only when the value differs from the stored one. Without an offset the refill happens at 07:00 UTC, the same fallback as the recap (D106). The simulator takes the offset as part of the hero's input, so evaluation stays pure and deterministic, and the tick runner already reads the owner (`sim/runs/tick.ts`), so this adds no read.
3. **There must be at least 20 hours between refills.** Changing the TRMNL timezone, or a DST shift, can move the next 07:00 earlier, but never closer than 20 hours to the last refill. The worst case for someone gaming their timezone is a little over one refill a day, and rule 1 already limits what they gain to rewards for finished tasks. In practice the change is invisible to them.

The hero stores `todo.lastRefillTick`. The refill runs at the first exploring, resting or sleeping evaluation at or after the hero's next 07:00 that is also at least 80 ticks after the last refill. A paused or dead hero refills when it next takes part. Refilling doesn't need the player to visit, so an unattended hero gets new tasks every morning too.

### Swaps and stale tasks

- **Swap:** `heroes.swapTask(slot)` is a receipted intent. It replaces one unfinished task with a newly generated one of a different kind, and progress on the old task is dropped. A hero gets one swap per refill period, and an unused swap doesn't carry over. The swap draws from the hero's `quest` stream at the intent's tick position, so it is deterministic and can't be rerolled by retrying.
- **Stale tasks:** a task that has gone three refills without finishing is swapped automatically at the next refill. This keeps a list from getting stuck on a task the hero can't reach in practice, such as a Cafeteria task after the hero settled in the Office. Since the simulator does it on a schedule, it isn't something a player has to manage.

### Determinism and versions

Task generation draws from a new `quest` stream. As with the D110 `raid` stream, each stream hashes on its own name, so the five existing streams keep their seeds and replays of content v7 and earlier stay identical. The simulation version stays 1. The whole system exists only under a catalog with `todo` rules. The first content v8 evaluation of each hero fills its list with three tasks, which is the backfill, and it needs no migration job.

## Data

One optional hero field, with no new table:

```
todo?: {
  tasks: Array<{ templateId, params, target, progress, addedTick, refillsSeen, doneTick? }>  // exactly 3
  lastRefillTick: number
  swapUsedTick?: number
}
```

One optional user field: `trmnlUtcOffset?: number`, in seconds, written only on change. One counter: `tasksCompleted`. Reads per tick are unchanged and writes go into the hero patch the tick already makes. The payload adds nothing for the list. The task log line rides the existing `log`, and the recap fact rides the existing recap aggregation over counter differences.

## Deliberate limits

- Tasks never expire with lost rewards, never stack beyond three, and never require a visit.
- No streak bonus, all-three bonus or login reward.
- No paid or gold-bought rerolls. The one free swap is the whole lever.
- No task asks for something outside the hero's own adventure, such as "sell 5 items", "visit the companion" or "check your TRMNL". Tasks reward the game, not engagement.
- No social tasks ("win 2 raids") in this version. Raids are pure chance with no opt-out, so a raid task would reward luck and could feel like a nudge to pick the bold stance.

## Work slices

| Slice | Scope | Done when |
| --- | --- | --- |
| Q1 Rules and harness | Content v8 `todo` rules and validator, the `quest` stream, generation, progress, completion, refill with the 20-hour floor, stale swap, `tasksCompleted`, the task log variant (device-compact and full). Harness reports: tasks finished per hero-day by cohort (unattended, daily, three-day, seven-day), extra gold and XP share, time to finish by kind, stale-swap rate | v7 replays unchanged seed by seed; unattended heroes finish at least two tasks on most days; gold added stays at or under 12% and XP at or under 5%; timezone-change abuse in the harness stays at or under 1.25 refills a day |
| Q2 Backend | Hero field, `users.trmnlUtcOffset` written on change from the screen route, `heroes.swapTask` receipted intent, the hero query returns the list | Duplicate swap receipts can't swap twice; no extra reads per tick; offset writes happen only on change (test) |
| Q3 Companion and help | To-do card, swap flow, help section, analytics `task swapped` (template id only) | Phone previews pass at 390 wide |
| Q4 Device | Checkbox glyph, task log line fits all four layouts and the X mashups, recap fact, template bump, preview sweep | The longest task line renders without clipping in every sweep case |
| Q5 Achievements | Catalog version 4 with Tasks done | Rarity publishes for the new family |

## Questions for Barry

1. Name: "To-do list" and "tasks" (office theme) or "Daily quests"? This spec uses the office words.
2. Should rewards include XP, or gold only? XP moves the boards slightly. Gold only keeps ranks purely about adventuring.
3. Should tasks name specific monsters? It's more charming, but "Defeat 4 Paper Imps" is a nudge to travel. The biome-free slot keeps it optional either way.
