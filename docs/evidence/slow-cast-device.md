# Slow Cast device layouts (S3)

Recorded 2026-10-09 for D115 and updated 2026-10-10 for template v2 (`packages/slow-cast/src/templates/screen.ts`), with scene v2, QR v1 and fish v1 (`packages/slow-cast/src/art/`).

## What was checked

`pnpm preview:slowcast` renders 16 device states through the real payload builder and templates, with the art drawn locally, for the OG, the X and the BWRY panel in landscape and portrait, in all four layouts: 384 pages. `pnpm sweep:trmnl <out> --filter sc-` loaded each in the pinned framework 3.4.0 and checked that nothing runs past the view or under the title bar, no image is broken and no unclamped text overflows. Result: **384 pages, 0 failures** ([results](slow-cast-layout-results.json)). The full layout, the half and side views and the quarter were also inspected by eye on the OG and the X in both orientations.

States: bareHook, catch, coolerFull, gotAway, longText, millpondDawn, outsideTop, paused, pending, pier, servicePaused, stale, travelling, unlinked, unranked, waiting.

## Layouts

Template v2 sets the counters behind 1-bit marks (`art/marks.ts`) instead of words: a pin for the place, marks for the time of day and the weather, then the cooler, the hook and bait left, gold and the logbook. XP is ten half-step ticks like Desk Crawler's. Every story leads with its kind's glyph (a fish kept, a fish released, the one that got away, wildlife, travel, out of bait, an achievement, a star for a level-up). The attention line is inverted behind its mark. The board heads with a trophy and shows each angler's 7-day XP. The recap sits at the foot as Desk Crawler's ribbon: a rule, "Last 12 hours", then each fact behind its mark.

| Layout | Landscape | Portrait |
| --- | --- | --- |
| Full | Name, level and XP ticks, place with time and weather, the counters and the code in the header. On the OG the scene at 4x beside the board, then the attention line and five stories (four beside an attention line). On the X the scene at 6x, then the stories beside the board with the newest catch under it. The recap at the foot | The same header; the scene at 3x (8x on the X); five stories; the newest catch; the board; the recap |
| Half | Scene at 2x (4x on the X) beside the name and XP, place and conditions, cooler, bait and gold, and the newest story or the attention line; code at the right | Name and code, scene at 2x, place, counters, two stories |
| Side | Name and code, scene at 2x (5x on the X), XP, place, counters, attention, three stories, recap | Name, scene at 1x (4x on the X), XP, place, cooler, bait and gold, three stories, the board, code at the foot |
| Quarter | Name and level, place, cooler and gold beside the code; the newest story or the attention line | The same stacked, code at the foot |

The newest-catch panel draws the fish alone (`/art/sc/fish/v1/<species>/<scale>.png`, the 30x12 sprite) beside "Newest catch" or "Released", its name and weight. On the X landscape it shows only without an attention line and with five board rows or fewer, which is what fits.

A held fish is drawn at the angler's hands when the newest story is a catch or a release; one that got away bends the rod. The code opens the dock, or the cooler when it is full. Attention lines, most urgent first: a service pause, delayed updates, a full cooler, a bare hook.

**Parity and lint.** `pnpm crosscheck:trmnl` now renders every Slow Cast scenario, with and without a fly code, in liquidjs and in Ruby Liquid through `trmnlp`: all 524 renders of both games match. `pnpm lint:trmnl` runs the official linter over both games' templates: both pass.

## Notes

- Fish sprites come from one trait row per species (`art/fish.ts`): body shape, tail, fin and markings. A sheet of all thirty is drawn by `pnpm tsx tools/art/slowcastSheet.ts <out.png>`; scenes by `tools/art/slowcastScenes.ts`.
- The pixel canvas, PNG encoder, font and QR drawing moved to `packages/engine/src/art/`; Desk Crawler re-exports them from its old paths and its art tests pass unchanged.
- Each scene scale is a small 1-bit PNG and every scene URL is immutable.
- The X draws images about 1.8 times their pixel size, so its scales are chosen to fit after that: 6x for the full scene.
- The board's own row is the label itself, so its inverted text stays white. The weekly fly code sits in the title bar; narrow portrait columns (side, quarter) show it as "Fly 482 917" in the title's place while a code is showing, as Desk Crawler's keepsake does. The previews carry a code on every fishing screen. The newest fly is drawn on the angler's hat (scene v2). The quarter shows no scene or board, as the spec's simplification order allows.
