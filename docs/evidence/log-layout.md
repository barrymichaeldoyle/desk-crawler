# Log layout and name wrapping (D49)

Deployed on 2026-10-05 following Barry's “please deploy it”. This follows the deployed D48 presentation release. Signed-in production companion and live TRMNL preview verified; the installation's post-deployment server render is recorded below. Physical-display acceptance remains unverified.

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

Ignored local artifacts: `.previews/companion-log.html`, `.previews/generate-log-layout.ts`, `.previews/log-layout-check.log`, `.previews/log-layout-build.log` and the generated TRMNL pages. Local screenshots/geometry do not replace installation rendering or physical-display acceptance.

Deployment attempt on 2026-10-05: commit `6bea7f2713e2aa4ed460411c04e62d411e219e9e` failed in [Workers Builds](https://dash.cloudflare.com/57fa9c5f2bc9dda93a108e887a81b419/workers/services/view/trmnl-games/production/builds/942bb6f1-14b8-4f9f-8dec-9286a2a55a79), before Convex or Worker deployment. Typechecks and 164 tests passed; the existing v2/v3 differential simulation test exceeded its default 5,000ms timeout at 5,084ms on the CI runner. Its 48,000 simulations and assertions are unchanged; that one test now has a 15,000ms timeout. Local `pnpm check` passes all 165 tests after the correction. No production progress was reset or content activated.

Production release:

- Commit `382bc45004f40f300b98c29bb7ee23b5d6b3b7e6`, containing the D49 changes and timeout correction, passed the existing `main` pipeline. [Workers Builds](https://dash.cloudflare.com/57fa9c5f2bc9dda93a108e887a81b419/workers/services/view/trmnl-games/production/builds/42894732-0f75-4ad0-848c-a86e399f55c8) succeeded; its logs confirm deployment to production Convex `exciting-cormorant-948`, followed by the companion Worker. No migration, content activation or progress reset.
- Worker deployment `b55a181e-815e-4c76-9beb-d92887539641` at 13:39:38 UTC serves version `5529a911-12a9-46c3-a881-d5c4da1145d9` at `trmnlgames.com` with 100% traffic.
- Signed-in companion screenshots show icons beside stories, times below icons, XP/gold/HP changes beside times and a thin rule between entries. Production DOM confirms `inline-block` marked names with normal word wrapping and 1px entry borders. The expense-claim and battle amounts remain separate from their stories.
- The live owner TRMNL X full preview shows three separated log rows with the new time/change placement and centered weapon/armor labels and values. Its rendered markup contains the v23 grouped-name utility. This verifies the production preview, not the physical screen.
- Installation `495747` was refreshed once through its normal UI. Its timeline reports 15:42:48 SAST (13:42:48 UTC): “Rendered — manual refresh · 731 ms · 24.5 KB”, after deployment. This confirms authenticated installation/server rendering; its rendered image and physical screen were not visually inspected.
