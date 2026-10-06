# Compact device log rows — 2026-10-06

Barry requested less vertical space between each log description and its stats, to fit more useful history. Template **v26** is verified locally, and Barry explicitly approved its production deployment on 2026-10-06. The rollout is in progress; the last verified production template is **v25**.

Each story now uses a one-column framework grid with zero explicit row gap. A separate visibility wrapper keeps extra entries X-only, avoiding the responsive display utility resetting grid columns/gaps. Full-layout spacing between entries also decreases. On the ordinary X full preview, description-to-stats spacing decreased from **14.05 to 5.05 pixels** for the newest story; older-story leading remains about **1.45 pixels**. OG's explicit gap drops from five pixels to zero. Font sizes, named narrative formatting and unclamped X descriptions are retained.

X full/side now show **three recent stories** below the rolling twelve-hour recap. OG, half-horizontal and quadrant keep one. A four-story full view overflowed the long-description fixture, so three is the verified limit for this design. Critical attention still suppresses the recap and older stories. Numeric changes, potion-find receipts and `No effect` remain visible in their own row. The companion's history and gameplay are unchanged.

Verification:

- `pnpm check`: all typechecks and **202 tests / 31 files** passed (11:15:15 SAST).
- Official `pnpm lint:trmnl` and `pnpm build` passed.
- **25 states × four layouts × OG/X = 200 settled browser checks**, with zero footer overflows and zero failed visible images. The harness waits for fonts, the framework readiness flag and two animation frames; read-only metrics now include story/stat gaps.
- Paired full ordinary/long-text, side long-text and quadrant full-health coffee screenshots were visually inspected. Local files are `.previews/density-normal-markup.png`, `.previews/density-longText-markup.png`, `.previews/density-longText-markup_half_vertical.png` and `.previews/density-quietMorning-markup_quadrant.png`.

The [sanitized results](log-density-results.json) record the matrix and spacing. These are local previews; v26's production build and existing-installation server render/delivery remain pending deployment authorization. The separately approved [v25 recap release](activity-recap.md) has already deployed, rendered, delivered and passed its next natural tick.
