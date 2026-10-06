# Release roadmap

Updated 2026-10-07 (D64, D70). Work is planned as named releases rather than calendar months. Every passing change may still ship continuously; a release groups a coherent block of work, its release note and its gate. The earlier "Month 1–6" themes map onto the versions below and keep their feature boundaries and gates; nothing from them was dropped.

Version meaning:

- **Patch (v1.0.x)**: fixes, layout polish, help/listing copy, balance passes under a new content/simulation version. No new player-facing system, no schema change beyond additive fields.
- **Minor (v1.x)**: a new optional system on the existing hero (stances, merchant, salvage, meetings). Additive schema and content, old payloads and templates keep their meaning.
- **Major (v2, v3)**: a change to progression ceilings or the hero lifecycle (bigger bags past 20, elite fights, prestige, seasons). Needs its own design amendment, migration plan and progress-preservation proof before it starts.

Release order is a commitment; the dates are not. A release ends when its gate passes. Work never pauses for a gate or a review (D70): while one release waits on an external check, the next one is designed, built and, when it preserves progress and payload meaning, deployed.

## Current focus: v1.0 — Submission

Goal (unchanged from Month 1): a TRMNL user installs the public plugin, prepares a Warrior in the web companion, activates it on authenticated Save, and passive adventures plus a coherent rank keep updating independently of device connectivity.

State: built and verified in production except the local candidate below. See [status](status.md) and the [release checklist](evidence/release.md).

Scope still to deploy (all local, approved):

| Item | Decision | Why it belongs in v1.0 |
| --- | --- | --- |
| One release catalog `v1` and the pre-launch game reset | D63 | Drops pre-launch compatibility while there are no public players (D41). Not possible after launch |
| 6 → 20 bag ladder | D61 | Changes the first-day loop and the inventory cadence promised in help; must be in the reviewed build |
| Portrait arrangement for every device view | D62 | Reviewers may install in portrait |
| Template v29 QR coverage and compact OG/X spacing | D58 | Layout polish for the reviewed build |
| Platformer HUD companion | D60 | The reviewed companion |
| Achievements | D65/O14 | Deployed 2026-10-06 at Barry's request as an additive system: optional counters with a one-off backfill, new tables, companion section and device celebration. No payload meaning changed |

Then: reset-first deployment ([runbook](release/pre-launch-reset.md)), fresh install → Save → first adventure recording, review package and email, Submit for Review. Each external action needs its own authorization.

**After submission (D70).** There is no scope freeze. The D63 reset is the last moment stored meaning changes without a migration; from that deployment on, every change ships under the post-launch preservation rule (progress preserved, old payload fields and templates keep their meaning, balance under a new content version). Review may take a while, so v1.1 work starts immediately and additive systems deploy as they pass their checks. The one courtesy to reviewers: keep the submitted listing, recording and help accurate, and refresh the review package when a deployed change alters what they see.

Content floor (unchanged): 3 biomes, 12 authored monsters, gear across 3 tiers / 2 slots / 3 rarities, 48 encounter variants plus lifecycle and lucky-moment summaries, two Warrior sprite states, D24 pacing, bounded return recap, D54 device recap, D46 keepsakes.

Gate: [product acceptance](product.md), [quality checks](quality.md), recorded deployment/cost evidence and TRMNL marketplace approval. Persistent play stays gated to verified installations until approval.

## Next: v1.0.x — Live polish

Runs from submission through the first weeks of public play. Patch releases only.

