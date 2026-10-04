---
version: 1
slug: "apps-web-src-routes-app-desk-crawler-index-tsx"
primary_target: "apps/web/src/routes/app/desk-crawler/index.tsx"
related_targets: ["apps/web/src/routes/app/desk-crawler.tsx"]
---

# Desk Crawler companion: hero page

Mode: Operate. The owner returns every few days on a phone (sometimes desktop) to see what their hero did, glance at what their TRMNL is showing, and make the occasional decision (travel, potion, pause, open bag). Calm, never nagging (PRODUCT.md calmness rules); no streaks or urgency copy.

Content: live device payload (same `buildPayload` + Liquid templates as the TRMNL plugin), return summary since last visit, next 15-minute tick, travel/revive ETAs, lifetime counters and XP, seven-day rank in level group, encounter log (three days kept), biomes with unlocks.

States: pending/paused/sleeping (bag full)/dead/travelling/quarantined; empty log; unranked hero; stale world (scheduler delay); preview unavailable.

## Direction contract

THESIS: The TRMNL screen is the anchor and the page is its logbook. Refuses the stacked-card dashboard where every fact gets an equal white box.

OWN-WORLD: 1-bit e-ink. Stone-50 paper ground, stone-900 ink, one grey (stone-300) for rules and dither; no accent colour. Pixel art at integer scale with `image-rendering: pixelated`. A drawn device bezel (thick ink frame, rounded corners). Ledger rows separated by hairline rules, tabular numerals, small-caps labels. Controls are ink-filled or ink-outlined rectangles, never soft pastel chips.

STORY: Understand at a glance what the desk shows and how far the hero got since last visit; believe progress is steady without them; optionally act (travel, potion, pause, bag) and leave.

FIRST VIEWPORT: Phone: device preview full width under the game nav, layout tabs (Full, Half, Quadrant) beneath the bezel, then a single ink strip: status sentence and "Next adventure in 7 min". The since-you-left ledger starts above the fold. Desktop ≥1024px: device pinned in a left column (sticky); right column scrolls ledger, actions, log, records.

FORM: Desk and feed, position 6 of 7 on the ordered list, seed key bea3cdb8.

Signature interaction: layout tabs swap the device preview between the four TRMNL layouts in place; the countdown ticks each second and, when it reaches zero, the page shows "Adventuring…" until the live query delivers the new tick and the ledger counts up.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
