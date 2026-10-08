# MVP gameplay rules and content

Rule status: one Warrior/three biomes, death/revival, public pseudonyms and pause/resume are confirmed. Other numerical defaults below are **proposed for balance testing**. The simulator package must implement one consistent version rather than choose its own numbers.

## Hero and starting state

| Field | Proposed starting value / meaning |
| --- | --- |
| Class | `warrior`; no class selection or special passive |
| Level | 1 |
| XP | 0 toward the next level; lifetime XP separately accumulated |
| HP / maximum HP | 100 / 100 |
| Gold | 0; nonnegative integer |
| Biome | `office_cubicles` |
| Status | `exploring` |
| Gear | Common Letter Opener (+3 ATK), Common Cardigan (+2 DEF), equipped |
| Potions | 3 of a single healing template, stack cap 20 |
| First log | “Your shift begins in the Office Cubicles.”; no onboarding XP/gold |

The hero's first encounter occurs in the next eligible scheduled run after verified TRMNL activation. Pending setup earns no encounters/rewards/rank. Account creation and Save grant no extra simulation ticks; after activation, display refresh/connectivity never determines progression.

Public aliases are 2–20 supported display characters; hero names 2–16. Trim whitespace, normalize Unicode, reject controls, HTML/Liquid delimiters and unsupported emoji, and escape text at render time. Use an allowlist suitable for MVP device fonts; broaden localized names after font verification. Alias uniqueness is case-insensitive. No global uniqueness requirement for hero names.

## Stats and progression

Derived stats at level L:

- Maximum HP = `100 + 12 * (L - 1)`.
- Base attack = `10 + 2 * (L - 1)`; add the equipped weapon's attack.
- Base defense = `4 + floor(0.75 * (L - 1))`; add the equipped armor's defense.
- XP required to leave level L = `floor(50 * L^1.6)`.

Store level, current-level XP and lifetime XP. ATK/DEF/maximum HP are derived by one shared domain function. No DEX, INT, MP, crit, dodge, hunger, status effects, stance or passive skills in MVP.

On level-up, subtract the old level's XP requirement, increment level, increase current HP by the **increase** in maximum HP, then clamp to the new maximum. Repeat if multiple levels are earned. Do not refill HP completely. Update the level-reached logical tick for leaderboard ties only if level changes. All rewards and stat values must remain finite nonnegative safe integers.

XP is never lost on death, travel, equipment changes or selling. Fixed biome rewards make overleveled safe play progressively slower relative to XP requirements. Do not scale encounter rewards to the hero's level or higher stats would reward permanent tutorial farming. No level cap is introduced in MVP; test progression over at least 30 and 90 simulated days.

Approved pacing targets (D24): a level gain in day 1, Server Room unlock around days 2–4 and Cafeteria unlock around days 8–14 for occasional-management cohorts. These concern unlocks, not automatic travel or guaranteed seed outcomes. [Build refinements](build-readiness.md) define cohort policies and measurements; tune pacing and inventory-sleep cadence together.

## Biomes

Weights are integer probabilities out of 100. They must sum to 100 in content validation.

| ID / display name | Unlock level | Combat | Loot | Trap | Rest | Monster tier |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `office_cubicles` / Office Cubicles | 1 | 30 | 30 | 10 | 30 | Safe, tier 1 |
| `server_room` / Server Room | 4 | 40 | 25 | 15 | 20 | Tier 2 |
| `cafeteria_depths` / Cafeteria Depths | 8 | 45 | 25 | 15 | 15 | Tier 3 |

Approved content floor (D26): 4 monsters per biome (12 total), and 4 summary variants for each of combat/loot/trap/rest per biome (48 total), plus required lifecycle summaries. Variants describe the actual outcome; cosmetic RNG never alters rewards. Examples: Rogue Roomba, Paper Imp, Cable Serpent, Dust Daemon, Coffee Slime, Crumb Golem. Tone: mildly absurd office fantasy, warm, concise, no insults tied to personal identity.