- Live monitoring and protected capture (the inactive [hourly capture template](../tools/recovery/checkpoint-workflow.yml.txt)), real-provider deletion/expiry/reinstall proof, funding decision O11 from measured costs.
- Measured balance passes under a new content version. D61 numbers are measurement starting points: watch three-day/seven-day sleep share and the level-8 date for weekly managers (harness: day 17).
- Physical checks that were waived or unverified: portrait display, keepsake claim path.
- Listing, help and companion copy from reviewer and first-player feedback. Done 2026-10-07: potion heal amount on the help and Bag pages. Also done: the tick detail records `potionHealing` and the change row shows `+N HP from potion`, so an automatic drink is no longer hidden inside net HP (additive optional field, same simulation version; older logs simply omit it).
- Colour (BWRY) device templates are a candidate here only if they are a pure template change; previews already exist (D62). Anything that changes payload meaning waits.
- Watch retention by hero level. **Reorder trigger:** if heroes that reached best-in-slot or level 12 drop off faster than younger heroes, pull v2.0 Depth ahead of v1.2 Other people. Decide this once from live data, not from the harness.

Gate: no production reset, every player's progress preserved across each deploy, old templates keep valid payload meanings.

## v1.1 — Decisions (was Month 2)

Goal: optional meaningful choices without a daily obligation.

Core batch: stances, configurable rest/potion thresholds, a small set of event choices with an automatic default, a wandering merchant, prioritized device attention text. Continue gear/balance improvements.

| Feature | Dependencies and boundaries |
| --- | --- |
| Stances/policies | Versioned resolver modifiers; validate thresholds and avoid infinite rest/potion loops |
| Narrative choices | Pending-choice table, expiry/default resolution, transactionally idempotent selection; passive players continue |
| Merchant | Bounded offers/price validation, four-tick expiry, purchase receipts; no push spam. Prices sit beside the D61 bag prices (40/150/600/2,000), the first gold sink |
| Potion pouch (P29) | The potion stack cap becomes a content ladder (one additive tier field on the hero, cap from content like `bagCapacity`); milestones, a rare find and a `buyBag`-shaped purchase advance it. Potions stay outside the bag and the 32-row read. Second gold sink; tune with the merchant and the configurable potion threshold |
| Effects | Typed duration/modifier rules; death ordering and rest cleansing explicitly designed |
| Affixes/Epic | Versioned generation and owned-item compatibility; extend inventory UI |
| Achievements (D65) | Shipped early, in v1.0 (2026-10-06). v1.1 appends families for merchant purchases, stance changes and event choices under a new catalog version. See [achievements](achievements.md) |
| Daily quests | Stretch, not required; timezone/DST and timezone-change abuse design first |
| Lost-and-found | Stretch; extend the single held-find/inventory-sleep system only with a bounded migration; never reintroduce silent disposal |
| Web push/email alerts | Deferred by default; user opt-in, delivery cost and calmness review |

Achievements are additive and independent of the choice systems, so they can ship first within v1.1. Prefer choices/merchant/stances as one coherent release and schedule quest/push scope separately. Salvage is not in this release: materials without a sink would be a hollow feature, so it ships with gear upgrades in v2.0.

Gate: no manual intervention required to resolve expiry; choose/default cannot both award; attention remains one unobtrusive message; more app engagement is a hypothesis, not a login target.

## v1.2 — Other people exist (was Month 3)

Goal: charming asynchronous social evidence.

Core batch: player meetings, friends/rivals, world-event banner, shareable public hero profile. Enhance all four existing layouts. New classes are a separately sized feature within this theme, not presumed trivial.

| Feature | Dependencies and limits |
| --- | --- |
| Meetings | Select from a completed immutable biome cohort; canonical pair/tick key prevents duplicate rewards/logs; no trading initially |
| Friends/rivals | Public-profile privacy and moderation; no friend requirement to progress |
| World events | Versioned typed modifiers, UTC activation, snapshot per tick; admin permissions and rollback |
| Profiles | Public-safe projection, alias controls, rate limits; no equipment/private-log leakage |
| Additional classes | Each passive tested; MP/spells only if their economy/state design is ready |
| Graveyard items | Stretch; only after item-transfer ownership and death-rule changes are designed |

Gate: meeting side effects commit at most once for both parties; social data does not add unbounded per-hero simulation reads; public-profile exposure is intentional. Measure follow adoption without imposing it as a launch blocker.

