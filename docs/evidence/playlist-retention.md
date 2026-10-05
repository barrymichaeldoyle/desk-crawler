# Playlist retention and narrative callbacks — 2026-10-05

Scope: D46 optional permanent Desk keepsakes, template v21’s authenticated-device footer, companion shelf/claims, and D47 content v4’s narrative variety and deliberate cable callback. Deployed on 2026-10-05 following Barry’s “approved, deploy”; Barry waived the remaining live verification on 2026-10-05 (“I trust that works, lets skip the verification”), as detailed below. No marketplace publication or player-progress reset occurred.

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

## Production deployment and waived live checks

Release scope includes shared companion dependencies: the shelf uses the pending/offline-aware `Button`, `ActionFeedback`, `NetworkProvider`, `Submission` receipt helper and existing settings/home integration. The shared release commit also contains companion-polish work.

Barry authorized deployment, content activation and the live keepsake check on 2026-10-05. An isolated candidate passed 131 tests in 21 files, all package typechecks, the production build, Convex deployment dry run and Wrangler dry run. Before deploying that candidate, the agent found that the shared commit `6391c5d5b554496457f6c6a7a58931516fb3cb70` was already on `main` and its existing pipeline had deployed it. The older isolated candidate was not deployed over the newer release.

- Cloudflare check `Workers Builds: trmnl-games` completed successfully at 07:11:38 UTC; build ID `6bb1b011-0767-4ae3-8342-b0c58eddd763`. Worker deployment at 07:11:33 UTC serves version `a7e94c71-871d-49b3-8c32-43d276a68837` on `trmnlgames.com`.
- Production Convex `exciting-cormorant-948` serves `keepsakes:mine`; the signed-in production companion shows the connected installation, the twelve-design shelf and zero collected. The desktop capture `.impeccable/review/keepsakes-live-desktop-before.png` was opened and inspected, with no horizontal overflow at the actual 1920px browser width. The viewport override did not change that width, so no live mobile render is claimed.
- The owner hero preview iframe’s rendered HTML omits `Keepsake` before any claim, while the collection is still unclaimed.
- `world:setActiveContentVersion` returned `{from:"v3",to:"v4"}` between runs. The next ordinary scheduled run will pin v4; no extra gameplay tick was forced. At verification, tick 98 was completed under v3 and no run was active.
- Before rollout Baz was level 3 with lifetime XP 258 at completed tick 97. After rollout and content activation the same hero ID remained active/exploring, level 3, XP 258 and completed tick 98. No progress reset or seed occurred.
- The existing live TRMNL installation 495747 was refreshed once through its normal UI. Its timeline confirms `09:16:29` SAST: “Rendered — manual refresh · 811 ms · 29 KB.” This establishes successful server rendering, not visual acceptance or physical delivery of the new image.

Opening the observed TRMNL image link was rejected by automatic browser approval review because its redirect targets `fsn1.your-objectstorage.com`, a user-blocked browser origin. No alternate image retrieval was attempted. Barry was asked for the code visible on the physical device so the authenticated live claim can be checked without opening the blocked image. Barry subsequently waived the remaining live verification on 2026-10-05 (“I trust that works, lets skip the verification”). The physical glance, real cosmetic claim, localized post-claim copy and refreshed-screen code suppression were not performed and are recorded as waived, not passed. No further device code or claim is required to close this feature. Local fixtures and backend tests above remain the evidence for those behaviors. The TRMNL connector also required reauthentication; the signed-in browser provided the permitted settings/timeline checks.

The feature incentivizes watching the device but cannot prove playlist inclusion or hardware impressions. TRMNL’s own dashboard preview can expose a valid code. Creator Fund qualification remains the separate V10 gate, as explained in the [feature contract](../playlist-retention.md).
