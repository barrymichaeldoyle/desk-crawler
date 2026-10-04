# Delivery, operations, security and costs

## Environment strategy

Local development: current pinned app dependencies, local Workers-compatible runtime, a Convex development deployment, dedicated Desk Crawler Clerk development instance, mocked TRMNL external calls for most tests.

Staging: separate Convex state + Worker deployment + dedicated Clerk configuration. Use an owner's development TRMNL plugin/instance for live protocol and screenshot checks. Staging is an engineering environment, not a player beta program. Do not copy private production user data into it.

Production: `https://trmnlgames.com` (D40, moved from `desk-crawler.grandprixpicks.com` in the M4 cutover), Convex `exciting-cormorant-948`, the TRMNL Games Clerk production instance and Cloudflare Worker, TRMNL plugin 564. These are configured and live as of 2026-10-04. Daily backups and the corrected deletion webhook were verified; [release evidence](evidence/release.md) records current open gates. Original planning sections below describe policies, not the current provisioning checklist.

Each environment uses explicit app/API origins and a matching Clerk issuer. Development and production tokens must never share a database or grant identity. A preview deployment must not accidentally run production mutations or register production cron jobs.

## Configuration inventory

| Configuration | Location / visibility |
| --- | --- |
| Convex deployment URL | Web public client configuration; `.convex.cloud` client endpoint |
| Convex HTTP origin | App/server configuration; `.convex.site` lifecycle/screen endpoint |
| Clerk publishable key | Public frontend config |
| Clerk secret key | Workers server secret for auth; Convex server secret for retryable dedicated-user deletion; never public |
| Clerk webhook signing secret | Convex server secret for verified user.deleted reconciliation |
| Clerk issuer domain | Convex auth config; exact environment match |
| Google and GitHub OAuth client credentials | Entered in the production Clerk instance's social-connection settings (Clerk's shared development credentials do not carry over to production); callback URLs follow the production domain |
| App origin and allowed callback host/path | Server allowlist configuration |
| TRMNL plugin Client ID | Server audience validation configuration |
| TRMNL Client Secret | Keep server-only if needed by current registration/protocol; not required for the documented install code exchange |
| Pending-flow cookie encryption key | Workers secret; environment-specific rotation plan |
| World seed | Server-generated Convex singleton; never public config |
| Admin allowlist | Server-controlled Clerk subjects/verified claims, never client writes |
| Convex/Cloudflare deployment tokens | CI secrets with project-scoped access |
| Resend key | Convex server-only; configured for approved D27/D38 incident/recovery notices |

Keep an `.env.example` with variable names and fake placeholders during implementation; never print or commit actual secret values. Do not create replacement accounts when existing subscriptions can host the project.

## CI/CD proposal

The repository is `github.com/barrymichaeldoyle/trmnl-games` (renamed from `desk-crawler` 2026-10-04; D33), MIT for code with reserved art/content (D34). Cloudflare Workers Builds deploys on pushes to `main` using `pnpm build:deploy` and its configured Convex deploy secret. Treat a push as a production deployment and obtain explicit approval. Backend/web releases must preserve the shared contract.

Pull request checks: frozen dependency install, formatting/lint/type check, domain and transaction tests, contract/fixture checks, deterministic small balance smoke, Worker production build, relevant end-to-end tests, and docs/link checks. Screenshot checks are required when a layout/payload/text-length change affects rendering; do not burn TRMNL render allowance on unrelated commits.

Main branch: deploy only passing versions, continuously. Build once and record commit/content/simulation/template versions. Backend changes must be backward-compatible with the currently deployed app and templates.

Recommended release sequence:

1. Deploy additive schema/functions/catalog versions while old behavior remains active.
2. Deploy compatible app/static sprite assets and templates; smoke auth, hero reads/intents and all relevant endpoints in staging.
3. Activate the new simulation/content/template selection at a clean tick boundary only after every required asset exists. Existing active runs continue with their pinned supported version.
4. Promote production-compatible artifacts, run targeted production smoke with an owned test account, then activate feature/content flags.
5. Record release and monitor health/cost metrics. If checks fail, stop promotion; the last complete board/state remains served.

