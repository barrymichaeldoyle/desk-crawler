# TRMNL layout evidence: A10 (in progress)

## Next-tick fix, template v16 (2026-10-04)

Live TRMNL renders of setting 495747 and test setting 495979 never showed "Next adventure". TRMNL's screen-generation docs state that only `merge_variables` reach Liquid for third-party markup; the `trmnl` metadata does not. v14–v15 read `trmnl.user.utc_offset`, so D42's line was always omitted on devices, while the local preview injected a `trmnl` object and hid the gap. The screen route now passes the request's `trmnl[user][utc_offset]` as `utc_offset`, templates v16 use it, and the preview supplies only merge variables like TRMNL. A unit test renders the template with merge variables only and asserts the line appears with `utc_offset` and not with `trmnl.user.utc_offset` alone. All 88 previews still pass; the line appears in the 24 adventuring full/half cases.

Live check after deploy: a forced refresh of setting 495747 at 17:27 UTC rendered "Next adventure 19:30" on TRMNL's own renderer, which is the next :30 tick in Barry's SAST (UTC+2) timezone.

## Preview pass, template v15 (2026-10-04)

Barry made previews the layout gate (D43). All 88 cases (11 states × four sizes × OG/X) were rendered in Chrome via Playwright against production art and checked for content outside the view or under the title bar, broken images and clock/UTC text, then inspected visually as contact sheets.

