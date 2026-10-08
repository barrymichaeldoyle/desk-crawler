# Desk raids: R1 rules and harness (D110)

Date: 2026-10-08 · Simulation version 1 · Content v7 (not active; production stays on v6 until the R2 switch) · Harness: `pnpm balance:raids` ([tools/balance/raids.ts](../../tools/balance/raids.ts)) · Local Node 24, pure simulator in memory, no database.

## What R1 built

- Content v7 = v6 plus `raids` rules ([v7.ts](../../packages/desk-crawler/src/content/v7.ts)) and validator checks: launch chances are permille up to 100, every stance pairing's win chance stays within 10–90%, gold and HP shares are integers up to 50% with the winner losing less, the cooldown is 1–96 ticks, narrative placeholders are limited to `{rival}` and `{gold}`.
- A fifth `raid` seed stream. Each stream hashes its own name, so the four existing seeds are unchanged.
- Pure core ([raid.ts](../../packages/desk-crawler/src/sim/core/raid.ts)): `planRaid` for the adapter; the raider side inside an exploring tick after sustain and before the encounter roll; the target side as the whole event of the target's next exploring or resting evaluation; lethal raid damage through the same knockout or Office Cubicles rescue as any encounter; a `raid` log kind and outcome variant; four counters (`raidsLaunched`, `raidsWon`, `raidsRepelled`, `raidsLost`).
- Additive schema only: the four counters as optional fields, the `raid` log kind and outcome validator. Nothing in production can produce them until the world switches to v7.

## Gate

