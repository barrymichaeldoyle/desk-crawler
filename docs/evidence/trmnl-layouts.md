# TRMNL layout evidence: A10 (in progress)

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
