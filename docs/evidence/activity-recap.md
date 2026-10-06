# Twelve-hour device recap — 2026-10-06

Barry approved D54's rolling recap and then requested less space between the full-screen HP/XP bars and Weapon/Armor labels. Template **v25** was deployed with Barry's explicit approval on 2026-10-06 from commit `a7116c761da482d87dd305011c7360baa7928974`. The production rollout, live installation render and next natural tick are verified below. A subsequent [log-spacing candidate](log-density.md) is local v26 and has not been deployed.

The recap reads `(now − 12 hours, now]` independently of the ten newest stories. It counts adventure XP, gross gold grants, victories, gear/potion finds and breaks, with historical milestones for levels, known rare finds, knockouts/revivals, arrivals, elites, jackpots and bag overflow. Companion commands do not inflate adventure rewards. X full/side retain two recent stories; other views retain one. Compact views prioritize a milestone or progress fact. Attention messages take priority over the recap. Refreshing never acknowledges a visit or changes gameplay; D25's companion return summary remains separate.

The existing owner/time index bounds the additional read to **201 rows**, aggregating 200 and marking a capped window as partial. No global scan, new aggregation table or backfill is introduced. The transactional adapter stores optional combat `gearRarity` from the awarded item; older combat rarity remains unknown. Simulator output, random draws, numerical tuning and player progress are unchanged.

## Automated verification

- `pnpm check`: all workspace/core typechecks and **202 tests in 31 files** passed (latest run started 10:43:38 SAST).
- `pnpm lint:trmnl`: official framework checks passed for all four templates.
- `pnpm build`: companion/Worker build passed.
- New recap tests cover real outcome totals, gross potion finds despite automatic use, full-pouch fallback, command exclusion, boundaries/future rows, milestones, unknown historical combat rarity, empty/partial windows, owner isolation, pending/anonymous denial and repeated-query no-write snapshots. The tick integration proves the stored rarity matches the actual awarded item without changing simulator rewards.

## Browser layout evidence

The local preview renders the real payload/templates through Liquid using pinned **TRMNL framework 3.4.0** CSS, fonts and runtime. The review harness waits for `document.fonts.ready`, `TRMNL_PLUGINS_READY === true` and two animation frames before measuring. This is local browser evidence; it does not substitute for TRMNL server rendering or a physical display.

**25 states × four layouts × OG/X = 200 checks**, with zero visible story/stat/image elements below the footer and zero failed visible images. Cases include ordinary/long text, overnight activity, milestones, coffee at full HP, empty and capped windows, held finds, knockout/revival, arrivals, stale/service states, setup and first-run screens. The final full-screen spacing/name change was rechecked across all 25 states on both devices. Portrait, alternate themes and text scales are outside this pass; apply D43's coverage decision without treating unsupported settings as passed.

Representative paired OG/X screenshots were visually inspected for overnight activity in all four layouts, long text in full/side, full-bag attention, coffee `No effect`, and recorded history. Local images and the full raw matrix are under ignored `.previews/`; regenerate with:

```sh
pnpm tsx tools/trmnl/preview.ts https://exciting-cormorant-948.convex.site --recap
python3 tools/trmnl/recap-review.py
python3 -m http.server 8765 --bind 127.0.0.1 --directory .previews
```

The recorded-history fixture additionally used a private, identifier-free read-only capture of 48 production outcomes. Its aggregate was **83 XP, 53 gold earned, 13 victories, three gear finds, four potion finds and 17 breaks**. Timestamps were shifted into the fixed preview clock and hero stats remained fictional; the screenshot is not a current production hero snapshot. The capture was never written to a deployment or committed.

Full-screen X now uses separate two-column grids for bars and gear. Horizontal separation stays the same; the measured bar-to-gear gap decreased from **36 to 12.6 pixels**, lifting the normal scene/logs by **23.4 pixels** in the 1872 × 1404 preview. Long hero names retain the level with a responsive two-line clamp. OG's scene position stayed at 70.5 pixels.

## Size and remaining live evidence

The largest canonical preview payload was **4,935 bytes**, below the 8 KiB target. The largest encoded Third Party envelope, including all four templates and synthetic keepsake/offset fields, was **61,440 bytes**. Template JSON alone is **56,435 bytes**, compared with **56,837 bytes** for production v24. The proposed 40 KiB envelope target was already exceeded by v24 and remains unmet; this pass does not certify a new platform limit. The [capacity report](capacity.md) predates the extra activity-window read, so its cost measurements do not certify this candidate's additional read cost.

Sanitized counts, sizes, spacing and individual layout outcomes are recorded in [results](activity-recap-results.json). No email, publication or listing action was performed.

## Approved production release

- Existing [Workers Build `742546b2`](https://dash.cloudflare.com/57fa9c5f2bc9dda93a108e887a81b419/workers/services/view/trmnl-games/production/builds/742546b2-2562-4c88-b4e8-8dfad10659da) succeeded for `a7116c7`, using `pnpm build:deploy` and `pnpm deploy:web`.
- Targets: production Convex `exciting-cormorant-948` and Worker `trmnl-games` at `trmnlgames.com`. Worker deployment `e1bc34d4-3548-4ea1-aa02-271110a28659` serves 100% on version `9ebcfdfa-3217-4c29-8568-ddb4633d2638`, deployed **09:06:43.676147 UTC**.
- The signed-in companion's full/side preview contains the recap and deployed tighter gear grid. The full OG/X preview was visually inspected with actual current history: **94 XP, 57 gold earned, 15 victories, three gear finds, four potion finds and 15 breaks**. Both full views had no footer overflow or failed images; the X's bar-to-gear gap remained 12.6 pixels.
- The existing TRMNL installation rendered on manual refresh at **11:07:46 SAST** (09:07:46 UTC), **862 ms / 26.8 KB**, and delivered that image at **11:13:33 SAST**. Its actual 1872 × 1404 server-rendered image was opened from the dashboard thumbnail and visually inspected: recap, two stories, stats, gear and footer are readable. This establishes server rendering/delivery, not physical-display observation.
- Natural tick **202** completed at **09:15:06.046 UTC**, processing one hero with zero quarantines and pagination version 1. The world is unpaused, outside maintenance and has no active run; all three published boards remain ready with population one. Hero identity, creation time and activation are unchanged, with no level/lifetime-XP/tick regression. No progress reset or manual advancement occurred. The optional combat-rarity award is covered by the deterministic transaction test; this tick is not claimed as a forced gear-drop verification.
- A bounded post-deployment sample of **52 completion records, 09:07:01–09:09:04 UTC**, contained zero errors and zero retries. The live noncached installation query took **46.02 ms**, read **51,358 bytes / 78 documents**, wrote zero bytes and returned **4,643 bytes**. These one-hero observations extend [capacity evidence](capacity.md), without certifying launch-scale cost.
