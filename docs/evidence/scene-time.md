# Local day/night window (D50)

Deployed on 2026-10-05 following Barry's “deploy it please”, together with D51's tighter log spacing. Signed-in production companion and post-deployment installation rendering are verified. Physical-display acceptance remains unverified.

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

Production release:

- Commit `df3f8f6b9ee7e6dacd3c507ca51b4eeaec22a8ec` passed the existing `main` pipeline. [Workers Builds](https://dash.cloudflare.com/57fa9c5f2bc9dda93a108e887a81b419/workers/services/view/trmnl-games/production/builds/c269a6c6-6e9c-45d0-a0ee-80aa517fef3f) succeeded for production Convex `exciting-cormorant-948` and Worker `trmnl-games`. No migration, catalog activation or progress reset.
- Worker deployment `e8c3db94-5d3e-4bff-b4c4-abb49b281781` at 14:17:41 UTC serves version `37f15b1a-74c1-4ada-8cd6-df043b2ca804` at `trmnlgames.com` with 100% traffic.
- Signed-in companion at approximately 16:18 SAST: the fallback scene and live X full preview both use v4 `office_cubicles/day/rest/prop-campfire` URLs. Screenshot inspection confirms sun/clouds in the window.
- Production day/night ×5 PNGs each return HTTP 200, 760×200 dimensions and the exact bytes of the locally verified artwork. The live cache header is `public, max-age=31536000`. The v3 office scene remains available and byte-identical to the original night composition.
- Installation `495747` refreshed once through its normal UI. Its timeline reports 16:18:36 SAST (14:18:36 UTC): “Rendered — manual refresh · 1109 ms · 24.6 KB”, after deployment. This proves successful authenticated installation/server rendering; its rendered image and physical screen were not visually inspected.
