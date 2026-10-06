# TRMNL Third Party integration and display contract

Device ranks show seven-day earned XP within the hero's captured level group, published hourly (D31); dormant heroes are unranked on recent boards (D32). Held-find inventory sleep is a gameplay state with explicit claim/wake guidance. All live protocol/render gates remain open.

## Selected integration

Barry selected a **Third Party marketplace plugin with TRMNL OAuth** for Month 1. This differs from publishing a polling Recipe. TRMNL calls a server endpoint for markup, while the backend keeps a reusable flattened player payload query/API.

Third Party plugins use their own installation, management, screen-generation and uninstall flows. The installation token is distinct from a device API key, personal account API key, Clerk session token and short-lived management JWT. [Marketplace introduction](https://docs.trmnl.com/go/plugin-marketplace/introduction)

## Planned endpoint map

`APP_ORIGIN` is the Cloudflare-hosted app; `API_ORIGIN` is the Convex `.convex.site` deployment. Production `APP_ORIGIN` is `https://trmnlgames.com` (D40); plugin 564 is registered with the game-scoped routes under `/connect/trmnl/desk-crawler/`.

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
4. Sign in with Clerk, collect alias/hero name if needed, and show explicit “connect this TRMNL installation to this hero” context so account mix-ups are visible. Do not create a hero before code validation.
5. Call an authenticated Convex action to exchange the code server-side. Link its token hash to the current owner transactionally; never assign an already linked token to another user. Persist a bounded install attempt before returning to TRMNL. Repair targets an explicitly selected owned tombstoned UUID; ordinary new-instance attempts permit only a previously unknown UUID.
6. For a new player, pass the returned owned install-attempt ID to the Clerk-authenticated `heroes.create` transaction to prepare the pending Warrior/kit/welcome. Reuse an existing pending or activated hero. Clear pending cookie and redirect to the exact validated callback; the user clicks Save in TRMNL.
7. Authenticate the success callback, validate its JSON fields, and confirm instance UUID/plugin setting ID against the authorized attempt. In the same transaction activate the existing prepared hero once for the next eligible world tick. Store only required non-PII fields; no rewards occur on Save.

Protocol facts checked on 2026-10-03: code exchange is a form POST to `https://trmnl.com/oauth/token`; the code is the required parameter, repeated exchange returns the same token, token does not expire, and success callback delivery is one-shot. An invalid code may have HTTP 200 with an error body, so validate JSON success explicitly. [Installation flow](https://docs.trmnl.com/go/plugin-marketplace/plugin-installation-flow)

The callback may never arrive. A first screen request with a known linked grant and valid instance UUID may confirm a **new** instance, subject to the live protocol spike. Existing uninstalled/disconnected UUIDs stay tombstoned unless a current owner-authorized repair targets that exact UUID. Neither duplicate success callbacks nor old polls suffice. Do not create a hero from a callback or polling request. Verified first-screen recovery may activate an existing prepared hero through the same one-time confirmation transaction; a token, arbitrary UUID or completed screen query alone is insufficient.

A missing success callback must not permanently strand a linked hero. Show “waiting for TRMNL confirmation” and allow a new installation attempt. Persist install intent as specified in the [data model](data-model.md); do not depend on the browser staying open. Proposed pending browser/install validity is 20 minutes; offer explicit restart on expiry. Expiry never revokes a previously active connection.

## Management and uninstall

Register the management URL without its own query string. Management landing receives UUID and a JWT with a documented two-minute lifetime. Validate RS256 signature against TRMNL JWKS, key ID, expiration and timestamps, audience against the configured plugin Client ID, and subject against the supplied UUID before trusting it. Verify immediately on landing; then create our own 10-minute opaque handoff, which survives a Clerk sign-in redirect. Claiming the handoff checks the linked companion owner. [Management flow](https://docs.trmnl.com/go/plugin-marketplace/plugin-management-flow)

Keep Clerk as the sole authority for gameplay intents. The TRMNL management token identifies a connection and, for D69 only, independently verifies its UUID before explicit reconnection. Do not match accounts by imported email, or silently merge Clerk users.

Uninstall callback authenticates bearer **and** instance UUID, then tombstones that instance idempotently. Disconnect in the companion UI has the same local read revocation. It preserves the hero and other instances; the user may continue on the web or pause the hero. [Uninstall flow](https://docs.trmnl.com/go/plugin-marketplace/plugin-uninstallation-flow)

Account deletion revokes every connection and starts the game-data purge. Uninstall is not account deletion. Reinstall behavior/token reuse must be captured by the live multi-instance spike before claiming final lifecycle correctness. Duplicate/late success webhooks cannot reactivate tombstones without current targeted repair intent. If the protocol cannot safely identify repair, leave it disconnected and offer a new instance.

## Returning after deletion (D69)

The 2026-10-06 live report exposed token reuse on a fresh installation after deletion. A revoked token still cannot create or serve a connection by itself. Its verified code exchange now reserves one Clerk-owned 20-minute reconnect draft; no account, hero or grant exists yet. The installation page directs the player to **Continue to TRMNL to save**, then **Configure** in that plugin’s settings, while still signed in to the requesting account.

Configure supplies TRMNL’s signed two-minute management JWT. Convex independently verifies RS256/JWKS, key ID, audience, subject, issue time and expiry. It must have been issued after the draft was requested. The resulting proof expires after ten minutes or at the draft deadline, whichever is earlier. Opening Configure only records this proof; **Confirm and connect** is the explicit transactional intent that creates a fresh account/hero if needed and activates the selected installation. An existing hero is preserved. Signed-out players sign in, then reopen Configure for a fresh proof. Expired drafts restart at Install; expired proofs reopen Configure. Reloading the installation page retains its validated cookie so the player can repeat the request.

Grants created by this path are scoped to the verified UUID. Authorization resolves UUID → grant → token hash, scope and owner; callbacks and polling never authorize unknown UUIDs under a revoked token. Revocation hashes remain retained, old Clerk identities remain refused and deleted progress stays deleted. Multiple independently verified UUIDs can safely reuse a provider token without sharing an owner. An already owned UUID cannot be transferred to another live account. A disconnected owned scope may be repaired only through another fresh signed proof and explicit confirmation.

The success endpoint acknowledges Save during a current reconnect draft without activation; screen requests return 404 until confirmation. The local suite exercises real HTTP routes, two consecutive deletion/reinstall cycles, account/game deletion, wrong-account/proof denial, multiple scopes and conservative recovery repair. A live Save → Configure → confirm → render rehearsal remains required after the separately approved deployment. See [TRMNL’s management protocol](https://docs.trmnl.com/go/plugin-marketplace/plugin-management-flow) and [rollout gates](release/account-deletion-confirmation.md).

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

D46: the authenticated screen envelope additionally includes `desk_keepsake_code: string | null` for the optional weekly cosmetic collection. It is derived after authorization without mutation, shown in the existing title bar in all four layouts, and omitted after this week’s claim. This field is separate from the canonical v1 payload and is never returned by the companion preview. [Keepsake contract](playlist-retention.md) defines owner/week HMAC, cache grace and verification limits; the request is not a physical-display acknowledgement.

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
| `status_label`, `status_eta_ticks` | Preformatted text with area names in `[[bold marks]]` and no tick counts ("Knocked out. Back in about 1 h 15 min"); travel/revival or scheduled inventory-wake remaining logical ticks, otherwise 0 |
| `status_eta_at`, `status_eta_label` | While a revive, arrival or scheduled resume is pending: its expected start (UTC seconds, from the tick schedule) and the status leading into it ("Knocked out, back at"). Templates v20 render the label plus HH:MM with `utc_offset`, else `status_label` (D45). Null/empty otherwise. Additive v1 fields |
| `biome_id`, `biome_name` | Current biome; empty when unlinked |
| `sprite`, `sprite_url` | Allowlisted sprite ID + versioned public HTTPS asset URL, or empty strings |
| `weapon`, `armor` | Equipped names or empty strings |
| `potions` | Nonnegative quantity; 0 when unlinked |
| `bag_used`, `bag_capacity`, `held_item`, `wake_at_tick` | Live bag usage/capacity (initial 30; null unlinked), retained gear name or empty, nullable scheduled inventory-wake tick |
| `log` | Max 10 newest-first `{ at, u, t, k, s, n, d }` entries; ISO UTC source time, the same time as UTC seconds (templates v19 render it as HH:MM with `utc_offset`, D44), legacy local `DD Mon HH:mm` label (not displayed), kind (selects the line's glyph), legacy summary `s` (names in `[[bold marks]]` from v20 logs on; older entries have none, D45). Additive `n` is narrative without numeric stat changes; `d` is the separate nonzero earned-XP/net-gold/net-HP line, e.g. `+14 XP · +5 gold · −12 HP`, empty for no change. D52 adds gross potion acquisition, e.g. `+1 healing potion · +20 HP`, from stored outcome data; full-pouch fallback shows only gold. Templates v22+ use `n` and `d`, falling back to `s` for older payloads (D48) |
| `celebration` | String/null: "Level up! Now level N", "Elite defeated!", "Jackpot!", "Rare find!" or, from D65, "Achievement: {name}" when the newest log is that big moment and no attention message applies; templates show it as an inverted badge on full and both half views (D44; the quadrant has no room). Additive v1 field. Log kind `achievement` has its own glyph; its story is `Achievement: [[name]]` with an empty `d` |
| `rank`, `rank_delta` | Nullable seven-day own-group ordinal rank / gain since previous hourly publication of same board/group; group change or return from dormancy null |
| `rank_status` | `ranked`, `awaiting` (no own row yet: new, unlinked or before first publication) or `dormant` (paused/sleeping without wake with zero window XP, D32); lets templates explain a null rank |
| `leaderboard_board`, `leaderboard_cohort`, `leaderboard_cohort_label`, `leaderboard_score` | recent_7d; captured group key/label (<=48 chars; null key and empty label when unlinked); own earned-XP score nullable before own snapshot |
| `leaderboard_window_start`, `leaderboard_window_end` | Nullable ISO UTC boundaries of the 168 whole UTC hours in the window: start is the beginning of the oldest included hour; end is the publication's `scoreAt` (the last credited slot) |
| `leaderboard_tick`, `leaderboard_built_at` | Nullable published board tick/time |
| `total_players`, `global_total_players` | Selected-group population and the population ranked on `recent_7d` across all groups (dormant heroes excluded) from the same publication; 0 with no applicable publication/unlinked scope |
| `top5` | Max 5 `{ rank, name, hero_name, level, class, score }` entries; `name` is owner alias |
| `attention` | String/null, <=120 supported characters: service pause > unlinked > delayed updates > death/revival > inventory sleep/held-find or scheduled-wake guidance > otherwise null; gameplay status remains visible independently |
| `plugin_instance_name` | Sanitized <=40-character label or “Desk Crawler” |
| `scene_url`, `scene_url_small` | Public versioned scene images (`/art/scene/v4/<biome>/<day-or-night>/<pose>/<subject>/<scale>.png`) for the full (760×200) and smaller (304×80) layouts; empty when no art origin is configured. Canonical payloads default to day; the screen envelope selects the local sky using the request time and TRMNL offset (D50). Frozen v3 night paths without the sky segment remain served. Additive v1 fields (revision 12) |
| `scene_url_large`, `scene_url_medium` | The same scene at ×6 (912×240) and ×3 (456×120) for large screens (TRMNL X), selected in markup with `lg:` classes. Additive v1 fields |
| `qr_url`, `qr_url_large`, `qr_label` | QR code back to the companion (`/art/qr/v1/<app\|bag>/<3\|5>.png`, encodes `COMPANION_ORIGIN` + `/app` or `/app/inventory`) and its caption. Set only for setup and a full bag; empty otherwise. Additive v1 fields |
| `companion_qr_base` | Standing QR path to the bag (`.../art/qr/v3/bag`, markup appends `/<3\|5>.png`) for any active hero; the full layout shows it beside the rank panel ("Your bag" caption on the X) unless `qr_url` takes over the panel. Empty when unlinked or with no art origin. Additive v1 field (template v17) |
| `qr_base`, `first_run` | QR path without the scale (`.../art/qr/v1/<target>`, markup appends `/<3\|4\|5\|7>.png`), and true for a new hero before its first adventure (the screen shows a welcome with a companion QR). Additive v1 fields |
| `game_as_of_label` | Legacy v1 completed-run date/time label; retained for compatibility, not displayed (D39) |
| `leaderboard_as_of_label` | Legacy v1 published-board date/time label; retained for compatibility, not displayed. Templates use fixed “Ranking within the hour” when awaiting a rank |

For dead/travelling heroes or sleeping heroes with a wake deadline, `status_eta_ticks = max(0, deadlineTick - hero_tick)`, never deadline minus newly allocated world tick. If a deadline is due while state still awaits evaluation, say “Revival pending” / “Arrival pending” / “Resume pending”; do not invent a completed transition. Apply this rule in web labels. Status text is <=80 supported characters.

Capture server time once for assembly/health. A missing first completion becomes stale >30 minutes after the expected initial schedule, deriving initialization from the server world record. A new hero awaiting its first eligible tick is not lagged. Healthy paused/sleeping/dead heroes may have old `hero_updated_at`. Service pause can coexist with stale; payload-serving errors never become healthy snapshots.

HP percent uses rounded clamped ratio; XP percent uses floored clamped ratio. All absolute timestamps remain UTC. The v1 log `t` and as-of labels keep their legacy formatting from the stored timezone (UTC for new installs) for compatibility, but current device layouts render no dates or UTC offsets. The one exception (D42) is `next_tick_at`: UTC seconds of the next scheduled tick, which templates render as 24-hour HH:MM without a zone label (from v15 the OG full layout shows it in the title bar). TRMNL only exposes `merge_variables` to third-party markup Liquid, not its `trmnl` metadata, so the screen route copies the request's `trmnl[user][utc_offset]` (seconds, accepted within ±14 h) into the additive `utc_offset` merge variable; templates v16 read that. Without a valid offset the line is omitted, only while the hero is adventuring and no delay applies. D39 removes the companion timezone preference and browser timezone collection. Companion history formats the UTC source timestamps in the browser's local timezone. Any future device timestamp must use TRMNL's configured timezone. First rank/delta is null; the UI renders “Ranking within the hour.” A dormant hero renders “Unranked while adventures are stopped.”

Payload target <=8 KiB serialized UTF-8 at worst allowed name/log lengths. This is our budget, not an asserted TRMNL polling limit. The markup envelope adds template bytes; measure its size separately. Keep it under a proposed 40 KiB budget and the response latency target; reduce template duplication if needed.

Templates v24 place the icon beside the story, then HH:MM underneath the icon with stat changes alongside it, outside narrative clamping (D48/D49). D51 replaces the fixed timestamp-width story gutter with the icon's intrinsic width and the framework's small gap; metadata widths are independent. Time remains omitted without `utc_offset`, with no empty gutter before the changes. Thin framework rules separate visible entries. Marked names use atomic inline spans to move together where they fit; oversized names can wrap between words. The framework's compact-screen clamp still flattens rich markup and can truncate names with an ellipsis. Combat HP reflects the event's net change, including automatic potion and level-up healing. On the X, full/half-horizontal/half-vertical layouts show at most three/two/four stories respectively; the OG shows only the newest story to reserve room for metadata and rank. Quadrant keeps the newest story and stats when no attention message takes priority. Full-layout X weapon and armor labels/values are centered. These limits supersede v22's higher story counts to keep outcomes above the footer.

Scene art v4 (D50) gives the Office Cubicles window sun/clouds from local 06:00 inclusive to 18:00 exclusive, otherwise moon/stars. Fixed hours do not model seasonal sunrise/sunset. The HTTP screen envelope chooses all four scene scales from its request time plus the validated `utc_offset`, independent of the latest event time or paused/sleeping state. Missing/invalid offsets use daylight rather than guessing a timezone. Server Room and Cafeteria art have no outdoor window and do not change. Day/night URLs are immutable and cache independently; the previous v3 paths retain their original night pixels. The physical screen keeps its last rendered sky until its next eligible refresh.

Fields keep their meaning within v1. Optional additions are permitted; removing/renaming/changing type needs v2 and overlapping support. Do not reserve dozens of unused future fields with ambiguous placeholder meanings. See the [fixture examples](fixtures/trmnl-normal.json).

## D54 device recap (deployed template v25)

Additive `recap` is null for unlinked payloads or callers that did not read a separate activity window. Otherwise it contains `label`, `partial`, UTC-second `from`/`to`, `events`, fixed numerical `totals`, and plain escaped `activity`, `gains`, `highlights`, `compact` strings. The window is `(now − 12 hours, now]`; source timestamps are server recorded, and no device/companion visit acknowledgement is made. The most recent ten stories remain a separate `log` array; their truncated history never supplies twelve-hour totals.

Only simulation outcomes contribute to adventure totals: granted XP, gross combat/loot gold, victories, actual gear drops/loot, gross potion acquisition excluding full-pouch fallback, rest events, level gains, deaths/revivals, known rare finds, elite wins and jackpots. Travel arrivals resolve their destination from the content catalog. Companion commands remain visible as stories but are excluded from the adventure aggregate. Combat rarity is optional on older logs; it is never inferred from narrative flavor or current inventory. Production v25 is deployed and its existing-installation render/delivery is verified ([evidence](evidence/activity-recap.md)).

Deployed v25 layouts show full recap detail on X full/half/side and compact milestone/progress text on OG and quadrant. X full/side retain two stories; half and quadrant retain one. OG retains one across all sizes. Full-layout X gives the hero five grid columns and a two-line clamp so a permitted long name does not clip the level. Separate bar/gear grids preserve the horizontal spacing while reducing their vertical gap from 36 to 12.6 pixels in the X preview, lifting the scene and logs by 23.4 pixels for the normal header. Half-horizontal uses three columns for hero, recap/attention and newest story. OG quadrant drops decorative scene art to retain the recap, story and changes; X retains its scene. Attention suppresses the recap and older stories. All displayed stories retain their individual time/change rows and D53 `No effect` labels; the companion's detailed history remains available.

D55 deployed template v26 uses a zero-gap one-column grid within each story, retaining the same fonts and separate time/stat row. Smaller full-layout inter-entry spacing allows three recent stories on X full/side, superseding v25’s two-story count. OG and compact views retain one. Attention keeps priority; live previews, server image and natural tick 203 are verified ([evidence](evidence/log-density.md)).

D56 deployed template v27 moves the X full bag caption into the divider above the QR and the recap beneath it, allocating 7/2/3 grid columns to history/rank/bag. All four OG/X layouts fit the longest complete newest-first prefix from the existing ten stories, measuring actual wrapped boxes after framework terminalization and reserving the footer/following rank line. Shorter stories can show more entries; long descriptions retain their complete change row. Attention keeps priority. Barry approved production rollout on October 6; the actual X server image and natural tick 218 passed with progress preserved ([evidence](evidence/adaptive-log-layout.md)).

## Query read budget

Fixed lookups: grant/instance, user, hero, bounded equipped/potion items, latest ten logs, plus at most 201 logs in the twelve-hour owner/time range for D54, world/run summary, published publication pointer, that hero's recent_7d rank row (to resolve captured cohort), selected generation/publication, and five public-user state/name-version checks for privacy masking. Aggregate the newest 200 range rows; the extra row detects a partial window. This adds bounded per-poll read work and must be included in future capacity/cost measurements. It is bounded indexed work, not literally a single O(1) database access. No global scan, no live rank count, no per-poll inventory traversal beyond the bounded bag if the adapter needs it.

## Layout plans

Follow the [player experience](trmnl-experience.md) for hierarchy, freshness and cuts. Allocations below are starting proportions, not pixel specifications.

MVP is monochrome first and static. OG logical design sizes are 800×480 full, 800×240 half horizontal, 400×480 half vertical and 400×240 quadrant; framework/device scaling must be verified. Use actual screenshot content area, not the assumption every pixel is available.

| Layout | Axis / allocation | Display | Cut |
| --- | --- | --- | --- |
| Full | Three-zone row: hero 3/12, log 5/12, leaderboard 4/12; footer/attention reserved | 96–128px hero, level/status, HP/XP, 6 logs, Top 5 + own rank | Equipment names if fit fails; no extra future-feature panels |
| Half horizontal | Row: hero 4/12, story 5/12, rank 3/12 | Small sprite, level/HP, 1–2 newest logs, own rank | Top 5, gear, gold if cramped |
| Half vertical | Column: hero about 40%, story about 45%, rank/footer about 15% | Hero/stats, 3 logs, own rank | Top 5, gear details |
| Quadrant | One primary hero/status block; tiny context/footer | Name, level, HP/status, newest short outcome | Leaderboard, long log, gear, multiple progress bars |

Dead: show static dead sprite, recovery text and tick ETA. Paused/sleeping/quarantined: prominent state label; no misleading “exploring.” Unlinked: readable setup prompt and app domain. Empty board/log: deliberate text without empty grid shells. Stale: a small “Updates delayed” label; retain the last state.

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

D57 deployed template v28 supersedes D56’s X full arrangement: 6/4/2 history/ranking/bag columns, a 20% smaller standing X QR (integer scale 4), and one complete full-width recap line above the title bar. Rank fitting reserves context width. OG and compact recap placement stays unchanged; adaptive complete-story fitting remains. All 256 previews pass; Barry approved production rollout on October 6; the actual X server image, eight live-data previews and natural tick 222 passed with progress preserved ([evidence](evidence/recap-ribbon.md)).

D58 local template v29 reserves a standing/action QR in all four layouts. OG full uses smaller art and a compact rank heading; full and half recaps sit in a bottom ribbon. Side OG drops XP/art and the side rank line gives way to history. Full X keeps 6/4/2 with padding below the divider and recap rule. All 256 OG/X previews pass, including destination/presence agreement and 248 visible QR checks. Production remains v28 pending separately approved deployment ([evidence](evidence/layout-polish.md)).

D62 portrait follow-up (local, with the dev preview gallery): on the 480-pixel-wide OG/BWRY portrait panels the title bar could not hold the D46 keepsake code. Full portrait now shows the next adventure in the body (as X already did), freeing the bar; side and quarter portrait show the code in place of the "Desk Crawler" name while a code is live (icon kept; X keeps both). Setup and first-run screens in the short portrait slots (quarter, half) use a compact column without OG scene art, so their URL line no longer meets the title bar. A sweep of all 744 local previews (every scenario, OG/X/BWRY, four layouts, both orientations, keepsake code on) finds no content below the title bar and no clipped title text. Browse them at `/dev/desk-crawler` on the dev server.

Template v31 (local): the setup and first-run panel grows to the title bar and centers its content in every size and orientation, so no layout leaves a blank band above the bar (the X half and quarter were half empty). Every size shows the largest code each panel serves (scale 5 on OG/BWRY, 7 on X; the quarter and portrait columns had 3-4). The scan line appears only while a code is on screen and a paused service reads "Back soon" over its attention text; the OG quarter keeps one short line ("Scan with your phone.") while the X quarter shows the full set; first-run copy is one line on OG full/half. Portrait half and quarter columns drop scene art, which pushed the URL line under the X bar. A sweep of the 48 setup/first-run previews (OG/X/BWRY, four layouts, both orientations) finds no text or image below the title bar or outside its view.
