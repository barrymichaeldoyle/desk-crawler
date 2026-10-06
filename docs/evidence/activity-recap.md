# Twelve-hour device recap — 2026-10-06

Barry approved D54's rolling recap and then requested less space between the full-screen HP/XP bars and Weapon/Armor labels. Template **v25** is locally verified, and Barry explicitly approved its production deployment on 2026-10-06. The rollout and live installation/render checks are now in progress; the last verified production release was **v24** on commit `c8daeaa`.

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

Sanitized counts, sizes, spacing and individual layout outcomes are recorded in [results](activity-recap-results.json). After approval, deploy through the existing production pipeline, verify the existing TRMNL installation renders v25 with recorded history, and confirm a natural tick preserves progress and stores the optional detail correctly. No email, publication or listing action is part of this candidate.
