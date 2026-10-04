# TRMNL Games platform and domain migration

Prepared 2026-10-04 for Barry. **Proposed implementation plan**, not an executed migration. Barry owns `trmnlgames.com` and wants future TRMNL games to share infrastructure. This document proposes the architecture and the changes to existing policies needed to support that direction.

Barry clarified that the plugin has not been submitted for review and there is no public player base to migrate. Preserving his current account/hero is best effort, not a release gate. The plan therefore uses one coordinated pre-launch cutover rather than a customer identity bridge, overlapping clients or a long compatibility period. This exception applies to this migration; progress preservation still governs releases after launch.

## Recommended outcome

One TRMNL Games companion at `https://trmnlgames.com`, one Clerk application, and one Convex production deployment. Desk Crawler becomes the first game in the platform. Each game has a distinct TRMNL marketplace plugin, its own progression and display templates, and its own server-controlled lifecycle configuration.

Reuse the existing production Convex deployment `exciting-cormorant-948`, Clerk application/production instance and initially the existing Cloudflare Worker because that avoids unnecessary provisioning. Move code into a pnpm monorepo and retain plugin 564. Attempt to keep Barry's existing user/hero and installations with a small one-off migration. If preservation becomes disproportionate, he can sign in, create a hero and reconnect TRMNL on the new platform. Infrastructure display names and repository branding can change without replacing the underlying resources.

A shared deployment shares capacity, outage and backup boundaries. Application modules provide separation, not independent infrastructure fault isolation. Each game needs separate run guards, publication pointers, maintenance controls, notices and cost measurements. If a later game needs stronger isolation, introduce a Convex component or another deployment deliberately; the common login and web shell can still remain shared.

## What is here today

| Area | Current implementation / migration consequence |
| --- | --- |
| Repository | Single root app, pnpm 11.17, Node >=24; current review/layout/brand changes are uncommitted and must be preserved |
| Companion | TanStack Start/Vite/React on Worker `desk-crawler`; public `/`, player `/app`, inventory, leaderboard, settings, install/manage handlers |
| Backend | Root `convex/`, Convex 1.46; generated API imported directly with relative paths across app/tests/tools |
| Identity | `users.tokenIdentifier` identifies players; `users.activeHeroId` assumes Desk Crawler is the only game |
| Deletion | Removes Desk Crawler data **and the Clerk identity**; privacy/settings promise this explicitly |
| Game orchestration | `worldState.key = 'world'`, one quarter-hour simulation, one watchdog, one ranking publication pointer |
| TRMNL | Plugin 564; one configured Client ID/audience; grants/instances assume one game; legacy HTTP endpoints are live |
| Assets | Scenes are served from the Convex `.site` host; QR URLs depend on `COMPANION_ORIGIN`, default old domain, cached for a day |
| Domain references | Wrangler routes, SEO/canonicals/social card, Clerk key/issuer, QR defaults/paths, screen footer, help/docs and plugin install/manage URLs |
| Delivery | Every `main` push deploys production Convex then Worker; non-production branch builds are currently disabled |

Public DNS inspection on 2026-10-04: `trmnlgames.com` uses `sunny.ns.cloudflare.com` and `konnor.ns.cloudflare.com`; its apex has no public A record. Nameservers do not prove that the zone is active in the intended Cloudflare account. Verify account, zone status, conflicting records and certificate readiness before cutover. No DNS was changed while preparing this plan.

## URLs and product boundaries

Use paths on one origin so every game shares the same login and companion session:

| URL | Purpose |
| --- | --- |
| `trmnlgames.com/` | TRMNL Games home/catalog, initially featuring Desk Crawler only |
| `/games/desk-crawler` | Desk Crawler public page and installation instructions |
| `/app` | Player's game library; initially direct access to Desk Crawler |
| `/app/desk-crawler` | Existing hero companion |
| `/app/desk-crawler/inventory`, `/leaderboard`, `/settings` under that prefix | Game-specific controls |
| `/account` | Shared public identity, sign-in and whole-platform deletion |
| `/connect/trmnl/desk-crawler/install` and `/manage` | Game-specific installation and management |
| `/help/desk-crawler`, `/privacy`, `/terms`, `/support` | Game help and platform policies/support |