| Tier | Monster HP | ATK | DEF | XP on victory | Gold on victory | Trap damage |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 14–30 | 6–10 | 1–3 | 8–12 | 3–5 | 5–12 |
| 2 | 40–65 | 14–19 | 4–7 | 20–28 | 8–12 | 12–24 |
| 3 | 80–120 | 22–32 | 8–12 | 35–50 | 14–20 | 20–36 |

These are template-authoring ranges, not independent random stats at runtime. Give each monster explicit HP/ATK/DEF so content is explainable and balance can be compared. Each monster also authors its own XP and gold reward ranges (proposed: nominal value ±20%, inside the tier range); every reward rolls inside them (D35).

### Travel

`changeBiome` checks ownership, unlock level, healthy simulation state, and an exploring/resting status. Choosing the current biome is a no-op. Dead, paused or already travelling heroes cannot start/restart travel. A sleeping hero cannot call `changeBiome`, but `resumeAdventures` may name a destination that departs on the wake tick (D29).

Set `targetBiomeId` and `arriveAtTick = current world tick + 1`. At that deadline, evaluation changes biome, clears target/ETA, sets exploring, and logs arrival. If an already allocated tick evaluates the hero before that deadline, it observes waiting travel and grants no encounter. Arrival also gives no encounter, XP, gold or passive healing. Explain arrival as the following logical world tick, not a guarantee of exactly one skipped encounter during a batch-boundary race. No cancellation/retargeting while travelling in MVP.

## Simulation order

One accepted logical tick yields at most one gameplay encounter per eligible hero. See [simulation](simulation.md) for run membership and service failure rules.

1. Handle suspended/deleting/quarantined records outside the pure core.
2. Paused: no gameplay; keep state and no routine per-tick log. Sleeping: if no due `wakeAtTick`, no encounter/heal/XP or routine log. If wake is due, validate empty held slot/free bag space and clear the wake deadline. With a pending destination (D29), set travelling with `arriveAtTick = tick + 1`, log the departure and stop (no encounter, as with any travel). Otherwise set exploring and continue normal sustain/encounter rules.
3. Dead: if tick has reached `reviveAtTick`, revive in Office Cubicles at 50% maximum HP, clear death/travel fields, log revival, and stop. Otherwise remain dead with no routine log.
4. Travelling: resolve arrival and stop, or remain travelling if not due.
5. Resting: heal `ceil(20% maximum HP)`; resume exploring if HP is at least 75%; log the healing; stop even when leaving rest.
6. Exploring: if HP is below the catalog's potion threshold (v1: 35%; v2: 50%, D71) and potion quantity > 0, drink **one** potion and heal `ceil(40% maximum HP)`.
7. If HP is still below the rest threshold (v1: 25%; v2: 35%), enter resting, apply the first resting heal, log, and stop. Potion consumption remains committed even when the hero must rest.
8. Roll one biome-weighted encounter and resolve it.
9. Apply death/safe-biome protection before level-up. A lethal encounter cannot be undone by a level-up heal. A dead hero still receives earned XP if the resolver already earned it.
10. Apply rewards, level-ups, clamps and lifetime counters. If a new gear find exceeded bag capacity, retain it and enter sleeping after those effects. Produce one concise combined summary/detail; prioritize retained-find/sleep explanation. Adapter credits earned XP to both rolling windows once.

Stances (D76, content v3): the hero's stance replaces the three sustain thresholds in steps 5 to 7. Cautious drinks below 65%, rests below 50%, leaves rest at 90% and earns 90% of victory XP; balanced is the catalog's 50/35/75 at 100%; bold drinks below 35%, rests below 20%, leaves rest at 60% and earns 115% of victory XP (scaled after the ordinary roll, floored, never below 1). Thresholds are ordered rest < potion < resume by the catalog validator so no stance can loop, and rest never exceeds the 50% revival HP. A hero with no stance, or any hero under a catalog without stances, uses the constants. Changing stance is a policy intent, allowed in every status, and takes effect at the next evaluation.