The first run on v14 found the **OG full** layout overflowing in five states (normal, elite, long text, travelling, full bag) by 12–32px. The framework clips rather than overlaps, so the bottom row lost its last rank row (the owner's own row in the sample) and, in the full-bag state, the QR caption. Causes: v14's "Next adventure" line and a status column narrow enough to wrap "Travelling to the Cafeteria Depths". Fixes, OG only (the X keeps v14's arrangement):

- The status column widens from 4/12 to 5/12 on the OG so the longest status fits on one line.
- "Next adventure HH:MM" moves to the title bar's instance slot on the OG full layout. Placing it under the HP/XP bars made the header taller and overflowed by 19px.
- The full-bag QR caption sits beside the code on the OG instead of under it.

After the fixes all 88 pages pass with zero findings, and every OG full state shows three rank rows. The long-text sample now includes a 20-character public name with a five-digit score, the widest rank row, which fits on one line. The OG pixel font draws "y" with a short tail; that is the font, not clipping (same glyph mid-screen). Sheets: [OG full](layouts/v15-og-full.png), [X full](layouts/v15-x-full.png). Half and quadrant layouts on both devices were inspected and are unchanged from v14.

v12–v14 were never visually checked before this pass; this closes that gap.

## Readability candidate, template v12 (2026-10-04)

Barry described the delivered full-screen v11 layout as decent and requested easier reading. Candidate v12 gives hero/status and HP/XP a shared top row, keeps scene art in the middle, and widens the story panel beside rankings below. Gear names can wrap on the X; older story rows are black. Half layouts have clearer hero/status separation; quadrant prioritizes hero/HP and removes duplicate detail. Setup/first-run panels are unchanged.

`pnpm check` (71 tests/typechecks), `pnpm build`, and generation of all 88 HTML cases passed. Mechanical layout lint returned no findings. **Visual inspection and overflow/image checks have not run for v12**: automatic browser review rejected local preview access even after Barry allowed it. These changes remain local and must not be deployed as verified. No browser workaround was used.

Production v11 is now live: original setting 495747's timeline recorded rendering at 11:12:47 SAST and device delivery at 11:22:18; later rendering at 12:27:09. Barry's hardware feedback supplies limited full-screen readability evidence. A new production installation rendered successfully at 13:13:13, 941 ms, 22.6 KB ([walkthrough](install-demo/README.md)). Its install form still uses an old static featured image; that image is not a current production render.

Generic account markup preview returned empty merge variables and was excluded from acceptance evidence. Downloading the actual TRMNL image was rejected by browser review. Latest mashup and OG live-render proof remain open. Firmware observed: TRMNL X 1.8.17.

## Device times removed, template v11 (2026-10-04)

D39 removes the completed-game date/time and UTC offset from the shared title bar in all four sizes. Awaiting-rank copy now uses fixed “Ranking within the hour” text instead of the legacy board-time label. Older story rows already omit timestamps. The icon and title remain, following the [official basic title-bar structure](https://trmnl.com/framework/docs/3.4/title_bar).

Validation: `pnpm check` passed all typechecks and 71 tests. `pnpm tsx tools/trmnl/preview.ts` generated 88 pages (11 states × four sizes × OG/X). Playwright checked each for content crossing the title bar/view bounds, failed visible images, and clock/UTC text: zero failures. All eight normal-state screenshots (four sizes × OG/X) were visually inspected; local artifacts are in `.previews/v11-<og|x>-<layout>.png`. Help/settings copy and onboarding now omit the separate timezone preference; the backend and v1 payload keep legacy fields for compatibility.

`pnpm build` also passed for the client and Worker SSR bundle, with existing TanStack `inputValidator` deprecation notices. These were local framework previews at the time; subsequent production delivery and Barry's feedback are recorded above. The all-layout live release gate remains open.

## First-run screens, template v10 (2026-10-04)

Two first-run states share one panel in every size, built around a large QR code: setup (an installation with no active hero) and a brand-new hero before its first adventure (`first_run`, new payload field). A new player sees the second one for up to 15 minutes after saving the plugin. QR scales per layout: full ×4 (OG) / ×7 (X), half vertical ×4 / ×5, half horizontal ×3 / ×5, quadrant ×3 / ×4; the payload sends `qr_base` and the markup appends the scale. Rows: setup and first run on OG, then the same on the X: [v10-first-run.png](layouts/v10-first-run.png). No overflow across all 88 renders (eleven states).

Template v9 dropped per-line timestamps from older log entries and lets them wrap to two rows.

## Local framework matrix, template v8 (2026-10-04)

The preview now renders every state and size twice: OG (`screen--og screen--md screen--1bit`, 800×480) and TRMNL X (`screen--v2 screen--lg screen--4bit`, 1040×780 logical, scaled ×1.8 to 1872×1404). An automated check flags any layout whose content overflows its view; v8 has none.

| Device | Sheet (rows: the ten states; columns: full, half horizontal, half vertical, quadrant) |
| --- | --- |
| OG | [v8-og.png](layouts/v8-og.png) |
| TRMNL X | [v8-x.png](layouts/v8-x.png) |

Changes after Barry's v7 device check ("squashed to the top", unreadable small text):

- No text below the regular `label` size. `label--small` and `description` render in the 1-bit pixel font on the OG and were unreadable; gray text is dithered on 1-bit screens, so gray now applies only on 4-bit (`4bit:label--gray`).
- `lg:` variants enlarge type and progress bars on the X, and X-only rows fill the extra height: gear, gold and potions, two more log lines, Top 5 instead of Top 3.
- The X gets larger scene art (`scene_url_large` ×6 for full, `scene_url_medium` ×3 for halves and quadrant) swapped in with `lg:hidden` / `hidden lg:block`. At ×1.8 that is 10.8 device px per art pixel, so edges pick up a faint one-pixel gray fringe in the browser render (about 4% of scene pixels). Accepted for now; ×5 (exactly 9 device px) remains the fallback if the real X shows it.
- Companion QR codes (`qr_url`, `qr_url_large`) appear only when the player has something to do: setup (full and half vertical) and a full bag (full layout, in place of the rank panel). Targets are allowlisted (`/app`, `/app/inventory`); both scales decode in tests.


## Local framework matrix, template v7 (2026-10-03)

`pnpm tsx tools/trmnl/preview.ts` renders the real templates with real `buildPayload` output through Liquid (liquidjs) inside the pinned TRMNL framework 3.4.0 CSS/JS, at OG logical sizes, for ten states × four sizes. Screenshots via Playwright. This approximates TRMNL's renderer; real-device renders remain the acceptance gate.

| Size | Sheet |
| --- | --- |
| Full 800×480 | [v7-markup.png](layouts/v7-markup.png) |
| Half horizontal | [v7-markup_half_horizontal.png](layouts/v7-markup_half_horizontal.png) |
| Half vertical | [v7-markup_half_vertical.png](layouts/v7-markup_half_vertical.png) |
| Quadrant | [v7-markup_quadrant.png](layouts/v7-markup_quadrant.png) |

States: normal, elite, dead, travelling, inventory sleep, paused (dormant rank), quarantined, stale, maximum text, unlinked.

Findings fixed in v7: the attention message was clipped by the title bar on the full layout and missing from smaller sizes; it now sits under the story (full), under the status (halves) or replaces the story (quadrant). Story column top-aligned.

## Real TRMNL renders (Barry's TRMNL X, plugin setting 495493)

| Template | Observed |
| --- | --- |
| v1 | Legible, vertically centred; `data-progress` bars did not render |
| v3 | Framework 3.4 progress bars render; top-aligned |
| v5 | Scene window, rune divider, title icon, rank panel; content occupied the top ~55% at ×4 |
| v6–v7 | Larger scene (×5) and text; awaiting the next device check-in to render |

Not yet covered: mashup composition with other plugins on the real device, 1-bit OG hardware (rendered previews only, per D37), dark/text-scale variants.
