# TRMNL layout evidence — A10 (in progress)

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
