# Recap icons, period hours and the bag count — 2026-10-07

Barry asked whether the morning stand-up line could carry icons. He also noted that the line did not say which hours the stand-up covered, and suggested a bag count such as "bag 4/12" in the hero section's top right corner. D83 and template v35 implement all three.

## Behavior

- The recap row reads `Morning stand-up 19:00-07:00` (or `Sprint retro 07:00-19:00`), followed by each fact behind its mark. The order is levels, arrivals, rare finds, elites, jackpots, a full bag, knockouts and revivals, then XP (a new star mark), gold, wins, gear finds, potions and breaks. The name and the hours are separate pieces that never break internally, so a narrow column wraps between them and never inside "19:00-07:00".
- Line caps: one row for the bottom ribbon, two in the quarter views, three in the side and portrait columns. Before the stories are fitted, the fitter hides the trailing (least notable) facts that would exceed the cap and always keeps the first fact.
- The payload adds `recap.span` and `recap.items` (`{ k, t }`). `activity`, `gains`, `highlights` and `compact` are unchanged.
- `bag_used/bag_capacity` (already in the payload) shows with a new bag mark at the right end of the hearts row in the wide HUD, the X full included, and after gold and potions in the narrow columns. Unlinked payloads show nothing.

## Local verification

- Typechecks pass and **331 tests** pass. They cover the span for both periods, item order and text, the quiet and partial fallbacks, escaping of item text, one mark per item except `none`, the bag mark on the hearts row and its absence when unlinked.
- The official TRMNL markup lint passes, and 292 renders are identical in liquidjs and Ruby Liquid.
- **1,752 settled previews** (876 plain states and 876 recap states: OG/X/BWRY × four layouts × both orientations) pass the headless sweep. No element sits outside its view or past the title bar, there is no unclamped text overflow, every story list fits completely, and every recap row fits its line cap. The sweep now also fails when the hearts row wraps, which caught the first placements of the bag count: it wrapped on the OG full under gold and potions and on the X full in the worded row. The final placement was re-swept on all 438 full-layout previews.
- Cost: quarter views show one story fewer where the recap takes its extra row (for example OG 2 → 1, X 4 → 3). The OG quarter views with a choice or merchant notice already showed no stories before this change.

[Results](recap-icons-results.json) record per-preview story counts and recap fits, with no story text or player identifiers.

## Rollout state

Pushed as `8a84b23`; lint and the Workers build passed (18:06 UTC), so production serves template v35. Live server render and physical readability are unverified.
