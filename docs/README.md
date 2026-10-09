# Documentation index

Planning revision 7 · 2026-10-03 · Owner: Barry

Implementation was authorized on 2026-10-03. This index includes the original planning brief and current [implementation status](status.md); [release preparation](evidence/release.md) distinguishes completed checks from open gates. Planning documents alone do not authorize deployment or publication.

## Reading order

| Document | Authoritative subject |
| --- | --- |
| [Implementation status](status.md) | What is built and verified, deliberate differences, remaining release work |
| [TRMNL Games migration](trmnl-games-migration.md) | Proposed shared platform, monorepo and pre-launch domain cutover; owner preservation is best effort |
| [Decisions](decisions.md) | Confirmed choices, proposals, open questions, superseded assumptions |
| [Product](product.md) | Audience, MVP boundaries, player experience, launch acceptance |
| [Monetization](monetization.md) | Creator Fund assumptions, eligibility evidence and operating costs |
| [Playlist retention](playlist-retention.md) | Optional permanent keepsakes, weekly screen codes, authority and verification limits |
| [Achievements](achievements.md) | Tiered, rarity-rated, release-appended achievements over bounded counters (D65) |
| [Roadmap](roadmap.md) | Named releases: v1.0 submission scope, continuous iteration after submission, later versions, guardrails for future systems |
| [Gameplay](gameplay.md) | State machine, simulation rules, initial balance and content |
| [Raids](raids.md) | Desk raids: passive, unavoidable, chance-driven hero-versus-hero raids, stance-only odds, ledger application, work slices (D110) |
| [Quests](quests.md) | Approved (D112, content v9): daily quests as a passive, place-aware office to-do list paying gold only; refill and timezone rules |
| [Desk drawer](desk-drawer.md) | Proposed (P32, the lost-and-found row): a six-slot drawer that delays inventory sleep, intents and migration |
| [Alerts](alerts.md) | Built (D114): opt-in web push only for a stopped hero and an affordable merchant bag or pouch |
| [Slow Cast](slow-cast.md) | Built (D115, hidden until its listing): the second game, a passive pixel art fishing simulator; waters, species, gear ladders, shared weather, platform profile and the engine extraction it needs |
| [Architecture](architecture.md) | Service boundaries, planned file structure, implementation spikes |
| [Domain contracts](domain-contracts.md) | Pure-core input/output, adapter ownership, typed event details |
| [Data model](data-model.md) | Planned Convex tables, fields, indexes, invariants, retention |
| [Simulation](simulation.md) | Tick orchestration, determinism, concurrency, failure recovery |
| [Ranking](ranking.md) | Recent-XP groups/views, hourly windows, dormant heroes |
| [Leaderboards](leaderboards.md) | Ranking comparator, snapshot consistency, bounded reads |
| [Inventory](inventory.md) | Cadence, retained-find sleep, Resume with destination, bulk sale |
| [API contract](api.md) | Authenticated queries/actions/mutations and errors |
| [Build refinements](build-readiness.md) | Approved pacing/content, bounded recap, incident/recovery policies and first integration milestone |
| [TRMNL experience](trmnl-experience.md) | Glance hierarchy, first-screen journey, freshness and support |
| [Evidence checklist](evidence/README.md) | Artifacts required to close release gates |
| [TRMNL integration](trmnl.md) | OAuth, lifecycle, payload fields, layout plans, publication |
| [Companion app](companion.md) | Web flows, responsive UI, auth and empty/error states |
| [Operations](operations.md) | CI/CD, environments, runbooks, security, cost model |
| [Error reporting](error-reporting.md) | Sentry for production errors (D113): what reports, consent and privacy boundary, source maps |
| [Quality](quality.md) | Tests, balance harness, contract and hardware acceptance |
| [Work packages](work-packages.md) | Assignable implementation tasks and dependency graph |
| [Traceability](traceability.md) | Requirement → specification → work package → verification |
| [Source brief](source-brief.md) | Preserved design intent and future-feature inventory |
| [References](references.md) | Primary-source research and skill provenance |
| [Third-party notices](third-party-notices.md) | License for the vendored official skill |

Fixtures: see the [case index](fixtures/README.md) for normal, dead, unlinked, paused, travelling, delayed, quarantined, unranked, sleeping, dormant and maximum-text payloads. These are illustrative v1 contracts; implementation must generate/validate cases from actual queries and prove rendering.

## How to use this plan

Confirmed decisions may be implemented once coding is requested. Proposed defaults are explicit working assumptions; agents should use them consistently unless Barry changes them. Open decisions must be settled before their dependent work starts. A spike marked as a gate must produce evidence before subsequent packages can rely on it.

Month 1 has detailed contracts and acceptance criteria. Months 2–6 have feature boundaries, dependency notes, and release gates; each needs its own detailed design amendment before implementation. This avoids pretending six months of speculative designs are already final.

When changing a decision, update `decisions.md`, its authoritative specification, affected API/fixture examples, and work-package dependencies together. Do not quietly implement an alternative.

The canonical JSON API is separate from the Third Party screen response. Do not infer private-plugin polling behavior applies to the marketplace lifecycle.

Planning history (revisions 1–7) lives in the [decisions change record](decisions.md#change-record). Superseded material is kept for context only: the [first review](history/review-2026-10-03.md), [final review](history/final-review-2026-10-03.md) and [six-default rationale](history/recommended-defaults.md). The specs above are authoritative.
