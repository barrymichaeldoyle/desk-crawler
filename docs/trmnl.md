# TRMNL Third Party integration and display contract

Device ranks show seven-day earned XP within the hero's captured level group, published hourly (D31); dormant heroes are unranked on recent boards (D32). Held-find inventory sleep is a gameplay state with explicit claim/wake guidance. All live protocol/render gates remain open.

## Selected integration

Barry selected a **Third Party marketplace plugin with TRMNL OAuth** for Month 1. This differs from publishing a polling Recipe. TRMNL calls a server endpoint for markup, while the backend keeps a reusable flattened player payload query/API.

Third Party plugins use their own installation, management, screen-generation and uninstall flows. The installation token is distinct from a device API key, personal account API key, Clerk session token and short-lived management JWT. [Marketplace introduction](https://docs.trmnl.com/go/plugin-marketplace/introduction)

## Planned endpoint map

`APP_ORIGIN` is the Cloudflare-hosted app; `API_ORIGIN` is the Convex `.convex.site` deployment. Production `APP_ORIGIN` is `https://desk-crawler.grandprixpicks.com` (D33); plugin registration is still open.

| Registered/public route | Location | Purpose |
| --- | --- | --- |
| `GET /connect/trmnl/install` | App | Capture installation request, preserve pending flow, sign in, verify code, prepare pending hero and link |
| `POST /trmnl/install/success` | Convex | Authenticated JSON success callback |
| `GET /connect/trmnl/manage` | App | Verify management landing and continue via Clerk ownership check |
| `POST /trmnl/v1/screen` | Convex | Authenticated form-encoded screen request; return four markup variants + payload |
| `POST /trmnl/uninstall` | Convex | Authenticated JSON teardown for one UUID |
| `GET /api/trmnl/v1/payload?uuid=...` | Convex | Canonical JSON under bearer + instance authorization; useful for integration/debug |
| `GET /help/trmnl` | App | Install, privacy, supported layout, reconnect and stale-screen help |

Do not put bearer credentials in URL paths/query strings. No manual polling URL setup is required for the marketplace user.

## Current platform and capability checks

Third Party installation OAuth remains selected. New account Developer Apps/OIDC integration is a separate capability and is not required to display this hero.

Plugin creation currently requires the owner's Developer Edition upgrade. Publication is unavailable during a BYOD free trial; check the selected license. These are author prerequisites, not a claim that every player needs developer access. [Creation](https://docs.trmnl.com/go/plugin-marketplace/plugin-creation), [publication](https://docs.trmnl.com/go/plugin-marketplace/going-live)

## Installation flow

1. TRMNL redirects the browser with an installation `code` and opaque `installation_callback_url`.
2. App validates callback: HTTPS, exact permitted TRMNL hostname, expected callback path, no credentials/foreign port. Preserve approved existing query params rather than rebuilding a guessed callback. Bound length; reject non-TRMNL destinations to prevent open redirects.
3. Put pending code/callback into a short-lived encrypted HttpOnly Secure SameSite=Lax cookie, then remove sensitive query params by server redirect before loading third-party scripts. Landing responses use no-store and no-referrer; access logs scrub code/callback/JWT query values. The Clerk redirect must preserve the opaque pending flow. Require POST/server-function origin/CSRF checks to consume the flow.
4. Sign in with Clerk, collect alias/timezone/hero name if needed, and show explicit “connect this TRMNL installation to this hero” context so account mix-ups are visible. Do not create a hero before code validation.
5. Call an authenticated Convex action to exchange the code server-side. Link its token hash to the current owner transactionally; never assign an already linked token to another user. Persist a bounded install attempt before returning to TRMNL. Repair targets an explicitly selected owned tombstoned UUID; ordinary new-instance attempts permit only a previously unknown UUID.
6. For a new player, pass the returned owned install-attempt ID to the Clerk-authenticated `heroes.create` transaction to prepare the pending Warrior/kit/welcome. Reuse an existing pending or activated hero. Clear pending cookie and redirect to the exact validated callback; the user clicks Save in TRMNL.
7. Authenticate the success callback, validate its JSON fields, and confirm instance UUID/plugin setting ID against the authorized attempt. In the same transaction activate the existing prepared hero once for the next eligible world tick. Store only required non-PII fields; no rewards occur on Save.

Protocol facts checked on 2026-10-03: code exchange is a form POST to `https://trmnl.com/oauth/token`; the code is the required parameter, repeated exchange returns the same token, token does not expire, and success callback delivery is one-shot. An invalid code may have HTTP 200 with an error body, so validate JSON success explicitly. [Installation flow](https://docs.trmnl.com/go/plugin-marketplace/plugin-installation-flow)

The callback may never arrive. A first screen request with a known linked grant and valid instance UUID may confirm a **new** instance, subject to the live protocol spike. Existing uninstalled/disconnected UUIDs stay tombstoned unless a current owner-authorized repair targets that exact UUID. Neither duplicate success callbacks nor old polls suffice. Do not create a hero from a callback or polling request. Verified first-screen recovery may activate an existing prepared hero through the same one-time confirmation transaction; a token, arbitrary UUID or completed screen query alone is insufficient.

A missing success callback must not permanently strand a linked hero. Show “waiting for TRMNL confirmation” and allow a new installation attempt. Persist install intent as specified in the [data model](data-model.md); do not depend on the browser staying open. Proposed pending browser/install validity is 20 minutes; offer explicit restart on expiry. Expiry never revokes a previously active connection.

## Management and uninstall

Register the management URL without its own query string. Management landing receives UUID and a JWT with a documented two-minute lifetime. Validate RS256 signature against TRMNL JWKS, key ID, expiration and timestamps, audience against the configured plugin Client ID, and subject against the supplied UUID before trusting it. Verify immediately on landing; then create our own 10-minute opaque handoff, which survives a Clerk sign-in redirect. Claiming the handoff checks the linked companion owner. [Management flow](https://docs.trmnl.com/go/plugin-marketplace/plugin-management-flow)

Keep Clerk as the sole authority for gameplay intents. The TRMNL management token only identifies an existing connection. Do not match accounts by imported email, or silently merge Clerk users.

Uninstall callback authenticates bearer **and** instance UUID, then tombstones that instance idempotently. Disconnect in the companion UI has the same local read revocation. It preserves the hero and other instances; the user may continue on the web or pause the hero. [Uninstall flow](https://docs.trmnl.com/go/plugin-marketplace/plugin-uninstallation-flow)

Account deletion revokes every connection and starts the game-data purge. Uninstall is not account deletion. Reinstall behavior/token reuse must be captured by the live multi-instance spike before claiming final lifecycle correctness. Duplicate/late success webhooks cannot reactivate tombstones without current targeted repair intent. If the protocol cannot safely identify repair, leave it disconnected and offer a new instance.

## Screen request/response

The screen endpoint parses `application/x-www-form-urlencoded`, including `user_uuid` and bracketed TRMNL metadata. Validate required fields and bearer hash; match both grant and instance identity. Metadata is untrusted descriptive input, not proof of owner authority. Its device is representative, not every device displaying this instance; never select only one layout/model from it. Accept bounded metadata keys; ignore unknown keys. Proposed parser budget: 32 KiB body / 64 fields, reject duplicate UUID keys, validate media type/UTF-8, sanitize instance labels to <=40 supported characters. Verify bounds against real samples. Oversize/unsupported media type returns 413/415.

Current protocol uses a POST and a JSON response whose full-layout key is `markup`, plus `markup_half_horizontal`, `markup_half_vertical`, `markup_quadrant`. An optional `merge_variables` object supplies Liquid data. All four layouts are required for public marketplace publication. TRMNL's documented screen timeout is 10 seconds, so target p95 under 1 second and provide direct endpoint URLs without cross-host redirects. [Screen generation](https://docs.trmnl.com/go/plugin-marketplace/plugin-screen-generation-flow)

Envelope shape (conceptual, no markup implemented yet):

```json
{
  "markup": "<full-layout Liquid source>",
  "markup_half_horizontal": "<half-horizontal Liquid source>",
  "markup_half_vertical": "<half-vertical Liquid source>",
  "markup_quadrant": "<quadrant Liquid source>",
  "merge_variables": "<the canonical v1 payload object>"
}
```

In the actual response `merge_variables` is an object, not the illustrative string above. Templates are deploy-time constants; serialize via JSON encoding. Each layout string is self-contained: package shared source helpers into each string, without assuming a Third Party response registers a shared template. Verify helpers in the real flow. Never concatenate user text into Liquid source. User-visible text is data and rendered with escaping. Validate literal Liquid delimiter handling in user aliases/names.

Third Party Liquid sees response merge variables; do not assume request metadata is automatically in scope. Explicitly forward a sanitized `plugin_instance_name` and other selected display metadata if needed. The web/debug JSON uses the same defaults when no request metadata exists.

HTTP responses: JSON UTF-8, `Cache-Control: private, no-store`; no public/CDN caching of individualized data. Unknown credential/instance, revoked connection and ownership mismatch return the same generic 404; malformed supported body returns 400; unexpected errors return 503. An authorized known instance with no activated hero returns the documented unlinked payload, including pending drafts without exposing starter stats/logs. Failed credential checks still return 404. Transport errors must never masquerade as a successful healthy hero screen.

No game advancement, new random rolls or mandatory telemetry mutation during a read. First-request confirmation may perform the explicitly gated one-time lifecycle mutation, including pending-hero activation, before the read; subsequent requests are read-only apart from optional telemetry. The canonical query itself never confirms/relinks. Optional screen-response telemetry is throttled/best-effort and its failure cannot block the response.

## Canonical payload v1

Root values are flat; bounded `log` and `top5` arrays are intentionally nested. This means “Liquid-friendly,” not “every JSON value is scalar.” Omit raw IDs, emails, tokens/hashes, seeds, hidden rolls, full bag contents and structured combat detail.

| Field(s) | Type / meaning |
| --- | --- |
| `v` | Integer 1 |
| `generated_at` | ISO UTC time of response assembly; not last simulation time |
| `tick` | Last allocated logical world tick |
| `last_completed_tick`, `last_completed_at` | Latest finished run, nullable before first completion |
| `hero_tick`, `hero_updated_at` | `lastTick` evaluation marker / `lastAdvancedAt` successful gameplay time; nullable when unlinked. Waiting/paused/sleeping evaluations may advance only the former |
| `data_state` | `ready`, `unlinked`, or `service_paused`; unlinked includes no activated hero, service pause covers quarantine or intentional global maintenance/tick pause |
| `stale` | Expected completed-run/evaluation progress >30 minutes late, or run explicitly blocked; normal in-flight batches and old paused/sleeping/dead gameplay changes alone are not stale |
| `hero_name`, `owner_name`, `class` | Public hero name/alias/class; empty strings when unlinked |
| `level`, `xp`, `xp_to_next`, `xp_pct` | Current-level XP and progress; nullable when unlinked, percent 0–100 |
| `hp`, `max_hp`, `hp_pct`, `gold` | Live stats, nullable when unlinked; percent 0–100 |
| `status` | exploring/resting/travelling/dead/paused/sleeping, or unlinked when no activated hero |
| `status_label`, `status_eta_ticks` | Preformatted text; travel/revival or scheduled inventory-wake remaining logical ticks, otherwise 0 |
| `biome_id`, `biome_name` | Current biome; empty when unlinked |
| `sprite`, `sprite_url` | Allowlisted sprite ID + versioned public HTTPS asset URL, or empty strings |
| `weapon`, `armor` | Equipped names or empty strings |
| `potions` | Nonnegative quantity; 0 when unlinked |
| `bag_used`, `bag_capacity`, `held_item`, `wake_at_tick` | Live bag usage/capacity (initial 30; null unlinked), retained gear name or empty, nullable scheduled inventory-wake tick |
| `log` | Max 6 newest-first `{ at, t, k, s }` entries; ISO UTC source time, local `DD Mon HH:mm` label, kind, summary |
| `rank`, `rank_delta` | Nullable seven-day own-group ordinal rank / gain since previous hourly publication of same board/group; group change or return from dormancy null |
| `rank_status` | `ranked`, `awaiting` (no own row yet: new, unlinked or before first publication) or `dormant` (paused/sleeping without wake with zero window XP, D32); lets templates explain a null rank |
| `leaderboard_board`, `leaderboard_cohort`, `leaderboard_cohort_label`, `leaderboard_score` | recent_7d; captured group key/label (<=48 chars; null key and empty label when unlinked); own earned-XP score nullable before own snapshot |
| `leaderboard_window_start`, `leaderboard_window_end` | Nullable ISO UTC boundaries of the 168 whole UTC hours in the window: start is the beginning of the oldest included hour; end is the publication's `scoreAt` (the last credited slot) |
| `leaderboard_tick`, `leaderboard_built_at` | Nullable published board tick/time |
| `total_players`, `global_total_players` | Selected-group population and the population ranked on `recent_7d` across all groups (dormant heroes excluded) from the same publication; 0 with no applicable publication/unlinked scope |
| `top5` | Max 5 `{ rank, name, hero_name, level, class, score }` entries; `name` is owner alias |
| `attention` | String/null, <=120 supported characters: service pause > unlinked > delayed updates > death/revival > inventory sleep/held-find or scheduled-wake guidance > otherwise null; gameplay status remains visible independently |
| `plugin_instance_name` | Sanitized <=40-character label or “Desk Crawler” |
| `scene_url`, `scene_url_small` | Public versioned scene images (`/art/scene/v<N>/<biome>/<pose>/<subject>/<scale>.png`) for the full (760×200) and smaller (304×80) layouts; empty when no art origin is configured. Additive v1 fields (revision 12) |
| `game_as_of_label` | <=48-character local completed-run date/time with UTC offset, or “Awaiting first game tick”; present on every layout |
| `leaderboard_as_of_label` | Same format for published board, or “Ranking within the hour”; shown with ranks |

For dead/travelling heroes or sleeping heroes with a wake deadline, `status_eta_ticks = max(0, deadlineTick - hero_tick)`, never deadline minus newly allocated world tick. If a deadline is due while state still awaits evaluation, say “Revival pending” / “Arrival pending” / “Resume pending”; do not invent a completed transition. Apply this rule in web labels. Status text is <=80 supported characters.

Capture server time once for assembly/health. A missing first completion becomes stale >30 minutes after the expected initial schedule, deriving initialization from the server world record. A new hero awaiting its first eligible tick is not lagged. Healthy paused/sleeping/dead heroes may have old `hero_updated_at`. Service pause can coexist with stale; payload-serving errors never become healthy snapshots.

HP percent uses rounded clamped ratio; XP percent uses floored clamped ratio. Log display timezone comes from validated user settings, with UTC fallback. All absolute timestamps remain UTC. Format labels server-side in that same timezone with fixed English month names and numeric UTC offset, including half/quarter-hour offsets; no TRMNL globals are needed. First rank/delta is null; the UI renders “Ranking within the hour.” A dormant hero renders “Unranked while adventures are stopped.”

Payload target <=8 KiB serialized UTF-8 at worst allowed name/log lengths. This is our budget, not an asserted TRMNL polling limit. The markup envelope adds template bytes; measure its size separately. Keep it under a proposed 40 KiB budget and the response latency target; reduce template duplication if needed.

Fields keep their meaning within v1. Optional additions are permitted; removing/renaming/changing type needs v2 and overlapping support. Do not reserve dozens of unused future fields with ambiguous placeholder meanings. See the [fixture examples](fixtures/trmnl-normal.json).

## Query read budget

Fixed lookups: grant/instance, user, hero, bounded equipped/potion items, latest six logs, world/run summary, published publication pointer, that hero's recent_7d rank row (to resolve captured cohort), selected generation/publication, and five public-user state/name-version checks for privacy masking. It is bounded indexed work, not literally a single O(1) database access. No global scan, no live rank count, no per-poll inventory traversal beyond the bounded bag if the adapter needs it.

## Layout plans

Follow the [player experience](trmnl-experience.md) for hierarchy, freshness and cuts. Allocations below are starting proportions, not pixel specifications.

MVP is monochrome first and static. OG logical design sizes are 800×480 full, 800×240 half horizontal, 400×480 half vertical and 400×240 quadrant; framework/device scaling must be verified. Use actual screenshot content area, not the assumption every pixel is available.

| Layout | Axis / allocation | Display | Cut |
| --- | --- | --- | --- |
| Full | Three-zone row: hero 3/12, log 5/12, leaderboard 4/12; footer/attention reserved | 96–128px hero, level/status, HP/XP, 6 logs, Top 5 + own rank | Equipment names if fit fails; no extra future-feature panels |
| Half horizontal | Row: hero 4/12, story 5/12, rank 3/12 | Small sprite, level/HP, 1–2 newest logs, own rank | Top 5, gear, gold if cramped |
| Half vertical | Column: hero about 40%, story about 45%, rank/footer about 15% | Hero/stats, 3 logs, own rank | Top 5, gear details |
| Quadrant | One primary hero/status block; tiny context/footer | Name, level, HP/status, newest short outcome | Leaderboard, long log, gear, multiple progress bars |

Dead: show static dead sprite, recovery text and tick ETA. Paused/sleeping/quarantined: prominent state label; no misleading “exploring.” Unlinked: readable setup prompt and app domain. Empty board/log: deliberate text without empty grid shells. Stale: a small “Updates delayed” label plus last-completed time; retain the last state.

Use the installed official TRMNL skill. Required build workflow: verify live merge-variable shape, inspect a matching recipe/reference, plan proportions, write one size, screenshot each touched size and iterate. No `view` wrapper (platform supplies it), no arbitrary inline CSS/style blocks (documented progress fill exception below), no emoji. Use framework Grid for proportional splits, framework progress controls or quantized framework widths for bars, and clamping/fit helpers. Raster art needing conversion uses `image-dither` on TRMNL; local framework CSS does not perform platform dithering. Prepared 1-bit art/UI icons stay crisp without another pass, subject to render evidence. Title artwork follows inline/base64 guidance; title bar is a sibling of layout. [Image behavior](https://trmnl.com/framework/docs/3.4/image)

Official progress examples permit a numeric inline width on the standard fill. This is the sole MVP exception to the older style ban: server-derived clamped 0–100 percentage, no arbitrary CSS/user text. Verified width utilities are an alternative. HP 0 must survive Liquid fallback handling. [Progress](https://trmnl.com/framework/docs/3.4/progress)

Use responsive framework utilities for the actual renderer's model/font scale/theme/orientation. Do not embed another framework stylesheet/runtime. Local preview versions are pinned; record the actual hosted framework separately. [Responsive](https://trmnl.com/framework/docs/3.4/responsive) [Project-local skill](../.agents/skills/trmnl/SKILL.md)

Two original Warrior sprite states: idle and dead. Use versioned immutable PNG URLs on the app's static assets, high contrast and licensed original art. A static e-ink sprite is not an animated pet. No real-time animation required.

## Publication checklist

Prepare name, description <=35 characters, recommended 512×512 PNG/SVG icon, up to three categories, 15-minute supported interval, lifecycle URLs, knowledge-base URL, privacy/support info, install demo, reviewer access and four layouts. Keep default padding; removing it is a separately tested choice. Creation/review requirements come from [plugin creation](https://docs.trmnl.com/go/plugin-marketplace/plugin-creation) and [going live](https://docs.trmnl.com/go/plugin-marketplace/going-live).

The game should be presented as calm passive desk entertainment. Marketplace approval and its timing are external dependencies. If review requests changes or approval is delayed, keep the public landing/sample preview/help available and the TRMNL plugin in development; persistent play remains installation-gated, do not label it publicly installable until approval. No silent switch to a Recipe/private-plugin launch.

Preparing the review package does not authorize sending reviewer emails, changing Barry's TRMNL account or submitting the listing. Those actions need explicit session authorization when we reach them.

Review package: plugin ID, owner identity, focus-first public benefit, video installing from scratch, durable reviewer-owned access using supported Clerk sign-in, and an honest promotion plan if one exists. Do not invent a password flow/auth bypass. Prepare Submit for Review and the currently requested email material; sending/submitting still requires authorization.

[Review guidance](https://docs.trmnl.com/go/plugin-marketplace/going-live) questions plugins that create distraction. Calm design is a proposed fit, not approval evidence. If review rejects the game, bring that decision to Barry rather than silently changing the channel.

TRMNL documents one retry after a timeout/empty screen body; serving is idempotent and must tolerate duplicate calls. We cannot assume retries for every HTTP error. Use direct public HTTPS endpoints and capture actual failure behavior in V08. [Screen transport](https://docs.trmnl.com/go/plugin-marketplace/plugin-screen-generation-flow)

v1 fields are still pre-release; freeze their types/meanings at A00/A08. After publication the compatibility rule above applies.

Pending onboarding (D09) reuses v1 `unlinked` privacy-safe fields; no new payload root field is needed. Owner web queries expose activation state. Complete V10 in [monetization](monetization.md) before making revenue/qualification claims.

## Recent-rank and sleep display semantics

Seven-day score and group are always labeled with rank (for example Last 7 days / Levels 4–7). A newer live level does not move an old snapshot rank into a different group. Group change clears delta; Top 5 entries all belong to that published group. global_total_players is a separate publication count, never substituted for the group denominator.

Sleeping is ready gameplay data, not service_paused/stale: show retained-find/bag guidance and idle sprite. A scheduled wake remains sleeping until evaluated. held_item is empty after claim; when bag remains full, explain free-space/Resume requirements. No device/companion-visit inactivity timer is used. Name-version mismatch or missing owner masks copied public names until refreshed.

These v1 changes happen before any consumer is released; shipped compatibility rules still apply thereafter. Public examples remain illustrative, not live data or rendered proof.
