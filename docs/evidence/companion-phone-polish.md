# Companion phone polish — 2026-10-08 (D100)

Scope: the signed-in companion (shell, Hero, Bag, Rankings, Settings) at phone width. No template, backend or gameplay change.

## What was wrong

Full-page captures at 390×844 (Chrome via playwright-core) of the real components with fictional data:

- Hero page: 6,551px tall (about eight screens). With a weekly keepsake unclaimed the callout filled the first viewport and the game screen began below it. Stance was three stacked cards (about 450px), the world map three stacked tiles, Records twelve single rows.
- Bag page: the section title wrapped to two lines beside "Sell gear" and to one beside "Done", so the header jumped when selection started (seen on the iPhone 17 Pro simulator).
- Hero and Settings commands reported inline under their buttons, so the page moved when an action settled; the Bag already used a pinned notice (D98).
- No control answered a tap before the server did (hover styles only; Tailwind v4 scopes them to pointers that hover).
- A weapon's attack figure was red and armor's defence blue, so a plain "+5 attack" read as a loss (Barry, 2026-10-08).

## What changed

- `KeepsakeCallout`: a 3px window strip (icon, "New this week", title, Enter code) that opens the code form in place; after a claim it names the keepsake and links to the shelf.
- Stance: a segmented `radiogroup` (Cautious / Balanced / Bold) with the chosen stance's blurb and thresholds in one line below.
- World map: on phones each world is a row (number chip, name, status, Travel); from 640px the tiles and dashed path are unchanged.
- Records: two columns at every width.
- `useNotice` / `NoticeBar` moved to `lib/ui.tsx`; Hero (potion, pause, resume, stance, choice, travel), Bag and Settings (pause, resume, disconnect, deletion) report through it. The keepsake form keeps its inline feedback beside the input.
- Buttons: `active:` press states (primary sinks 2px into its lip, secondary and danger invert, quiet brightens); slots darken on press. `.sheet[open]` and the notice rise 1.5rem in four steps over 160ms; reduced motion collapses it.
- Bag: section title one line (`text-xl`, truncating) beside a fixed-width Sell / Done button; the bag ladder card is titled "Bigger bags" so two cards no longer share the bag's name; gear figures neutral, deltas green/red.

## Verification

- `pnpm --filter @trmnl-games/web typecheck` and `vitest run tests/web` (11 files, 46 tests) pass.
- Full-page phone captures after the change: Hero 5,465px (from 6,551) with the game screen inside the first viewport under the keepsake strip; the busy variant (paused, effects, merchant, choice, return tally) 6,129px. Bag, Rankings and Settings fit 390px without horizontal overflow.
- iPhone 17 Pro simulator (Safari) on the harness: tabs, the gear sheet, Sell selection with its pinned bar and the stance row respond to taps; the notice sits above the home indicator.

## Harness

`node tools/review/companion-fixtures.mjs` then `pnpm exec vite --config .previews/submission-companion/vite.config.mjs` serves the real shell and pages at `http://127.0.0.1:4197/app/desk-crawler` (and `/inventory`, `/leaderboard`, `/settings`) with `tools/review/fixtures/companion.json`, a sanitised capture of a real hero. Query parameters cover statuses, a held find, a full bag, a merchant, a pending choice, effects, a return tally and a claimed keepsake; mutations fail after 1.2s or succeed with `?ok=1`. The simulator reaches it at the same address.
