# Slow Cast: a passive fishing game for TRMNL (P34)

Proposed 2026-10-09 for Barry's review and revised the same day with its open questions settled (see [Decisions taken in this revision](#decisions-taken-in-this-revision)). Approved as D115 on 2026-10-09 and in build; [Build log](#build-log) records each slice. This is the full specification for the second TRMNL Games title, a pixel art fishing simulator that plays itself on the desk display and is managed from the shared companion.

Settled with Barry on 2026-10-09 before drafting: real-world outdoor waters and a cosy tone; the companion is setup only (pick the water, rod and bait, then sell, restock and upgrade), with no active reeling; launch content is three waters and about thirty species; the two games connect through the shared account profile and achievements only. Cosmetic nods between games (a lure skin or keepsake earned across games) can be built later but are **not part of the MVP**.

The game reuses the Desk Crawler engine wherever the platform migration left it reusable: the quarter-hour tick, the pure seeded simulator, bounded cohort reads, receipted intents, hourly immutable leaderboard generations, achievements over counters, the TRMNL lifecycle, push alerts and the two-level deletion boundary. Where this spec says "as Desk Crawler", the named Desk Crawler document is the authority and the fishing game inherits the rule unchanged.

## The idea in one paragraph

Every player has one angler who sits by a water and casts a line once every fifteen minutes, all day and all night, whether or not anyone is watching. Sometimes a fish bites. The species depends on the water, the bait, the time of day and the weather; the weight decides how much it sells for and whether it is a personal record. Fish go in a cooler. When the cooler is full the angler keeps fishing and releases what it catches, so nothing is ever lost but the sale. The player opens the companion now and then to sell the cooler, restock bait and buy a better rod, a bigger cooler or the waders and permit that open the next water. Progress is a logbook of species and records that fills over weeks, and later content adds waters and species on top of it.

## What a player sees

- **Device:** a pixel art scene of the angler at the current water with the sky for the local time of day and the current weather, a header with the public alias and level, a status line ("Casting at the Millpond, dusk, light rain"), the newest story ("A 1.4 kg Tench took the bread at first light."), level, XP, the cooler meter (7 of 10), the bait left, the seven-day Top 5 with the angler's own row, service warnings and the companion QR code. A full cooler shows a quiet panel ("Cooler full: catches are being released") with a QR code to the cooler page.
- **Companion:** a Dock page (scene, status, level, cooler meter, bait, water and travel), a Cooler page (sell one or many), a Tackle Shop (rods, bait, coolers, access gear), a Logbook (every species with count, best weight and first-caught date; unseen species shown as silhouettes), Rankings, Achievements and the shared Settings.
- **Help page:** `/help/slow-cast` explains that the angler fishes alone, nothing spoils and nothing is lost, that a full cooler only means released fish, and what time of day and weather do.
- **Public profile:** the shared profile at `/profile/<public name>` lists each game the player has opted in, with that game's level, start date, rank and achievement families. Desk Crawler's existing hero page stays where it is and links to the profile.

No streaks, no daily login, no expiring bait, no spoiling fish, no line breaks that cost gear, no deaths. The only pressure is a cooler that stops earning and a bait tub that runs out, and both are mild by design.

## Rules

### Angler and starting state

| Field | Starting value / meaning |
| --- | --- |
| Name | The account's public alias; an angler has no separate name |
| Level / XP | 1 / 0; lifetime XP kept separately |
| Gold | 0 |
| Water | `millpond` |
| Status | `fishing` |
| Rod | Cane Rod (lands up to 1.5 kg) |
| Bait | Worms, 24 casts in the tub |
| Cooler | Bucket, 6 fish |
| Access | none (Millpond needs none) |
| Logbook | empty |
| First log | "You set up on the bank of the Millpond." |

Activation is TRMNL-exclusive as in Desk Crawler (D09): the angler is pending until a verified saved installation of the Slow Cast plugin, and a Desk Crawler installation does not activate it. One angler per account, kept across uninstalls, as [product](product.md) rules for heroes.

### Status

