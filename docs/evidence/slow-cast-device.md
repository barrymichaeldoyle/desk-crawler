# Slow Cast device layouts (S3)

Recorded 2026-10-09 for D115. Template v1 (`packages/slow-cast/src/templates/screen.ts`), scene v2 and QR v1 (`packages/slow-cast/src/art/`).

## What was checked

`pnpm preview:slowcast` renders 16 device states through the real payload builder and templates, with the art drawn locally, for the OG, the X and the BWRY panel in landscape and portrait, in all four layouts: 384 pages. `pnpm sweep:trmnl <out> --filter sc-` loaded each in the pinned framework 3.4.0 and checked that nothing runs past the view or under the title bar, no image is broken and no unclamped text overflows. Result: **384 pages, 0 failures** ([results](slow-cast-layout-results.json)). The full layout, the half and side views and the quarter were also inspected by eye on the OG and the X in both orientations.

States: bareHook, catch, coolerFull, gotAway, longText, millpondDawn, outsideTop, paused, pending, pier, servicePaused, stale, travelling, unlinked, unranked, waiting.

## Layouts

| Layout | Landscape | Portrait |
| --- | --- | --- |
| Full | Name, level, XP, status with time and weather, the counters line and the code in the header; on the OG the scene at 4x beside the seven-day Top 5 (5x without a board), on the X the scene at 6x over the board; the attention line; three stories; the twelve-hour recap | The same header; the scene at 3x (8x on the X); four stories; the board; the recap |
| Half | Scene at 2x (4x on the X) beside the name, status, counters and the newest story or the attention line, code at the right | Name and code, scene at 2x, status, counters, two stories |
| Side | Name and code, scene at 2x (5x on the X), status, counters, attention, three stories, recap | Name, scene at 1x (4x on the X), status, counters, four stories, code at the foot |
| Quarter | Name, status, cooler and gold beside the code; the newest story or the attention line | The same stacked, code at the foot |

A held fish is drawn at the angler's hands when the newest story is a catch or a release; one that got away bends the rod. The code opens the dock, or the cooler when it is full. Attention lines, most urgent first: a service pause, delayed updates, a full cooler, a bare hook.

## Notes

- Fish sprites come from one trait row per species (`art/fish.ts`): body shape, tail, fin and markings. A sheet of all thirty is drawn by `pnpm tsx tools/art/slowcastSheet.ts <out.png>`; scenes by `tools/art/slowcastScenes.ts`.
- The pixel canvas, PNG encoder, font and QR drawing moved to `packages/engine/src/art/`; Desk Crawler re-exports them from its old paths and its art tests pass unchanged.
- Each scene scale is a small 1-bit PNG and every scene URL is immutable.
- The X draws images about 1.8 times their pixel size, so its scales are chosen to fit after that: 6x for the full scene.
- The board's own row is the label itself, so its inverted text stays white. The weekly fly code sits in the title bar; narrow portrait columns (side, quarter) show it as "Fly 482 917" in the title's place while a code is showing, as Desk Crawler's keepsake does. The previews carry a code on every fishing screen. The newest fly is drawn on the angler's hat (scene v2). The quarter shows no scene or board, as the spec's simplification order allows.
