# Continuous delivery and monthly feature themes

Months are relative to implementation kickoff, not calendar promises. Every passing change may ship; a monthly theme groups a larger coherent improvement and release note. No separate beta program or multi-week beta gate.

“Month 1” means the minimum public product, including the selected Third Party installation experience. Its estimate remains provisional until the platform spikes resolve. If a dependency takes longer, preserve MVP quality/scope or explicitly renegotiate with Barry rather than calling incomplete installation a completed launch.

## Month 1 — It lives

Goal: a TRMNL user can install the public plugin, prepare a Warrior through its web companion and activate it on authenticated Save confirmation; passive adventures and a coherent rank then keep updating independently of device connectivity.

| Sequence / suggested week | Work | Visible result |
| --- | --- | --- |
| 1 / week 1 | Runtime/auth/TRMNL/index spikes, finalized contracts, schema, starter content | Verified platform paths and a hero-domain foundation |
| 2 / weeks 1–2 | Pure encounters, death/travel/sustain, transactions, scheduler and recovery | Hero advances without browser/device activity |
| 3 / weeks 2–3 | Immutable ranks, canonical payload, companion controls, four templates | Readable web and e-ink state with exact snapshot rank |
| 4 / weeks 3–4 | OAuth lifecycle, runtime integration, balance/capacity, CI/CD, review package | Public landing/companion release and marketplace submission/approval |

Work overlaps only after shared contracts/schema are agreed. OAuth protocol spike happens early even if final UI lands later. Four layouts are mandatory; keep smaller ones minimal.

First integration milestone (D28), ahead of bulk content and broad UI polish: real install/Save → one activated hero → scheduled encounter → coherent three-view rank publication → authorized payload → physical display, with all four minimal layouts. Build this staging path after required spikes and foundational contracts; record `first-path.md`. Sequence numbers above are estimates, not permission to defer real lifecycle/display proof until the final week. Full release acceptance remains required. See [approved build refinements](build-readiness.md).

Release gate: [product acceptance](product.md), implemented [quality checks](quality.md), recorded deployment/cost evidence, and TRMNL marketplace approval. Public landing/sample preview/help can exist before marketplace approval, but persistent play stays gated to verified installations. Do not claim universal plugin installability or open standalone web play while approval is pending.

Content floor: 3 biomes, 12 authored monsters, gear names across 3 tiers/2 slots/3 rarities, 48 encounter variants (four per type per biome) plus lifecycle and lucky-moment summaries, two Warrior sprite states. Initial ongoing goals are gear improvement and recent competition. D24 pacing targets and the bounded companion return recap are included; do not rely on future monthly releases to make the first 30/90 days work.

## Month 2 — Decisions

Goal: optional meaningful choices without a daily obligation.

Core batch: stances, configurable rest/potion thresholds, a small set of event choices with an automatic default, a wandering merchant, prioritized device attention text. Continue gear/balance improvements.

| Feature | Dependencies and boundaries |
| --- | --- |
| Stances/policies | Versioned resolver modifiers; validate thresholds and avoid infinite rest/potion loops |
| Narrative choices | Pending-choice table, expiry/default resolution, transactionally idempotent selection; passive players continue |
| Merchant | Bounded offers/price validation, four-tick expiry, purchase receipts; no push spam |
| Effects | Typed duration/modifier rules; death ordering and rest cleansing explicitly designed |
| Affixes/Epic | Versioned generation and owned-item compatibility; extend inventory UI |
| Daily quests | Stretch, not required; timezone/DST and timezone-change abuse design first |
| Lost-and-found | Stretch; extend the approved single held-find/inventory-sleep system only with a clear bounded migration; never reintroduce silent disposal |
| Web push/email alerts | Deferred by default; user opt-in, delivery cost and calmness review |

The earlier month's long list is too large to treat as guaranteed. Prefer choices/merchant/stances as one coherent release and schedule quest/push scope separately.