## v2.0 — Depth (was Month 4)

Goal: sustained progression for older heroes. Major because it raises ceilings.

Core batch: Archive and Parking Garage first, persistent elite encounters with explicit intervention/retreat rules, salvage (P26) with owned-gear upgrades (P27), and bigger bags. Rooftop/Sub-Basement/dungeons follow as capacity permits.

Persistent fight design must define saved monster state, damage/reward idempotency, abandonment, pause/travel restrictions, policy ordering, max fight duration, defeat/revival and inventory concurrency. Dungeons require keys/reward tables and bounded run histories.

| Slice | Shape |
| --- | --- |
| Salvage (P26) | Third choice beside Sell: materials as stack rows outside the bag (new `itemKind`, like potions), explicit, never automatic, same bounds and receipt shape as `sellMany`. Settle O13 (one material per rarity) first. Ships in the same release as upgrades so materials have a use from day one |
| Gear upgrades (P27) | Spend salvage materials plus gold to raise an owned item one tier within its slot (later, reroll an affix). Replaces the item's copied stats in place under a new catalog version and a receipt; retained logs and ranks untouched. No recipe tree. Keeps finds useful after best-in-slot |
| Potion strengths (P30) | Minor / healing / major as separate `kind: potion` rows with authored heal percentages, biome-tier drop weights, weakest-first automatic use and explicit manual choice. One flat rule turns minors plus a salvage material into a major, a second sink for materials. New content version because recap labels change |
| Bigger bags | New tiers appended to the content bag ladder above the Rolling Suitcase (20), earned through crafting, raids or new areas. Capacity stays "a ladder tier's capacity" (invariant `BAG_CAPACITY`); the bounded inventory read and `sellMany` bound grow with the new top tier |
| Legendary gear, lore, hardcore | Separate slices. Hardcore needs a new hero lifecycle, separate eligibility/ranking, permanent-death confirmation, retirement/Hall of Heroes model and recovery behaviour. It is not a boolean toggle on a live normal hero |

Re-measure pacing before this release: D61 moves the level-8 date for weekly managers from day 11 to day 17, so the "best-in-slot at days 35–45" assumption behind P27 needs a fresh harness run.

Gate: no repeatable boss rewards, no blocked fights after deployments, progression remains viable for existing high-level heroes, content compatible with retained items/logs. Compare retention by account age/level as a diagnostic rather than assert a predetermined percentage.

## v2.1 — Guilds (was Month 5)

Goal: optional shared progress without mandatory chat or synchronization.

Core batch: create/join/leave guilds (up to 20), tags, owner/kick permissions, hall contribution economy, weekly shared raid, guild leaderboard and device raid progress. Link an external Discord rather than build chat.

Design raid contribution ledger separately from the shared HP summary. Avoid every hero tick contending on one guild/world boss row. Stable contribution IDs, membership snapshots, reward claiming and guild dissolution/ownership transfer need their own RFC before implementation.

Gold tithes are player-consented and clamped. Changing tithes mid-tick cannot double-deduct. Revival blessings and Discord commands are stretch features with explicit user/bot auth; backend queries may be reused, authority may not.

Gate: repeat contributions cannot duplicate damage/rewards, quitting/rejoining cannot farm membership rewards, shared writes meet measured scale, guilds remain optional for individual progression.

## v3.0 — Seasons and prestige (was Month 6)

Goal: a long-term progression loop that preserves attachment to the hero. Major because it touches the hero lifecycle.

Core batch: prestige at a designed level threshold, permanent trait choices, an explicit prestige leaderboard, eight-week seasons with archived immutable results and cosmetic titles. Monthly world boss and bounties are stretch projects; they add transfer/shared-write complexity.

