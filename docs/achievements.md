# Achievements

Designed on 2026-10-06 under D65. Barry asked for achievements that grow with each release, show how rare each one is as a percentage of players, and come in tiers whose thresholds climb steeply. This is the design amendment the roadmap requires before a new system is built. The catalog below is the v1.1 launch set; the [implementation gaps](#implementation-gaps) section lists what the code needs, and O14 asks for the counters that must exist before the D63 reset.

## Player experience

Achievements are permanent recognitions of things the hero has already done. They live under Records in the companion and never read as a task list. Each card shows the name, a one-line office joke, when it was earned, and its rarity: "7% of heroes have this". Tiered families show as one card with the current tier, the next threshold and a small progress figure ("Paper Imp: 23 of 25 for tier III").

Rarity bands reuse the game's own vocabulary, so a glance works without the number:

| Band | Share of ranked heroes |
| --- | --- |
| Common | 50% and above |
| Uncommon | 10% to 50% |
| Rare | 1% to 10% |
| Legendary | under 1% |

A newly earned achievement is a big moment on the device: the D44 celebration badge reads "Achievement: Shredder Duty" until the next adventure. That is the only device presence. There is no list, counter or hint on the screen.

Rules carried over from the [TRMNL experience](trmnl-experience.md) and [keepsakes](playlist-retention.md):

- Nothing is time-limited, seasonal, streak-based or dependent on refresh rate, device count or companion visits. Every achievement is earned by the passive hero or by an explicit companion action the player already takes (buying a bag, selling gear, claiming a keepsake).
- Achievements have no XP, gold, gear, combat or ranking effect. Cosmetic titles stay a v3.0 question.
- Retroactive by construction: an achievement is a predicate over lifetime counters, so a hero who did the deed before the achievement existed earns it on the first tick after release. Counters that do not exist cannot be backfilled, which is why O14 exists.
- Missing one is never shown as failure. A family card appears once its first tier is earned. Unearned families show only their category and rarity under a "?" so the page stays short and does not nag. Legendary tiers are never previewed, so the top rung stays a surprise.

## Catalog rules

Achievements are content, versioned like the monster catalog, in `packages/desk-crawler/src/content/achievements.ts`. Each entry:

```ts
{ id: 'slay_paper_imp_3', family: 'slay_paper_imp', tier: 3, name: 'Imp Exterminator',
  blurb: 'The photocopier has never been quieter.', predicate: { counter: 'monsterWins.paper_imp', atLeast: 25 } }
```

- Predicates are pure functions of the hero's bounded state: lifetime counters, per-monster wins, level, bag capacity and keepsake total. No log scans, no history reads, no wall-clock. The evaluator lives in the pure core beside the simulator, so unit tests and the balance harness cover it.
- Ids are append-only and content-versioned. Renaming a joke is a copy change; changing a threshold is a new id. Ids are never reused.
- Monster and elite families share one ladder: **1, 5, 25, 100, 500**. Every other family uses its own ladder with steps of ×4 to ×10, listed below, so the top tier of any family is a months-long deed. Roman numerals I–V name tiers; every tier has its own name.
- Thresholds are set from the v1 catalog's pacing: an exploring hero takes up to 96 adventures a day, combat is 30–45% of them, a biome has four monsters, elites are 3% of fights, jackpots 1% of loot. A daily-managed hero defeats a given monster roughly 5–8 times a day while in its biome, so tier IV (100) is two to three weeks of staying put and tier V (500) is a deliberate choice to keep farming a floor the hero has outgrown. That is the "exponentially harder" shape Barry asked for.

## Launch catalog (v1.1)

### Monster families

One family per authored monster, counter `monsterWins[id]`, ladder 1 / 5 / 25 / 100 / 500.

**Paper Imp** (Office Cubicles)

| Tier | Wins | Name | Blurb |
| --- | --- | --- | --- |
| I | 1 | Shredder Duty | Fed a Paper Imp to the shredder. It was mostly staples. |
| II | 5 | Blue Bin Regular | Blue bin, not black bin. |
| III | 25 | Imp Exterminator | The photocopier has never been quieter. |
| IV | 100 | Paperless Office | Management sent a memo about it. |
| V | 500 | Pulp Legend | A plaque hangs by the shredder. |

**Rogue Roomba** (Office Cubicles)

| Tier | Wins | Name | Blurb |
| --- | --- | --- | --- |
| I | 1 | Flipped It | Like a turtle, but with more beeping. |
| II | 5 | Bin Emptier | Emptied its dust bin. |
| III | 25 | Roomba Wrangler | Twenty-five roombas flipped. |
| IV | 100 | Floor Supervisor | A hundred roombas flipped. |
| V | 500 | Clean Sweep | The cleaners sent a thank-you card. |

**Stapler Mimic** (Office Cubicles)

| Tier | Wins | Name | Blurb |
| --- | --- | --- | --- |
| I | 1 | Unjammed | Permanently this time. |
| II | 5 | Staple Remover | Pulled the staples out. |
| III | 25 | Mimic Spotter | You check every stapler twice. |
| IV | 100 | Supplies Auditor | You have opened every drawer on the floor. |
| V | 500 | Red Stapler | It is yours. Nobody will take it. |

**Dust Daemon** (Office Cubicles)

| Tier | Wins | Name | Blurb |
| --- | --- | --- | --- |
| I | 1 | Canned Air | One short blast. Problem solved. |
| II | 5 | Dust Buster | Gesundheit. |
| III | 25 | Allergy Season | Tissues on expenses. |
| IV | 100 | Spring Cleaning | The vents have never been this clear. |
| V | 500 | Spotless | You can see your reflection in the keyboard. |

**Cable Serpent** (Server Room)

| Tier | Wins | Name | Blurb |
| --- | --- | --- | --- |
| I | 1 | Zip-Tied | Coiled, tied and labelled. |
| II | 5 | Cable Manager | Velcro, never tape. |
| III | 25 | Labelled Everything | Both ends of every cable. |
| IV | 100 | Patch Panel Pro | Colour-coded and alphabetical. |
| V | 500 | Structured Cabling | The rack photo went viral internally. |

**Overheated Rack** (Server Room)

| Tier | Wins | Name | Blurb |
| --- | --- | --- | --- |
| I | 1 | Room Temperature | Talked it down to 21 degrees. |
| II | 5 | Vented | Hot air out, cold air in. |
| III | 25 | Thermal Throttler | Fans at a reasonable hum. |
| IV | 100 | Cold Aisle | Jumper required. |
| V | 500 | Absolute Zero | The thermostat reads 18. |

**Firewall Gremlin** (Server Room)

| Tier | Wins | Name | Blurb |
| --- | --- | --- | --- |
| I | 1 | Port 443 | Got through on HTTPS. |
| II | 5 | Patch Tuesday | Reboot required. |
| III | 25 | Deny All | Then allow exactly what you mean. |
| IV | 100 | Zero Trust | Every port closed by default. |
| V | 500 | Air Gapped | The safest network is the one you unplugged. |

**Legacy Mainframe** (Server Room)

| Tier | Wins | Name | Blurb |
| --- | --- | --- | --- |
| I | 1 | Decommissioned | Finally. |
| II | 5 | Migration Lead | Moved to the cloud. The old box stays plugged in, just in case. |
| III | 25 | Cloud Native | Nobody remembers the on-prem days. |
| IV | 100 | End of Life | Extended support declined. |
| V | 500 | Last COBOL Standing | Somebody still has to maintain it. |

**Coffee Slime** (Cafeteria Depths)

| Tier | Wins | Name | Blurb |
| --- | --- | --- | --- |
| I | 1 | Mopped Up | Wet floor sign deployed. |
| II | 5 | Down the Sink | With the rest of the morning. |
| III | 25 | Decaf Only | For everyone's safety. |
| IV | 100 | Barista | Latte art of a defeated slime. |
| V | 500 | Cold Brew Master | Steeped for twelve hours. |

**Crumb Golem** (Cafeteria Depths)

| Tier | Wins | Name | Blurb |
| --- | --- | --- | --- |
| I | 1 | Dustpan | Swept into the bin. |
| II | 5 | Crumb Collector | Not a crumb left for the pigeons. |
| III | 25 | Table Wiper | Every table in the canteen. |
| IV | 100 | Five-Second Rule | Not applicable to golems. |
| V | 500 | Breadwinner | You earned the loaf. |

**Microwave Wraith** (Cafeteria Depths)

| Tier | Wins | Name | Blurb |
| --- | --- | --- | --- |
| I | 1 | Hit Cancel | Mid-ding. |
| II | 5 | Unplugged | Try turning it off and leaving it off. |
| III | 25 | Thirty Seconds More | It was still cold in the middle. |
| IV | 100 | Fish Curry Day | You have smelled things. |
| V | 500 | Ding | The microwave is finally quiet. |

**Leftovers Hydra** (Cafeteria Depths)

| Tier | Wins | Name | Blurb |
| --- | --- | --- | --- |
| I | 1 | Nobody Claimed It | Every head went in the bin. |
| II | 5 | Fridge Cleaner | Friday, four o'clock, no mercy. |
| III | 25 | Tupperware Hero | Returned to its rightful owner. |
| IV | 100 | Friday Purge | A passive-aggressive note was not needed. |
| V | 500 | Sell-By Legend | The fridge has been empty for a week. |

### Set pieces

Single-tier achievements over several counters.

| Id | Name | Blurb | Predicate |
| --- | --- | --- | --- |
| `office_census` | Office Census | Met every monster on the premises at least once. | `monsterWins[id] ≥ 1` for every monster in the pinned catalog |
| `full_tour` | Full Tour | Won a fight on every floor. | at least one win in each biome's monster list |
| `floor_cleared_1` | Cubicles Cleared | Twenty-five of each in the Office Cubicles. | tier III of all four Office Cubicles families |
| `floor_cleared_2` | Server Room Cleared | Twenty-five of each in the Server Room. | tier III of all four Server Room families |
| `floor_cleared_3` | Cafeteria Cleared | Twenty-five of each in the Cafeteria Depths. | tier III of all four Cafeteria Depths families |

Set pieces are recomputed when the catalog version changes, so adding a biome in v2.0 makes Office Census harder for new unlocks and never revokes an earned one.

### Counter families

| Family | Counter | Tier | Threshold | Name | Blurb |
| --- | --- | --- | --- | --- | --- |
| Elites | `eliteWins` | I | 1 | The Floor Clapped | Took down an elite. Someone whistled. |
| | | II | 5 | Elite Problem | Five elites beaten. |
| | | III | 25 | Senior Exterminator | Title confirmed by email. |
| | | IV | 100 | Head of Department | Elites are your department. |
| Jackpots | `jackpots` | I | 1 | Lucky Break | Ten times the gold from one find. |
| | | II | 5 | Expense Approved | No receipts required. |
| | | III | 25 | Petty Cash Tin | You know where it is kept. |
| Rare finds | `rareFinds` | I | 1 | Shiny | Found your first rare piece of gear. |
| | | II | 5 | Collector | A small, strange and growing pile. |
| | | III | 25 | Curator | Labelled, catalogued, insured. |
| | | IV | 100 | The Vault | Nobody else has a drawer like this. |
| Adventures | `ticksExplored` | I | 1 | First Day | Found the kitchen and your desk. |
| | | II | 100 | Probation Passed | A day and a bit of adventuring. |
| | | III | 500 | Weekly Standup | Roughly a week on the clock. |
| | | IV | 2,500 | Monthly Report | A full month of fifteen-minute quests. |
| | | V | 10,000 | Long Service Award | A carriage clock would be appropriate. |
| Finds | `itemsFound` | I | 10 | Finders Keepers | Someone left it on their desk. |
| | | II | 100 | Drawer of Things | Everyone has one. Yours is bigger. |
| | | III | 1,000 | Supply Cupboard | The quartermaster of the open-plan. |
| | | IV | 5,000 | Lost Property Office | It all ends up with you. |
| Gold earned | `goldEarned` | I | 100 | Coins in the Couch | Lifetime gold, not current balance. |
| | | II | 1,000 | Expense Claim | Approved, eventually. |
| | | III | 10,000 | Bonus Season | Discretionary, apparently. |
| | | IV | 100,000 | Golden Handshake | Enough to retire on. You stay anyway. |
| Levels | `level` | I | 4 | Promoted | The Server Room is open. |
| | | II | 8 | Team Lead | The Cafeteria Depths are open. |
| | | III | 12 | Middle Management | Rolling Suitcase territory. |
| | | IV | 16 | Director | Your calendar is all meetings. |
| | | V | 20 | Corner Office | It has a window, and the blind works. |
| Knock-outs | `deaths` | I | 1 | Out Cold | Back in two hours, a little poorer. |
| | | II | 5 | Sick Note | Signed by the first-aider. |
| | | III | 25 | Regular at HR | They have a chair with your name on it. |
| | | IV | 100 | Nine Lives (Expired) | And then some. |
| Rescues | `rescues` | I | 1 | Fire Drill | The alarm went off mid-fight. |
| | | II | 5 | First-Aider's Friend | On first-name terms with the green box. |
| | | III | 25 | Coworker of the Year | Awarded to whoever keeps rescuing you. |
| Retreats | `retreats` | I | 1 | Rain Check | Fight another day. |
| | | II | 5 | Night Shift's Problem | Left it for them. Twice this week. |
| | | III | 25 | Strategic Withdrawal | Put it in the slide deck. |
| | | IV | 100 | Diary Full | Could not possibly fit the fight in. |
| Potions | `potionsUsed` | I | 1 | First Aid | Tasted of strawberry. |
| | | II | 10 | Kit Raider | Facilities put a lock on the first-aid box. |
| | | III | 100 | Pharmacy | Prescriptions on request. |
| | | IV | 500 | Self-Medicated | Not medical advice. |
| Traps avoided | `trapsAvoided` | I | 1 | Watch Your Step | Spotted the trap in time. |
| | | II | 25 | Wet Floor Sign | You put it there yourself. |
| | | III | 100 | Health and Safety | Completed the e-learning. Twice. |
| | | IV | 500 | Risk Assessed | Every corridor has a laminated form. |
| Breaks | `restTicks` | I | 10 | Coffee Break | Status set to "out of office". |
| | | II | 100 | Power Nap | Feet up under the desk. |
| | | III | 1,000 | Out of Office | Back on the twelfth. Ish. |
| Trips | `trips` | I | 1 | Commuter | Took the stairs to another floor. |
| | | II | 10 | Hot Desker | No fixed address. |
| | | III | 100 | Frequent Flyer | Lounge access to the Server Room. |
| Bag ladder | `bagCapacity` | I | 10 | Tote-ally Prepared | The Paper Bag is retired with honours. |
| | | II | 13 | Backpacker | Padded straps and a laptop sleeve. |
| | | III | 16 | Messenger | Worn across the body for maximum urgency. |
| | | IV | 20 | Rolling Suitcase | It has wheels. |
| Sales | `itemsSold` | I | 1 | Car Boot Sale | One careful owner. |
| | | II | 25 | Declutter | Sold what you did not need. |
| | | III | 250 | Procurement | A spreadsheet is involved. |
| | | IV | 1,000 | Liquidation | Everything must go, and it did. |
| Keepsakes | `deskKeepsakes.totalCollected` | I | 1 | Desk Ornament | Your first keepsake, propped by the monitor. |
| | | II | 6 | Shelf Life | Half a shelf and counting. |
| | | III | 12 | Full Set | Every design, once. |
| | | IV | 24 | Second Shelf | Facilities have been informed. |

Launch total: 60 monster tiers, 5 set pieces and 66 counter tiers, 131 ids. Catalog version 2 (v1.1, 2026-10-07) appends 15 counter tiers in five families, 146 ids: Purchases (1 / 5 / 25 merchant purchases), Merchants met (1 / 10 / 50 visits), Stance changes (1 / 5 / 25), Decisions made (1 / 5 / 25 / 100 choices answered) under a new "Decisions" category, and Epic finds (1 / 5) under Lifetime. Catalog version 3 (v1.2, D110, 2026-10-08) appends 6 counter tiers in two families under a new "Raids" category, 152 ids: Office raider (1 / 10 / 50 raids won: Light Fingers, Desk Burglar, Cat Burglar) and Desk defender (1 / 10 / 50 raids repelled: Not Today, Neighbourhood Watch, Fort Knox Desk). The counters exist from R1, so every raid counts from the switch to content v7. Catalog version 4 (v1.1 stretch, D112, 2026-10-09) appends 4 counter tiers in one family under Lifetime, 156 ids: Tasks done (1 / 10 / 50 / 250 to-do tasks ticked off: Ticked Off, Inbox Zero-ish, Getting Things Done, Employee of the Month). The `tasksCompleted` counter exists from Q1, so every task counts from the switch to content v9.

### Later releases

Each release appends families for its new system under a new catalog version; it never edits existing ids. Planned additions, to be named with the system's own design:

| Release | Families |
| --- | --- |
| v1.1 Decisions | Shipped as catalog version 2 on 2026-10-07: Purchases, Merchants met, Stance changes, Decisions made, Epic finds |
| v1.1 To-do list | Tasks done (to-do tasks ticked off), built as catalog version 4 on 2026-10-09 (D112) |
| v1.2 Other people | Office raider (raids won) and Desk defender (raids repelled) shipped as catalog version 3 on 2026-10-08 (D110); later meetings completed, meetings with the same hero, world events survived |
| v2.0 Depth | Archive and Parking Garage monsters (five tiers each), salvage, upgrades, persistent elite defeats, dungeon clears |
| v2.1 Guilds | Raid contributions, hall contributions |
| v3.0 Seasons | Prestige count, seasons completed (owner-keyed, so they survive a retired hero) |

## Storage

- **Counters (hero document).** `heroCounters` gains `monsterWins` (object keyed by monster id, keys limited to the pinned catalog), `eliteWins`, `jackpots`, `rareFinds`, `potionsUsed`, `trapsAvoided`, `restTicks`, `trips` and `itemsSold`. The simulator writes the first eight in the same tick transaction that increments `combatWins`; `inventory.sellMany` writes `itemsSold`. All are safe integers that only grow. See O14 for timing.
- **Unlocks.** `heroAchievements`: one row per unlock with `userId`, `heroId`, `achievementId`, `unlockedAt`, `tick`, `catalogVersion`; indexes `by_user_and_achievement` (unique, enforced transactionally) and `by_user_and_unlockedAt`. Rows are keyed by owner so they survive a v3.0 retire-and-prestige lifecycle. Game and account deletion purge them in the existing bounded jobs. Bounded by catalog size per owner.
- **Catalog marker.** `achievementsVersion` on the hero records the last catalog it was evaluated against. When the pinned catalog is newer, the tick evaluates every predicate once and updates the marker; otherwise it evaluates only families whose counters changed this tick. This is how a release makes new achievements retroactive without a migration or backfill job.
- **Log.** A new additive `logKind: 'achievement'` with `detail.achievementId`. The payload's `celebration` field gains "Achievement: {name}" as a fifth source. Old templates ignore the kind; the v1.1 template adds a glyph.

Hero documents stay bounded: the counter object has at most one key per authored monster and the unlock list lives in its own table.

## Rarity

Rarity is "share of ranked heroes holding this achievement", published from the same immutable generation as the leaderboards so the percentage, the population and a player's own rank agree.

- During a publication run's per-hero pass, which already visits every eligible hero to build rank inputs, each batch adds the hero's unlock ids into a fixed-size tally on the run (`achievementCounts`, keyed by achievement id, bounded by the catalog), patched once per batch alongside the existing progress counters. No per-unlock write to a shared document, so ticks never contend on a hot row.
- On promotion, the publication copies the tally and `totalPlayers` (overall board, `all` cohort) into one `achievementStats` document per publication. The companion reads the current publication's document: one bounded read for every card.
- Display: `round(100 × count / totalPlayers)`, "<1%" below one, banded as above. While `totalPlayers` is under 20 the card shows "3 of 11 heroes" instead, so launch week does not read as "100% of players". Pending heroes are excluded from both numerator and denominator; dormant heroes stay in both, since the deed was done.
- The number refreshes hourly with publications. Nothing recomputes on companion visits.

## Guardrails

- No achievement may require companion presence, device presence, a time window or another player's action. Social achievements in v1.2 count completed meetings, not friend counts.
- No predicate reads logs or history; the 72-hour log retention cannot be relied on.
- Catalog ids are append-only and content-versioned.
- The hero document gains only bounded counters. Unlock rows live in `heroAchievements`.
- The device shows at most the one celebration badge already defined by D44.

## Implementation gaps

All ten were implemented on 2026-10-06 at Barry's request ("do all the gaps") and deployed the same day. The table keeps the dependency order and where each piece lives.

| # | Gap | Where | Release |
| --- | --- | --- | --- |
| 1 | Counters `monsterWins`, `eliteWins`, `jackpots`, `rareFinds`, `potionsUsed`, `trapsAvoided`, `restTicks`, `trips` in `HeroCounters`, the schema validator, the starter kit and the simulator's increment sites; `itemsSold` in `sellMany`. Invariants: never decrease, `monsterWins` keys subset of the catalog. Optional in storage, `withCounterDefaults` on every read, `achievements.backfillCounters` run once after deploy | `packages/desk-crawler/src/sim/core/types.ts`, `simulate.ts`, `starter.ts`, `apps/backend/convex/schema.ts`, `inventory.ts`, `achievements.ts` | Deployed |
| 2 | Achievement catalog module with the ids above, a `catalogVersion`, and a pure `evaluate(hero, keepsakeTotal, changedCounters) → newlyUnlocked[]` with the catalog-lag full pass | `packages/desk-crawler/src/content/achievements.ts`, `sim/core/achievements.ts` | v1.1 |
| 3 | `heroAchievements` table, `achievementsVersion` on the hero, unlock insert in the tick transaction (idempotent on the unique index), `achievement` log kind and detail | `schema.ts`, tick mutation, `lib/logDetail.ts` | v1.1 |
| 4 | Publication tally: `achievementCounts` on the run, per-batch accumulation in the rank-input pass, `achievementStats` document written at promotion | `leaderboard.ts`, run schema | v1.1 |
| 5 | One query, `achievements.mine`: owner's unlock rows, per-family progress from counters and the current publication's rarity tally, all bounded | `apps/backend/convex/achievements.ts`, `docs/api.md` | v1.1 |
| 6 | Companion: Achievements section under Records with family cards, tier progress, rarity band and percentage, the under-20 fallback, "?" cards | `apps/web/src/routes/app/desk-crawler/-records.tsx` or a new `-achievements.tsx`, `DESIGN.md` log-badge tokens | v1.1 |
| 7 | Device: "Achievement: {name}" as a celebration source and an 8×8 glyph for the log kind; payload field docs | `trmnlPayload.ts`, `templates/screen.ts`, `docs/trmnl.md` | v1.1 |
| 8 | Deletion: purge `heroAchievements` in both bounded deletion jobs; recovery runbook note | deletion jobs, `docs/release/recovery-runbook.md` | v1.1 |
| 9 | Tests and harness: predicate unit tests, unlock-once under concurrency, tally equals direct count, deletion purge, pending-hero exclusion, layout checks with the longest name ("Nine Lives (Expired)"), harness unlock shares at days 1, 7 and 30 | `tests/`, `tools/harness` | v1.1 |
| 10 | Docs: data model, API, companion, TRMNL payload, traceability and work package entries | `docs/` | v1.1 |

Production had already been reset when this shipped, with one post-reset hero that predated the counters, so gap 1 went out as optional additive fields plus a resumable backfill instead of a schema break. Everything else is additive. Barry pulled the whole system into v1.0 by asking for deployment.

Two behaviours settled during implementation: an achievement log is written after the gameplay log that earned it, so it is the newest entry (the device celebrates it, the scene and the narrative-variety history keep following the newest gameplay event); and set pieces use their family id as the achievement id (`office_census`), while ladders number their rungs (`slay_paper_imp_3`).

## Verification

- Pure-core tests: each predicate against fixture heroes, the ladders, retroactive evaluation when the catalog marker lags, and the "changed counters only" fast path giving the same result as a full pass.
- Integration: an unlock commits exactly once under concurrent ticks and retries; the rarity tally matches a direct count on a fixture population; game and account deletion purge unlock rows; a pending hero never contributes to either side of the percentage.
- Harness: run the 300-hero × 30-day balance harness with the launch catalog and record the unlock share per tier at days 1, 7 and 30. Tier V of an Office Cubicles monster should be Legendary at day 30 (under 1% of daily heroes); tier IV should be Rare. If either is common, raise the ladder for all monster families rather than tuning one.
- Layouts: celebration badge with the longest achievement name on the full and both half layouts (the quadrant has no badge, D44) and the achievement glyph on every layout.

Results from the harness run of 2026-10-06 are in [evidence](evidence/achievements.md).

## Slow Cast and the platform (D115)

Slow Cast has its own catalog (`packages/slow-cast/src/content/achievements.ts`, version 1, 105 ids) with the same rules: unlock rows keyed by owner, unique per id, retroactive predicates over bounded state, rarity from each publication's tally. It is listed in the [Slow Cast spec](slow-cast.md#achievements). Platform achievements (`PLATFORM_ACHIEVEMENTS` in `packages/platform`) are Regular (two games with an active character) and Collector, Curator and Archivist (25, 100 and 250 achievements across games). They are computed when the shared profile at `/profile/<public name>` is read, and their share of players comes from a daily tally (`platformProfile.tally`, 03:27 UTC) over users with at least one active game.
