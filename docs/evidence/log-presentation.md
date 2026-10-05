# Separate story and stat changes (D48)

Deployed on 2026-10-05 following Barry's “deploy please”. Signed-in production companion and live TRMNL preview verified; installation server-render results are recorded below. Physical-display acceptance remains unverified; local browser previews do not close that gate.

The companion and TRMNL templates v22 use one presentation mapper. Narrative omits numeric XP/gold/HP changes, and a separate row shows nonzero earned XP, net gold and net HP. HP includes automatic potion and level-up healing. Level numbers, unlocks, marked names and bag-full/potion consequences remain in the story. Existing simulator summaries/catalogs are unchanged. Additive payload fields `n`/`d` carry story/stats; `s` remains for older consumers, and v22 templates fall back to it when needed.

Manual potion/sale commands now record actual deltas. The two known older command forms with zero stored deltas recover the displayed applied amount from their sentence. No database backfill, simulation-version change or content activation is needed.

Validation:

- `pnpm check`: all workspace/core typechecks and 165 tests across 26 files passed.
- `pnpm build`: client and Worker builds passed. Existing TanStack `inputValidator` deprecation warnings remain unrelated to this change.
- Coverage includes every narrative string in catalogs v1–v4, embedded gold amounts, death/retreat penalties, net-positive/negative/zero HP, marked names, milestones, legacy commands, manual command receipt retries, companion static rendering, additive payload fields, all four Liquid layouts, narrative clamping and older-payload fallback.
- `pnpm tsx tools/trmnl/preview.ts`: 104 local pages (13 states × four layouts × OG/X), including the expense-claim example. Refreshed browser geometry checks found no visible story/stat elements crossing the footer or view bounds. Read normal-state screenshots for every layout/model and confirmed long-text OG layouts plus normal/long-text X full screens after row-count adjustments.
- Companion story components rendered with the built CSS at 390px and 1024px, preserving separate story/stat rows. This was a fixture render, not a signed-in live mutation test.
- Impeccable's detector reported no deterministic issues in the changed companion files; `git diff --check` passed.

Local ignored artifacts: `.previews/log-ux-check.log`, `.previews/log-ux-build.log`, `.previews/log-ux-*.jpg` and the generated layout/companion HTML. The largest deliberately long preview story exceeds the simulator's usual summary budget and still leaves the newest stats visible.

Layout tradeoff: X full/half-horizontal/half-vertical now show at most four/three/six stories. OG hides the secondary entry when attention, long newest copy or its own stats row would crowd the footer. Numerical changes sit outside narrative clamping. Quadrant retains its existing attention-message priority.

Production release:

- Commit `3d6d93c780ac5a7ee10bc1fb16d075eea2d44e83`, released through the existing `main` pipeline. [Workers Builds](https://dash.cloudflare.com/57fa9c5f2bc9dda93a108e887a81b419/workers/services/view/trmnl-games/production/builds/9d8d7998-c76d-4429-a278-3d473314711f) succeeded, deploying production Convex `exciting-cormorant-948` and the companion Worker. No migration, content activation or progress reset.
- Worker deployment `42a1b49b-b7b7-45f5-b161-e6a60aae62e3` at 11:53:38 UTC serves version `d696afc2-cf0d-4f02-ab5e-342f2a77e169` at `trmnlgames.com` with 100% traffic.
- Signed-in Baz companion: the historical expense claim reads “An old expense claim finally paid out.” with one `+2 gold` entry. Fight logs show the story followed by XP/gold/HP changes; rest/trap and legacy potion/sale entries show separate changes too.
- The live owner TRMNL X full preview shows separate changes, including `+8 XP · +2 gold · −7 HP` for the 13:30 fight, without those amounts in the story. This verifies production payload presentation, not physical display acceptance.
- Installation `495747` was refreshed once through its normal TRMNL UI. Its timeline reports 13:57:56 SAST (11:57:56 UTC): “Rendered — manual refresh · 821 ms · 26.4 KB”, after the production deployment. This confirms successful authenticated installation/server rendering. The rendered image and physical screen were not visually inspected.