Activation config may live in the Convex singleton or a small release-config record. It must have an audited mutation; deploying code alone must not force an in-progress run onto a new simulator version. For a breaking core change, pause **new** tick starts, let the active run finish, deploy/verify, then resume at the next scheduled wall slot. Drain wait has a finite timeout and visible blocked status.

Two-phase migrations: add optional fields/read fallback → backfill in bounded pages → activate writes → validate → only later remove fallback. Do not delete or rename a live field in the same deployment that starts using its replacement.

Production deployment authorization and continuous automation rules will be established when Barry asks to set up delivery. This plan itself does not authorize publishing a site or sending marketplace submission emails.

## Runbooks

| Incident | Response |
| --- | --- |
| Tick >5 minutes without progress | Inspect active phase/sequence and scheduled job. Recover same run only if recognized safe cause; block repeated deterministic errors |
| World stale >30 minutes | Surface device/web stale state; inspect cron, deploy, scheduler and quota; resume without missed-slot rewards |
| One hero quarantined | Replay saved domain inputs under pinned versions; correct data/content/core; release with audit reason; no automatic retroactive rewards |
| Rank build failure | Keep old published generation; resume frozen-input builder at saved sequence; never publish partial rows |
| Token/code exchange failed | Validate response body and retry idempotent exchange when appropriate; show restart option; never fabricate link success |
| Success webhook lost | Validate first authenticated render/explicit relink recovery; do not rely on PII match |
| Broken layout | Revert template selection to last tested version; keep payload/game state; record screenshot evidence |
| New sprite missing | Keep old template/assets selected until static upload exists; asset URLs are versioned |
| Account deletion | Disable authority immediately, tombstone connections, mask copied public names, resume batched purge until verified complete |
| Cleanup backlog | Reduce page size if limits hit, resume continuation; inspect oldest row and protected active generations |
| Usage nearing allowance | Measure dominant operation; adjust log retention/batch sizes/read shape; discuss paid capacity before imposing new gameplay restrictions |

### Content releases

A catalog change ships as a new content version (e.g. v3) next to the old ones, so runs that pinned the old version can still finish. After the deploy, switch the live world between runs with `npx convex run world:setActiveContentVersion '{"contentVersion":"v3"}' --prod`. It refuses while a run is active (retry after it completes) and returns the previous version; switching back the same way is the rollback. `ACTIVE_CONTENT` only seeds new worlds. Switching is a production data change and needs explicit approval.

Never “fix” an incident by resetting all player state, dropping active rank generations or blindly replaying a tick. Restore/compensation is an explicit audited operation with a separate decision.

## Security requirements tied to this design

- Clerk identity + ownership at every public mutation/query. Client route guards are not authorization.
- TRMNL bearer + UUID authority for screen/lifecycle requests; tokens are stored hashed and grant display access only.
- Known token cannot be attached to another Clerk owner. Plugin instances and grants use logical uniqueness checks in transactions.
- JWT verification is cryptographic and claim-checked; a supplied UUID/query string is not authority.
- Callback/return URL allowlists prevent open redirects. Pending-flow cookies and state-changing server functions use origin/CSRF protections.
- User strings are data, escaped in Liquid/HTML; no user string becomes template code or arbitrary asset URL.
- Private SSR responses/payloads are not shared-cacheable. No raw authorization headers, install codes/JWTs or emails in operational logs.
- Display endpoint bodies/metadata and detail logs have bounds; unknown keys may be ignored without expanding stored state.
- Direct Convex calls have rate/intent validation, independent of the web edge.
- Account deletion/suspension masks public copied identities promptly and revokes display access.

Minimum retention/privacy/support pages should accurately describe aliases, auth provider, installation credential use and deletion behavior. Formal policy/legal copy needs an appropriate review when publication details are known; do not infer a compliance regime from this game concept.

## Cost model

