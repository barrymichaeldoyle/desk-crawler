# Companion polish — 2026-10-04

Scope: the companion's Hero, Bag, Rankings, Settings, account and TRMNL connection flows. No deployment, manual gameplay action or TRMNL layout change was made as part of this pass. The normal visible-visit recap acknowledgement runs when the Hero page is inspected.

Implemented: mobile hero identity/health first; consistent logbook sections; 44px controls and 16px form text; separate equipped slots and stat comparisons; immutable sale review with item/rare-item disclosure; correct held-find/claim/free-slot/explicit-resume guidance; potion count/healing/availability; ranking groups/freshness and stopped-hero copy; disconnect confirmation; quieter expandable deletion; offline, loading, query-error and action feedback; immediate double-click protection and receipt reuse; lazy preview and cached template parsing; recap acknowledgement after two uninterrupted visible seconds with one bounded stale-recap retry.

Final non-browser pass on 2026-10-05: theme-ink focus outlines remain distinct from filled controls; large meter/ranking figures can wrap; action groups show their latest feedback instead of stale messages; realtime bag changes prune unavailable selections without choosing replacement gear. Sale review receives keyboard focus, supports Cancel/Escape with focus return, and its list is keyboard-scrollable. Expanded review flows normally on phones rather than covering short screens. Name-repair fields now match the square, 16px, dark-aware forms, and page retry failures are caught and explained.

Verification:

- `pnpm check`: typechecking and 116 tests passed in an isolated checkout of `314ecaf` plus the polish changes. Four added submission tests cover simultaneous clicks, unknown-outcome receipt reuse, definite rejection and the 24-hour expiry boundary. Two visible-visit tests cover backgrounding, returning to the tab and unmount cleanup.
- `pnpm build`: client and Workers production build passed in that checkout. Existing `inputValidator` deprecation warnings remain.
- Shared-worktree `pnpm test`: all 116 tests passed after the visible-visit fix; `git diff --check` is clean. Shared-worktree typechecking initially failed on missing keepsake API wiring, resolved in the revalidation below.
- Revalidation on 2026-10-05: keepsake generated API wiring is now present. Shared-worktree `pnpm check && pnpm build` passes, including all four packages' typechecking, 116 tests and client/Workers production builds. Existing `inputValidator` deprecation warnings remain.
- Later combined revalidation on 2026-10-05, after the keepsake tests/contracts arrived: `pnpm check && pnpm build` passes with 21 test files / 126 tests, all package typechecks and both production builds. This proves code compatibility, not mobile visual or live interaction acceptance.
- Signed-in development browser: Hero, Bag and recent Rankings inspected; selection and sale review exercised without submitting a sale. Desktop Bag review lists the chosen item/total and disables gear changes during confirmation.
- Hook scan: no deterministic design issues in changed UI files. This is supplementary evidence, not visual acceptance.
- Final shared-worktree `pnpm check && pnpm build`: all four package typechecks and 24 test files / 144 tests passed, followed by successful client and Workers builds. Added six selection/sale-review regressions and five server-rendered UI semantics tests. JSX is enabled in the test typecheck so these component tests are typechecked too. Existing `inputValidator` deprecation warnings remain.
- `git diff --check`: clean. Generated production CSS contains the 44px/minmax mobile gear grid, its desktop action column, safe-area padding, scroll padding, dark focus color and wide hero grid.
- The new tests run without browser navigation, signed-in data or external writes. They prove selection safety and server-rendered button/section/meter/feedback semantics—not computed mobile layout, focus execution, viewport fit or live interaction.

Deferred verification (not claimed as passed):

- Desktop/mobile final confirmation and phone-sized light/dark/long-content renders. The browser viewport override did not change the Chrome viewport. Barry explicitly approved `http://localhost:3010` on 2026-10-05, but the subsequent navigation was still rejected by automatic browser approval review, citing the prior user restriction. Barry then explicitly requested completing as much as possible without browser access. No alternate browser action was used to bypass the restriction.
- Shared-worktree interaction smoke test. Concurrent weekly-keepsake changes were preserved; combined code checks now pass, but live query availability and rendered interaction remain unverified.

The requested non-browser polish pass is complete under Barry's revised verification constraint. This is not visual/mobile certification or release approval. Existing installation, hardware, keepsake and marketplace gates are unchanged; templates and concurrent backend/simulator feature work were not edited by this pass. Nothing was deployed, published or reset.

## Subsequent phone and interaction verification — 2026-10-05

The later submission-preparation session successfully used an actual 390×844 Chrome viewport and permitted production/local navigation. This supersedes the earlier unavailable-browser result for the inspected cases; no previously rejected origin was accessed. Signed-in production Bag selection → sale review → cancel passed, including review focus and focus return. Settings and its disconnect confirmation fit the phone; cancellation completed without a disconnect. No sale, equipment change, pause, keepsake claim or deletion was submitted.

Real Bag/Settings components with fictional queries supplied long-name, rare-sale and held-find cases. Phone light/dark screenshots and a desktop dark Bag capture showed wrapping and no horizontal overflow. Local candidate landing/help phone captures were inspected too. Exact matrix, reproduction, privacy and limitations are in [submission preparation](submission-preparation.md). Current `pnpm check` passes 29 files / 176 tests and all package typechecks; client/Worker production build passes. These checks close the specific deferred phone/focus inspections above, not the full live gameplay smoke matrix or release approval.