Potion pouch (D77, content v4): the potion cap is a per-hero ladder, Thermos 20 → Lunchbox 30 (level 6, 120 gold) → Cooler Bag 40 (level 10, 450) → Vending Cart 60 (level 14, 1,500). Milestones land before loot like bag milestones; a dedicated 8‰ draw per loot encounter, after the bag draw, can find the next pouch; purchases and finds run at most one rung ahead. A hero or catalog without a cap uses the constant 20.

Wandering merchant (D78, content v4): 6 of 100 loot draws are a merchant visit instead of gear, a potion or gold. The visit opens one to three offers (a potion bundle of one to three at 12 gold × biome tier each, the next pouch and the next bag at ladder prices when the hero may take them early) for four ticks, stored on the hero and sold once each through `inventory.buyOffer`. Nothing is bought automatically; an expired visit is cleared on the hero's next evaluation in any status, with no event.

Effects (D80, content v6): a hero carries up to three temporary effects, each a catalog rule with a duration and typed modifiers. A trap hit leaves it Bruised (−15% defense, 4 ticks), an elite win makes it Fired up (+10% attack, 8 ticks), the cake choice makes it Well fed (+10% XP, 8 ticks). Expired effects drop at the start of any evaluation, a knockout clears all of them, and any rest cleanses banes and keeps boons. Affix and effect modifiers are summed once per tick: attack and defense before combat, XP and gold on the rolled reward, trap damage on the roll, a heal after each victory, gold-loss points on retreat and knockout.

Narrative choices (D79, content v5): 4 of 100 loot draws offer one of six office situations with two options, logged as the tick's story and kept on the hero for 96 ticks (one pending at a time; another draw falls through to gold). Answering in the companion applies the option's authored effect (gold, a share of maximum HP or potions, never XP) at once; letting it expire applies the default option as the whole event of the next exploring or resting tick. The same pure resolver serves both, clamped to what the hero has, so neither path can award twice and no choice ever needs intervention.

Desk raids (D110, planned for content v7, [design](raids.md)): one draw from a new `raid` stream on each exploring tick, between sustain and the encounter roll, can turn the tick into a raid on any other active hero; nobody can opt out. The raider's stance sets the launch chance (bold most often, cautious least); one roll at 50 plus the raider's stance edge minus the target's (cautious +10, balanced 0, bold −5) decides it, so level, gear and effects never count; the loser loses 5% of gold and 30% of maximum HP, the winner gains that gold and loses 10% of maximum HP, and lethal damage resolves like any lethal encounter. The target applies the raid once at its next evaluation as that tick's whole event. Catalogs without raid rules take no draw.

Manual potions are allowed only when exploring/resting and below full HP. A potion can help a resting hero resume when its HP reaches 75%. Manual use cannot revive or heal while travelling/paused/sleeping. Repeated calls consume finite items and never advance encounters.

## Encounters

### Combat

Select one monster uniformly from the biome's versioned monster list. Resolve at most 6 abstract rounds within one tick:

1. Hero strikes first. Damage = `max(1, floor((attack - defense/2) * variance))`, variance uniformly selected from integer percentages 80–120 inclusive.
2. If the monster is defeated, stop and grant rolled XP/gold from the monster's ranges (multiplied for an elite, below) plus a proposed 3% gear-drop roll.
3. Otherwise the monster strikes using the same damage rule. If hero HP is 0, stop and resolve death/protection.
4. After round 6, if both remain alive, the hero retreats. Lose `floor(5% current gold)`, grant no victory XP/loot, retain HP damage, and log retreat. Monster HP does not persist.

There is no persistent fighting status in MVP. Retry inputs and random draws must reproduce the same rounds. Add event-specific RNG streams so adding a cosmetic log variant cannot alter combat rolls.

### Loot

