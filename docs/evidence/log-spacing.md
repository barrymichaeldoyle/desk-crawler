# Compact event spacing (D51)

Deployed on 2026-10-05 following Barry's “deploy it please”, together with D50's local day/night window. Signed-in production companion, live TRMNL preview and post-deployment installation rendering are verified. Physical-display acceptance remains unverified.

The companion formerly reserved a 72px column for the time beside the story. The narrative now uses a 16px icon column plus an 8px gap, recovering 56px for text. Its second row starts the time beneath the icon, with changes 12px after the intrinsic time width. Browser-local AM/PM and 24-hour times stay on one line without widening the story gutter. Stat changes can wrap independently.

Templates v24 remove the fixed `w--10 lg:w--20` story gutter. The icon and framework `gap--xsmall` determine spacing. The time/change row uses intrinsic widths; a missing offset omits the timestamp element entirely. Existing entry rules, grouped names, clamping, gear alignment and story counts remain. No payload/schema, stored history or gameplay changes are introduced by D51.

Verification:

- `pnpm check`: all workspace/core typechecks and 169 tests in 27 files pass. Existing React/Liquid presentation checks reflect the separate row containers and absent empty timestamp element.
- `pnpm build`: client and Worker builds pass, with the existing unrelated TanStack `inputValidator` warnings.
- Real `LogStory` fixture rendered with freshly built CSS and inspected at 390px and 1024px. Computed icon-to-description gap is 8px; time-to-changes gap is 12px. The phone has no horizontal overflow, its AM/PM times stay on one line, and ordinary marked names stay grouped. Intentionally oversized names wrap between words.
- All eight ordinary OG/X layout screenshots inspected using the current v24 templates. Measured icon-to-story gaps are 5px on the OG and 9px in the framework's scaled X viewport. Long-story OG side and X full screenshots also inspected; metadata and rank remain above the footer.
- Visible text bounds across all 120 cache-busted local pages (15 states × four layouts × OG/X) found no text crossing the footer.
- Impeccable layout scans report no deterministic findings before or after the change. `git diff --check` passes.

Ignored artifacts: `.previews/generate-log-layout.ts`, `.previews/companion-log.html`, `.previews/log-spacing-check.log`, `.previews/log-spacing-build.log`, `.previews/log-spacing-server.log` and generated device HTML. These are labeled synthetic local fixtures, not production or hardware acceptance evidence.

Production release:

- Commit `df3f8f6b9ee7e6dacd3c507ca51b4eeaec22a8ec` passed [Workers Builds](https://dash.cloudflare.com/57fa9c5f2bc9dda93a108e887a81b419/workers/services/view/trmnl-games/production/builds/c269a6c6-6e9c-45d0-a0ee-80aa517fef3f), deploying production Convex and the companion. Worker version `37f15b1a-74c1-4ada-8cd6-df043b2ca804` receives 100% traffic from the 14:17:41 UTC deployment.
- Signed-in production DOM confirms an 8px icon/story gap and 12px time/change gap. Desktop screenshot inspection shows the compact rows, separate amounts, grouped marked names and separators.
- The live X full preview uses v24 markup without the fixed timestamp-width gutter. Screenshot inspection confirms the compact story rows and time/change lines.
- Installation `495747` reports a successful manual render at 16:18:36 SAST (14:18:36 UTC), 1109ms and 24.6KB. This is server-render evidence; its rendered image and physical display were not visually inspected.
