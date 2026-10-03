# Requirement traceability

Use this table when assigning/reviewing agents. A package is incomplete if it implements a feature but misses the corresponding invariant or verification evidence.

| Requirement | Authoritative specification | Package(s) | Proof |
| --- | --- | --- | --- |
| One persistent hero per owner | [Data model](data-model.md), [API](api.md) | A02/A04 | Concurrent creation/ownership tests |
| Passive 15-minute progress | [Simulation](simulation.md) | A03/A05 | Closed-browser scenario, slot/tick guards |
| Deterministic four-encounter loop | [Gameplay](gameplay.md), [domain contracts](domain-contracts.md) | A03 | Rule boundary/replay/balance reports |
| Forgiving death and eight-tick safe revival | [Gameplay](gameplay.md) | A03/A04 | T+8 and safe-zone rescue fixtures |
| Pause/resume with no catch-up | [Gameplay](gameplay.md), [API](api.md) | A03/A04/A09 | State/timing/UX tests |
| Companion potion/equipment/biome intents | [API](api.md), [companion](companion.md) | A04/A09 | Transaction conservation and web end-to-end |
| Exact rank plus cached Top 5 | [Leaderboards](leaderboards.md) | A05/A06/A08 | Same-generation counts/ranks/ties/partial-failure tests |
| Both rolling recent-XP views among similar-level heroes (D17) | [Approved ranking](ranking.md), D17/D20 | A03/A05/A06/A08/A09/A10/A11 | Exact window expiry, group transitions, scoped ranks/period labels, coherent publication and measured score-storage cost; live proof pending |
| Occasional gear management with new finds retained (D18) | [Approved inventory](inventory.md), D18/D19 | A03/A04/A08/A09/A10/A11 | Cadence distributions, bounded held finds, no lost/duplicate items, approved overflow sleep and next-tick wake; live proof pending |
| Public pseudonyms, no imported real names | [Decisions](decisions.md), [companion](companion.md) | A02/A06/A09 | Public projection/privacy masking checks |
| Canonical flattened JSON API | [TRMNL](trmnl.md) | A08 | Actual query fixtures/type/null/byte bounds |
| Third Party OAuth installation | [TRMNL](trmnl.md) | A01/A07 | Real install/manage/uninstall, redacted protocol proof |
| Four marketplace layouts | [TRMNL](trmnl.md) | A10 | Live screenshot matrix + e-ink review |
| TRMNL-exclusive entry and owner companion | [Product](product.md), [API](api.md), [TRMNL](trmnl.md) | A02/A04/A07/A09 | Owned attempt, pending exclusion, once-only Save/recovery activation, direct API gate |
| Post-activation offline and multi-instance fairness | [Simulation](simulation.md), [leaderboards](leaderboards.md) | A05/A06/A07 | No tick/reward/rank dependence on current connections/displays/polls |
| Intended Creator Fund revenue with free gameplay | [Monetization](monetization.md), [operations](operations.md) | A01/A11/A12 | V10 type/category eligibility and dated rules; measured zero-payout costs |
| Start/Vite/Clerk/Convex/Workers | [Architecture](architecture.md) | A01/A02/A09 | Worker build/SSR/reload/auth proof |
| Email + Google + GitHub | [Decisions](decisions.md) | A02/A09 | Configured providers and login checks |
| Continuous release, no beta program | [Roadmap](roadmap.md), [operations](operations.md) | A11/A12 | Coordinated passing-main delivery, no beta quota |
| Low incremental cost | [Operations](operations.md) | A05/A08/A11 | 100/1,000 cohort read/write/function/storage measurements |
| Recoverable failures / preserved progress | [Simulation](simulation.md), [operations](operations.md) | A05/A06/A11 | Duplicate/recovery/drain/version tests |
| Bounded storage and account deletion | [Data model](data-model.md), [operations](operations.md) | A11 | Cleanup backlog/protected generations/purge verification |
| Calm dated display across four sizes | [Experience](trmnl-experience.md), [TRMNL](trmnl.md) | A08/A10 | State/ETA/timezone cases, runtime/model screenshots |
| Save-to-display and sleep/playlist help | [Experience](trmnl-experience.md), [companion](companion.md) | A01/A09/A10/A12 | V08 physical/mashup/slower-refresh evidence |
| Delayed callbacks cannot resurrect tombstones | [TRMNL](trmnl.md), [data model](data-model.md) | A01/A07 | V06 intent/expiry/repair/replay |
| Publication prerequisites and reviewer access | [TRMNL](trmnl.md), [decisions](decisions.md) | A01/A12 | V07 entitlement and review package |
| Timezone setting and bounded retries | [API](api.md) | A04/A09 | Formatting-only mutation and expiry checks |
| Safe deletion after credential-history purge | [Data model](data-model.md), [decisions](decisions.md) | A07/A11 | V09 token/code replay proof and D22 boundary |
| Bounded connection history and public-name response | [API](api.md), [companion](companion.md) | A07/A09/A11 | Pagination; D23 policy and admin/support procedure |
| Later coherent monthly themes | [Roadmap](roadmap.md), [source brief](source-brief.md) | Future RFCs | New feature-specific contracts before assignment |
| Pacing/content floor (D24/D26) | [Build refinements](build-readiness.md), [gameplay](gameplay.md) | A03/A09/A10 | Distinct occasional-management cohorts, unlock distributions, 12 monsters/48 variants, 30/90-day goals |
| Bounded return recap (D25) | [Build refinements](build-readiness.md), [API](api.md), [data model](data-model.md) | A04/A09 | Seven-day/no-log recap, single checkpoint, guarded visible-page acknowledgement/tab/retry invariants |
| Owner alerts and safe backup recovery (D27) | [Build refinements](build-readiness.md), [operations](operations.md) | A11 | Deduped notice delivery, entitlement, isolated restore and post-backup deletion/revocation reconciliation |
| One-visit return from inventory sleep (D29) | [Inventory](inventory.md), [API](api.md) | A04/A09 | Resume-with-destination timing and bulk-sale atomicity/receipt tests |
| Late-game gear/gold curve (D30) | [Build refinements](build-readiness.md), [gameplay](gameplay.md) | A03 | Best-in-slot day and retained-gold distributions per cohort |
| Hourly publication and dormant exclusion (D31/D32) | [Ranking](ranking.md), [leaderboards](leaderboards.md), [simulation](simulation.md) | A05/A06/A08/A11 | Hour-bucket expiry, catch-up publication, dormant skip/exclusion/return, measured write reduction |
| Luck: reward rolls and lucky moments (D35) | [Gameplay](gameplay.md#luck-and-lucky-moments), [simulation](simulation.md) | A03 | Draw-order determinism, rate checks, score-spread and gold reports |
| Early real installation-to-display milestone (D28) | [Build refinements](build-readiness.md), [work packages](work-packages.md) | Lead + A02–A10 | first-path.md with real Save/encounter/coherent ranks/physical screen and minimal onboarding/four layouts |

Overall first-release gate: [product acceptance](product.md). Change-specific ongoing checks: [quality](quality.md). Confirmed decisions override older rough examples; open owner choices and technical spikes remain explicit.
