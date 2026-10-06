# PostHog EU rollout evidence — 2026-10-06

Barry approved all three production actions: configure the six PostHog Convex variables, deploy the scoped backend to `exciting-cormorant-948`, and publish the companion to `trmnlgames.com`. He subsequently chose to skip the live recording check.

## Delivered

- PostHog EU project **296462**, **TRMNL Games**, in the existing organization; [onboarding/support dashboard](https://eu.posthog.com/project/296462/dashboard/1002517) is the default landing dashboard.
- Production-only browser opt-in, support identity using Clerk ID/email/public alias/hero name, path-only pageviews, structured onboarding and game-action failures, browser exceptions and masked replay.
- Server-confirmed installation connection and first hero activation, with consent/account-state rechecked at send time. Telemetry does not change simulation, rewards or polling.
- Durable account erasure requests for the PostHog person, events and recordings, including identified visitors without a game. Bounded retry exhaustion stays visible as `ANALYTICS_DELETE_FAILED`. Revoked identities remain silent after the user row is purged, preventing stale open tabs from recreating the erased profile.
- The active-installation/no-hero companion state now explains fresh-install recovery, shows the signed-in account and provides Switch account. Public help distinguishes the QR companion visit, account mismatch, missing hero and Save-pending states.
- Privacy copy and API/operations contracts updated. [Runbook and event definitions](../analytics.md).

## Targets and deployed versions

| Surface | Target / evidence |
| --- | --- |
| Convex | `prod:exciting-cormorant-948`, project `barry-michael-doyle:trmnl-games:production`; https://exciting-cormorant-948.convex.cloud |
| Cloudflare | Account `57fa9c5f2bc9dda93a108e887a81b419`, Worker `trmnl-games`, custom domain `trmnlgames.com` |
| Final Worker version | `f635c244-e379-4201-a94f-4457620f11be` |
| Initial D67 Worker version | `c1bd86ec-3250-4c7e-839d-63f5ed094f25`; superseded by the revoked-identity correction |
| Previous Worker version | `86d128d7-66e4-4a20-8b3b-9197615d0ef5` |
| Final client entry | `/assets/index-DPFbTluE.js`; fetched production contents exactly match the tested build |

The release was prepared in `/tmp/trmnl-games-posthog` atop `a74cfb1`, excluding concurrent unfinished achievements and deletion-confirmation work. It contains two optional schema fields, bounded query/preference changes and lifecycle telemetry/deletion integration; no index deletion or game reset. Concurrent workspace work is preserved. The local review patch is `.codex/posthog-release.patch` and contains no private environment file or PostHog personal key.

## Checks completed

- `pnpm check` on the isolated release: **219 tests, 34 files, all pass**, including the final revoked-identity regression assertion; typecheck passes.
- `pnpm build`: client and server builds pass. Existing TanStack `inputValidator` deprecation notices remain.
- Combined workspace typecheck and the two analytics test files: **11 tests pass**, including compatibility with the concurrent deletion-confirmation work.
- Convex and Wrangler deployment dry runs pass. Both Convex pushes validate the schema and explicitly report **no indexes deleted**. Final production pushes complete successfully.
- Six production Convex variables read back by name. Project ID and environment match `296462` / `production`; public token and personal key compare equal to the intended local values without printing the private key. The temporary secret file was removed after configuration.
- Worker version metadata confirms the existing `CLERK_SECRET_KEY` and `INSTALL_FLOW_KEY` secret bindings remain. Publication used `--keep-vars`; no new Cloudflare resources or secrets were created.
- `/`, `/privacy`, `/help/desk-crawler`, `/connect/trmnl/desk-crawler/install`, `/connect/trmnl/desk-crawler/manage` and `/app/desk-crawler` each return **HTTP 200** and reference the final client build. Help includes the QR recovery section; privacy includes PostHog EU and consent disclosures. The production entry asset contains the consent UI and exactly matches local output.
- Anonymous `users.me` against the deployed Convex API returns **HTTP 200**, `status: success`, `value: null`.
- PostHog settings read back: exception capture and replay on; replay sample `1.00`, retention `30d`, production-only recording domain, input/text masking; IP storage, network bodies/headers, console, performance, heatmaps, surveys and dead clicks off.
- All four dashboard queries run without warnings. Initial production pageview/setup counts are zero, as expected until players opt in. No artificial production traffic was created.
- EU synthetic API capture: **HTTP 200**, person observed through MCP. Scoped personal-key erasure: **HTTP 202**, later person lookup empty. Synthetic traffic was marked `environment = verification`, excluded from production charts, and used no real player data. Erasure of all events/recordings remains asynchronous; request acceptance and person disappearance do not establish every retained copy's removal.
- Touched local Markdown links and `git diff --check` pass.

## Explicit verification limits

The browser connection failed before a session could be controlled; Barry chose **Skip the live recording check**. Thus no live browser replay, account-switch recording, opted-in identified timeline or full TRMNL install → Save → physical display was observed in this rollout. HTTP/assets/API checks and automated privacy/lifecycle tests establish deployment/configuration evidence, not those omitted acceptance checks. Replay is configured; the first real consenting session will provide its live evidence.

Source-map upload is not configured. Exceptions retain scrubbed messages/stacks but minified locations may require local debugging. No recurring email/Slack delivery, paid PostHog plan, TRMNL registration change, player-progress reset or real account deletion was performed.