Clerk's proposed primary application domain is `trmnlgames.com`, with its generated infrastructure DNS records configured as instructed by Clerk. `www.trmnlgames.com` redirects to the apex if configured. Separate companion subdomains and Clerk satellite setup are unnecessary for this single-app proposal.

Keep Desk Crawler's name, logo, simulator and marketplace listing. Add a modest “by TRMNL Games” identity and game switcher; do not apply Desk Crawler's hero icon to the whole platform. Keep future game entries unpublished until real games exist. No new billing, marketing emails, analytics or common currency is included.

Build the new canonical game routes directly. A simple old-host GET redirect is optional convenience for Barry's bookmarks and cached QR codes; no old-route compatibility layer or fixed retention period is required. Update plugin URLs and reconnect installations as needed. Expire old install/manage handoffs rather than transferring cookies across unrelated domains. Do not redirect state-changing requests blindly.

## Monorepo structure

```text
trmnl-games/
  apps/
    web/                        # One TanStack Start companion and Worker
      src/                      # Platform shell + game routes/components
      public/                   # Platform and game brand assets
      vite.config.ts
      wrangler.jsonc
      package.json
    backend/                    # One deployed Convex application
      convex/
        schema.ts
        auth.config.ts
        http.ts
        crons.ts
        _generated/
        platform/               # Shared identity/account lifecycle
        games/deskCrawler/      # Game-specific backend functions
      package.json
  packages/
    desk-crawler/               # Pure simulator, versioned content/art/payload/templates
    platform/                   # Used game registry and public configuration types
  tests/                        # Existing regression suite during the first move
  tools/                        # Deploy guards, art, balance, previews, migrations
  docs/
  pnpm-workspace.yaml
  pnpm-lock.yaml
  package.json                  # Coordinated checks/build/deploy commands
```

Start with pnpm workspaces and explicit package exports. Existing UI primitives can remain in `apps/web` until a second game actually needs a separate UI package. Keep backend-only code and secrets outside browser export paths. The game package must have deterministic, network-free simulator entry points and separate subpath exports for content, art, payload and templates. Do not let React imports enter the Convex runtime.

The mechanical move can initially preserve function names to reduce its diff. The platform refactor can then namespace APIs and cron targets directly. Before deploying renamed scheduled functions, pause new tick starts and drain or cancel obsolete queued work so it cannot invoke removed functions. No public-client API wrappers are required. Keep simulator/content behavior unchanged; this is a structural migration, not a balance patch.

Update generated API imports through a narrow backend workspace export; regenerate code rather than manually editing generated files. Update TypeScript projects, Vitest/convex-test module discovery, asset tools, balance/preview commands, TanStack route generation, package scripts and Cloudflare config resolution. Run installs from the root with one lockfile. Keep current dependency versions during this migration.