| Gate (from the [plan](../raids.md#work-slices)) | Result |
| --- | --- |
| v6 replays unchanged seed by seed | Pass. Under v6 a raid seed, a target and a pending raid change nothing across 400 seeds (`tests/sim/raids.test.ts`), and the full existing suite passes unchanged |
| Raids create no gold beyond the clamp gap | Pass. A harness test checks that raid gains and losses across the world net to the clamp gap plus raids still pending. Clamp gap: 0 gold (three-day) and 79 of 1,065,816 moved (daily, 0.007%), from visits that sell or buy between a raid and its application |
| Win rates match the stance table within sampling error | Pass. All nine pairings within ±1.5 standard errors in both runs (table below) |
| Knockouts per hero-day rise by less than one point for cautious heroes | Pass. Cautious knockout hero-days 0.40% → 0.53% (three-day), 0.43% → 0.30% (daily) |
| Cautious, balanced and bold each still win on at least one measure | Pass for the three-day cohort: cautious keeps the most gold and the fewest knockouts, bold reaches level 8 first, balanced reaches level 12 first. In the daily cohort balanced comes second on every measure, but it already does without raids (baseline level 12: bold 12.4 days, balanced 12.8), so raids don't cause it |

The starting numbers from the plan pass the gate unchanged, so they're the R1 values: launch 5/10/20‰ (cautious/balanced/bold), edges +10/0/−5, the loser's gold loss 5%, HP 30% for the loser and 10% for the winner, a 24-tick target cooldown.

## Runs

```
pnpm balance:raids --heroes 300 --days 30 --policy three-day --json docs/evidence/balance-v7-raids-three-day-30-days.json
pnpm balance:raids --heroes 300 --days 30 --policy daily --json docs/evidence/balance-v7-raids-daily-30-days.json
```

Each run plays one world of 300 heroes (100 per stance, in turn) tick by tick, with every hero evaluated in index order. The raider picks the first pool row at or after its shard. That target must be another hero, exploring or resting, and not picked in the last 24 ticks, or the raid draw is spent and the tick plays its ordinary encounter. The target applies the raid at its next evaluation. The baseline is the same world and seeds without a raid seed, which plays exactly as v6.

Three-day cohort (raids, with the no-raid baseline in brackets):

| | Cautious | Balanced | Bold |
| --- | --- | --- | --- |
| Raids launched per hero-day | 0.27 | 0.62 | 1.23 |
| Raids involved in, either side, per hero-day | 0.98 | 1.33 | 1.91 |
| Hero-days with a raid | 63% | 74% | 86% |
| Launch draws with nobody raidable | 35% | 32% | 32% |
| HP lost to raids per hero-day | 37 | 59 | 89 |
| Raid gold net per hero-day | +28.9 | −11.6 | −17.4 |
| Hero-days with a knockout | 0.53% (0.40%) | 1.83% (1.40%) | 6.33% (4.50%) |
| Knockouts dealt by raids per hero-day | 0.0007 | 0.0027 | 0.0133 |
| Level 8, median days | 11.6 (11.5) | 9.1 (9.1) | 8.3 (8.3) |
| Level 12, median days | 17.6 (17.4) | 15.7 (15.5) | 16.3 (15.6) |
| Gold at day 30, median | 11,875 (11,462) | 11,243 (12,468) | 9,910 (11,866) |

Daily cohort: launches 0.29 / 0.66 / 1.27 per hero-day; hero-days with a raid 66% / 76% / 87%; knockout hero-days 0.30% (0.43%) / 2.17% (1.73%) / 10.63% (7.27%); level 12 at 15.0 (14.9) / 13.2 (12.8) / 13.1 (12.4) days; day-30 gold 13,773 (13,034) / 13,136 (13,921) / 11,783 (14,091).

Win rate per pairing, raider > target, observed vs table (three-day, n):

| | Target cautious | Target balanced | Target bold |
| --- | --- | --- | --- |
| Raider cautious | 49.0 / 50 (249) | 61.8 / 60 (296) | 61.5 / 65 (252) |
| Raider balanced | 39.0 / 40 (649) | 51.8 / 50 (627) | 54.8 / 55 (578) |
| Raider bold | 35.2 / 35 (1,257) | 44.9 / 45 (1,203) | 49.6 / 50 (1,225) |

Other measures: no hero was knocked out by a raid within its revival window of an earlier knockout in either run (the revival-then-raided chain). Raids move about 22% as much gold as heroes earn, but most of it goes back and forth; the net per hero-day is a few percent of the roughly 450 gold a hero earns.

## Findings that changed the plan

1. **Fixed shards were unfair.** With one fixed random shard per hero, a hero sitting behind a wide gap in the pool got picked far more often. Over 30 days, times targeted ran p10 2 / median 17 / p90 44 / max 81. The raid stream now takes a third draw, the target's new shard, which the adapter writes in the same patch as `raidedAtTick`. With it, times targeted are p10 14 / median 21 / p90 27 / max 35.
2. **One pending raid per evaluation, and only while exploring or resting.** A hero can't be picked again within 24 ticks, and it's only pickable while exploring or resting, so more than one pending raid needs an unusual timing. The core takes one `incomingRaid` per evaluation instead of three. Like an expired choice, it applies only to an exploring or resting hero; a dead, paused, sleeping or travelling hero keeps it pending until it is back.
3. **The knockout is a fixed short clause.** With a 20-character name and a five-digit purse, an authored knockout line pushed the knockout out of the 90-character summary. The raid line stays the story and "Knocked out for 8 ticks." follows it.
4. **The raider can be knocked out.** The plan said the raider never is at launch, but a bold hero raids down to its 20% rest threshold and a lost raid costs 30%. That outcome is allowed (it is bold's risk) and the harness counts it.

## Limits

These are policy simulations, not player forecasts. The harness evaluates heroes in a fixed order inside one world, and production batches by its own order. A real world has far fewer heroes than 300, which raises the share of launch draws that find nobody raidable without changing the odds once a raid happens. The production seed derivation (SHA-256) isn't reproduced. Thrifty gear on the target is read from its equipped items here; R2 decides how the adapter reads it within the bounded-read budget.

## R2 backend (2026-10-08)

Built and deployed while production stays on content v6. Under v6, no tick reads or writes anything raid-related, and a test checks that.

- **Tables:** `raidPool` and `raids` ([data model](../data-model.md#raidpool-d110)), plus the optional hero field `raidPoolId`. A hero joins the pool at its first evaluation under v7, so the switch needs no backfill.
- **Tick adapter** ([lib/raids.ts](../../apps/backend/convex/lib/raids.ts)). Every hero takes one indexed read for its oldest pending raid. A hero whose launch draw hits (about 1% of exploring ticks) also reads one pool row (two when the pick wraps), the target hero, its owner and the owner's profile, and the target's two equipped items for thrifty, then checks the ledger key before inserting. A pick that fails a live check costs only those reads and the tick plays its ordinary encounter.
- **Exactly once:** the raider's side commits inside its own evaluation under the `lastTick` guard, and the ledger row is keyed by raider and tick. The target's side commits when the row is marked applied in the target's own evaluation. A replayed batch worker changes nothing.
- **Names:** the ledger copies both public names with their versions, and raid log details carry the rival's owner and name version. `raids.recent` shows "A coworker" for a rival who is gone, suspended, under name repair or renamed since the raid.
- **Deletion and retention:** account deletion and game deletion both remove the hero's pool row and every ledger row it is party to, a batch at a time. The daily retention job removes applied raids older than 30 days of ticks.

Tests (`tests/convex/raids.test.ts`, 7):
- v6 writes nothing.
- Under v7, heroes join the pool and raid each other, with no target picked twice inside the cooldown. Counters on both sides match the ledger, each applied raid is logged once on each side, and gold only moves.
- A stale batch replay commits nothing.
- Paused, suspended and retired heroes are never picked, and a retired hero leaves the pool.
- `raids.recent` reports the record, masks a renamed rival and returns null without a hero.
- Game deletion purges the hero's rows.
- Retention keeps pending raids and recent applied ones.

The production switch to v7 is held until R3 (companion) and R4 (device) can show raids. Until then a raid log would render with the generic system glyph.

## R3 companion (2026-10-08)

- `heroes.mine` adds `raidsEnabled` and, under a catalog with raids, each stance's `raidsPerDay` (launch permille × 96 / 1000) and `raidWinPct` against a Balanced hero. `heroes.recentLog` masks raid rivals through `maskRaidSummaries`, with one owner read per distinct rival on the page.
- The hero page gets the Raids card (`-raids.tsx`), the raid line on the stance picker, a `raid` glyph and badge colour, and a Raids log filter.
- Raid lines no longer carry amounts. The first phone capture showed the log's change mapper (D48) cutting "Left with 14 gold." down to "Left with gold.", so the v7 lines were rewritten without numbers and the amounts appear only as change chips. Masked rivals now read "Hidden player", the leaderboards' wording, because "A coworker" read as a name in mid-sentence.
- Phone check at 390×844 with the companion fixtures harness (`?raids=1` adds a record, five raids and raid log lines, including a 21-character name and a four-digit loss): the card, stance line and filtered log fit without horizontal overflow and the page logs no errors. Without raids the card stays hidden.
- Tests: a Convex test checks that a raid line keeps the rival's bold name until that rival renames, then reads "Hidden player"; the simulator test checks that raid summaries carry no digits.

## R4 device (template v48)

- **Glyph and recap:** the `raid` glyph is a burglar's mask, shared with the companion. The recap counts raids from both sides ("3 raids, 2 won", "1 raid won", "2 raids lost", mark `raid`, after knockouts and revivals), and a lethal raid also counts as a knockout.
- **Scene:** a raid this hero won shows the gold prop; a lost one leaves the room empty.
- **Name masking:** payload logs mask a renamed or departed rival as "Hidden player".
- **Gold column:** the first sweep of the raid cases (120 previews) failed 24, all in one place: the one-line ledger's 78-pixel gold column clipped a four-digit swing ("−1240 gold" needs 85–89 pixels). The column is now 92 pixels, and the device's change chips shorten gold from 10,000 to "12k", so a five-figure swing fits too. The companion keeps exact figures.
- **New preview cases:** `raidLost`, `raidWon` and `raidKnockout`, each with the longest raid line and a 20-character rival; `raidRecap`; and `denseRaid`, a full log of the longest raid line.
- **Checks:**
  - Full sweep after the change: 996 previews (every state × OG, X and BWRY × four layouts × both orientations, with the recap), 0 failures ([raid cases](raids-device-results.json)).
  - Official `pnpm lint:trmnl` passes, and `pnpm crosscheck:trmnl` renders 332 contexts identically in liquidjs and Ruby Liquid.
  - Unit tests cover the recap fact and the compact gold chip.

## R5 achievements, profile and engagement

- **Achievements:** catalog version 3 appends Office raider (raids won 1 / 10 / 50: Light Fingers, Desk Burglar, Cat Burglar) and Desk defender (raids repelled 1 / 10 / 50: Not Today, Neighbourhood Watch, Fort Knox Desk) under a "Raids" category, 152 ids. A hero behind the catalog gets one full pass on its next evaluation, as with version 2.
- **Public profile:** the profile projection adds `raids { won, failed, repelled, lost }`, counts only, and the page lists raids won and raiders repelled once the hero has a record. The profile test checks that no rival name or raid gold reaches it.
- **Engagement:** `admin:engagement` reports raids launched, won, repelled and lost, and how many heroes have raided or been raided. The operations and analytics docs say so. Raids are simulation events, so they add no browser analytics event.