The design reuses existing subscriptions. Barry set no fixed extra monthly spending cap, while asking to keep costs low. That does **not** establish available allowances or guarantee zero incremental cost. Cloudflare hosts the web/SSR app and versioned static assets. The account is on the free plan; move to Workers Paid (from $5/month plus usage beyond its allowance) if the V01 spike or staging shows SSR exceeds free-plan CPU/request limits; direct TRMNL rendering calls Convex rather than proxying every refresh through the web Worker. [Workers pricing reference](https://developers.cloudflare.com/workers/platform/pricing/)

Let N = activated simulated heroes, D = polling plugin instances, interval = 15 minutes, month = 30 days. Pending heroes are excluded from reward/rank work but add bounded storage/cohort-scan overhead. Disconnected activated heroes remain in N; D and N are independent:

- Tick evaluations = `N * 96 * 30 = 2,880N/month`.
- Screen requests = `D * 96 * 30 = 2,880D/month`, before manual refresh/retries.
- Baseline screen invocation count ≈ one HTTP action + one internal payload query = `5,760D/month`; lifecycle/telemetry/masking implementation can add work.
- With simulation pages 25 and rank pages 100, worker-page baseline ≈ `2,880 * ceil(N/25) + 720 * 3 * ceil(N/100)` (ranking publishes hourly, D31; dormant heroes cost a hero-row read between publications, D32); add cohort boundaries, coordinator/publication/watchdog/cleanup calls and actual history expiry cost.
- Up to one tick log per evaluated active gameplay tick; waiting dead/paused/sleeping do not create empty tick logs. Dormant heroes (paused, or sleeping without wake) cost a hero-row read per tick and a score fold/rank projection per hourly publication; sleeping is not zero backend cost, but it is far cheaper than active play.
- Three-day log ceiling ≈ `288N` tick rows plus bounded command rows. At 0.5–1.5 KiB each, estimate raw row bytes before index overhead.

| Scenario | Hero evaluations/month | Screens/month (D=N) | Baseline screen calls/month | Three-day tick-log ceiling |
| --- | ---: | ---: | ---: | ---: |
| 100 heroes / 100 instances | 288,000 | 288,000 | 576,000 | 28,800 rows |
| 1,000 heroes / 1,000 instances | 2,880,000 | 2,880,000 | 5,760,000 | 288,000 rows |
| 1,000 heroes / 2,000 instances | 2,880,000 | 5,760,000 | 11,520,000 | 288,000 rows |

At 1,000 heroes, three days of logs alone may be roughly 140–420 MiB raw under that assumed row-size range. Hero/rank/input rows, indexes, subscriptions, mutation churn and cleanup add cost. Two retained publication sets (up to three rank rows per hero per set), bounded generation entries/rank inputs and <=168 hourly score buckets per hero stay O(N) with fixed history bound. Rebuilding/deleting them hourly (D31) still consumes writes, about a quarter of the per-tick design. Measure actual billing and database bytes rather than assume caches make all costs negligible.

Use measured means and p95s: per screen function count/read bytes/latency, hero tick CPU/read/write bytes, three-view board/cleanup writes and score-history document bytes/expiry CPU, static art egress, daily SSR requests and open web subscriptions. Compare against the actual subscriptions in use before launch. [Convex limits and usage](https://docs.convex.dev/production/state/limits)

Initial knobs: bounded logs, 30-slot baseline plus one held find/potion (32 rows), bounded score history, compact rank projections, throttle optional telemetry, batch job sizes, efficient subscriptions and immutable static assets. Do not silently slow 15-minute gameplay or gate signups as a cost fix; propose any product behavior change explicitly.

No new paid analytics, Redis, Sentry, managed queue or email-delivery service is planned for MVP. D27 adds owner incident/recovery email through the existing subscription, with a configured verified sender, recipient barry@barrymichaeldoyle.com (D36), and bounded deduplicated delivery. Admin health shows failed delivery. [Approved incident policy](build-readiness.md#operational-alerts) distinguishes alert retries from a new incident. No email is sent during planning; live sending follows implementation/configuration authorization.

## Operational targets (proposed, to verify)

- Healthy run including rank publication: under 2 minutes at the documented 1,000-hero scenario.
- Screen response p95 under 1 second, comfortably inside TRMNL timeout.
- Hero/run stale label after 30 minutes without expected progress; alert on 5-minute stalled batch.
- Application cleanup target: no log row older than 96 hours except an explicitly retained failure/debug record.
- D27: daily production backups retained seven days plus completed pre-migration backups; confirm plan entitlement/cost. Target recovery within one business day with roughly one day of potential snapshot-related progress loss; prove isolated restore with synthetic data.

These are engineering targets, not SLAs or guarantees. First public release evidence must state the tested environment and actual observed load.

## Display delivery, outage and privacy

Diagnose game run → authorized payload → TRMNL Liquid/assets/preview → device wake/playlist/display separately. Only the first two are directly observable by our backend. Optional `lastScreenServedAt` is throttled response telemetry, not rendering or human attention.

Reachable serving with delayed simulation returns valid state plus delay/service status. During a serving outage our templates cannot add warnings to existing images. Device layouts omit timestamps (D39); companion diagnostics and TRMNL preview/refresh settings help diagnose old images. Record actual TRMNL failure behavior in V08. Revocation cannot erase already generated/offline images.

The 15-minute formula above is a conservative continuous per-instance scenario, not predicted on-demand volume. Measure actual requests per installation/playlist and manual retry traffic; sleep and schedules can change demand. Hero simulation remains independent. Devices and instances are not interchangeable counts.

Hosted framework/font updates may cause regressions without our template changes. Record runtime in evidence, compare the tested matrix after relevant platform updates, and revert templates only if effective. Local version pins do not control TRMNL's hosted renderer.

## Revenue and cost review

Use [monetization](monetization.md) for the intended Creator Fund route and V10 evidence. Forecast zero payouts until qualification/payment history is known; do not assign a fixed value to each download or treat screen requests as paid impressions. Report activated heroes, pending drafts and currently polling instances separately, including simulation cost for disconnected owners. Measure total cohort page overhead including pending rows; the N-only page estimate above is a baseline, not a pending-heavy capacity claim. Review realized payouts versus incremental spend monthly. Funding shortfalls need an explicit product/budget decision before changing progression, access or billing.

## Approved support, deletion and response-volume operations

Barry is initial support/admin owner; private support email handles account/name/security reports, public GitHub issues handle non-private bugs. Two-business-day response target is not an SLA. Support reports and operational alerts use barry@barrymichaeldoyle.com (D36); the alert sender domain remains launch configuration. No mail is sent by this plan.

D27 selects email to Barry for five-minute run stalls and recovery, suppressing repeat checks for an open incident. Recipient is barry@barrymichaeldoyle.com; sender `alerts@trmnlgames.com` (`TRMNL Games` display name) on the Resend-verified `trmnlgames.com` domain, replacing D38's `desk-crawler@grandprixpicks.com` (revision 24); `ALERT_FROM` overrides it. Recovery evidence must include the [backup baseline and reconciliation drill](build-readiness.md#backup-and-recovery-baseline), including a protected source for post-backup deletion/revocation changes. Code/config/scheduled work restoration is separate from database restoration; deny uncertain credentials until reconciled. Backup/recap/incident bytes, writes and delivery costs join the measured zero-revenue cost report.

Account deletion persists denial plus a guarded durable deletion job before provider calls. Purge held gear, XP history and copied names; delete the dedicated Clerk user and verify completion. Record retry/blocked phase and scrub references from retained diagnostics; minimal revoked hashes persist while credentials remain usable. V09 proves replay-safe returning-player authorization. Public names use version masking so repair cannot reveal an old offending generation.

At the 40 KiB envelope ceiling, 1,000 continuously polling instances yield about 110 GiB/month response volume before sprites/retries. Measure actual bytes, relevant billing and clustered requests; this is an upper-budget scenario, not predicted traffic or a price quote. Measure score-history overhead and inventory-sleep cohorts rather than claim sleep removes all simulation cost.
