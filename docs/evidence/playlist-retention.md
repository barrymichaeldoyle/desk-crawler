# Playlist retention and narrative callbacks — 2026-10-05

Scope: D46 optional permanent Desk keepsakes, template v21’s authenticated-device footer, companion shelf/claims, and D47 content v4’s narrative variety and deliberate cable callback. Local implementation only; no deployment, production catalog activation, hardware refresh, marketplace publication or player-progress reset occurred.

## Automated verification

- `pnpm check`: all four packages and simulator tests typecheck; 23 test files, 139 tests pass in the shared workspace, including concurrent companion work.
- Current-worktree revalidation on 2026-10-05 at 08:49 local time: all package typechecks and 24 test files / 144 tests pass after further concurrent companion changes. All twelve recorded keepsake UI/device capture files are still present. This revalidation does not establish deployed behavior.
- `pnpm build`: client and Cloudflare Workers production build pass. Existing TanStack `inputValidator` deprecation warnings remain.
- `git diff --check`: clean.
- `tests/convex/keepsakes.test.ts`: authenticated real HTTP envelope delivery, absent companion-preview code, no award from screen reads, bearer/UUID/ownership denial, pending and deleting users, current/previous-week acceptance and older/future rejection, exact weekly boundary, receipt replay, concurrent claims, multiple grants sharing one award, revoked/disconnected installations, failed guesses committing their limiter charge, bounded collection growth through fifteen weeks, and both game/account deletion paths.
- `tests/sim/screen.test.ts`: real Liquid rendering shows the code in all four layouts and omits it without the device-envelope variable.
- `tests/sim/narrative-v4.test.ts`: second-cable callback, no third cable-family line despite different damage, appended consequences, repetition reset after another action, one narrative draw per selection, accidental-repeat avoidance in other pools, deterministic simulator history, older catalogs ignoring history, and v3-equivalent gameplay over 1,500 seeded outcomes across all three biomes.
- `tests/convex/tick.test.ts`: a real v4 scheduler run reads both prior stories and changes a seeded third cable trip into a different mishap with the expected deltas.

Generated Convex bindings include the new keepsake functions. Code generation was performed against the existing development deployment; no running function deployment was made.

## Companion review

The isolated local Vite fixture renders the real `DeskKeepsakes` component and incumbent stylesheet with explicitly labeled synthetic hook data. It does not contact a live backend. Desktop 1440×1000 and phone 390×844 captures were opened and inspected; the shelf reflows from three columns to two without horizontal overflow. Invalid-code feedback, lowercase/hyphen normalization, successful collection, shelf-count update, next design and success announcement were exercised. Backend authority is separately tested above.

Local captures are in `.impeccable/review/keepsakes-desktop.png`, `keepsakes-mobile.png`, `keepsakes-claimed.png` and `keepsakes-claimed-mobile.png`. The claim copy reads “The next code arrives Monday 02:00” for the current browser’s timezone. It formats the reset timestamp using the browser’s local weekday/hour/minute, without a timezone label; west-of-UTC users therefore get their actual local Sunday boundary rather than a hard-coded Monday.

The detector returned no deterministic findings. The required independent finish review accepted the incumbent typography, palette, crisp pixel glyphs and responsive shelf, and identified the original fixed-Monday/local-time inconsistency. After correction and recapture, its verdict scored that fix resolved and returned `ship`. The documenter found an ordinary extension of the incumbent system and made no design-system changes; it recorded unrelated pre-existing 40px/44px segmented-target drift without repairing it.

## TRMNL preview review

`pnpm exec tsx tools/trmnl/preview.ts https://exciting-cormorant-948.convex.site --keepsakes` generates 96 local HTML fixtures: twelve states × four layouts × OG/X. The sample code `ABCD-EFGH` is fictional.

The eight ordinary-state layout/model combinations were captured at the framework’s OG 800×480 and X 1872×1404 layout dimensions, opened individually and inspected. DOM bounds checks found the code within every title bar, without text overflow or overlapping neighbouring labels. The standing story/rank/body layout is preserved. Local screenshots are `.impeccable/review/keepsake-{og,x}-{markup,markup_half_horizontal,markup_half_vertical,markup_quadrant}.png`. This is a local framework preview, not a physical-device or live server-Liquid claim.

## Open live gate

Release scope includes shared companion dependencies: the shelf uses the pending/offline-aware `Button`, `ActionFeedback`, `NetworkProvider`, `Submission` receipt helper and existing settings/home integration. Those files also contain concurrent companion-polish work. Prepare an explicit release commit containing the approved feature and its required dependencies; do not deploy or push every dirty file indiscriminately. The production targets remain Convex `exciting-cormorant-948` and Cloudflare Worker `trmnl-games` on `trmnlgames.com`. The existing pipeline deploys both on a push to `main`, so that push is a production action requiring approval too.

Project instructions require action-specific approval before deploying. After authorization, deploy the additive schema/backend and companion, activate content v4 between runs using the existing guarded world operation, then verify an authenticated live TRMNL render and cosmetic claim. Confirm code omission from the companion preview and suppression after a successful claim. Preserve all hero, inventory and ranking progress.

The feature incentivizes watching the device but cannot prove playlist inclusion or hardware impressions. TRMNL’s own dashboard preview can expose a valid code. Creator Fund qualification remains the separate V10 gate, as explained in the [feature contract](../playlist-retention.md).
