# TRMNL X half (top/bottom) details column — 2026-10-08

Barry asked for these changes to the X half (top/bottom) view:

- the pixel scene at the top, between the hero details and the QR code;
- the hearts, XP and gear moved down to where the scene sat;
- a vertical rule between the stories and the details;
- the rune rule separating only the stories from the scene and the code.

Partway through, he asked for the armor to take its own line, so the left column could be much thinner and the right one much wider (D97).

## Behavior

Template v41 changes the landscape half on the X only.

- **Details column, the left third:**
  - the hero with attack and defense, the status and the named gold, potions and bag;
  - the hearts and XP with their counts;
  - the weapon on one line, the armor on the next;
  - the board, fitted to what is left of the column (up to three rows, with the hero's own row kept longest).
- **A vertical rule** runs the full height between the two columns.
- **Right two thirds:** the 2x scene, centred, with the bag code at the end (or the urgent code with its label), then the rune rule, then the one-line ledger with the XP, gold and HP columns.
- **Long names:** a name too wide to share a line with the attack and defense marks pushes them to the next line. A name over 12 characters clamps to one line.

The portrait half, the side and quarter views, the full layouts, and every OG and BWRY view are unchanged.

## Local verification

- Typecheck passes and **349 tests** pass. The half test now checks the landscape order: details, HUD, stacked gear, board, column rule, scene, code, rune rule, ledger.
- The official TRMNL markup lint passes, and 292 renders are identical in liquidjs and Ruby Liquid.
- The sweep of the 34 X landscape-half states (normal and recap) has no failures. Per-state story counts are in the [results](x-half-details-column-results.json). The normal state keeps all five one-line stories, as before.
- A sweep of all 292 X previews (every layout, landscape and portrait, normal and recap) has no failures.
