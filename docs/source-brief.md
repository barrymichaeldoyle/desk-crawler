# Source design intent and future inventory

Source: Barry's rough specification and pasted earlier design/roadmap, received 2026-10-03. This condenses their intent; supplied TypeScript examples were conceptual, not validated implementation. Subsequent [decisions](decisions.md) take precedence.

## Core request

Build a passive multiplayer Desk Crawler RPG for TRMNL. Convex TypeScript owns persistent level/XP/HP/gold/status/log state and cron evaluation every 15 minutes. Combat, loot, traps and rest change state. Companion mutations allow potion use, equipment/biome changes. Cache a global Top 5 and each player's absolute rank. Serve flattened JSON for the renderer.

The expanded draft proposed a web companion, monochrome art, pure seeded simulation, fan-out batches and six monthly releases. Barry asked for a smaller first month and later coherent feature batches. The initial choices added Third Party OAuth, Start/Vite/Clerk/Convex/Cloudflare, continuous delivery without beta, web-only play and forgiving death. Decision D09 superseded web-only entry with TRMNL-exclusive activation and a retained owner companion; Creator Fund is the intended MVP revenue route. See [decisions](decisions.md).

## Future concepts retained for amendments

| Concept | Original direction | Current treatment |
| --- | --- | --- |
| Classes | Warrior, Rogue, Mage, Ranger, Cleric with passives | Warrior only MVP; classes later |
| Attributes | MP, STR/DEX/INT/VIT/LCK, effects, hunger | Deferred; explicit order/stat design |
| Stances | Aggressive/balanced/defensive/cautious | Month 2 candidate |
| Biomes | Office/Server/Cafeteria/Archive/Garage/Rooftop/infinite Sub-Basement | First three MVP; scaling later |
| Gear | Five slots/rarities, affixes/materials | Two slots/three rarities MVP |
| Elite fights | Persistent multi-tick bosses, app intervention | Month 4; fight/reward invariants |
| Choices | 24h expiry with default branch | Month 2; passive continuation |
| Merchant | Three offers for four ticks | Month 2; authoritative purchases/expiry |
| Meetings | Shared stories/buffs/trade | Month 3; start with stories only |
| Death | 10% gold, item drop, eight-tick revive, instant shard/feather or guild revival | MVP retains all gear/XP and returns to safe Office |
| Hardcore | Permanent retirement/memorial/Hall of Heroes | Separate lifecycle/board |
| Dailies | Three local-day quests, shards/keys | Stretch after timezone/DST/abuse rules |
| Prestige | Level 50 reset, traits, retained shards | Month 6; reset semantics unresolved |
| Seasons | Eight-week themes, titles, archived board | Month 6; scoring/reset boundaries |
| Guilds | Up to 20, hall/tithe buffs, weekly shared raid | Month 5; contributions/reward receipts |
| World events | Admin/cron 6–24h modifiers | Month 3; typed pinned modifiers |
| World boss | Monthly shared HP/contribution rewards | Stretch; avoid hot unbounded row |
| Graveyard | Other heroes find named dropped gear | Deferred transfer/privacy/death amendment |
| Bounties | Gold escrow for kill goals | Stretch after economy/escrow design |
| Friends/rivals | Follow and device comparison | Month 3 candidate |
| Notifications | Web push choice/merchant/death | Opt-in later, not engagement requirement |
| Discord | Status/leaderboard/raid messages | Optional later, separate bot authority |

## Sketches that are not contracts

The original schema, cron times, HTTP route and payload examples are not checked-in implementation. The plan corrects packed ranking scores, mutation/action guarantees, live-index rank pagination, lifecycle controls and Third Party rendering.

Pre-adding six months of optional fields is replaced with versioned additive migrations. Arbitrary unbounded detail/modifier blobs and shared contribution arrays are not the approved architecture.

Balance/death rates, level pace, payload sizes, refresh timing, capacity and recurring costs require measured evidence. Each later feature needs an RFC covering schema, authority, simulation/version ordering, payload, migration, abuse/concurrency and release acceptance before assignment.
