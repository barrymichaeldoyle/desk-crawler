# Site audit — 2026-10-09

Scope: UX, performance, accessibility and SEO across the public pages (live, then a local production build) and the signed-in companion (fixtures harness). Chrome only, at 390×844, 320 wide for reflow, and 800 and 1280 wide.

## Findings before the changes

- **Lighthouse (mobile, live):** accessibility, best practices and SEO 100 on every public page; performance 66–91, held down by JavaScript weight under simulated throttling. Real Chrome loads paint in about 200–300 ms on every public page.
- **axe-core 4 (WCAG 2.0–2.2 A/AA plus best practice):** no violations on any public page, companion page, or open sheet (achievement, pause, item).
- **Manual:** no horizontal overflow at 320 px, one `h1` per page, no skipped heading levels, visible focus everywhere, skip link present, reduced motion honoured.
- **Caching:** fingerprinted `/assets/*` files were served with `max-age=0, must-revalidate`, so each return visit re-checked about 30 files.
- **Tap targets:** footer links and the Records "All rankings" link were 20 px tall (passes WCAG 2.2's 24 px rule through spacing, misses companion.md's 44 px rule).
- **UX:** the Help page is about 9,500 px on a phone with no way to jump between sections; the consent panel covered 276 px (a third of a phone screen); the game page, Help, legal pages, waiting list and public hero pages had a bare logo instead of the site header, so a signed-in player there had no route back to their games.
- **SEO:** the game page's description was 60 characters.

## Changes

- `apps/web/public/_headers`: `/assets/*` one year, immutable; `/fonts/*` a week with a day of stale-while-revalidate. Checked in `pnpm preview` (Wrangler parses both rules).
- Site footer links and "All rankings" are 44 px targets.
- `ProsePage` takes `contents`; Help lists its 21 sections in a two-column jump list (about half a phone screen) with matching heading ids.
- Every public page uses the site header (`lib/platformHeader.tsx`): game page, waiting list, Help, Support, Feedback, Privacy, Terms and public hero pages.
- The consent panel's two answers share one row on phones (276 px to 225 px, measured on the live panel), equally prominent, same labels.
- Game page description now 132 characters.

After: axe clean and no target under 24 px on every public page of the local production build; no overflow at 320 px; `pnpm check` (471 tests) and `pnpm build` pass.

## Clerk on public pages: not changed

Clerk's scripts (about 340 KB, 250 KB of it `@clerk/ui`) load on every page and are most of Lighthouse's "unused JavaScript". They load after first paint (total blocking time 0–30 ms), so real loads are unaffected; the cost is bandwidth and the simulated mobile score. `prefetchUI: false` would skip `@clerk/ui`, but Clerk documents it only for custom UIs built from control components: this site uses the prebuilt `SignInButton`/`SignUpButton` modals and `UserButton`, which need it. Moving `ClerkProvider` off public routes would break the waitlist's signed-in variant, account-linked feedback, analytics identity and the header avatar. Revisit if the sign-in surfaces move to custom UI.