Clarify before designing: does prestige reset the same active hero or retire it/create another? What survives (shards, cosmetics, gear, traits, lifetime totals)? How does the overall comparator change? Are seasons fresh heroes, separate seasonal XP, or cosmetic competition on existing heroes? No reset may be inferred from the rough brief.

Season start/end is one audited transition with immutable scoring boundaries, reward receipts, archives and deploy-safe recovery. Avoid a single unbounded contribution array on a boss document. Bounties escrow funds transactionally and refund/expire idempotently.

Gate: resets/currency transfers cannot duplicate assets, pre-season progress survives as promised, season results cannot change after archival, old templates retain valid payload meanings.

## Guardrails: what v1.0 must not foreclose

Checked against the local v1.0 candidate on 2026-10-06. Keep these true in any v1.0 change.

| Later need | What v1.0 does today | Rule |
| --- | --- | --- |
| Bags above 20 (v2.0) | `bagCapacity` is a number on the hero; the invariant requires it to equal a tier in the content ladder | Bigger bags are appended ladder tiers in a new content version, never ad-hoc numbers. Do not hard-code 20 anywhere except the ladder |
| Bounded inventory reads | Read bound is fixed at 32 rows; `sellMany` accepts up to 30 | Derive both from the ladder's top capacity plus stack kinds before the first bigger bag ships |
| Salvage materials (v2.0) | Potions are item rows (`itemKind: 'potion'`) counted outside gear capacity | Materials follow the same stack-row pattern with a new `itemKind` literal. Do not add material counters to the hero document |
| Gear upgrades (v2.0) | Items copy catalog stats at creation under a `contentVersion` | Keep copied stats and version on items; upgrades rewrite them under a receipt. Do not move item stats to catalog lookups |
| Potion pouch and strengths (v1.1 / v2.0) | One potion stack row with a hidden cap of 20 (`potionStackCap`) and one shared heal constant | Keep the cap a content constant read through one place so it can become a per-hero ladder lookup; keep heal percentage reachable from the template rather than hard-coding the constant in new code; keep potion rows keyed by template id so more strengths are more rows, not a quantity split |
| Gold economy (v1.1 merchant) | Bag prices 40/150/600/2,000 are the only gold sink | Merchant prices are tuned against bag prices and D30 income; never remove the bag purchase path |
| Five gear slots (later) | Capacity counts unequipped gear only | Keep that rule, so new slots never shrink a bag |
| Balance after launch | D63 keeps the content-version mechanism; the pre-launch reset is the last reset | Every post-launch balance change is a new content version; the D41 exception ends at launch |
| Colour devices | Device templates and scene art are 1-bit/greyscale; BWRY previews exist | Colour variants are template work, not payload changes |
| Achievements (D65) | The nine counters are optional storage fields, normalized on read and backfilled once; predicates read only bounded hero state | Every future counter an achievement will need must exist before the deeds happen; logs expire after 72 hours. Keep predicates off logs and history; append ids, never renumber |
| Hardcore, prestige, seasons (v3.0) | One hero per owner, no lifecycle beyond death/revival | Do not add hero-mode flags to v1.0; these need their own lifecycle tables |

## Every release

- One measured balance pass with a content/simulation version and release notes.
- Small content additions only after the versioned catalog is stable.
- Append achievement families for each new system under a new catalog version (D65); never reuse or renumber ids.
- Review cron/recovery, leaderboard/read cost, retention, subscription headroom, current Creator Fund rules and realized payouts versus operating costs.
- Regression checks on all four layouts, landscape and portrait, for visible changes.
- Preserve existing players' progress and old API compatibility.
- Record actual outcomes; cut speculative scope rather than carry hidden unfinished work into the next release.

Releases are a prioritization tool. Bugs, reliability/security repairs and small quality improvements ship as soon as their checks pass.

The later releases retain the TRMNL audience and companion role. Wider platform support requires a separate scope/financial decision, rather than appearing implicitly through a web feature. Use the [evidence checklist](evidence/README.md) for each release gate.