Convex supports configuring the functions directory, and its bundler includes imported dependencies. Rehearse the chosen workspace layout with the pinned CLI rather than assume package resolution. [Convex configuration](https://docs.convex.dev/config/convex.json), [bundling](https://docs.convex.dev/functions/bundling), [pnpm workspaces](https://pnpm.io/workspaces).

## Shared identity and best-effort owner preservation

Today the code uses issuer-qualified `tokenIdentifier` for player lookup and admin authorization. Changing the Clerk domain can change that value for the same Clerk subject. This affects whether Barry's existing game user is found, but **does not require a permanent old/new issuer bridge before launch**. [Convex authenticated identities](https://docs.convex.dev/auth/functions-auth).

Use the normal verified identity from the new Clerk issuer. If the existing Clerk instance retains Barry's subject, attempt a one-off update of his known Convex user's identity key and admin allowlist. Keep the user document ID so its hero and connections remain attached. The migration must verify the selected account against the same Clerk instance, reject collisions and avoid granting authority to deleted/suspended accounts. Do not match arbitrary identities by email or public alias.

If that simple update is insufficient, document the outcome and use a fresh owner signup/hero/installation. Reauthentication and loss of Barry's pre-launch test progress are acceptable. Do not spend time on dual issuers, legacy identity aliases or seamless session transfer just to preserve this account.

Acceptance is correct new-domain sign-in, authorization, admin access, signed deletion webhook and account deletion. If owner preservation succeeds, also verify hero ownership and progress. Existing revocation records are not cleared as an auth workaround; replaced installations must have their old authority revoked. If a broader pre-launch data reset becomes necessary, identify the exact tables/accounts and resulting deletion before executing it. This planning clarification is not an instruction to wipe production now.

## Shared platform, separate games

`users` becomes the platform account/public alias. Desk Crawler receives a game-specific profile, initially `{ userId, activeHeroId }`, with an indexed, transactionally enforced one-profile-per-user lookup. Copy any retained owner state into that profile during the one-off cutover and verify references, or create it through fresh onboarding. A permanent dual-read/write period is unnecessary; switch the frontend/backend together during maintenance. Keep temporary schema fields only where needed to complete the deployed migration safely, then remove them once verified.

Existing `heroes`, items, history, score windows and ranking tables can retain their IDs and physical names as Desk Crawler-owned data. A later game gets its own state schema and namespaces. Avoid turning unrelated games into a universal hero/item model. The current singleton and legacy cron targets remain explicitly owned by Desk Crawler; another game must get separate world/run/publication state and scheduler entry points rather than joining this global loop.

The registry initially contains only Desk Crawler's slug, public metadata, enabled state and server-owned plugin mapping. TRMNL connections become game-scoped; update retained installations once or recreate them. Unknown games fail closed. Each future plugin has its own Client ID/audience, credentials, bearer/UUID authorization and HTTP lifecycle routes. A token or management JWT from game A cannot authorize game B. Pending encrypted install/manage cookies must include validated game identity and use game-scoped names so parallel installs cannot overwrite one another. Old handoffs can expire at cutover.

Two deletion actions are proposed, requiring a change to D22 and current policy copy:

1. **Delete Desk Crawler progress:** revoke its installations, immediately deny/mask its game authority and purge its data through bounded jobs; keep the shared account and other games. This is distinct from uninstall/disconnect, which continue to preserve progress.
2. **Delete TRMNL Games account:** immediately deny all game authority, purge every registered game's data/connections, then delete the shared Clerk user. A Clerk `user.deleted` webhook invokes this whole-platform path.

Game-specific deletion/suspension and shared account deletion/suspension need separate authority flags and scoped tombstones. Shared-profile name moderation masks copied names across games. Keep dedicated purges resumable, retain replay-denial records and define safe fresh-start/reinstallation behavior. Update settings, privacy, terms, help and tests before launch. The new UI explicitly distinguishes deleting game progress from deleting the platform account; no legacy deletion UI/API compatibility is required.

## Production resources and configuration

| Resource | Planned change |
| --- | --- |
| GitHub | Convert existing repository in place; preserve history. Rename to `trmnl-games` after build integration is verified; update local remote, CI connection, docs/support/license links and Clerk CLI project linkage as needed |
| Cloudflare | Verify new zone/account; attach new apex to existing Worker. An old-host GET redirect is optional. Keep Worker name initially to preserve secrets/build connection; rename only if useful |
| Worker builds | Install/check from workspace root; build web from its package; deploy with explicit web config. Verify root, watch paths, package manager, output config and environment resolution |
| Convex | Keep existing prod/dev deployments, database and backups. Use coordinated root deployment scripts and exact target guard. Server URLs may remain `.convex.site`/`.cloud` |
| Clerk | Keep same app/prod instance; rename branding, change primary domain, DNS/certificates, publishable key, issuer integration and Google/GitHub callbacks; retain current auth methods |
| TRMNL plugin 564 | Keep plugin registration; update install, management, docs and any renamed screen/callback endpoints in the coordinated cutover. Preserve owner installations if straightforward; otherwise reconnect |
| QR/art | Point QR targets at the new game routes and regenerate/version changed assets. Force a fresh owner render; long-term old QR endpoint compatibility is unnecessary |
| Email | Keep the verified `grandprixpicks.com` sender and Barry's recipient initially. A sender on `trmnlgames.com` is an optional later Resend DNS verification/action, not a cutover prerequisite |
| Operations | Brand/config per game, shared support, game-labeled notices/health/costs, per-game pause controls; prove independent post-backup deletion/revocation recovery before public release |

Clerk documents that domain changes can cause downtime and require new DNS/certificates, publishable key, social redirects and issuer/JWKS integration updates. Expect a coordinated cutover, not an atomic cross-service change. [Clerk domain migration](https://clerk.com/docs/guides/development/deployment/changing-domains).

Cloudflare Workers Custom Domains require an active owned zone. Workers Builds supports monorepo root/build/watch configuration. Keep a single backend deploy orchestrator so multiple package builds cannot deploy Convex independently. Branch/PR previews must use preview/dev backend keys and Clerk dev credentials; they must never inherit the production Convex deploy key. [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), [monorepo builds](https://developers.cloudflare.com/workers/ci-cd/builds/advanced-setups/).

## Execution sequence and gates

| Step | Concrete work | Gate before next step |
| --- | --- | --- |
| M0 — baseline | Preserve current review/layout changes; record code/configuration and Barry's user/hero/installation references; inventory DNS, secrets by name and CI. Take a completed backup before production data changes | Recoverable baseline; no secrets in git |
| M1 — mechanical monorepo | Move web/backend, extract pure Desk Crawler package, wire workspace exports/scripts/tests; preserve URLs, schema, APIs and cron function names | Frozen install, typechecks, all 71 existing tests, deterministic balance comparison, Worker build and isolated Convex bundle/deploy succeed |
| M2 — platform foundations | Add registry, shared account shell, game routes/profile, scoped TRMNL config/cookies and deletion boundaries; prepare optional one-off owner rebind | New ownership/revocation/deletion paths tested; no permanent identity bridge or legacy API layer |
| M3 — rehearsal | Deploy isolated web/Convex with synthetic data and Clerk dev; exercise fresh signup, game routes, intents, malformed/wrong-game credentials, duplicate jobs, privacy and QR decoding | New platform works, no authority leaks or duplicate rewards; visual checks pass. Owner preservation is optional |
| M4 — coordinated pre-launch cutover | With explicit approval, pause/drain old scheduled work, deploy new backend/web, configure new Cloudflare host and same-instance Clerk domain/DNS/key/OAuth/Convex issuer, update plugin endpoints/QR origin; attempt simple owner rebind or use fresh onboarding | Email/Google/GitHub sign-in, admin access, signed webhook, healthy simulation/rank publication and fresh install/manage/render/uninstall pass |
| M5 — stabilization and review prep | Confirm physical X delivery, monitor health/costs, optionally redirect old GET pages, refresh marketplace image and reviewer recording/docs; rename repo/resource display names as useful | New canonical URLs and all four layouts verified; updated release evidence; marketplace submission separately authorized |

Implementation work should be split into the monorepo move, platform/game/account boundaries, and domain/config/brand preparation. The production cutover is one coordinated action after those changes are verified, rather than a separate old-domain compatibility deployment. No new game implementation is included. Plain workspaces are sufficient initially; add a task/cache system only if build time warrants it.

## Cutover checklist

1. Schedule a maintenance window convenient for Barry, take a completed backup and record current configuration. Pause new tick starts and drain/cancel queued work before changing scheduled function names. Preserve source/art/content; do not change balance as part of the move.
2. Verify the new zone, Worker route and TLS preparation. Prepare the new web artifact with environment injection that can accept Clerk's newly issued public key at cutover. Test the build/config paths first.
3. Stop old installation/account writes during the transition. Expire old install/manage handoffs and restart the connection flow on the new domain. Cookies do not transfer between these domains; no handoff migration is needed.
4. Change the **existing** Clerk production domain; complete generated DNS/certificates and social callbacks; retrieve the new publishable key and verified issuer/JWKS values. Configure Convex for the new issuer and deploy the new web/backend together. No overlapping old/new issuer support is required.
5. Attempt the one-off rebind of Barry's known account and game profile. If it is not straightforward, use fresh signup, a new hero and new TRMNL connection. Verify correct ownership/admin access and signed deletion webhook either way. Record whether old progress was retained; it does not block cutover.
6. Update plugin 564's install/manage/docs and any changed screen/lifecycle URLs. Set companion/QR targets to the new game routes. Revoke abandoned installation authority and refresh the owner device so it no longer relies on cached old URLs.
7. Verify signup/sign-in and an authorized game intent; run fresh install → Save → manage → render → uninstall, with a usable final owner installation. Resume the scheduler and confirm a healthy tick and coherent rank publication. Inspect all four layouts and physical X delivery before submission.
8. Optionally redirect old ordinary GET pages for bookmark convenience. Old POST/server-function requests can fail with a clear restart response; no long-term legacy handlers are required. Never forward credentials/query strings to an arbitrary destination.

## Rollback and recovery

Before Clerk changes, fallback is the recorded previous build/configuration. Retain a backup so a failed owner-preservation attempt is recoverable if useful. This pre-launch migration does not require zero downtime or preservation of every test record.

After Clerk changes, old frontend keys/issuer may no longer work. Prefer fixing forward on the new domain with valid Clerk configuration; fresh owner onboarding is acceptable. Redirecting to the old hostname alone does not restore authentication. A reverse domain change, if needed, must coordinate DNS/certificate/key/OAuth/issuer configuration again.

Keep authorization fail-closed while configuration is incomplete. A fresh account must use genuine Clerk authentication and normal verified TRMNL activation. Do not bypass authentication to recover progress or replay missed reward ticks. Any broader reset must be explicitly scoped; Barry's acceptance of possible owner-progress loss does not authorize deleting unrelated platform resources. Before public launch, the future-player backup/deletion/revocation guarantees still need the [recovery evidence](evidence/recovery.md).

Monitor immediately and through subsequent scheduled runs/publications: sign-in, webhook/lifecycle calls, guard/watchdog state, rank-generation consistency, payload/art/QR status, notices and per-game resource usage. Retire old routes after the new flows and Barry's device work; there is no 90-day compatibility requirement.

## Decisions to accept before implementation

Confirmed migration constraint: pre-launch owner identity/progress preservation is best effort; fresh onboarding/reconnection is an acceptable fallback. Recommended architecture defaults remain apex/path-based app, same existing Clerk/Convex resources, per-game marketplace plugins, common public alias with game-specific progress, separate game/platform deletion, pnpm-only monorepo, repository rename after CI works, and old verified email sender retained initially.

The migration requires revising D22's dedicated-identity deletion policy and D33's production home/repository naming. D38's sender stays valid until a separately approved change. Game rules, exclusivity, no catch-up and public-name policies remain applicable. Progress preservation governs future public releases; D41 permits best-effort owner preservation in this pre-launch cutover. Record the remaining proposed choices as confirmed only when Barry accepts them.

The plan deliberately completes the platform/domain migration **before** finishing marketplace submission, so reviewers see the intended permanent URLs and account behavior. Retain current candidate layout/branding work and existing evidence; regenerate only evidence affected by the final migration. DNS/account configuration, production deploys/backfills, remote renaming, email and publication still require explicit action authorization under [AGENTS.md](../AGENTS.md).
