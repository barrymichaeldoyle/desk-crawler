# Local day/night window (D50)

Prepared locally on 2026-10-05 after Barry reported moon/stars at midday. Not deployed; live installation rendering and physical-display acceptance remain unverified.

Office scene v4 uses hand-authored 1-bit sun/cloud sprites during local 06:00–18:00 and the original moon/stars overnight. Fixed hours are a cosmetic implementation default, not astronomical sunrise/sunset. The companion's existing visible-page minute clock and browser offset select the rendered preview and fallback image. The authenticated TRMNL HTTP envelope selects all four scene URLs from request time and the validated configured offset. Missing/invalid offsets default to daylight. Canonical queries stay timezone-neutral with day URLs. Neither the simulator nor stored hero/user state changes.

Each v4 URL contains the explicit day/night variant, so immutable asset caching cannot conflate the skies. The asset route continues serving frozen v3 URLs as the original night composition, including the static public landing image. D50 changes no template markup or scene dimensions/scales; the later [D51 spacing refinement](log-spacing.md) uses templates v24. Server Room and Cafeteria interiors do not vary by time.

Verification:

- `pnpm check`: package/core typechecks and all 169 tests across 27 files pass. New checks cover boundaries, fractional offsets, date rollover, missing/invalid offset, every scale, frozen v3 routes, and changes confined to the office window pixels.
- An authenticated HTTP integration test exercises daytime, nighttime and unknown-offset requests for a paused hero, fetches every returned image scale and confirms its immutable cache policy. The hero document remains identical before/after those requests.
- `pnpm build`: client and Worker builds pass. Existing TanStack `inputValidator` warnings are unrelated.
- Compared the current night canvas against the previous commit's implementation for all 612 biome/pose/subject compositions: exact pixel equality. Both skies rendered at all four served scales.
- Generated 120 local framework pages (15 states × four layouts × OG/X). In all 16 office day/night/model/layout combinations the correct scene URL loads successfully. Inspected eight cropped browser screenshots covering both skies at ×2/×3/×5/×6; compact daylight clouds/sun and nighttime moon/stars remain legible.
- `git diff --check` passes. No migration, content activation or progress reset is needed.

Ignored artifacts: `.previews/scene-time/`, `.previews/art/`, `.previews/scene-time-check.log`, `.previews/scene-time-build.log`, `.previews/scene-time-layout.log` and generated HTML pages. These are synthetic local previews, not a signed-in production or hardware check. The physical display can retain the previous sky until its next eligible refresh.