Gate: no manual intervention required to resolve expiry; choose/default cannot both award; attention remains one unobtrusive message; more app engagement is a hypothesis, not a login target.

## Month 3 — Other people exist

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

## Month 4 — Depth

Goal: sustained progression for older heroes.

Core batch: Archive and Parking Garage first, persistent elite encounters with explicit intervention/retreat rules, simple gold sink/gear upgrades. Rooftop/Sub-Basement/dungeons follow as capacity permits.

Persistent fight design must define saved monster state, damage/reward idempotency, abandonment, pause/travel restrictions, policy ordering, max fight duration, defeat/revival and inventory concurrency. Dungeons require keys/reward tables and bounded run histories.

Legendary gear, salvage/crafting, lore and hardcore are separate slices. Hardcore requires a new hero lifecycle, separate eligibility/ranking, permanent-death confirmation, retirement/Hall of Heroes model and recovery behavior. It is not a boolean toggle on a live normal hero.

Gate: no repeatable boss rewards, no blocked fights after deployments, progression remains viable for existing high-level heroes, content compatible with retained items/logs. Compare retention by account age/level as a diagnostic rather than assert a predetermined percentage.

## Month 5 — Guilds

Goal: optional shared progress without mandatory chat or synchronization.

Core batch: create/join/leave guilds (up to 20), tags, owner/kick permissions, hall contribution economy, weekly shared raid, guild leaderboard and device raid progress. Link an external Discord rather than build chat.

Design raid contribution ledger separately from the shared HP summary. Avoid every hero tick contending on one guild/world boss row. Stable contribution IDs, membership snapshots, reward claiming and guild dissolution/ownership transfer need their own RFC before implementation.

Gold tithes are player-consented and clamped. Changing tithes mid-tick cannot double-deduct. Revival blessings and Discord commands are stretch features with explicit user/bot auth; backend queries may be reused, authority may not.

Gate: repeat contributions cannot duplicate damage/rewards, quitting/rejoining cannot farm membership rewards, shared writes meet measured scale, guilds remain optional for individual progression.

## Month 6 — Seasons and prestige

Goal: a long-term progression loop that preserves attachment to the hero.

Core batch: prestige at a designed level threshold, permanent trait choices, an explicit prestige leaderboard, eight-week seasons with archived immutable results and cosmetic titles. Monthly world boss and bounties are stretch projects; they add transfer/shared-write complexity.

Clarify before designing: does prestige reset the same active hero or retire it/create another? What survives (shards, cosmetics, gear, traits, lifetime totals)? How does the overall comparator change? Are seasons fresh heroes, separate seasonal XP, or cosmetic competition on existing heroes? No reset may be inferred from the rough brief.

Season start/end is one audited transition with immutable scoring boundaries, reward receipts, archives and deploy-safe recovery. Avoid a single unbounded contribution array on a boss document. Bounties escrow funds transactionally and refund/expire idempotently.

Gate: resets/currency transfers cannot duplicate assets, pre-season progress survives as promised, season results cannot change after archival, old templates retain valid payload meanings.

## Every month

- One measured balance pass with a content/simulation version and release notes.
- Small content additions only after the versioned catalog is stable.
- Review cron/recovery, leaderboard/read cost, retention, subscription headroom, current Creator Fund rules and realized payouts versus operating costs.
- Regression checks on all four layouts for visible changes.
- Preserve existing players' progress and old API compatibility.
- Record actual outcomes; cut speculative scope rather than carry hidden unfinished work into the next theme.

Monthly themes are a prioritization tool. Bugs, reliability/security repairs and small quality improvements ship as soon as their checks pass.

Month 1 refinement: entitlement/protocol checks precede full implementation; A09/A10 include Save-to-playlist-to-hardware, dated snapshots and missed-refresh states. Use the [evidence checklist](evidence/README.md).

The later themes retain the TRMNL audience and companion role. Wider platform support requires a separate scope/financial decision, rather than appearing implicitly through a web feature.
