# Compact device log rows — 2026-10-06

Barry requested less vertical space between each log description and its stats, to fit more useful history. Template **v26** deployed on 2026-10-06 with Barry’s explicit approval, from commit `93b18c7bb02a503b4bbf6f95f18818fba04b09ae`. The live companion previews and existing-installation server image are verified.

Each story now uses a one-column framework grid with zero explicit row gap. A separate visibility wrapper keeps extra entries X-only, avoiding the responsive display utility resetting grid columns/gaps. Full-layout spacing between entries also decreases. On the ordinary X full preview, description-to-stats spacing decreased from **14.05 to 5.05 pixels** for the newest story; older-story leading remains about **1.45 pixels**. OG's explicit gap drops from five pixels to zero. Font sizes, named narrative formatting and unclamped X descriptions are retained.

X full/side now show **three recent stories** below the rolling twelve-hour recap. OG, half-horizontal and quadrant keep one. A four-story full view overflowed the long-description fixture, so three is the verified limit for this design. Critical attention still suppresses the recap and older stories. Numeric changes, potion-find receipts and `No effect` remain visible in their own row. The companion's history and gameplay are unchanged.

Verification:

- `pnpm check`: all typechecks and **202 tests / 31 files** passed (11:15:15 SAST).
- Official `pnpm lint:trmnl` and `pnpm build` passed.
- **25 states × four layouts × OG/X = 200 settled browser checks**, with zero footer overflows and zero failed visible images. The harness waits for fonts, the framework readiness flag and two animation frames; read-only metrics now include story/stat gaps.
- Paired full ordinary/long-text, side long-text and quadrant full-health coffee screenshots were visually inspected. Local files are `.previews/density-normal-markup.png`, `.previews/density-longText-markup.png`, `.previews/density-longText-markup_half_vertical.png` and `.previews/density-quietMorning-markup_quadrant.png`.

The [sanitized results](log-density-results.json) record the matrix, spacing and production verification. The separately approved [v25 recap release](activity-recap.md) retains its historical render/delivery evidence.

## Approved production rollout

- Workers Build `add49097-c1f9-4599-8b74-4bc3306004f7` completed successfully for the exact commit above. Targets are production Convex `exciting-cormorant-948` and Worker `trmnl-games` at `trmnlgames.com`.
- Worker deployment `ec499609-bbc2-4259-8bc4-bf3f926399f9`, version `d4ec7180-548c-4950-9978-20ed8a76b210`, serves 100% of traffic, deployed **09:29:33.129089 UTC**.
- Signed-in live X full and side previews both contain the zero-gap story grids and **three recent stories**. The preview was restored to X full after inspection.
- The original installation rendered at **11:30:56 SAST / 09:30:56 UTC**, taking **970 ms**, **27.7 KB**. Its actual **1872×1404** server image was visually inspected: recap, three stories, changes, gear, rank, QR and footer remain readable. Local capture: `.previews/density-trmnl-server-image.png`.
- The device checked in at **11:31:04 SAST**, with content returned and its next screen refresh scheduled for **11:45:57**. The observed timeline does not yet explicitly record delivery of this 27.7 KB image; physical-display acceptance is unobserved.
- Natural tick **203** completed at **09:30:06.070 UTC**, processing one hero with zero quarantines. Hero identity/creation and progress were preserved; all three leaderboard generations are ready with population one.
- A bounded sample of **89 completion records**, **09:30:06.066263–09:31:15.012362 UTC**, contains zero errors and zero retries, including one installation payload query. These observations verify this release without claiming launch-scale capacity.
