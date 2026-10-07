# HUD layout: hearts, counters and story chips — 2026-10-07

Barry asked for the TRMNL layout to look better using the companion's HUD elements (hearts for HP), to drop the next-adventure time, and to polish the logs. Template **v32** (D72) was verified locally and then committed and pushed with Barry's authorization from a parallel session (`4a12184`), which also added the companion footer credits; its lint and Workers build passed. **Live server render and physical readability are not yet verified.**

## Behavior

Every view draws health as ten half-heart hearts, floored in Liquid from the real `hp`/`max_hp` so liquidjs and Ruby Liquid agree; the row is never empty while the hero lives and fully empty when knocked out. Wide rows (full landscape and portrait) carry the `hp/max_hp HP` count beside the hearts; the side, half, quarter and portrait columns show the count in the counter line instead, since ten hearts fill their width. Coin and potion marks replace the "gold · potions" words, with bare numbers in narrow columns. The XP bar, scene, divider, recap, rank panel, attention rules and QR codes are unchanged. Half horizontal uses 4/6/2 hero/history/QR columns.

Each story keeps its HH:MM at the end of its line; its nonzero changes follow as outlined chips (one per ` · `-separated change, `No effect` included) in a block that wraps like words, indented to the story's edge. The 240-pixel portrait side and quarter columns place the time among the chips. Whole-entry fitting is unchanged.

No layout shows the next-adventure clock. `next_tick_at` stays in the payload for the companion and `utc_offset` still drives story and pending-status times. The help page explains the quarter-hour schedule instead of the clock.

Two pre-existing portrait defects were fixed on the way: the full portrait's scene and rune divider rows now stretch so the framework's image max-width keeps the 600-pixel rule inside the OG panel, and the X full portrait uses the medium scene instead of clipping the large one.

## Local verification

- Typechecks and **288 tests / 43 files** pass. The template suite covers half-heart rounding (16 of 20 at 118/148, a half at 75/100), the one-half floor at 1 HP, all empty at 0 HP, the HP count placement, counter words versus bare numbers, chips for every change including potion finds, the time position in landscape versus the narrow portrait columns, and that no layout renders the clock even with an offset.
- Official TRMNL markup lint passes. **276 renders identical** in liquidjs and Ruby Liquid (trmnlp), after flooring the heart arithmetic; the first local cut differed (`data-hearts="16.44"` versus `16`), which is what failed the CI lint on `35c85a6`.
- **504 settled previews**: 21 states × four layouts × OG/X/BWRY × landscape/portrait, pinned framework 3.4.0. No element outside its view or below the title bar, no broken image, no unclamped text overflow, every story list fitted completely, and 432 heart rows each holding ten hearts. 2,551 chips rendered; 299 chip rows wrapped onto more than one line without leaving their column.

Fitted story counts for the ordinary fixture (not guaranteed row counts):

| Device | Full | Half | Side | Quarter |
| --- | ---: | ---: | ---: | ---: |
| OG | 3 | 2 | 4 | 2 |
| X | 5 | 6 | 6 | 4 |
| OG portrait | 6 | 4 | 6 | 2 |
| X portrait | 6 | 5 | 6 | 5 |

Captures: [OG full](layouts/v32-og-full.png), [OG side](layouts/v32-og-side.png), [X full](layouts/v32-x-full.png). [Sanitized results](hud-layout-results.json) keep counts and bounds only.

## Rollout state

A review-submission commit from a parallel session (`35c85a6`, 02:02 UTC+2) swept up the half-finished template and `hud.ts`. Its TRMNL lint (cross-check mismatch) and Workers build both failed, so production kept the previous build. Barry authorized that session to commit and push all outstanding work: `4a12184` (02:22) carries the finished v32, the flooring fix, the portrait scene/divider fix, tests, help copy and docs, and passed the lint workflow and the Workers build for Convex `exciting-cormorant-948` and `trmnlgames.com`. The 504-preview sweep above was rerun on that exact template state after the portrait fix; the results file was added afterwards. Physical readability remains unverified.

**Live server render, 2026-10-07.** Installation 498157's actual 1872×1404 X full server image (refreshed about 11:00 UTC) was inspected: ten hearts with `112/112 HP`, coin and potion marks, four complete stories with outlined chips, rank panel, bag QR, a complete 12-hour recap line and a clear footer with no next-adventure clock.

**Listing image.** The featured image from October 5 (blob `19296090`) still showed HP/XP bars and "Next adventure 22:30". Barry regenerated it from installation 498157; the new 800×480 image (blob `19302435`) was downloaded and inspected: hearts, coin/potion marks, a fight scene, three chipped stories (the first ends in an ellipsis), rank, QR and recap. The install video still shows the earlier layout; it was left unchanged because the install flow it demonstrates is the same.

The same commit adds the shared companion footer: unofficial-site wording with a normal link to TRMNL, plus Barry Michael Doyle's website, LinkedIn and X links, inspected on desktop and at a 375-pixel phone width with no horizontal overflow.
