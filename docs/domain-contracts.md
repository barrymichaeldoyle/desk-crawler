# Pure simulation and adapter contracts

This defines the boundary between simulator, persistence and rendering so future agents do not invent incompatible outputs. It is not executable TypeScript.

## Domain input

`simulateHero` receives one immutable input:

| Member | Content |
| --- | --- |
| `hero` | ID and current domain values: class, level/current XP/lifetime XP, HP/gold, status/biome/travel/revival/pause/sleep-wake fields, equipment/held references and lifetime counters |
| `inventory` | At most 32 owned item snapshots (30 bag gear + held gear + potion), sorted lexically by item ID; copied template/version/name/rarity/stat/quantity/requirement/sale fields |
| `tick` | Current run's logical tick |
| `contentVersion` | Exact immutable catalog version |
| `simulationVersion` | Exact rule/rounding/PRNG version |
| `streams` | Four independently derived seeded RNG streams specified in [simulation](simulation.md) |
| `recentSummaries` | Optional two newest story summaries, newest first. Content v4 uses them only for narrative callbacks and repeat avoidance; older catalogs ignore them |

The input omits user profile/auth, connection/token data, database context and wall clock. Content is supplied as immutable typed data, not queried inside the core. Inventory ID sorting is a reproducibility requirement even if current rules rarely depend on order.

For v4 the adapter reads at most two logs using the existing hero/time/sequence index. A second loose-cable mishap uses “another”; after two consecutive cable-family lines that variant is excluded. Other repeated wording is excluded immediately where alternatives exist. Numeric amounts and bold marks are ignored for matching, and appended consequences do not hide the primary line. The narrative stream still consumes one draw per selection. Complete deterministic inputs now include this cosmetic history; it cannot change encounters, damage, rewards, counters or item directives.

The database adapter has already checked current ownership, persisted TRMNL activation, cohort/tick eligibility, gameplay state and quarantine; the core handles the six gameplay statuses. It validates cross-field invariants before writing anything.

## Core result

| Member | Contract |
| --- | --- |
| `nextHeroState` | Only simulator-owned fields: level, XP/lifetime XP, HP/gold, status/biome/deadline/wake fields, last-level-up tick and lifetime counters |
| `itemChanges` | Bounded directives: decrement an existing potion quantity, add to that stack, create at most one new gear/potion row with bag-vs-held intent, delete a depleted potion row; adapter binds a held-create to its allocated item ID |
| `event` | Optional single combined tick event with primary kind, <=90-code-point summary, typed detail and net deltas |
| `metrics` | Fixed counters: encounter kind or none, victory/retreat/death/rescue/level-up/potion/held-find/sleep-start/wake/elite/jackpot counts |
| `disposition` | `advanced`, `rested`, `arrived`, `departed` (D29 wake into travel), `revived`, `waiting_dead`, `waiting_travel`, `paused`, `sleeping`, or `inventory_sleep_started` |

No generic free-form side-effect map, database IDs for newly created items, or complete raw document overwrite. New item directives contain copied content fields; the adapter allocates IDs on insertion. Existing item references may identify only items from the validated input.

The core does not change equipment IDs because MVP loot does not auto-equip. Manual equipment intents own those fields. It never changes hero name/user/active state, `activationState`/`activatedAt` or auth/quarantine markers.

`event` is absent for routine paused/waiting ticks. Arrival/revival/rest generate an event but no encounter. An automatic potion and encounter are combined in one event, with all item/HP effects in detail. Gameplay death/rescue takes primary summary priority; secondary information remains structured.

## Postconditions

- Derived maximum HP/ATK/DEF/XP threshold agree with current level and equipment.
- Level >=1; current-level XP >=0 and < its next-level threshold after resolution.
- All stats/counters are finite safe integers; HP 0..maximum, gold >=0, XP totals conserved.
- Dead requires HP 0 and revival deadline; travelling requires valid target/deadline; exploring/resting/paused/sleeping have no stale travel/death deadline (a sleeping hero with a pending wake may hold a destination `targetBiomeId` without `arriveAtTick`, D29). Only sleeping may hold a wake deadline; sleep requires HP >0 and a held find or bag capacity management.
- A revived hero returns to Office at half maximum HP; its original target is cleared.
- Bag gear <=30; held gear <=1 and never equipped; potion quantity <=20; item changes cannot consume nonexistent quantity or create more than one stack.
- At most one encounter and one combined log event; at most six combat rounds.
- Earned XP/gold rewards and held-find effects appear in counters/detail. `goldEarned` counts grants/sales, not net gold after losses; passive gold penalties do not decrement lifetime earned totals.
- `xpEarned` delta is granted XP before current-level subtraction, not the net change in the current-level XP column.
- `hp`/`gold` deltas compare final state with input, including potion/rest/level-up healing and death/retreat losses.

