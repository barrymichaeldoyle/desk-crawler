# Submission preparation — 2026-10-05

Base: `df3f8f6b9ee7e6dacd3c507ca51b4eeaec22a8ec`, with local candidate changes. Deployed device template v24 / scene v4 and active catalog v4 are unchanged. Owner/sender barry@barrymichaeldoyle.com and “No promotion commitment at this time” confirmed by Barry. No deployment, listing write, signup, new installation, media publication, reviewer contact or email occurred in this pass.

## Prepared changes

- Landing page uses an 800×480 fictional sample rendered from the current device template instead of the old narrative card. Its caption identifies illustrative hero/ranks. The same [featured image](../release/featured-image.png) is prepared for the listing; it contains no real profile or redeemable keepsake code and has not been uploaded.
- Help explains retained overflow finds, 30 slots, equipping versus freeing space, Claim find, explicit Resume, next-tick waking, eight-tick knockout recovery, hourly ranking freshness and past-due snapshot times.
- [Review package](../release/review-package.md) and [email draft](../review-email.md) reflect current keepsakes, bag sleep and weekly ranks. Description is 33 characters, below TRMNL's published 35-character limit. The [recording checklist](../release/recording-checklist.md) is ready; final recording and hosting remain open.
- [Balance evidence](balance.md) adds six-policy 500-tick, 30-day and 90-day runs, potion conservation, useful gear, censored progression and corrected death-day probabilities. Early Cafeteria difficulty and late upgrade saturation remain explicit tuning decisions.
- [Recovery runbook](../release/recovery-runbook.md) and protected checkpoint capture/planning tools are ready. The source-independent **offline** rehearsal passed; an ongoing protected production source and isolated live reconciliation remain open.

## Code verification

`pnpm check`: all package typechecks and **29 test files / 176 tests passed**. New tests exercise real-simulator potion conservation, distinct death days and deterministic policies; recovery tests cover source-independent denial planning, pending purge, tampering, wrong keys, source mismatch, game deletion versus account deletion, and unaffected installations. `pnpm build`: client and Cloudflare Worker production builds passed; existing TanStack `inputValidator` deprecation warnings remain.

## Browser verification

Controlled Chrome, actual viewport dimensions 390×844 and 1440×1000. Inspection used real application DOM, computed viewport/overflow checks and saved screenshots. No manual gameplay mutation was submitted. Private signed-in captures are kept in ignored `.impeccable/review/submission/`, not committed to this public repository.

| View | Environment | Observed result |
| --- | --- | --- |
| Landing | Local candidate, phone + desktop, dark | Sample loaded, caption/readability checked; no horizontal overflow |
| Help | Local candidate, phone, dark | All new sections visible, final exact Claim find label checked; ordered recovery instructions |
| Bag sale review | Signed-in production, phone, dark | Select → review → cancel; chosen item/price visible; review heading receives focus and cancellation returns it to gear review; selection cleared; no sale |
| Settings/disconnect | Signed-in production, phone, dark | Keepsake shelf, connection and confirmation fit; cancellation completed; no claim, pause, disconnect or deletion |
| Long-name rare sale | Real Bag component with fictional queries, phone, light | Long names wrap, rare-item disclosure and confirmation visible; no horizontal overflow |
| Held find | Real Bag component with fictional queries, phone, dark | Full-bag notice, disabled Claim find and explanation visible; no overflow. Synthetic scenario counts do not certify 30-row live rendering |
| Settings/disconnect | Real Settings component with fictional queries, phone, light | Long public alias and shelf names wrap; confirmation/cancel fit; no horizontal overflow |
| Long-name bag | Real Bag component with fictional queries, desktop, dark | Gear comparison and actions fit; no horizontal overflow |

Reproduce synthetic component fixtures with `node tools/review/companion-fixtures.mjs`, then `pnpm exec vite --config .previews/submission-companion/vite.config.mjs`. Query parameters `view=bag|settings`, `theme=light|dark`, `long=1`, `held=1` select scenarios. Fixtures mark themselves fictional and all server mutations throw locally. This proves visual layout for those cases, not authentication or live action success. The fixtures use a class-selected theme for deterministic light/dark inspection; production styling is unchanged.

The viewport was reset and the review tab closed afterward. Temporary local servers were stopped. The current phone checks supersede the earlier unavailable-browser portion of [companion polish](companion-polish.md), within the specific coverage above. They do not prove every theme/page/state or close lifecycle/recovery gates.

## Remaining

See [release preparation](release.md) for submission and launch gates. D43 preview-based layout coverage and D46 waived live keepsake checks remain respected. No review status, marketplace approval, live restore, final video or featured-image publication is claimed by these local results.