Proposed loot weights: 15% one gear, 20% one potion, 65% gold (template-authored range, initially the biome tier's combat-gold range). Combat drops generate gear directly. If the potion stack is full after sustain, the potion branch yields its documented gold outcome before generating an item. No excess potion is created or auto-sold. These weights replace the old 20%-potion/otherwise-gear sketch and target about five gear/day; measure before final tuning.

Gear rarity: common 70%, uncommon 25%, rare 4%, epic 1% (D66, D81; epic +7 stat and ×8 sale value). Choose weapon/armor evenly, then a template belonging to the biome's tier. Rare and epic gear roll one affix (D81, content v6): Vampiric, Lucky, Sturdy or Thrifty, a typed modifier applied at one place in the rules. No level-scaled random stat bonuses.

| Tier | Weapon base ATK | Armor base DEF | Required level | Base sale value |
| --- | ---: | ---: | ---: | ---: |
| 1 | 3 | 2 | 1 | 5 |
| 2 | 7 | 5 | 4 | 12 |
| 3 | 12 | 9 | 8 | 24 |

Uncommon adds +2 to the slot's stat and doubles sale value. Rare adds +4 and quadruples sale value. Each template also carries a small stat offset so same-tier items differ: the starter Letter Opener and Cardigan keep the tier stat and their tier-1 partners (Ruler Blade, Lanyard Mail) add 1; tier-2 and tier-3 pairs sit one point either side of the tier stat (for example Cable Cutter 6 ATK, Keyboard Mace 8 ATK), keeping the tier average. Equipped starter gear counts toward inventory capacity.

Initial bag capacity: 30 gear including equipment, plus one bounded potion stack and at most one held gear outside the bag. A new gear find at capacity is retained with its original stats in the held slot; finish earned effects, then sleep. No automatic sale/disposal, hidden queue or expiry. At 24/30 show a quiet warning. Inventory sleep stops encounters/XP until explicit claim/free-space/Resume; see [inventory](inventory.md).

No automatic equipping. New items remain in the bag until the user chooses. Equipping swaps the old item back to the bag without increasing document count.

### Trap

25% chance to avoid the trap; otherwise apply uniformly selected integer damage in the biome's range. No ongoing effect and no gold loss. Check lethal damage normally.

### Rest encounter

Heal `ceil(25% maximum HP)`, clamp to maximum, remain exploring. At full HP log a quiet rest with zero delta. No MP or lore reward in MVP.

### Luck and lucky moments

Confirmed D35; rates and multipliers are tuning proposals. Each tick already has chance (encounter kind, monster, damage variance, win/retreat), but across 96 ticks a day it averages out: indicatively ±15% daily XP and about ±6% over seven days. Two additions give luck a visible role without changing the calm, passive loop:

- **Reward rolls.** Every combat XP/gold reward and loot gold outcome draws a uniform integer inside its template range from the `reward` stream. No fixed-value rewards.
- **Elite foe.** After monster selection, 3% of combats meet an elite version (`encounter` stream): monster HP ×1.5 (floored), same ATK/DEF. On victory, the rolled XP ×4 and gold ×3; gear-drop chance unchanged. Retreat, death and Office rescue rules apply normally, so elites carry some extra risk.
- **Jackpot.** 1% of gold loot outcomes, including the full-potion gold fallback, multiply that gold ×10 (`reward` stream).

Luck never creates gear or potions (bag cadence and potion supply stay as tuned), never comes with streaks, notifications or attention text, and is never purchasable. Lucky outcomes get their own summary variants, e.g. "An elite Crumb Golem fell! +164 XP". The harness reports how luck changes 24-hour/seven-day score spread and retained gold, and tunes base gold (D30) so jackpots fit.

## Death and safe-biome protection

Outside Office Cubicles, lethal damage sets HP to 0 and status dead, loses `floor(10% current gold)`, increments deaths, and sets `reviveAtTick = deathTick + 8`. Equipment, potions and XP remain. No item drop. Revival at tick T+8 occurs without an encounter and sets biome to Office Cubicles and HP to `ceil(50% maximum HP)`.

Eight ticks are normally two hours. An outage or paused world delays this in wall time; display the countdown in game ticks and describe the wall-time estimate as approximate.

Office Cubicles cannot kill the hero: when damage would be lethal, set HP to 1, enter resting, grant no death penalty, increment a rescue counter, and log the narrow escape. The next tick heals under the normal resting rule. Do not immediately grant another combat reward following rescue.

Pause/resume (confirmed MVP controls): only exploring/resting can pause. Save the prior status and restore it on resume. There is no catch-up. Dead/travelling/sleeping cannot be paused, so a user cannot distort revival/travel timers by pausing them.

## Inventory return and gold

`sleeping` is a sixth gameplay state, not HP rest or service pause. Allow bag equip/unequip/sell during sleep, reject held-item equip/sell until claimed, and reject potion, `changeBiome` and voluntary pause in sleep. Bag gear may also be sold in bulk (`inventory.sellMany`, D29). `claimHeld` requires one free bag slot and preserves the same item. Resume requires no held item and at least one free slot, sets `wakeAtTick = world.currentTick + 1`, optionally records an unlocked destination in `targetBiomeId`, and grants no catch-up. A full bag without a new find keeps exploring. Hardware/website inactivity never initiates sleep.

Gold is secondary. Its first use is buying the next bag (D61, [inventory](inventory.md)): fixed prices, at most one tier ahead of the hero's bag milestones. Other gold sinks wait for later merchant design; do not promise a date/buying power or reset accumulated gold for inflation. Manual authorized bag sales remain available.

## Content contracts

Versioned content catalogs define biomes, monsters, items, constants and summary variants. Stable string IDs never change meaning. Item documents copy generated stats/sale value/required level so balance edits do not silently change an owned item. Retirement of a template must not make existing gear unreadable or unequippable.

Tick summaries have a 90-code-point backend limit, with render-time clamping for actual pixel width. User names have separate stricter limits. Structured detail uses a validated versioned union, not arbitrary unbounded blobs. Net deltas reflect all effects in that tick, including potion healing, gold loss and level-up HP gains.

## Balance questions to measure

- First level-up target: within the first day of activation (D24).
- Unlock Server Room target: around days 2–4; Cafeteria target: around days 8–14 (D24). Report three-day and seven-day management cohorts separately; see [build refinements](build-readiness.md).
- Office death rate must be exactly zero; harder-zone deaths should be occasional and explainable.
- Initial Server Room death target hypothesis: 2–5% of hero-days with eligible gear and passive policy. Separately report undergeared and newly unlocked cohorts.
- Rest/travel/death downtime must not dominate the story. Report fraction of ticks in each state.
- Luck (D35): report p10/p90 24-hour and seven-day score spread with and without lucky moments, elite deaths and jackpot share of gold.
- Late game (D30): best-in-slot gear around days 35–45 for the three-day cohort; report the day each cohort stops finding upgrades and retained gold at days 30/90.
- Compare unattended/occasional/immediate-upgrade policies, safe farming versus appropriate exploration, potion full-stack fallback, useful upgrades, three-to-seven-day bag/sleep percentiles, both recent views, 30/90-day level curves and retained gold growth.

These targets may conflict with the starting numbers. The balance harness decides; record tuned values and observed confidence intervals before calling the game balanced.

The tables above are the planning baseline. The release catalog v1 (`packages/desk-crawler/src/content/v1.ts`, D63) carries the harness-tuned numbers: lower monster XP/gold and loot gold, rare gear 4% and uncommon 26% (D66, after the per-item stat split; previously 2%/28%), plus the D61 bag ladder. Results and remaining tuning are in [balance evidence](evidence/balance.md) and [bag ladder evidence](evidence/bag-ladder.md).

## Device narrative acceptance

Each summary is self-contained; players may miss hours. Put consequences before expendable flavor when clamping. Clearly state retained-find sleep, recovery, arrival and level gains; secondary effects remain in detail. No random text selection during render.

Finalize the name allowlist from selected-font glyph evidence, including UI/catalog punctuation. Normalize NFC and enforce the stated code-point budgets server-side. Metadata labels use fallback for unsupported characters. See [experience](trmnl-experience.md).