Output validation runs before database writes. Invalid output produces a bounded replay failure/quarantine as specified in [simulation](simulation.md); it does not partly apply an item directive.

## Persistence adapter

Within one mutation: read current input → derive seeds → run/validate core → apply allowlisted hero fields and item changes → increment hero log sequence if event exists → write log with server timestamp → update evaluation/progress markers and metrics → credit earned XP to the hero's current-hour accumulator under run-pinned `scoreAt` → on publication runs only, fold/expire bounded hourly history and write one frozen projection for all three views (D31). Score projection receives time as input and never reads a clock.

`lastTick` belongs to the adapter and advances for every eligible evaluated hero, including waiting/sleeping-with-wake/quarantined. Dormant heroes (paused, or sleeping without a wake) are skipped without writes between publications (D32), so their marker may lag. `lastProgressTick`/`lastAdvancedAt` change for successful non-waiting gameplay evaluations. Last-event time is not the same as current evaluation tick. Commands update their own log entries and visible state but do not advance either game tick marker.

For a quarantined hero, no core invocation/reward occurs; capture unchanged lifetime progression plus expired recent scores and explicit service-pause state. Core failures are caught before applying the hero's write set. Database failures after write application must propagate and roll back the entire batch.

## Log detail v1

Every detail has `v=1`, `simulationVersion`, `contentVersion`, `disposition`, `encounterKind?`, `potionsUsed`, `levelsGained`, `itemEffects` (bounded), and `goldPenalty`. A typed outcome variant adds:

| Variant | Required detail |
| --- | --- |
| Combat | Monster ID, `elite` boolean, initial/final monster HP, <=6 rounds (hero damage/enemy damage), outcome `victory/retreat/death/rescue`, XP/gold grants |
| Loot | Discriminator gear/potion/gold; found template/rarity where applicable, bag/held destination or granted quantity/gold; `jackpot` boolean for gold; full-potion fallback reason when applicable |
| Trap | Avoided boolean, damage, outcome `survived/death/rescue` |
| Rest | Healing applied, automatic-vs-encounter boolean, resulting status |
| Travel | Previous/destination biome IDs, arrival tick |
| Revival | Previous biome, safe destination, HP granted, original revival tick |
| System/command | Operation kind, public-safe applied result, no auth/token/private profile data |

Death primary log kind can wrap combat/trap detail; level-up may be secondary. The detail discriminator reflects the underlying resolver while `kind` controls the display narrative priority. Command detail uses a separate versioned validator and may omit simulation version when not applicable.

The companion and device display narrative separately from nonzero earned-XP/net-gold/net-HP changes (D48). A shared presentation mapper removes numeric stat clauses from immutable simulator summaries while preserving names, milestones and other consequences. Stored summaries remain versioned and replayable; existing logs receive the same display treatment. Manual sales and potion use store their actual changes in `deltas`; the two known legacy command forms with zero deltas recover their applied amount from the stored command sentence for display only. Source timestamps and legacy local labels remain in the v1 payload for compatibility (D39); web own-history can show bounded detail. Target <=1.5 KiB per detail; author content names with explicit length budgets (proposed monster <=24 and item <=32 display characters).

## Score and held-ID adapter ownership

The core returns held-create intent and sleep status, never a database ID for that find. Adapter allocates the item and writes `heldItemId` atomically. Manual claim clears it; core may not replace an existing held item. Core may clear a due `wakeAtTick` but never wake from a visit/poll alone.

At each publication, quarantined/paused/sleeping/waiting heroes still age score history at `scoreAt` and capture eligible ranks (dormant heroes on lifetime only); no earned XP is fabricated. Creation/commands never credit recent scores. Whole-batch failure rolls back items, XP history and rank inputs together.

## Rendering projection

One mapper produces v1 payload using hero + derived stats + recent logs + completed-run health + one selected board/group generation within the published board set. It never derives rewards, runs RNG or changes state. Template and web display labels use the same status/deadline semantics.

The HTTP adapter authenticates first, assembles the canonical mapper inputs through one internal query, serializes the JSON body/envelope and applies no-store headers. Request metadata such as instance name is sanitized and given a fallback; it is never used for ownership decisions.
