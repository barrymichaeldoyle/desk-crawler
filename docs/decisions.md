# Decisions and open questions

Status language: **confirmed** means Barry chose it; **proposed** means a documented working default; **verification gate** means implementation must prove it; **open** means a remaining owner decision.

## Confirmed product and stack choices

| ID | Decision | Status / reason |
| --- | --- | --- |
| D01 | Plan fully before application coding | Confirmed; work now is documentation only |
| D02 | Month 1 MVP, then larger monthly feature themes | Confirmed; each release builds on a playable foundation |
| D03 | Public Third Party TRMNL marketplace plugin at launch | Confirmed; OAuth and seamless linking, rather than URL/template copying |
| D04 | One Warrior, three office biomes for MVP | Confirmed; class choice/passives deferred |
| D05 | TanStack Start, Vite, Clerk, Convex | Confirmed |
| D06 | Cloudflare hosts the companion app | Confirmed direction; Workers is the proposed TanStack-compatible service |
| D07 | Continuous delivery; no separate beta program | Confirmed; testing/staging remain engineering checks |
| D08 | Minimize additional costs; existing Convex, Clerk, Resend subscriptions | Confirmed; subscription tiers/unused capacity have not been inspected |
| D09 | TRMNL-exclusive MVP; verified saved installation required once to activate a persistent hero | Confirmed in revision 3; supersedes web-only entry. Companion controls remain; after activation, hardware refresh/Sleep Mode/disconnection never govern progression or ranking eligibility. D19 adds a separate capacity-triggered gameplay sleep |
| D10 | Death: lose 10% gold, retain XP/equipment, revive after 8 game ticks in Office Cubicles | Confirmed; no item drops or paid instant revival in MVP |
| D11 | Clerk email + Google + GitHub sign-in | Confirmed; exact email code/link configuration decided during setup |
| D12 | Required public name chosen by the player; never import a real name automatically | Confirmed; revision 11: players may use a real name or a pseudonym. Onboarding states clearly that the name is public; contact details stay disallowed (D23) |
| D13 | Include pause/resume; retain ranking eligibility, no rewards/catch-up | Confirmed; allowed states in gameplay |
| D14 | Publish this existing project folder as a public GitHub repository | Confirmed direction; owner/name and actual remote publication remain to be arranged |
| D15 | No fixed monthly extra-spend cap beyond current subscriptions | Confirmed; still keep costs low and measure headroom/usage |
| D16 | Free gameplay; TRMNL Creator Fund is the intended sole MVP revenue source | Confirmed direction; no player billing or pay-to-win. Eligibility and profitability are unproven; [monetization](monetization.md) |
| D17 | XP-earned ranking among similar-level heroes, with rolling 24-hour and seven-day views in Month 1 | Confirmed; D20 finalizes scope/groups/display; [ranking specification](ranking.md) |
| D18 | Occasional manual companion management; preserve new gear finds | Confirmed; target management every three to seven days. Start tuning with 30 bag slots and about five gear/day; no automatic equip/disposal; [inventory specification](inventory.md) |
| D19 | Sleep after first gear overflow, retain that find, stop encounters/XP until deliberate resume | Confirmed; full bag alone and 24-hour companion inactivity do not trigger sleep. Claim held find and leave at least one free slot before Resume; next eligible tick, no catch-up. Recent XP still ages out |
| D20 | Seven-day recent board on TRMNL; both recent views and secondary lifetime board in companion | Confirmed; current-level bands 1–3, 4–7, 8–11, then four-level bands. Group changes carry recent XP and clear delta; new/zero-score heroes included. No per-installation period setting in MVP |
| D21 | Gold is a reserve until the later merchant | Confirmed; secondary prominence, no MVP shop or promise of future purchasing power. Price later offers against retained balances; never reset gold to fix inflation |
| D22 | Two deletion levels: **Delete Desk Crawler progress** (game data and connections; shared account and sign-in stay) and **Delete TRMNL Games account** (every game's data, connections and the shared Clerk identity; also triggered by Clerk `user.deleted`); permit replay-safe fresh start | Revised 2026-10-04 for the platform migration (D40), replacing deletion of a dedicated Desk Crawler identity. Both levels: deny authority/mask names immediately, resumable purge, minimal disclosed credential-revocation retention while tokens remain usable. V09 must prove returning-player authorization; old code/token replay alone denied |
| D23 | Barry initially handles support/admin; private email reports, public GitHub bugs, audited name repair | Confirmed; two-business-day response target, concise banned-content/impersonation policy, temporary masking/restricted replacement preserves progress. Suspension for deliberate/repeated abuse or compromised authority; no MVP chat/ticketing service |
| D24 | Initial progression targets: level gain day 1, Server Room unlock days 2–4, Cafeteria unlock days 8–14 | Approved balance targets for occasional management, not promises; report unlock/travel separately and seeded distributions |
| D25 | Bounded companion return summary, independent of detailed log retention | Confirmed; one server-captured visit checkpoint, XP/level gains, current gear and attention state; no per-poll acknowledgement |
| D26 | Twelve monsters and four summary variants per encounter type per biome | Confirmed floor: 48 encounter variants plus lifecycle summaries; initial ongoing goals are gear and recent competition |
| D27 | Owner incident/recovery emails and daily-backup recovery baseline | Confirmed planning direction: five-minute run stall, deduped alert/recovery notices; daily seven-day backups plus pre-migration backup, one-business-day restore target and roughly one-day potential loss. Entitlement, delivery and safe restore must be proven |
| D28 | Prove complete install-to-physical-display path early | Confirmed implementation order after coding authorization; minimal valid content/layouts first, full release gates remain |
| D29 | One-visit return from inventory sleep: Resume may take a destination biome; bulk sale of selected bag gear | Confirmed revision 6. `resumeAdventures` accepts an optional unlocked biome: the hero wakes on the next tick into travel and arrives the tick after, with no catch-up. `inventory.sellMany` sells up to 30 player-selected bag items under one receipt. No automatic disposal; D18/D19 otherwise unchanged |
| D30 | Slow the late-game gear curve and trim gold income | Confirmed revision 6 tuning direction for A03: best-in-slot gear around days 35–45 for the three-day cohort, and gold income reduced so Month 2 merchant prices stay reasonable. Never reset existing gold (D21). Numbers come from the harness |
| D31 | Hourly ranking publication with hourly score buckets | Confirmed revision 6; amends D20/P04/P22. Simulation stays every 15 minutes. All three views publish together once per UTC hour; recent windows are whole UTC hours (24 or 168 hourly buckets). Replaces quarter-hour precision and 672-entry history |
| D32 | Dormant heroes leave recent boards | Confirmed revision 6; amends D20. A paused hero, or a sleeping hero with no wake scheduled, that has zero XP in a recent window is left out of that board and its population counts. It stays on lifetime and returns at the next publication after earning XP. New, dead, travelling and quarantined heroes remain listed. Simulation skips writes for dormant heroes between publications |
| D33 | Initial production home `desk-crawler.grandprixpicks.com`; public GitHub repository `barrymichaeldoyle/desk-crawler` | Confirmed revision 7; resolves O01. Remote creation/push and DNS changes still need explicit authorization when we get there. The `grandprixpicks.com` zone is on Cloudflare, so a Workers custom domain fits |
| D34 | MIT license for code; original artwork, authored narrative content and the Desk Crawler name/logo all rights reserved | Confirmed revision 7; resolves O06. See [LICENSE](../LICENSE). Vendored TRMNL skill keeps its own MIT notice |
| D35 | Luck: mandatory bounded reward rolls plus rare lucky moments | Confirmed revision 7. Every XP/gold reward rolls inside its template range; rare elite foes and gold jackpots create memorable stories and real short-window rank variance. No gear/potions from luck, no streaks or alerts. Rates are tuning proposals; [gameplay](gameplay.md#luck-and-lucky-moments) |
| D40 | TRMNL Games platform direction and owned `trmnlgames.com` domain | Confirmed direction 2026-10-04: Barry bought the domain and wants future TRMNL games to share infrastructure. [Migration plan](trmnl-games-migration.md) proposes monorepo, shared account/backend/companion, game boundaries and cutover. Its detailed choices and changes to D22/D33 remain proposed; this planning request does not authorize production migration |
| D41 | Pre-launch TRMNL Games migration: owner identity/progress preservation is best effort | Confirmed 2026-10-04: no marketplace review submission or public player base yet. Preserve Barry's existing user/hero if straightforward; fresh signup/hero/TRMNL reconnection is acceptable if preservation fails. No mandatory issuer bridge or long legacy compatibility period. This exception is limited to the pre-launch migration, not future public releases, and is not an instruction to reset production now |
| D39 | Remove device date/time/timezone labels and the separate companion timezone preference | Confirmed 2026-10-04. All four layouts focus on hero/story with service warnings and logical-tick ETAs. Companion timestamps use browser local time; any future device timestamps use TRMNL's configured timezone. Keep legacy v1 fields/API/storage for compatibility; supersedes P17's timezone UI |
| D38 | Alert sender `desk-crawler@grandprixpicks.com` via Resend | Confirmed revision 10; replaces proposal P24. `grandprixpicks.com` is already verified in Resend (Pro), so no new DNS is required. Optional Cloudflare Email Routing can forward replies/bounces to barry@barrymichaeldoyle.com |
| D37 | Live checks use Barry's TRMNL X and Developer Edition access | Confirmed revision 9. TRMNL X is the physical and larger-grayscale proof device; OG 1-bit layouts are proven from TRMNL-rendered screenshots (confirmed revision 10). Developer Edition covers the V07 entitlement prerequisite; creating/submitting the Third Party plugin still needs live proof |
| D36 | Support and operational alerts go to barry@barrymichaeldoyle.com | Confirmed revision 8. Private player reports (D23) and incident/recovery emails (D27). The alert sender must be a verified sending domain; staging and restore drills still use a safe test destination or disabled delivery |

Revision 5 details: [approved build refinements](build-readiness.md). These approvals do not authorize implementation or sending email.

## Proposed implementation defaults

| ID | Proposal | Rationale / authoritative doc |
| --- | --- | --- |
| P01 | Convex fixed UTC tick at minutes 13, 28, 43, 58 | Predictable schedule; no claim that TRMNL refreshes align; [simulation](simulation.md) |
| P02 | No offline catch-up for service outages or paused heroes | Avoid bursts and fairness exploits; recovery resumes an interrupted logical run |
| P03 | Automatic potions and rest use fixed MVP policies | Passive play never requires daily intervention; [gameplay](gameplay.md) |
| P04 | Top 100 per selected companion board/group; seven-day own-group Top 5 on device; exact scoped ranks | One coherent immutable hourly publication (D31) covers both recent views and lifetime; [leaderboards](leaderboards.md) |
| P05 | No standing level cap; fixed biome rewards slow later growth | Avoid a dead end before later biomes ship |
| P06 | Current gameplay fields only; future migrations are additive | Do not prebuild six months of unused tables/optional fields |
| P07 | TRMNL lifecycle and rendering on Convex HTTP actions; installation/management UI on Workers | Direct polling avoids an extra proxy per refresh |
| P08 | No anonymous heroes; Clerk controls the three confirmed sign-in methods | Existing subscription and one persistent owner identity |
| P09 | No subscriptions, purchases, ads or payment integration in MVP | Superseded no-monetization assumption: Creator Fund is intended revenue under D16; no player charges |
| P10 | 1,000 heroes/instances as an engineering load scenario, not a signup cap or beta | Establish a repeatable capacity benchmark; no production capacity claimed yet |
| P11 | Raw installation tokens are hashed and discarded; token grants and plugin instances are separate records | Multi-instance identity and bounded read authorization; [TRMNL](trmnl.md) |
| P12 | Three-day detailed gameplay log retention; 30-day run summaries | Bound growth; [data model](data-model.md) |
| P13 | GitHub Actions coordinates staged Convex/Workers deployment | Proposed CI choice for the confirmed GitHub repository |
| P14 | Hero/status and newest story lead every layout; ranking is secondary | [Experience](trmnl-experience.md); full still includes Top 5 |
| P15 | Device date/time labels superseded by D39; UTC timestamps remain in the API | Service warnings explain reachable delays; companion history uses browser local time; [TRMNL](trmnl.md) |
| P16 | Bounded persistent install attempts authorize recovery and targeted repair | Delayed callbacks cannot revive tombstones alone; V06 still required |
| P17 | Retries stop before receipt expiry; timezone UI superseded by D39 | Contract consistency; legacy timezone API remains for compatibility; [API](api.md) |
| P18 | Current framework docs apply, including the numeric progress fill-width exception | Current guidance outranks older vendor examples; [references](references.md) |
| P19 | Prepare a pending hero after verified code exchange; activate atomically on authenticated Save confirmation or V06 recovery | One useful first screen; no pending rewards/rank, no callback-created heroes; [TRMNL](trmnl.md), [API](api.md) |

| P20 | Initial bag capacity 30; quiet warning at 24; target about five gear/day | Approved tuning baseline, not measured/permanent balance; validate capacity distributions and useful upgrades |
| P21 | Loot baseline 15% gear / 20% potion / 65% gold; combat gear drop 3% | Working content weights replacing the old high-acquisition sketch. Full potion stacks select a gold outcome before generating a potion; measure supply/undergeared survival |
| P22 | Bounded recent-XP history and one atomic hourly board publication | Up to 168 hourly buckets per hero (D31) plus a small current-hour accumulator on the hero, folded at publication; pinned run time, exact integer sums; V04/V05 verify bytes/CPU |
| P23 | Read only the equipped gear, potion row and denormalized bag count per tick | Proposed cost refinement: the core needs equipped stats, potion quantity and bag usage, not all 32 rows. Keep `bagGearCount` on the hero, maintained in the same transaction as every item insert/delete/claim. Intents still read full inventory; A05 measures both shapes under V05 before choosing |

## Verification gates before implementation commitments

| ID | Evidence needed | Unblocks |
| --- | --- | --- |
| V01 | Current TanStack Start + Clerk + Convex builds and authenticates in Workers runtime | Foundation and authenticated web app |
| V02 | Real Third Party installation, token exchange, callback, screen body and instance UUID behavior | Final lifecycle validator and connection model |
| V03 | All four layout responses render using markup + `merge_variables` in TRMNL | Final rendering adapter and publication |
| V04 | Index ordering, stable cohort pagination, generation build and promotion work under duplicates/concurrent edits | Tick scheduler and leaderboard implementation |
| V05 | Read/write/CPU measurements at 100 and 1,000 heroes; batched cleanup stays below actual deployment limits | Capacity claims and budget estimate |
| V06 | Second instance/reinstall token/UUID reuse; callback loss/delay/replay; targeted repair of tombstones | Lifecycle recovery policy |
| V07 | Owner can create/submit Third Party plugins under current device/license entitlements; reviewer access works with Clerk | Registration/review preparation |
| V08 | Save → playlist preview → physical screen/mashup works with current refresh; slower settings/sleep and outage/revocation observed | Accurate first-screen/help promises |
| V09 | Deleted-account credential/code replay remains denied after purge; auth-identity deletion and minimal revocation retention are explicit | Safe account purge and accurate privacy copy |
| V10 | Creator Fund eligibility for this Third Party game/category, owner registration/payment requirements and current qualification rules | Revenue claims and financial launch assessment; listing approval alone does not establish eligibility |

## Open owner decisions

These do not block the current documentation work. Ask only before dependent implementation.

O01, O06 and O07–O10 are resolved; their technical verification gates remain open. Delivery capacity: AI agents implement the work packages under the lead, so Month 1 keeps its full scope (final-review E10). Approval remains planning only.

| ID | Question | Working assumption / affected package |
| --- | --- | --- |
| O01 — resolved | Project domain and GitHub owner/repository name | D33 |
| O02 | Which existing Clerk/Convex applications and environments should this use? | Dedicated Desk Crawler app/deployments within existing subscriptions; infrastructure |
| O04 — resolved (tiers) | Actual subscription tiers and available headroom? | Convex Pro and Clerk Pro confirmed (covers Convex daily backups for D27). Cloudflare is on the free plan; Barry approved moving to Workers Paid (from $5/month, usage-based above its included allowance) if the V01 spike or staging shows the free plan's CPU/request limits are too tight for SSR. Resend Pro confirmed. Measure actual headroom/costs before launch |
| O05 | Public launch scale expectations? | No beta or hard signup cap; measure 1,000 heroes and establish capacity before publication |
| O06 — resolved | Project license | D34 |
| O07 — resolved | Deletion scope/retention/return policy | D22; V09 still proves Clerk deletion, minimal revocation and replay-safe fresh authorization |
| O08 — resolved | Public-name/support/admin policy | D23; support and operational-alert address is barry@barrymichaeldoyle.com (D36) |
| O09 — resolved | Ranking groups/periods/device/lifetime policy | D17/D20; [ranking](ranking.md), [leaderboards](leaderboards.md); V04/V05 remain open |
| O10 — resolved | Cadence/held find/sleep/XP/wake/potion policy | D18/D19; [inventory](inventory.md). Capacity/acquisition numbers require balance proof |
| O11 | Launch/funding decision if measured costs exceed payouts or fund eligibility fails? | Barry chose to decide after measured costs; no subsidy or eligibility-only launch rule is approved. Preserve zero-revenue measurements and V10 |

Gameplay constants are tuning proposals except explicitly confirmed rules/numbers (including death/revival and level-group boundaries). Bag size/acquisition rates are approved measurement starting points, not tuned results. Record tuning changes in balance evidence and affected contracts.

D24–D28 resolve final pacing/content/recap/incident/recovery-policy recommendations. Exact operational address, backup entitlement and independent deletion/revocation recovery source remain setup/verification work. O11 remains deferred until measured costs.

## Corrections to the earlier rough design

- Third Party marketplace installation replaces manual private-plugin setup. Its screen endpoint returns a JSON **markup envelope**; a canonical player JSON query/API still exists.
- All four device layouts move into Month 1 as a marketplace requirement. Later months enhance them rather than introduce missing layouts.
- There is one Warrior sprite in two states, not three class sprites.
- No `level * 1e9 + xp` packing. Rank by an explicit tuple, with deterministic ties.
- Ranking during mutable pagination can produce internally inconsistent ranks. Freeze rank inputs, build a generation, then atomically publish its pointer.
- A Convex cron's own non-overlap guarantee does not cover a fan-out chain it schedules. Add an application-level active-run guard.
- Scheduled actions are not automatically retried like mutations. Database-only simulation uses internal mutations; OAuth/network work uses actions with explicit retry handling.
- `pause`, token revocation/lifecycle, unequip, and automatic rest are MVP necessities beyond the six mutations in the sketch.
- Future guilds, prestige, seasons, MP, and hardcore fields are not mandatory schema placeholders.
- The previous “10 devices for a week” beta gate is removed. Automated checks, staging and a real installation/render check replace it.

## Change record

2026-10-03: established confirmed scope including three sign-in methods, pseudonyms and pause/resume; installed official TRMNL skill; documented architecture, release themes, verification gates, and work packages. No game implementation or external publication performed.

2026-10-03, revision 2: reviewed docs against current TRMNL guidance; added proposed experience/recovery defaults, entitlement/display gates, edge fixtures and evidence checklist. Confirmed scope remains unchanged; no implementation gate is claimed complete.

2026-10-03, revision 3: Barry chose TRMNL-exclusive entry and requested the documentation update. D09 supersedes the earlier web-only decision; D16 records intended Creator Fund revenue. Proposed activation contracts and dependencies now align with that scope. Installation is a one-time entry requirement, not a continuing connection check. No implementation or external gate is complete.

2026-10-03, final review: Barry confirmed both rolling recent-XP views among similar-level heroes (D17), occasional manual management and preserving new gear finds (D18). O09/O10 record definitions still required before rewriting leaderboard/inventory/state/API/display contracts. Funding will be decided after measured costs (O11). Further product and operational gaps are recorded in the final review; no other suggested change is approved by that review alone.

2026-10-03, revision 4: Barry approved all six recommendations. D19–D23 resolve O07–O10; inventory sleep/held finds, scoped recent/lifetime rankings, gold, deletion and moderation contracts/fixtures/work packages are synchronized. Numerical tuning, protocol/render/recovery/capacity/revenue proof remain open. Planning only; no application implementation or external action authorized.

2026-10-03, revision 5: Barry endorsed all five final refinements. D24–D28 and affected contracts record pacing/content, bounded visit recap, incident emails, daily/pre-migration backups and early real install-to-display milestone. Pacing/backup proposals are approved engineering baselines, not measured guarantees. Planning only.

2026-10-03, revision 6: a whole-plan review with a throwaway rules Monte Carlo (indicative only; see [build refinements](build-readiness.md#pre-harness-arithmetic-check--2026-10-03)) found that sleeping heroes could not travel in the same visit, that gear and gold saturate early, a high per-tick ranking write cost, and dormant-hero cost/clutter. Barry approved D29–D32. Corrected stale gameplay pacing targets against D24, added production OAuth credentials to configuration, let A03 start after A00, and proposed P23. Planning only.

2026-10-03, revision 7: Barry confirmed agents will carry full Month 1 scope, Convex/Clerk Pro, the production domain and public repository (D33), MIT code with reserved art/content (D34) and luck mechanics (D35). Specs were consolidated: revision banners removed, ranking/inventory renamed from `-proposal`, superseded reviews moved to `history/`. Planning only; no remote, DNS or deployment created.

2026-10-03, revision 8: Barry confirmed the `grandprixpicks.com` zone is on Cloudflare, the Workers Paid upgrade if needed, and barry@barrymichaeldoyle.com for support and alerts (D36). He authorized the first commit and public GitHub publication of this planning repository. No deployment, DNS change or email sending.

2026-10-03, revision 9: Resend Pro confirmed (O04 tiers resolved); TRMNL X and Developer Edition for live checks (D37); proposed alert sender P24. Removed a tool-managed block from AGENTS.md.

2026-10-03, revision 10: Barry confirmed the alert sender `desk-crawler@grandprixpicks.com` on the already Resend-verified domain (D38, replacing P24), and that OG coverage uses TRMNL-rendered screenshots. Remaining open items are setup or measurement: O02 (create the dedicated Desk Crawler Convex/Clerk apps at provisioning), O05 launch scale and O11 funding.

2026-10-03, revision 11: first live install. Barry installed the development Desk Crawler plugin end to end: code exchange, owner link, pending hero, Save, success webhook, one-time activation and a TRMNL-rendered screen of the live payload. D12 amended: public names may be real names, with clear public-visibility copy. Findings in `docs/evidence/trmnl-lifecycle.md`.

2026-10-03, revision 12 (implementation night): Barry approved the scene-window visual direction with hand-authored 1-bit pixel art and the full asset scope (hero poses, monsters, scenes/icons, frame/runes/title icon). Built while Barry slept: A04 intents, A05 scheduler (live), A06 hourly rankings, A09 companion, management landing, D25 recap, D22 deletion (live-verified with the Clerk test identity), D27 incident notices (off until `RESEND_API_KEY`), D23 admin, retention cleanup, public help/privacy/support pages, layout matrix harness. See [status](status.md). Dev deployment only; no production deploy, DNS, email or marketplace action.

2026-10-04, revision 13: Barry removed device date/time/timezone labels and the separate companion timezone preference (D39). Template v11 keeps service warnings and logical-tick ETAs; current onboarding stops collecting browser timezone, while legacy backend arguments/storage and v1 labels remain compatible. Companion times use browser local time. No deployment or external plugin update authorized by this change.

2026-10-04, revision 14: Barry requested a shared TRMNL Games platform and monorepo/domain migration plan (D40), then clarified that preserving his pre-launch test identity/progress is optional if costly (D41). Simplified the proposal to one coordinated cutover with a best-effort one-off owner rebind or fresh onboarding; removed mandatory issuer bridging and extended legacy compatibility. Architecture/deletion-policy details remain proposed; no deployment or data reset performed.

2026-10-04, revision 15: Barry approved finishing M2 and committing the monorepo move directly on `main` (no migration branch, nothing in production needs protecting). D22 revised to the two deletion levels. Install/manage handoff cookies are now named per game. Committed locally; not pushed, because a push to `main` deploys production.