`fishing`, `travelling` (one tick, arrives the next, no cast), `paused` (owner's choice, no casts, no XP) and `pending`. There is no resting, sleeping or dead state. A full cooler does not change status.

### The cast

One cast per eligible tick, resolved by the pure core in this order:

1. **Conditions.** Time band from the owner's last TRMNL `utc_offset` (D112), UTC without one (D106): dawn 05:00 to 08:00, day 08:00 to 17:00, dusk 17:00 to 20:00, night 20:00 to 05:00. Weather for the water from the shared forecast (below).
2. **Bite.** One `bite` draw against the water's base bite rate × time multiplier × weather multiplier × rod bonus × bait factor (matched bait 1.0, bare hook 0.4). No bite ends the cast; every fourth quiet tick writes one ambient line from the `narrative` stream so the device story never goes stale for more than an hour.
3. **Species.** One `species` draw over the water's table, filtered to species that take the current bait class and are active in this time band and weather, weighted by rarity (common 700, uncommon 230, rare 60, epic 10 per thousand before filtering). Bare hook filters to species marked `anyBait`.
4. **Weight.** One `size` draw: a skewed draw in the species range (most fish near the lower third, a long tail to the maximum).
5. **Landing.** If the weight exceeds the rod's limit the fish **gets away**: a log line ("Something heavy took the line and kept going."), a `gotAway` counter tick, no XP, no gold. This is the device's invitation to buy a better rod.
6. **Logbook and XP.** A landed fish updates the species entry (count, best weight, first-caught tick) and awards XP = species XP × (1 + weight ÷ species maximum). A new personal best adds the record line to the log.
7. **Cooler.** If the cooler has room the fish becomes a `catches` row. If not, the fish is **released**: it counts in the logbook, XP and achievements, but earns no gold. The release line is explicit ("Cooler full. A 0.9 kg Perch goes back.").
8. **Bait.** A matched cast uses one unit of bait whether or not a fish bit. At zero the angler fishes with a bare hook until the player restocks. The run-out tick writes one line ("The worm tub is empty.").

Travel, pause and shop commands never cause a cast or a reward. No catch-up for missed ticks (as [simulation](simulation.md)).

### Weather and the shared forecast

Weather is shared by everyone at the same water, so two players comparing screens see the same rain. It is derived, not stored: for each water and each UTC six-hour block, the core hashes `[worldSeed, waterId, blockKey]` and draws one condition from the water's weather table. The companion and the device read the same function, so no tick writes weather and the simulator stays pure. Conditions and multipliers:

| Condition | Bite | Note |
| --- | --- | --- |
| Clear | 1.0 | Default |
| Overcast | 1.1 | Freshwater fish feed more under cloud |
| Rain | 1.2 at River Bend, 1.0 elsewhere | Salmon and Grayling need it |
| Wind | 0.9 | Pier only in MVP |
| Fog | 1.0 | Dawn and dusk look like night to fish: night-only species become active |

Time multipliers: dawn 1.3, day 1.0, dusk 1.3, night 0.8 freshwater and 1.0 at the pier. Every multiplier is a catalog number tuned by the harness.

### Waters

| Water | Unlock | Base bite | Baits used | Character |
| --- | --- | --- | --- | --- |
| Millpond | start | 16% | Worms, Bread | Calm freshwater commons, carp at dawn, eels at night |
| River Bend | level 4 and Waders (350 gold) | 14% | Worms, Maggots, Spinner | Trout, grayling and chub; predators on the spinner; salmon in the rain |
| Harbour Pier | level 8, Pier Permit (1,200 gold) | 12% | Ragworm, Mackerel strip, Spinner | Sea fish, bigger and worth more; most need the Carbon Rod or better |

Travel is a receipted intent, one tick, arriving the next, as Desk Crawler travel. A player may travel back freely. Each water's weather table and ambient lines are its own.

### Species

Thirty species at launch. Rarity sets draw weight; the price and XP are per species and scale with weight (a record-weight fish is worth twice the base). "Any" bait means the species also bites a bare hook. Time and weather list where the species is active; blank means always.

| Water | Species | Rarity | Weight (kg) | Bait | Time / weather | Price | XP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Millpond | Minnow | common | 0.01 to 0.05 | any | | 2 | 4 |
| | Roach | common | 0.05 to 0.6 | any | | 4 | 6 |
| | Rudd | common | 0.05 to 0.7 | bread, worms | day | 4 | 6 |
| | Perch | common | 0.1 to 1.4 | worms, spinner | | 6 | 8 |
| | Bream | uncommon | 0.3 to 3.5 | bread, worms | dawn, dusk, night | 10 | 12 |
| | Crucian Carp | uncommon | 0.2 to 1.6 | bread | dawn, day | 12 | 12 |
| | Tench | uncommon | 0.5 to 3.0 | bread, worms | dawn, dusk | 14 | 14 |
| | Eel | rare | 0.3 to 2.5 | worms | night | 20 | 20 |
| | Common Carp | rare | 1.0 to 12.0 | bread | dawn, dusk | 30 | 28 |
| | Golden Carp | epic | 1.5 to 8.0 | bread | dawn, clear | 90 | 60 |
| River Bend | Gudgeon | common | 0.02 to 0.1 | any | | 3 | 5 |
| | Dace | common | 0.05 to 0.4 | any | | 4 | 6 |
| | Chub | common | 0.2 to 2.5 | worms, maggots | | 8 | 9 |
| | Grayling | uncommon | 0.2 to 1.5 | maggots | overcast, rain | 14 | 14 |
| | Brown Trout | uncommon | 0.2 to 2.5 | worms, spinner | dawn, dusk | 16 | 16 |
| | Barbel | uncommon | 0.5 to 6.0 | maggots, worms | dusk, night | 18 | 18 |
| | Rainbow Trout | rare | 0.3 to 3.5 | spinner | day | 24 | 22 |
| | Pike | rare | 1.0 to 14.0 | spinner | dawn, dusk, overcast | 36 | 32 |
| | Zander | rare | 0.8 to 7.0 | spinner | dusk, night | 32 | 30 |
| | Salmon | epic | 2.0 to 15.0 | spinner | rain | 110 | 70 |
| Harbour Pier | Sand Eel | common | 0.01 to 0.05 | any | | 3 | 5 |
| | Whiting | common | 0.1 to 1.0 | ragworm | | 8 | 9 |
| | Mackerel | common | 0.2 to 1.2 | spinner, mackerel strip | day | 10 | 10 |
| | Pollock | uncommon | 0.5 to 5.0 | spinner, ragworm | dawn, dusk | 18 | 18 |
| | Flounder | uncommon | 0.2 to 1.5 | ragworm | | 16 | 16 |
| | Wrasse | uncommon | 0.3 to 2.5 | ragworm | day, clear | 18 | 18 |
| | Sea Bass | rare | 0.8 to 8.0 | spinner, ragworm | dusk, night | 44 | 36 |
| | Conger Eel | rare | 2.0 to 30.0 | mackerel strip | night | 50 | 40 |
| | Smoothhound | rare | 2.0 to 12.0 | ragworm, mackerel strip | dusk, night | 48 | 38 |
| | Thornback Ray | epic | 2.0 to 10.0 | mackerel strip | night, overcast | 140 | 80 |

Fish value is `round(price × (1 + weight ÷ maximum))`, so a species is worth between its price and double it. The table is a tuning starting point; the harness gate below sets the final numbers.

### Gear

Four ladders, all bought in the Tackle Shop at fixed prices with the same "fixed price, next tier only" shape as the bag ladder (D61). Nothing is found; fishing gear is earned by selling fish.

**Rods** (landing limit and bite bonus):

| Rod | Limit | Bite bonus | Price |
| --- | --- | --- | --- |
| Cane Rod | 1.5 kg | 0 | start |
| Fibreglass Rod | 4 kg | +5% | 300 |
| Carbon Rod | 10 kg | +10% | 900 |
| Beachcaster | 30 kg | +15% | 2,000 |

**Bait** (consumable, bought in tubs; the angler holds one tub of each class, the companion picks which one is on the hook):

| Bait | Class | Casts per tub | Price | Takes |
| --- | --- | --- | --- | --- |
| Worms | worms | 24 | 15 | Freshwater commons, perch, eel, trout |
| Bread | bread | 24 | 10 | Carp family, bream, rudd, tench |
| Maggots | maggots | 24 | 20 | River commons, grayling, barbel |
| Spinner | spinner | 200 (wears out) | 120 | Predators: perch, pike, zander, trout, bass, mackerel, pollock |
| Ragworm | ragworm | 24 | 40 | Sea commons, flounder, wrasse, bass, smoothhound |
| Mackerel strip | strip | 24 | 50 | Conger, ray, smoothhound, mackerel |

A tub holds at most 96 casts (one day), bought in multiples of its size, so nobody stockpiles weeks of bait in one visit and a visit every day or two stays meaningful. Switching bait is free and takes effect at the next cast.

**Coolers:** Bucket 6 → Cool Box 10 (80 gold) → Chest Cooler 16 (400) → Dockside Crate 24 (1,500). The ceiling of 24 rows keeps the per-angler read bounded (24 catches + the angler row).

**Access:** Waders 350 gold (River Bend), Pier Permit 1,200 gold (Harbour Pier). Permanent.

### Progression

- XP per landed or released fish as above. Level needs `floor(50 × L^1.6)` XP, the Desk Crawler curve, so the ranking level groups (D20 bands) apply unchanged.
- Expected pace at the catalog's starting numbers: about 12 fish a day at the Millpond, level 4 in two to three days, the Pier in about two weeks (level 8 plus 1,200 gold plus a rod that lands pier fish), the Beachcaster and the epics over the following weeks. The logbook's thirty species, with the four epics gated by time, weather and bait, is the months-long tail. All of this is to be measured, not assumed (see the S1 gate).
- Levels unlock nothing except waters and achievements. There are no stats.

### Selling and the shop

- `cooler.sell(catchId)` and `cooler.sellMany(catchIds)` (up to 24) sell at the fish's value. Selection is explicit; there is no auto-sell.
- `shop.buyRod`, `shop.buyCooler`, `shop.buyAccess(waterId)` buy the next tier or the named item at the fixed price. `shop.buyBait(class, tubs)` adds casts up to the 96 cap. `angler.setBait(class)` chooses the hook.
- `angler.travel(waterId)`, `angler.pause`, `angler.resume`, `angler.setPublicProfile` and `connections.disconnect` mirror the Desk Crawler intents.
- All are receipted, rate-limited and owner-checked under the [common intent contract](api.md#common-intent-contract).

### Determinism and versions

Per-angler seed as [simulation](simulation.md): SHA-256 of `[worldSeed, anglerId, tick, simulationVersion, streamName]`, Mulberry32, four streams `bite`, `species`, `size`, `narrative`. The forecast hashes `[worldSeed, waterId, blockKey]` and is not a per-angler stream. Slow Cast has its own simulation version (1) and content version (1) in its own package; it never shares a catalog number with Desk Crawler. Replays of every past content version must stay identical, as Desk Crawler requires.

## Leaderboards

The same three boards as Desk Crawler (overall, 24 hours, 7 days) over XP, the same level groups, the same hourly immutable generation with Top 5, population and individual ranks from one publication. Released fish count for XP, so a player who never visits still ranks; what they forgo is gold. A "biggest catch" board is not in the MVP because it would need a per-species scan; the logbook and the record achievements cover it.

## Achievements

A Slow Cast catalog, versioned and appended as [achievements](achievements.md) requires, with rarity against the Slow Cast population from that game's `achievementStats`. Launch families:

| Family | Counter | Tiers |
| --- | --- | --- |
| Catches | `fishCaught` | 1 / 10 / 100 / 1,000 / 10,000 |
| Logbook | `speciesLogged` | 5 / 10 / 20 / 30 |
| Big ones | `heaviestCatch` | 1 kg / 5 kg / 10 kg / 20 kg |
| Rare catches | `rareCaught` (rare and epic) | 1 / 10 / 100 |
| Epic catches | `epicCaught` | 1 / 4 |
| Got away | `gotAway` | 1 / 10 / 50 |
| Night fishing | `nightCatches` | 1 / 25 / 250 |
| Released | `released` | 1 / 25 / 250 |
| Gold earned | `goldEarned` | 100 / 1,000 / 10,000 / 100,000 |
| Sales | `fishSold` | 1 / 25 / 250 / 1,000 |
| Levels | `level` | 4 / 8 / 12 / 16 / 20 |
| Waters | `watersVisited` | 2 / 3 |
| Rods | `rodTier` | 2 / 3 / 4 |
| Flies | `flyBox.totalCollected` | 1 / 6 / 12 / 24 |
| Per species | `logbook[id].count`, `logbook[id].best` | First catch; a record over 75% of the species maximum |

That is about 60 species tiers and 52 counter tiers. Names and one-line descriptions are written with the content, in the cosy register rather than the office one. New species in later content append their two tiers under a new catalog version.

### Platform profile and achievements

The platform grows a public profile page per public name at `/profile/<public name>`, opt-in per game (the existing Desk Crawler switch and a Slow Cast switch), listing each opted-in game's level, start date, all-time rank and highest earned tier per family with that game's rarity. The page returns the same not-found for missing, private and suspended names, as D109. A small platform catalog adds two families computed by a daily bounded tally over users rather than at a game publication: Regular (`gamesActive` 2) and Collector (`achievementsEarned` across games 25 / 100 / 250). Platform rarity is the share of users with at least one active game profile. Nothing else crosses games: no gold, items, gating, shared boards or (in the MVP) cosmetic nods.

## Device

The screen route is per game (`/trmnl/slow-cast/screen`), with its own payload version, templates and scene composer. Layouts follow the Desk Crawler [display rules](trmnl-experience.md#display-rules) with the fishing contents:

| Layout | Must retain | Simplification order |
| --- | --- | --- |
| Full | Scene (water, sky band, weather, angler pose, newest fish when the last event was a catch), public alias and level, status line, newest story, XP bar, cooler meter, bait left, seven-day Top 5 with own row, service warnings, companion QR in the corner; a full cooler swaps the board for the cooler panel and its QR | Bait → gold → older stories → sprite size |
| Half horizontal | Alias and level, status line, newest story, cooler meter, QR and warnings | Second story → XP → sprite size |
| Half vertical | Alias and level, status line, newest story, cooler meter, QR and warnings | Older stories → XP → sprite size |
| Quadrant | Alias and level, cooler count, QR, newest outcome or setup message and warnings | Sprite first; no board |

Angler poses: casting, waiting, reeling, holding a catch, paused (rod on the rest). The scene reuses the sky bands and composer from Desk Crawler's art package; the water and the weather overlay are new. Four layouts on OG and four on X are the baseline proof, as D37, checked through TRMNL previews (the layout gate). Night recap: a twelve-hour summary line like D54 ("Night: 5 fish, best 2.1 kg Tench, 1 got away") on layouts that have the room.

## Companion

Routes under `/app/slow-cast`: Dock, Cooler, Shop, Logbook, Rankings, Achievements; Settings and Account are shared. The game switcher on the shell lists both games. Empty, pending, paused, travelling, disconnected and error states follow [companion](companion.md). Mobile first at 390 wide. Help at `/help/slow-cast`, public game page at `/games/slow-cast`.

## Staying on the TRMNL: the fly box

The game cannot and does not enforce that the plugin stays on a playlist: activation needs one verified install (D09), removal preserves progress, penalties and urgency are ruled out by [product](product.md), and no render can prove a physical display. The lever is the one Desk Crawler already uses, [desk keepsakes](playlist-retention.md) (D46), with a fishing skin.

- The device footer shows a short weekly code, omitted from the companion preview. Claiming it in the companion adds one **fly** to a permanent fly box on the Dock page. One per account per week, cached-screen grace, no missed-week penalty, no XP or ranking effect, as D46.
- Flies are cosmetic. A seasonal set gives the collection an end and a "full box" achievement family (Flies: 1 / 6 / 12 / 24).
- The one addition over Desk Crawler: the most recently claimed fly is pinned to the angler's hat in the device scene, so the reward is visible where it was earned. Cosmetic only.
- The device stays the better view by composition: the catch moment with the large sprite, the sky and weather, and the ambient lines are drawn for the screen; the companion lists the same facts. The companion is setup only, so it cannot become the place the game is played.

Not done, deliberately: hiding the weather or forecast from the companion, a daily device-only bonus, or catch rates that depend on refresh activity.

## Alerts

Two opt-in kinds under the D114 machinery, off by default, with the same quiet hours, caps and device rules: `cooler_full` (30 minutes after the cooler fills, once per fill, held through quiet hours) and `bait_out` (when the last tub empties, once per run-out, dropped in quiet hours). Both are things the player can act on. Alert preferences are per game; devices are shared.

## Analytics

Consent-gated, as Desk Crawler: `slow cast started`, `fish sold`, `tackle bought` (kind, tier), `water changed`, `bait changed`, `logbook viewed`, plus the shared alert and profile events. No per-cast events.

The angler carries no name of its own, so the public-name moderation, masking and repair rules apply once, on the alias, and onboarding has one step fewer than Desk Crawler.

## Data

New tables, all prefixed `sw` to keep indexes, retention and deletion boundaries per game. Shared tables gain the game where they already carry a slug.

- `slowCastProfiles` `{ userId, anglerId }`, one per user, like `deskCrawlerProfiles`.
- `anglers`: owner, level, xp, lifetimeXp, gold, waterId, status, wakeAtTick?, rod, baitOnHook, bait `{ class → castsLeft }`, cooler tier, access set, logbook `{ speciesId → { count, best, firstTick } }`, counters, publicProfile, activation fields, lastTick, eligibleFromTick, createdAt. Indexes `by_owner`, `by_createdAt`.
- `catches`: anglerId, speciesId, weight, caughtTick, value; index `by_anglerId`. At most 24 per angler.
- `swWorldState`, `swSimulationRuns`, `swSimulationFailures`, `swTickLogs`, `swScoreWindows`, `swRankInputs`, `swLeaderboardPublications`, `swLeaderboardGenerations`, `swRanks`, `swAchievements`, `swAchievementStats`: the Desk Crawler shapes with `heroId` read as `anglerId`.
- Shared: `users` (plus a `slowCastAlerts` preference block), `trmnlGrants`, `trmnlInstances`, `trmnlInstallAttempts` and `trmnlReconnectAttempts` (`gameSlug` widens to a union), `operationReceipts` and `rateLimitBuckets` (keys carry the game), `pushSubscriptions` (shared devices), `alertOutbox` (kind widens, rows carry the game), `gameDeletionJobs`.
- Retention: `swTickLogs` and `swSimulationRuns` under the same bounded cleanup; `catches` live until sold.

Deleting Slow Cast progress revokes its installations, denies its authority and purges the `sw` tables and the profile, leaving the account and Desk Crawler untouched; account deletion runs both games' purges then the Clerk deletion, as the migration plan designed.

## Architecture

- **Package** `packages/slow-cast` with `content`, `sim`, `art`, `templates` and `payload` subpath exports, pure and network-free like `packages/desk-crawler`.
- **Backend module** `apps/backend/convex/slowCast/` owning the `sw` tables, its crons, its screen route and its intents. Crons at UTC minutes 5, 20, 35 and 50 so the two worlds never tick in the same slot; its own watchdog and run guards; game-labelled health, notices and cost lines in operations.
- **Shared engine.** Before any fishing code, the tick runner, cohort pagination, ranking publication, achievement tally, receipt and rate-limit helpers and the TRMNL lifecycle are lifted into `apps/backend/convex/lib/engine/` as functions parametrised by table names and the simulator adapter. Desk Crawler is switched to the lifted code with its tests unchanged and its production ticks unaffected. This is slice S0 and the main engineering risk of the project.
- **Registry.** `packages/platform` adds `slow-cast` to `games` and `GameSlug`; `clientIdEnv` is `TRMNL_CLIENT_ID_SLOW_CAST` with its own secret. Per-game handoff cookies already exist.
- **Lifecycle status.** Each game has a server-controlled `status`: `hidden`, `preview` or `live`, read by the companion from the backend, not from a build flag. Desk Crawler is `live`; Slow Cast starts `hidden`. While `hidden`, nothing on the site lists the game, and its companion, game page, help, install and manage routes return the ordinary not-found page for everyone except the D23 admin allowlist, so the game cannot be probed for. Its crons run against an empty world with the run guard engaged, so every slice deploys to production as it lands and the tick, watchdog and health lines are proven before any player exists. Barry tests on production with his own account and a private TRMNL plugin pointed at the Slow Cast install route, as Desk Crawler was tested before plugin 564. `preview` adds a "Coming soon" tile in the switcher and on the home page with the listing image, and widens the D105 waiting list with a game field; routes stay closed. It is switched on only once the device art exists. `live` lists the game everywhere and opens every route, flipped the day the marketplace approves the plugin. No open beta: the marketplace is the only install path.
- **Considered and not chosen:** a Convex component per game. A component cannot reach `users` and the TRMNL grants directly, and the simulator differs per game, so the engine would need to cross the component boundary on every tick. The migration plan keeps that option for a game that needs stronger fault isolation.

## TRMNL

A separate marketplace plugin with its own OAuth client, listing image, knowledge-base URL and install and manage routes under `/connect/trmnl/slow-cast/`. The same install → Save → activation → uninstall tombstone lifecycle. Submitting it is a separate authorized action, after the Desk Crawler listing is approved so the reviewer sees a live platform. Creator Fund eligibility is checked for the second plugin as [monetization](monetization.md) requires; it is budgeted at zero revenue.

## Art

1-bit, hand-authored like Desk Crawler: three water backdrops with the four sky bands and three weather overlays (rain, wind, fog); five angler poses; thirty fish sprites at two sizes (a small one for log lines and the cooler, a larger one for the logbook and the device catch moment); about fourteen gear icons; a cooler meter glyph. The art count is the largest single cost in the MVP and the reason launch content is capped at three waters.

## Work slices

| Slice | Content | Gate |
| --- | --- | --- |
| S0 Engine | Lift the shared engine out of Desk Crawler; registry entry with the lifecycle status and the admin-only gate for hidden games; `gameSlug` unions | Desk Crawler's full test set passes unchanged; a production tick after deploy completes clean |
| S1 Core | Content v1 (waters, species, gear, weather, lines), pure core, four streams, harness | Harness over 30 days: 10 to 14 fish a day at the Millpond; level 4 in 2 to 3 days; Pier reachable in 10 to 16 days for a daily seller; each epic caught at least once in 30 days by a daily seller at the right water; bucket fills in 8 to 14 hours, crate in about 2 days; a never-visiting angler still levels and logs species |
| S2 Backend | `sw` tables, profile, tick, intents, screen route, payload v1, deletion paths | convex-test matrix: tick, intents, duplicate receipts, cooler boundary, bait run-out, travel, activation, both deletion levels |
| S3 Device | Art, scene composer, templates for four layouts on OG and X, recap line | Preview sweep clean in every state; no overflow |
| S4 Companion | Pages, help, game page, switcher, 390-wide states | Playwright walkthrough with the test identity |
| S5 Boards and badges | Rankings, achievement catalog v1, platform profile page and daily tally | Publication consistency tests; profile not-found parity |
| S6 Alerts, flies and analytics | Two alert kinds, the fly box on the D46 machinery, events, privacy page | Alert tests by backend path; a real push on the dev keys |
| S7 Listing | OAuth client, listing image, review email, submission (each an authorized action) | Live install, render and uninstall on Barry's device |

Progress preservation applies from the first public install, as every release.

## Not in the MVP

- Cosmetic nods between games (Barry, 2026-10-09: can be built later, not MVP).
- A tackle accessory slot (floats, weights), a rotating merchant, found gear.
- Further waters (Lake with a boat, Deep Sea charter, Frozen Lake with an ice auger), seasons and migratory runs, tournaments, a biggest-catch board.
- Fishing meetings or raids between anglers, daily quests, prestige.
- A trophy wall or keepsakes. Spoilage, line breaks, lost gear, deaths: never.

## Decisions taken in this revision

Barry asked on 2026-10-09 for the best player experience on each open question and agreed with the answers.

1. **Name: Slow Cast.** Chosen over the working title Still Waters because it says fishing, hints at the quarter-hour cadence, is distinctive enough to find in a marketplace search and sits naturally beside Desk Crawler in the game switcher. The listing title carries the descriptor: "Slow Cast: a fishing game that plays itself on your TRMNL". Slug `slow-cast`.
2. **Released fish earn full XP.** Nothing is lost, and ranking measures fishing rather than visiting; the cooler already motivates visits because gold is the only path to gear.
3. **Shared weather stays.** It makes two desks feel like one world and gives the device something true to say, at no runtime cost.
4. **No separate angler name.** The angler is the player, so the public alias is the name on the device and the profile. One fewer onboarding step and one fewer moderation surface.
5. **Timing.** S0 (engine extraction) and S1 (core and harness) can start while plugin 564 awaits approval; S7 (the second listing) waits until Desk Crawler is approved so the reviewer sees a working platform.
6. **Work in progress stays hidden.** Barry asked how the game should look in the companion while it is being built. Answer: the lifecycle status above, `hidden` with an admin-only gate, so slices deploy continuously to production without anyone else seeing them, `preview` for a coming-soon tile once art exists, and `live` on approval.
7. **Keeping the plugin on the playlist is rewarded, not enforced.** Barry asked how to make sure players keep the game on their TRMNL rather than play through the companion. Answer: the fly box, Slow Cast's version of the D46 keepsakes, with the device as the better view by composition and the companion kept to setup only.

## Build log

- 2026-10-09, S0 step 1: `packages/engine` holds the pure engine shared by both games: the Mulberry32 PRNG, the tick schedule with a per-game offset inside the quarter-hour (`makeSchedule`), recent-XP score windows, stream and shared-forecast seeds, the level curve and ranking bands. Desk Crawler re-exports each from its old path, so no import changed and all 484 tests pass; a pinned seed vector, checked against Node's own SHA-256, guards replay identity.
