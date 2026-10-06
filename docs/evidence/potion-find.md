# Potion finds in log changes — 2026-10-05

Barry requested D52 while authorizing the listing update and companion polish deployment. A stored healing-potion find now displays **+1 healing potion** in the same change row as XP, gold and HP, in the companion and device payload. The story remains intact.

`displayLogDeltas` derives optional display-only `potionsFound` from the existing typed loot outcome. Both own-history and device-payload queries use it. Gross acquisition survives same-tick potion consumption even when there is no net stack directive; net HP remains separate. Full-stack gold fallback and ordinary drink commands do not invent a find. No raw outcome detail is exposed, and no schema, simulator, inventory, rewards or historical log writes changed. Existing retained entries need no backfill.

Validation: `pnpm check` passes all package typechecks and 29 files / 181 tests. New cases cover the find/use combination, full-stack fallback, refusing narrative-only inference, HTML change-list placement, all four Liquid templates, and the actual authenticated query/payload adapters while asserting stored deltas remain unchanged. `--potion-finds` in [the preview tool](../../tools/trmnl/preview.ts) generates 24 pages (three cases × four layouts × OG/X) for wrapping/footer review.

All 24 pages passed loaded-image and change-row/footer bounds checks ([results](potion-find-layouts.json)). Eight find-and-use screenshots were inspected across OG/X and all four sizes; the new label remains legible above the footer. The X captures use the full 1872-pixel viewport. Client/Worker build and Wrangler packaging dry run passed.

Production deployment completed from `392829c596206ccefb64a33d2f4ce7cd70ac9bef` through the existing Convex/Worker pipeline. The signed-in production Finds filter now shows **+1 healing potion** on retained 22:00, 21:45, 18:45 and 16:00 entries that lacked the change label before deployment. No backfill was needed. Baz remains level 3 with the existing equipment, potion stack and lifetime progress.

The original TRMNL installation rendered successfully after deployment at 20:21:32 UTC (22:21:32 SAST), manual refresh, 880 ms / 23.9 KB. Its latest story was a coffee break, so this live render establishes the updated payload/render path; potion label coverage on all four device layouts is supplied by the 24 local previews above. Physical potion-screen acceptance is not claimed. Template v24 and scene v4 remain unchanged. See [listing and deployment evidence](listing-polish-deploy.md) for release identity and image verification.
