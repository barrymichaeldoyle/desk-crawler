# First install-to-display path — D28

Recorded 2026-10-03, Convex dev `superb-bobcat-74`, Barry's TRMNL account (development plugin "Desk Crawler", plugin setting 495493, TRMNL X).

| Step | Evidence |
| --- | --- |
| Real installation | Barry clicked Install in TRMNL; the app captured the code into the encrypted flow cookie, Clerk sign-in, public name and hero name |
| Code exchange + owner link | `trmnl.com/oauth/token` returned a token; hash linked to Barry's account; pending hero "Baz" + starter kit |
| Save → activation | Success webhook (Bearer + `user.uuid`, `plugin_setting_id`) confirmed the instance and activated Baz once (`eligibleFromTick 1`) |
| Scheduled encounters | Cron ticks from 20:58 UTC; tick 1: "Filed a Stapler Mimic under 'defeated'. +6 XP, +3 gold."; ticks 2–5 completed |
| Coherent rank publication | Tick 5 (21:58 UTC slot) published overall, recent_24h and recent_7d atomically; Baz #1 in Levels 1-3 (19 XP) and #1 lifetime |
| Authorized payload | `POST /trmnl/v1/screen` with bearer + UUID returned the four-layout envelope and v1 merge variables |
| Rendered on TRMNL | TRMNL generated 1872×1404 (X) and 800×480 renders of the live payload: scene, story, HP/XP, rank panel, dated freshness |
| Physical display | **Pending:** photo of the TRMNL X showing the current layout after its next check-in |

All four layouts are implemented (minimal → scene-window v7). This milestone proves integration order, not release readiness; see [status](../status.md).
