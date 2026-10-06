# Adaptive device log layout — 2026-10-06

Barry requested moving “Your bag” above the QR into the decorative divider, placing the twelve-hour recap below the QR, narrowing the leaderboard and showing as many complete recent stories as fit. Template **v27** implements these changes. Barry explicitly authorized production rollout on October 6. Production now serves **v27**, and deployment, live server-render inspection and the next natural tick passed.

## Behavior

On X full, the bottom grid assigns **7/12 to logs, 2/12 to rank and 3/12 to bag/recap**. The centered bag label sits in the divider row above the existing integer-scaled QR. Compact internal recap spacing retains gains, activity and highlights beneath the QR. Rank context stacks below its ordinal on X; the framework fits unusually long ordinals to the narrow column, and names retain their existing single-line clamp. The X full hero heading also fits exceptionally wide unbroken names within its header column, keeping them clear of the HP bar. The OG full heading abbreviates names beyond twelve characters with an ellipsis before the level, retaining its readable title font.

The recent list offers all **ten bounded payload entries**, newest first. A view-scoped renderer hook runs when pinned framework 3.4 emits its final terminalization statistics, before framework readiness. It measures actual rich-text boxes, reserves the footer, layout padding and any following rank line, then hides complete oldest entries until the longest prefix fits. It changes only framework visibility classes. Each story keeps its description, time and changes together; the latest story retains its larger type, names retain rich formatting on X, and older rows keep subtle rules and tight spacing.

All four layouts on OG/X use the same fitting behavior. Full OG keeps its compact recap above the logs and existing rank/QR presentation. Side, half and quadrant keep their recap positions. Attention suppresses optional recap/history; onboarding stays separate. Without a standing QR, the full recap remains in the narrative column. Empty history retains the first-adventure message. Backend reads, payload limits, simulation state and rewards remain unchanged.

## Verification

- `pnpm check`: all typechecks and **202 tests / 31 files** passed.
- Official `pnpm lint:trmnl` and `pnpm build` passed.
- **32 states × four layouts × OG/X = 256 settled browser checks** passed, including ten short entries, ten long marked-name entries, wide hero names, five-digit ranks/six-digit scores, missing metadata, no QR and empty history.
- Zero footer overflows, failed visible images, incomplete fitter runs or cases where the next hidden complete entry would fit. All 64 full-layout header checks also pass the actual text-bounds check. The harness waits for fonts, framework readiness and two frames, then checks remaining space against the next entry’s measured height.
- Visual inspection covers paired OG/X full recorded history and dense long text, side ordinary history, half short/no-effect entries, quadrant quiet breaks, wide hero names and large ranks. These are local previews; recorded-history outcomes use shifted timestamps and fictional hero stats.

Representative visible counts depend on actual wrapping and metadata:

| Fixture | X full | X side | X half | X quadrant |
| --- | ---: | ---: | ---: | ---: |
| Recorded history | 6 | 5 | 7 | 2 |
| Ten short coffee breaks | 6 | 5 | 7 | 2 |
| Ten long stories | 4 | 4 | 4 | 2 |
| Ten short entries without metadata | 10 | 10 | 10 | 5 |

[Sanitized results](adaptive-log-layout-results.json) record all checks without player identifiers or source story text. Local screenshots live in `.previews/adaptive-*.png`; `.previews/adaptive-recordedHistory-markup.png` is the primary review image. The fixture timestamps and hero are illustrative, not a live production snapshot.

## Production rollout

- Source `a9b682849722e9349b1b611ccd5873cf948df1fb` deployed through the existing `main` Workers Builds pipeline. Build `0c8cb709-666f-4ed1-abd1-08b28e7010a4` succeeded. Production Convex is `exciting-cormorant-948`; Worker `trmnl-games` deployment `c7022b35-13db-43a9-b4aa-6d6a72eb57a8` serves version `89747932-a9b6-4af8-acd1-8e494cc02163` at 100% traffic, deployed **13:13:33 UTC**.
- The signed-in companion confirms the adaptive hook, seven-column X history and right-hand recap. Its X full preview was inspected and shows six complete recent story/stat pairs. Its side preview was also inspected after the next natural tick, showing five complete rows and the rank line clear of the footer.
- Existing installation 495747 automatically rendered v27 at **15:14:00 SAST / 13:14:00 UTC** (938 ms, 31 KB). Manual refresh rendered at **15:15:00 SAST / 13:15:00 UTC** (880 ms, 31 KB). The actual **1872×1404 server image** was inspected: six complete rows, bag label in the divider, narrow ranking, recap beneath the QR and clear footer. This verifies the renderer executes the fitting hook. Capture: `.previews/adaptive-trmnl-server-image.png`.
- Natural tick **218** completed at **13:15:06.044 UTC**, processing one hero with zero quarantines. Hero count, identity, creation and activation were preserved; lifetime XP, level and last tick did not regress. All three published boards are ready with one player; simulation is neither paused nor in maintenance and no deletion jobs are blocked. Verification did not force ticks or alter hero state.
- The bounded post-deployment log sample contains **89 completion records**, from **13:13:59.522416 through 13:15:10.628116 UTC**, with zero errors or retries; both screen requests and their payload reads succeeded.

Explicit delivery of v27 to the physical device and physical-screen readability are not yet observed. The successful server image is ready for its next eligible check-in. No submission, listing edit or marketplace publication was performed. Post-deployment evidence is kept locally for the next source change; a documentation-only push would trigger another deployment.
