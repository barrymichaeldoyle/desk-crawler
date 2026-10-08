# Support analytics (D67)

Authorized by Barry on 2026-10-06, including identifiable data for support. He confirmed creating **TRMNL Games** in his existing EU organization. Project **296462** is configured; Barry explicitly approved the production environment configuration, Convex deployment and companion publication; all three actions are complete.

[Onboarding and support dashboard](https://eu.posthog.com/project/296462/dashboard/1002517) is the project landing dashboard. Its four native insights show the install-to-activation funnel, setup states, installation failures by reason, and browser errors/failed game actions. All require `environment = production`. The instrumented app is now live; production data appears as players opt in. Catalog discovery found no existing governed metrics; these are custom operational counts, not canonical business measures.

## Collection and identity

The production browser SDK loads only on `https://trmnlgames.com`, after an explicit Allow analytics choice. Development, local production previews, unknown/loading identity and deleting accounts remain silent. Revoked sign-ins also remain silent after their user row is purged, preventing an open tab from recreating an erased profile. No thanks is equally available and gameplay works either way. Preferences remain accessible at the bottom of every page, including sign-in/setup. Withdrawal stops capture and recording, resets browser analytics identity, and is respected even when local storage refuses an update.

Signed-in profiles use the Clerk subject (`user_...`) as their distinct ID, with `email`, `public_alias` and `hero_name` properties. No installation UUID, code, token, callback URL, hero ID, action arguments or game inventory is sent. The SDK clears the preceding account's identity on sign-out/account switch; anonymous install visits can be merged into the eventual signed-in profile. The provider publishes identity before captures and view hooks wait for that publication.

Browser consent is stored in `tg_analytics_consent_v1`. For an enrolled active owner it is synchronized to the optional `users.analyticsConsent` boolean, used for server lifecycle telemetry. The most recent browser preference controls that server flag. New install submissions explicitly carry the browser choice, including first enrollment. Server actions recheck owner state and consent before sending.

Replay is enabled at 100% of consenting production sessions, with 30-day retention. Inputs and DOM text are masked. Clerk UI, account-switch details, installation forms, hidden/file inputs and scripts are blocked. Sensitive attribute values are masked, URLs lose search/hash, and captured network requests are dropped; bodies, headers, console logs, canvas, autocapture, performance, heatmaps and surveys are off. IP addresses are dropped by project configuration. Error messages/stacks and nested event properties pass through credential/URL scrubbing. Raw install/management credential URLs cannot initialize or send browser analytics; the existing encrypted handoff drops them before page rendering. Privacy copy explains identity, storage, replay, opt-out and erasure.

## Events

| Event | Source and meaning | Extra properties |
| --- | --- | --- |
| `installation started` | Browser install page with valid encrypted handoff | `setup_state = pending_install` |
| `installation submitted` | Browser Connect submission | `needs_profile`, `needs_hero` |
| `installation connected` | Convex, after the verified grant/attempt transaction commits | `source = convex` |
| `hero activated` | Convex, when a prepared hero first becomes active through Save/first-screen recovery | `source = convex` |
| `installation failed` | Structured rejection or transport failure | `error_code` |
| `setup screen shown` | Browser has no active hero or invalid/missing install handoff | `setup_state`, companion `has_active_installation` |
| `setup help opened` | Companion setup help click | `setup_state` |
| `companion ready` | Active hero companion shell | `setup_state = active`, `has_active_installation` |
| `management opened` | Management landing state | `setup_state` |
| `management account mismatch` | Management handoff owner differs from current account | No credential/owner IDs |
| `account switched` | Account-switch button | No email in event arguments |
| `intent failed` | Authenticated game intent fails | `intent` function name, `error_code`; no arguments |
| `stance changed` | Browser, after `heroes.setStance` commits (v1.1, D76) | `stance` |
| `decision made` | Browser, after `heroes.choose` commits (D79); defaults resolved by the simulator are counted in `choicesDefaulted`, not here | `option_id` |
| `merchant purchase` | Browser, after `inventory.buyOffer` commits (D78) | `offer` (`potions`, `pouch` or `bag`) |
| `pouch bought` | Browser, after `inventory.buyPouch` commits (D77) | `tier` |
| `bag bought` | Browser, after `inventory.buyBag` commits (D61) | `tier` |
| `waitlist joined` | Browser, after `waitlist.join` or `waitlist.joinWithAccount` succeeds (D105) | `source` (`notify`, `pitch`, `landing`, `home`, `account`); never the email |
| `feedback sent` | Browser, after `feedback.send` succeeds (D107) | none; never the message |
| `$pageview`, `$exception` | Manual path-only pageviews, automatic unhandled errors/rejections and explicit route/transport reports | Scrubbed SDK properties; console errors excluded |

`setup_state = installation_without_hero` directly exposes the incident that prompted this work: the pre-launch reset kept an active installation but removed the hero. The QR goes to the companion, so it cannot create a hero without a new verified install attempt. That page now explains how to start a fresh installation, shows the signed-in account with Switch account, and links to recovery instructions. `signed_out` means a signed-out visitor saw the Desk Crawler pitch on a companion route, usually after scanning a screen's QR (D102); `not_enrolled` means no hero/active installation; `waiting_for_save` means a prepared hero awaits TRMNL confirmation. Install landing states are `pending_install`, `missing_install_link`, and `invalid_install_link`.

The funnel is ordered, per person, with a 24-hour window; intervening pageviews/sign-in events are allowed. Reinstalling an already active hero emits connection, but no new activation. Counts cover consenting players only (`admin:engagement` in [operations](operations.md) counts every active hero's v1.1 choices and D110 raids from game data; raids happen in the simulation, so they add no browser event) and can miss blocked scripts, offline/abandoned submissions, delayed delivery or telemetry failures. Activation confirms a server lifecycle transition, not a physical device render. PostHog failure never changes gameplay, blocks navigation or fails a valid installation. No simulation/poll telemetry is added.

## Supporting a player

Open the dashboard and investigate `installation_without_hero`, failure reasons or conversion drop-offs. Find the affected person from an insight or search People by their support email/Clerk ID. Read their event timeline, then inspect an available masked replay. Text is intentionally unreadable; structured events supply the step/state/reason. Use the signed-in account shown on setup to distinguish a missing hero from signing in with another email/provider.

For an invalid/expired install, start from TRMNL's Install button again. For `waiting_for_save`, return to that installation and Save. For an active installation without a hero following the pre-launch reset, install a fresh copy using the same account, choose a new hero, Connect, then Save; remove the old playlist copy after the replacement works. Do not reset game data or create heroes from ordinary QR visits.

## Account erasure

Account deletion retains its durable job until Clerk deletion succeeds and PostHog accepts erasure of the linked person, events and recordings. The server calls `POST /api/projects/296462/persons/bulk_delete/` with the Clerk distinct ID and `delete_events: true`, `delete_recordings: true`. PostHog processes an accepted request asynchronously; acceptance is not proof that every retained copy is already erased.

Failures use the existing bounded provider-step backoff and eventually remain blocked with `ANALYTICS_DELETE_FAILED` in admin health. Keep the Clerk ID until acceptance, repair configuration/permission, and resume via the existing deletion-job admin action. A verified Clerk deletion webhook also creates an erasure job for identified visitors who never enrolled in a game; duplicate webhooks stay idempotent. Deleting only Desk Crawler progress preserves the shared account and analytics profile. Withdrawal stops future collection; earlier records require account deletion or a support erasure request. Anonymous visits that never link to an account cannot be located by email.

## Configuration and rollout

Public browser values are in `apps/web/.env.production`: `VITE_POSTHOG_PROJECT_TOKEN` for project 296462 and `VITE_POSTHOG_HOST=https://eu.i.posthog.com`. The personal API key is stored only in ignored root `.env.local`; it must never be bundled or committed.

Set these **Convex deployment** variables on the approved target:

| Name | Value / purpose |
| --- | --- |
| `POSTHOG_PROJECT_TOKEN` | Public project 296462 token, authoritative connection/activation captures |
| `POSTHOG_HOST` | `https://eu.i.posthog.com` |
| `POSTHOG_ENVIRONMENT` | `production` |
| `POSTHOG_PROJECT_ID` | `296462` |
| `POSTHOG_API_HOST` | `https://eu.posthog.com` |
| `POSTHOG_PERSONAL_API_KEY` | Project-restricted server key with `person:write`, automatic erasure |

After explicit deployment approval, configure all server values, deploy the additive backend changes to `exciting-cormorant-948`, then publish the companion Worker to `trmnlgames.com`. Changes are additive and preserve player progress. No new Clerk/TRMNL/Cloudflare resource is needed. The isolated checkout `/tmp/trmnl-games-posthog` contains only this change atop `a74cfb1`, excluding the concurrent unfinished achievement and deletion-confirmation implementations; refresh/revalidate it if the baseline changes.

A production browser acceptance check must verify: no PostHog requests before Allow or after No thanks; identify the correct account; install → Connect → Save/activation timeline; missing-hero state; masked replay without input/credentials; sign-out/account switch; and account erasure acceptance. A physical TRMNL install/render check remains separate from analytics. Source-map upload is not configured yet, so minified stack locations may require local debugging. No recurring email/Slack delivery or paid plan was enabled.

## Validation evidence, 2026-10-06

- Workspace typecheck passes; analytics/lifecycle/deletion/platform tests pass. The combined workspace's six unrelated failures are achievement-log expectations in tick, bag-ladder, intent and keepsake tests; those changes are preserved.
- Isolated analytics release: `pnpm check` passes all 219 tests across 34 files; `pnpm build` passes. Existing TanStack input-validator deprecation notices remain.
- New privacy tests cover no-consent rejection, credential-URL rejection, nested credential/URL scrubbing, unknown/deleting identity, storage-failure withdrawal and restrictive replay/network configuration. Backend tests cover shared Clerk ID, consent recheck, telemetry outage without gameplay writes, queued person/event/replay removal, visible blocked retries and non-enrolled webhook deletion.
- All four saved dashboard queries run without warnings; production charts are empty as expected before deployment.
- EU synthetic capture returned HTTP 200. The MCP person lookup confirmed the profile was ingested. The project-restricted personal key queued its erasure with HTTP 202; a subsequent lookup found no profile. Test traffic used `environment = verification`, outside production charts, and involved no real player.
- Barry chose to skip the live recording check. Browser replay has not been observed live. Browser automation bootstrap failed because its runtime rejected `node:process`; local configuration/tests and API smoke checks do not replace live browser acceptance. The approved production application/env deployment is complete; see [rollout evidence](evidence/posthog-analytics.md).

## Incident: no browser events, 2026-10-06 to 2026-10-08

From launch until this fix, PostHog received only the server `installation connected` and `hero activated` captures; no browser event or replay ever arrived. The `before_send` scrubber removed every property key matching `token`, including the SDK's top-level `token` (the public project key), and posthog-js drops any event whose hook removes a property ingestion requires. The SDK loaded, identified and queued normally, so nothing looked broken. Found on 2026-10-08 by inspecting the live SDK on trmnlgames.com. `beforeAnalyticsSend` now keeps that one top-level key and scrubs everything else as before; a regression test covers it. Browser data before the fix is lost, so funnels and v1.1 events start from the fix's deploy.

## Platform references

Current official documentation was checked through the connected PostHog documentation search: [JavaScript configuration](https://posthog.com/docs/libraries/js/config), [identify users](https://posthog.com/docs/getting-started/identify-users), [replay privacy controls](https://posthog.com/docs/session-replay/privacy), [network recording](https://posthog.com/docs/session-replay/network-recording), [persons API](https://posthog.com/docs/api/persons), and [data deletion](https://posthog.com/docs/privacy/data-storage#data-deletion). The installed PostHog SDK types also validate the configuration. Project creation, masking, replay and exception settings, dashboard construction and API erasure were checked against this EU instance's tool schemas. The PostHog dashboard/query skills were read from the connected server before use.
