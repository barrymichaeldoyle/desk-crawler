# The TRMNL player experience

Planning defaults for Month 1. [TRMNL](trmnl.md) owns the wire contract, [gameplay](gameplay.md) owns rules, and [quality](quality.md) owns proof. This document owns the display journey and content priority.

## A useful glance

Within roughly five seconds, a player should understand who their hero is, what the hero is doing, and the latest outcome. This is a design test target, not a measured usability result. The screen should stay pleasant when viewed repeatedly or left untouched for a day.

Priority in every size: connection/service explanation when needed → hero/status → latest story → HP/level → service/delay warnings → optional XP/gold/rank/history. Full screen includes seven-day own-group Top 5/score/personal rank with group/period labels, but the leaderboard must not visually dominate the hero or story.

Use one quiet attention message. Inventory-sleep copy explains bag capacity/retained find and manual Resume without blaming inactivity. Death copy reassures that revival is automatic and XP/equipment are safe. Paused copy says the player paused it. Quarantine/global maintenance copy says the service paused it. A service delay must not hide the hero's death/recovery status.

No flashing, animation, urgency badges, streak pressure or instruction to keep the app open. Optional improvements can be made later; every encounter resolves without checking the screen. Ranks are secondary context rather than a request to compete continuously.

## From marketplace to a first screen

| Stage | What the user sees | Completion means |
| --- | --- | --- |
| Discover | Calm office adventure exclusively for TRMNL, free gameplay, companion account required, one-time Save activation, progress independent of refresh | Listing accurately explains the game |
| Link | Current companion alias/hero, account-switch/restart action, explicit connection confirmation | Clerk-authenticated owner authorizes this installation |
| Save | “Return to TRMNL, name this instance and click Save” | Authenticated success callback or V06-verified recovery confirms a saved instance and activates the prepared hero once |
| Preview | TRMNL playlist/plugin preview; companion shows the same game payload in its own UI | Preview proves generation only when actually observed; companion UI is not a hardware screenshot |
| Display | Hero/story screen at the next eligible wake/playlist slot | Physical display is verified during the live check |
| Return | Configure opens owned connection and controls; separate refresh return action | Intents update web state; TRMNL catches up on its schedule |

Normal onboarding verifies code/owner, prepares the pending hero, then returns to TRMNL Save. Only authenticated saved-instance confirmation activates play. The unlinked screen covers no activated hero and remains privacy-safe, not an invitation to create heroes through polling. Public previews use labeled samples; pending companion previews show starter state without earned encounters or a scheduled-play promise.

A linked grant, saved instance, HTTP response, generated TRMNL preview and physical display are different milestones. Do not turn the first milestone into “Your device is connected and showing your hero.” The companion lists installations; it cannot infer device ownership from an installation count.

## Refresh, sleep and playlists

