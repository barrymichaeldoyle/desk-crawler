# Slow Cast device layouts (S3)

Recorded 2026-10-09 for D115. Template v1 (`packages/slow-cast/src/templates/screen.ts`), scene v1 and QR v1 (`packages/slow-cast/src/art/`).

## What was checked

`pnpm preview:slowcast` renders 14 device states through the real payload builder and templates, with the art drawn locally, for the OG, the X and the BWRY panel in landscape and portrait, in all four layouts: 336 pages. `pnpm sweep:trmnl <out> --filter sc-` loaded each in the pinned framework 3.4.0 and checked that nothing runs past the view or under the title bar, no image is broken and no unclamped text overflows. Result: **336 pages, 0 failures** ([results](slow-cast-layout-results.json)). The full layout, the half and side views and the quarter were also inspected by eye on the OG and the X in both orientations.

States: bareHook, catch, coolerFull, gotAway, longText, millpondDawn, paused, pending, pier, servicePaused, stale, travelling, unlinked, waiting.

## Layouts

| Layout | Landscape | Portrait |
| --- | --- | --- |
| Full | Name, level, XP, status with time and weather, the counters line and the code in the header; the scene at 5x (10x on the X); the attention line; three stories; the twelve-hour recap | The same header; the scene at 3x (8x on the X); five stories; the recap |
| Half | Scene at 2x (4x on the X) beside the name, status, counters and the newest story or the attention line, code at the right | Name and code, scene at 2x, status, counters, two stories |
| Side | Name and code, scene at 2x (5x on the X), status, counters, attention, three stories, recap | Name, scene at 1x (4x on the X), status, counters, four stories, code at the foot |
| Quarter | Name, status, cooler and gold beside the code; the newest story or the attention line | The same stacked, code at the foot |

A held fish is drawn at the angler's hands when the newest story is a catch or a release; one that got away bends the rod. The code opens the dock, or the cooler when it is full. Attention lines, most urgent first: a service pause, delayed updates, a full cooler, a bare hook.

## Notes

- Fish sprites come from one trait row per species (`art/fish.ts`): body shape, tail, fin and markings. A sheet of all thirty is drawn by `pnpm tsx tools/art/slowcastSheet.ts <out.png>`; scenes by `tools/art/slowcastScenes.ts`.
- The pixel canvas, PNG encoder, font and QR drawing moved to `packages/engine/src/art/`; Desk Crawler re-exports them from its old paths and its art tests pass unchanged.
- Each scene scale is a small 1-bit PNG and every scene URL is immutable.
- Not yet on the screen: the Top 5 board (S5) and the fly code in the title bar (S6). The quarter shows no scene, as the spec's simplification order allows.
