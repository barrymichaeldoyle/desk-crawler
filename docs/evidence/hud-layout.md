# HUD layout — template v32 (D72)

Barry requested the companion's HUD elements on TRMNL, removal of the next-adventure clock, and clearer adventure logs on 2026-10-07. The finished template uses ten half-heart health marks, coin and potion counters, and outlined stat chips. Story times remain in the installation's timezone; narrow portrait columns place the time beside the chips. `next_tick_at` remains in the payload for the companion.

This follow-up finishes the partial template included in `35c85a6`: explicit Liquid `floor` filters make health rounding agree between liquidjs and Ruby Liquid, stretched image wrappers keep the divider within narrow portrait columns, and full portrait uses the medium scene asset. The XP bar, recap, rank and QR rules retain their existing behavior.

## Checks rerun before commit and push

- `pnpm check`: all typechecks and **288 tests in 43 files** pass, including half-heart boundaries, zero/living health, narrow counters, story times and chips, and absence of the device clock.
- `pnpm lint:trmnl`: all official markup checks pass.
- `pnpm crosscheck:trmnl`: **276 renders identical** in liquidjs and Ruby Liquid through the pinned `trmnlp` environment.
- `pnpm build`: production client and Workers server builds pass. Existing TanStack `inputValidator` deprecation notices remain.
- `git diff --check`: passes.
- The committed OG full, OG side and X full screenshots below were visually inspected: health, counters and complete visible story/change pairs fit above the footer; recap, rank and QR remain readable.

The earlier layout session recorded a **504-preview sweep** across scenarios, OG/X/BWRY, four layouts and both orientations in D72 and the integration docs. That sweep was not repeated for this commit; its raw aggregate report is not retained in this repository. The screenshots and the rerun checks above are the retained evidence for this follow-up.

## Retained screenshots

- [OG full](layouts/v32-og-full.png)
- [OG side](layouts/v32-og-side.png)
- [X full](layouts/v32-x-full.png)

The screenshots use illustrative fixture names and game state. They are local framework previews, not proof of server rendering or physical device delivery.

## Rollout

Barry authorized committing and pushing all outstanding work to `main` on 2026-10-07. That push triggers the production pipeline for Convex `exciting-cormorant-948` and the companion at `trmnlgames.com`. Deployment completion, a live TRMNL server render and physical readability remain separate evidence; this document does not claim they have passed.

The same commit adds the shared companion footer: unofficial-site wording with a normal link to TRMNL, plus Barry Michael Doyle's website, LinkedIn and X links. The footer was inspected on desktop and at a 375-pixel phone width with no horizontal overflow; its external destinations have no `nofollow` attribute.