TRMNL currently anticipates device requests using on-demand refresh; its help page labels the older asynchronous section historical. Device, playlist, plugin and account settings influence new-image eligibility. A mixed playlist can show Desk Crawler less often than the device wakes. Website refresh prepares content; hardware must request it. [Current refresh behavior](https://help.trmnl.com/en/articles/10113695-how-refresh-rates-work)

Offer 15-minute plugin refresh as the fastest supported option. After activation, slower intervals, sleep and disconnection are fine and do not reduce earned progress. Recommend a mashup for keeping a hero visible beside useful desk information; avoid advising a faster device interval to farm encounters.

Sleep Mode stops ordinary device fetches during the chosen period. It is a user's battery preference, independent of hero pause. Do not change device settings automatically. [Sleep Mode](https://help.trmnl.com/en/articles/11129379-sleep-mode)

The help page walks through Save, finding the playlist item, seeing its preview, adding a half/quadrant mashup, refresh settings and sleep. It does not promise quarter-hour alignment, instantaneous delivery or an overnight fetch count. The live test includes slower refresh and multiple playlist items.

## A snapshot that ages honestly

D39 removes date/time and timezone labels from every device layout, including rank sections, with two exceptions: the next-tick time (D42) and log-line times (D44), both HH:MM in TRMNL's timezone. The title bar contains the icon and plugin title. Keep game and board timestamps in the API for diagnostics and companion history; response assembly time never pretends to be gameplay freshness.

Show service/delay messages when needed without a clock or relative “updated just now” label. Revival/travel show remaining logical ticks as of hero evaluation; conversions to minutes are approximate. There is no separate Desk Crawler timezone preference; any future device date/time uses the user's TRMNL timezone.

When the backend is reachable but progression is delayed, return the last valid state with “Updates delayed.” A total backend outage, failed image render, sleeping/offline device or old playlist image cannot acquire new warning text from us. Help explains that an old image can remain on screen without a new warning; use the companion and TRMNL preview/refresh settings to diagnose it. We do not control whether TRMNL keeps an old image or shows its own error; capture actual failure behavior in the live spike.

Disconnect/deletion prevents future authorized payloads. It cannot retract an image already cached by TRMNL or visible on an offline e-ink panel. Explain this in account controls/privacy help and give user-controlled removal/playlist replacement steps. Do not promise remote erasure.

## Story and history

Each newest outcome stands alone: concrete actor/object, result and the useful effect. Avoid references such as “again” or “it escaped” that require an earlier tick. Death, revival, arrival and level gains remain comprehensible without the preceding screen.

Following D54, the device shows a rolling **Last 12 hours** adventure recap, then the newest stories. D56 supersedes fixed row counts: every layout keeps as many complete recent story/stat pairs as its measured height allows. The recap reports recorded XP/gold grants, fights won, gear and potion finds, and grouped breaks. Up to two important historical facts take priority: bag overflow, knockouts/revivals, level gains, rare finds, arrivals, elite victories and jackpots. Current hero/status and attention messages remain authoritative; “Bag filled up” describes a historical event, not necessarily the current bag state.

The fixed window is independent of refresh, installations, device sleep and companion visit acknowledgement. A refresh cannot prove the player looked at the screen. Smaller layouts show a compact milestone/progress line and the latest outcome; an attention message takes the recap's space when needed. The latest story can be older than the recap window: an empty window says **No new adventures**, while retained history remains intact. Device story labels continue using HH:MM under D44.

Clamping must preserve the result. Put consequences early, shorten narrative first, and never clip away the “bag full” notice on overflow or “revives” on death. Author compact summaries if 90 characters cannot fit; do not shrink primary text until unreadable. Structured own-history retains full bounded detail.

The companion retains up to three days of detailed history; beyond that, only persistent hero state/lifetime counters are promised. The D54 device recap reads the existing hero/time index over `(request time − 12 hours, request time]`, takes at most 201 rows, and aggregates the newest 200. Normal twelve-hour play creates at most 48 tick events; unusually heavy command traffic can exceed the cap, so the recap explicitly says **partial**. Commands remain in recent stories but do not count as adventure rewards or fights. A zero-adventure partial sample says **No adventures in sample**. This is a fixed rolling digest, separate from D25's longer companion return summary.

## Display rules

| Layout | Must retain | Simplification order |
| --- | --- | --- |
| Full | Hero/status, newest story, HP/XP, seven-day group Top 5/score/personal rank, group/period and service warnings, a standing bag QR (template v17; an action QR replaces rank and bag QR) | Gear → gold → older logs → decorative sprite size |
| Half horizontal | Hero/status, HP/level, newest story, companion QR and service warnings | Second log → XP/gold → sprite size |
| Half vertical | Hero/status, HP/level, newest story, companion QR and service warnings | Older logs → XP/gold → sprite size |
| Quadrant | Name/level, readable status/HP, companion QR, newest outcome or recovery/setup message and service warnings | Sprite/detail first; no board or second progress bar |

Missing optional text falls back safely; missing required stats never render as zero. HP 0 is real and must survive Liquid default handling. Keep stable positions for hero, status and service messages across normal/recovery states.

Cut lower-priority content before reducing primary text. In full-screen Top 5, rank + one public alias + level is sufficient; both alias and hero name are optional. No permanently empty panels for zero/one-player populations.

Baseline proof is four layouts on OG 1-bit landscape, plus four on TRMNL X (D37). TRMNL X is the physical check device; OG proof comes from TRMNL-rendered screenshots. Record the X's actual resolution/bit depth from the live render. Check inherited dark/theme/text-scale behavior on representative worst cases. Portrait/color/fluid layouts are supported only after their own evidence; listing/help reports the tested matrix. Color must not be required to distinguish HP, XP, danger or rarity.

## Diagnosis without guesswork

| Observation | Next check |
| --- | --- |
| “Waiting for Save” | Return to the validated TRMNL form; save or restart an expired attempt |
| Wrong companion hero/account | Restart with intended Clerk account; never reassign a linked grant |
| Game old in web and device snapshot | Run health/service status |
| Web current, TRMNL preview old | Eligible refresh, connection state and plugin logs |
| Preview current, hardware old | Playlist position/schedule, sleep, connectivity and TRMNL activity logs |
| One mashup slot blank | That size's template and actual render/asset behavior |
| Disconnected/uninstalled | Explicit owned repair/new install; old requests cannot reactivate it |

Optional telemetry is labeled “Last data served to TRMNL.” It proves neither Liquid render nor physical display. Support uses a bounded connection reference, timestamps and layout/model; never installation tokens, authorization headers, codes or management JWTs.

## Approved inventory and public-name amendment

Adventures normally continue between occasional visits. First gear overflow retains one find and sleeps encounters/XP until bag management and explicit next-tick Resume. Neither hardware Sleep Mode nor 24-hour companion inactivity triggers this state. Recent XP ages out while sleeping; published ranks are eligible and can change, and a long sleeper with zero window XP shows as unranked rather than last (D32).

Show taking a break / bag full / find waiting, or Resume scheduled when wake is pending. Keep service quarantine and HP rest separate. Restricted name repair preserves progress; public copied names remain masked on version mismatch until coherent refresh.

D55 (deployed v26): remove the explicit vertical gap inside each story/stat pair and reduce full-layout inter-entry spacing. X full/side retain three recent stories below the recap; OG and compact views keep one. This supersedes v25’s two X full/side stories. Long X narratives, fonts and attention priority remain unchanged; [verification](evidence/log-density.md) covers all 200 previews, the live server image and natural tick 203.

D56 deployed template v27 moves the X full bag caption into the divider above the QR and the recap beneath it, allocating 7/2/3 grid columns to history/rank/bag. All four OG/X layouts fit the longest complete newest-first prefix from the existing ten stories, measuring actual wrapped boxes after framework terminalization and reserving the footer/following rank line. Shorter stories can show more entries; long descriptions retain their complete change row. Attention keeps priority. Barry approved production rollout on October 6; the actual X server image and natural tick 218 passed with progress preserved ([evidence](evidence/adaptive-log-layout.md)).

D57 deployed template v28 supersedes D56’s X full arrangement: 6/4/2 history/ranking/bag columns, a 20% smaller standing X QR (integer scale 4), and one complete full-width recap line above the title bar. Rank fitting reserves context width. OG and compact recap placement stays unchanged; adaptive complete-story fitting remains. All 256 previews pass; Barry approved production rollout on October 6; the actual X server image, eight live-data previews and natural tick 222 passed with progress preserved ([evidence](evidence/recap-ribbon.md)).

D58 local template v29 reserves a QR in every layout, uses compact OG full art/ranking and puts the full/half recap at the bottom. Side OG gives XP/art/rank space to recent history; personal ranking remains in full and the companion. X full keeps its 6/4/2 columns with explicit space beneath the story divider and recap rule. Setup/action QRs replace the standing bag link. Production remains v28 until a separately approved rollout; [local verification](evidence/layout-polish.md).
