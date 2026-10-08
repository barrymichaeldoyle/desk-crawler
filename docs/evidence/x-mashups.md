# TRMNL X half, side and quarter views — 2026-10-08

Barry asked for the TRMNL X to look good in the half views (top/bottom and left/right) and the quarter view (D95). They had been the OG's arrangements scaled up:

- bare counters;
- two-line stories;
- no board;
- a scene shrunk into leftover space;
- empty bands at the foot.

Template v40 gives the X its own blocks, built from the full layout's pieces. The OG and BWRY views are unchanged.

## Behavior

- **Half (top/bottom), landscape:**
  - The full layout's header:
    - the hero with attack and defense, the status and the named gold, potions and bag;
    - the hearts and XP with their counts, and the gear line;
    - the bag code at the end, or an urgent code with its label.
  - A rune rule.
  - The 2x scene with a board under it, beside a one-line ledger with the XP, gold and HP columns. The board shows up to three rows, trimmed to its slot when the recap ribbon or a taller header shortens it.
- **Half, portrait:**
  - The same header, with the bag code hung in the corner of the 3x scene so the hero and HUD keep the header's width.
  - The scene beside a five-row board, then a rune rule.
  - A one-line recap and the one-line ledger.
- **Side (left/right), landscape:**
  - A stacked header with the name line, status, named counters, hearts, XP and gear.
  - The 3x scene with the bag code hung in its corner. An urgent code sits under the scene with its label.
  - The recap and stories, then a five-row board.
- **Side, portrait:** the same with the 2x scene, closing with the bag code.
- **Quarter:**
  - The name with attack and defense, the hearts and XP with their counts, then the stories across the width.
  - In landscape the status and the bag code sit beside the header, and the tiny scene is gone. In portrait the code closes the column.
- **Implementation:**
  - The OG blocks in these views carry `lg:hidden`, and the X blocks are `hidden lg:block` with an inner flex box.
  - The story fitter also trims a board marked `data-fit-rows`. The hero's own row is dropped last, and a board with no room for a row is hidden.

## Sweep changes

`tools/trmnl/sweep.mjs` now:

- fails a preview where anything outside the recap ribbon runs below the ribbon's top. This caught the half-landscape board running into the ribbon.
- loads the whole screen and screenshots the plugin's own view. Before, the portrait mashup shots cropped the wrong box.
- bounds each page load with a retry, after one sweep stalled on a framework request.

## Local verification

- Typecheck passes and **349 tests** pass. New tests cover:
  - the half views' header, scene, board rows and one-line ledger;
  - the side's hung code, its board, and the portrait's foot code;
  - the quarter's counts and code placement.
- The official TRMNL markup lint passes, and 292 renders are identical in liquidjs and Ruby Liquid.
- The X full views and every OG and BWRY view of the normal state are pixel-identical to v39.
- Sweep results and story and board counts per view are in the [results](x-mashups-results.json).
- In every plain and recap state, each X view shows at least its newest story. With a 16-character name, the landscape half hides its board rather than overlap.

## Rollout state

Deployed from `8d11343` (pushed to `main`; the Workers build passed, and the lint passed on `6e8c0ea`, which carries the same template). The first builds of `6e8c0ea` and its retry failed on a timeout: the bulk preview render test passed 5 seconds on the build machine. It now parses each template once and has a 30-second budget.
