# Log layout and name wrapping (D49)

Prepared locally on 2026-10-05. This follows the deployed D48 presentation release; no deployment or external plugin update was performed for D49.

The companion places the event icon beside the story and its browser-local time underneath the icon, with XP/gold/HP changes alongside the time. Each individual entry gets a subtle bottom rule, including entries from the same tick. Time stays on one line in the browser's existing format. Nonzero changes remain displayed once and zero-change entries retain their time.

Marked names use atomic inline spans, so ordinary monster, area and gear names move together to the next line. Names wider than the column can wrap between words; companion names override the general emergency mid-word wrapping. TRMNL uses the framework's `inline-block` utility for rich names. Its existing OG clamping flattens markup and can truncate names with an ellipsis; that limitation remains explicit.

Templates v23 use an icon/story row followed by an owner-local HH:MM/change row, with framework separators between visible entries. The X full layout centers each weapon/armor label and value. The OG displays the newest event; X full/half-horizontal/half-vertical display at most three/two/four events. These lower counts replace v22's four/three/six so metadata and rank remain above the footer. Quadrant retains attention-message priority. Payload fields and stored history are unchanged.

Verification:

- Signed-in deployed D48 companion inspected as the incumbent layout before editing.
- Companion fixture uses the real `LogStory`, built CSS and labeled synthetic data. Phone 390px and desktop 1024px screenshots inspected. Phone has no horizontal overflow; all ordinary marked names occupy one line and a deliberately oversized name wraps between words. Browser-local AM/PM time stays on one line.
- All eight ordinary OG/X layout screenshots inspected. Bounds checks across all 104 fixture pages (13 states × four layouts × two models) found no visible text crossing the footer, including long-story, attention and celebration states. Cache-busted navigation ensures these checks use the revised templates.
- Existing React/Liquid presentation tests updated to cover the metadata row, names, escaping and unclamped changes.
- `pnpm check`: all package/core typechecks and 165 tests across 26 files passed. `pnpm build`: client and Worker builds passed; existing TanStack `inputValidator` deprecation warnings are unrelated.
- Long-story OG side and X full screenshots inspected after the final row limits, with names and HP changes readable above the footer. `git diff --check` passed.

Ignored local artifacts: `.previews/companion-log.html`, `.previews/generate-log-layout.ts`, `.previews/log-layout-check.log`, `.previews/log-layout-build.log` and the generated TRMNL pages. Local screenshots/geometry are not a live installation or physical-display check; that deployment gate remains open for v23.

Deployment attempt on 2026-10-05: commit `6bea7f2713e2aa4ed460411c04e62d411e219e9e` failed in [Workers Builds](https://dash.cloudflare.com/57fa9c5f2bc9dda93a108e887a81b419/workers/services/view/trmnl-games/production/builds/942bb6f1-14b8-4f9f-8dec-9286a2a55a79), before Convex or Worker deployment. Typechecks and 164 tests passed; the existing v2/v3 differential simulation test exceeded its default 5,000ms timeout at 5,084ms on the CI runner. Its 48,000 simulations and assertions are unchanged; that one test now has a 15,000ms timeout. Local `pnpm check` passes all 165 tests after the correction. No production progress was reset or content activated.
