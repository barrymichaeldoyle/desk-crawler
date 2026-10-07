# HUD polish: XP ticks, attack and defense, a shorter header and a marked leaderboard row — 2026-10-07

Barry liked the v32 hearts and asked for the XP bar to sit up with them and be skinnier to match, for attack and defense to show, for the scene to move up so the stories get more room, and for a better leaderboard without the redundant "3rd of 41 this week" line. Template **v33** (D74) was verified locally and then deployed through the main pipeline (`33917c3`, together with D75). **The live server render and physical readability are unverified.**

## Behavior

The XP bar is gone. XP is ten half-step ticks the width of the hearts (outlined when unearned, half or fully filled when earned), drawn from `xp_pct` with the same floor the hearts use, with `xp/xp_to_next XP` at the end of the row. The wide HUD (full landscape and full portrait) is two rows: hearts, HP count, sword mark and attack, shield mark and defense; then XP ticks, XP count, coin mark and gold, potion mark and potions. Every count is a bare number beside its mark, except on the X full, where Barry's second note asked for the words: there the counts move beside the hero as "23 attack · 9 defense · 640 gold · 4 potions" with the same marks, the two stacked gear slots become one `Weapon … · Armor …` line under the HUD rows (bold names, clamped only when long) and the hero title uses the regular size, so both header columns are three rows. Narrow columns (side, half, half portrait, side portrait) keep the hearts alone on their row, then an HP/attack/defense row and a gold/potion row; their XP ticks stay X-only except in the portrait side column, as the bar was before. The quarter layout shows the hearts only, as before.

`attack` and `defense` are new payload fields: the level base plus the equipped weapon's attack or armor's defense, the same `deriveStats` the companion HUD shows. The Convex payload reads the bonuses from the equipped items it already loads; the preview scenarios carry `weaponAttack`/`armorDefense` bonuses.

The full landscape header drops from three rows (hearts, XP label, XP bar) to two, so the scene, the divider and the stories move up: the OG scene starts at y = 61 instead of 94, and the OG full fits four stories instead of three with the ordinary fixture and its recap. On the X the scene starts at y = 163 instead of 280 and the full fits six stories instead of five.

The leaderboard no longer repeats the rank. The period and group caption ("This week · Levels 4-7"; "Lv 4-7" on the OG) sits in the divider row beside "Your bag" in the full landscape and heads the panel in the full portrait. The panel is rows only: the hero's own row is inverted (the row element is the label, so its text stays white on black), and when the hero sits below the rows a device shows (three on the OG, five on the X) the own row is appended after the list from `rank`, `owner_name` and `leaderboard_score`. "Ranking within the hour" and "Not ranked while paused" stay for a null rank, with no row marked. The full landscape divider is drawn at its seven-column width so the OG keeps whole pixels.

No layout uses an inline style any more; the framework progress bar's fill width was the only one.

Each story's glyph sits two framework pixels lower (`pt--0.5`, scaled on the X), so it centres on the letters instead of hugging the rule above the entry: on the OG the newest glyph's centre is now 4 pixels below the line-box centre (was 2) and the older ones 1 (was −1); on the X, 3 and 1 (were −1 and −3).

Two pre-existing quarter defects were fixed on the way: a long hero name without spaces pushed the hearts past the panel edge in the committed v32 (the inner heart strip ended at x = 408 on a 395-pixel panel), because the name could not shrink and the hearts row could. HUD rows no longer shrink and the quarter name shrinks and clamps instead.

## Local verification

- Typechecks and **293 tests / 43 files** pass. New template tests cover the tick rounding (3 full ticks at 32%, 7 full and a half at 75%, all empty at 0%, all full at 100%), the X-only ticks in the half and quarter columns, the sword/shield marks after the HP count and the coin/potion marks after the XP count, the worded X row and the one-line gear slot, the narrow combat and resource rows, the inverted own row in position 3 with no ordinal or "of 141" text, the appended own row for ranks 4 (OG only) and 12 (both devices), and the unranked and dormant texts. The payload tests cover the derived stats (10/4 at level 1 with no gear, 23/9 at level 5 with +5/+2 gear, null when unlinked).
- Official TRMNL markup lint passes. **276 renders identical** in liquidjs and Ruby Liquid (trmnlp).
- **1,152 settled previews** in two sweeps on the pinned framework 3.4.0 with a headless Chromium at each device's layout box: 384 without the recap (16 states × four layouts × OG/X/BWRY × landscape/portrait) and 768 with it (32 states). No element outside its view or past the title bar, no broken image, no unclamped text overflow, every story list fitted completely, every heart row and XP tick row holding ten marks on one line, every own row white on black, and no counter row wrapping (the worded X full row included). The committed v32 template was rendered through the same pipeline for the ordinary fixture to measure the gains below.

Fitted story counts for the ordinary fixture with its recap (not guaranteed row counts), v32 → v33:

| Device | Full | Half | Side | Quarter |
| --- | ---: | ---: | ---: | ---: |
| OG | 3 → 4 | 2 | 4 | 2 |
| X | 5 → 6 | 6 | 6 → 5 | 4 |
| OG portrait | 6 | 3 | 5 | 1 |
| X portrait | 6 | 5 → 4 | 6 | 4 |

Without the recap: OG 4 / 2 / 4 / 2, X 6 / 6 / 5 / 4, OG portrait 6 / 3 (v32: 4) / 6 / 2, X portrait 6 / 5 / 6 / 5. The X side, the X portrait half and the OG portrait half each give one story to the new attack/defense row in their narrow hero column, where the five counts need two rows. The OG full scene top moves from 94 to 61 pixels, the X full scene top from 280 to 163, and the OG portrait full scene top from 155 to 111.

Captures: [OG full](layouts/v33-og-full.png), [OG full with the own row appended](layouts/v33-og-full-rank-outside.png), [OG side](layouts/v33-og-side.png), [OG portrait full](layouts/v33-og-portrait-full.png), [X full](layouts/v33-x-full.png). [Sanitized results](hud-polish-results.json) keep counts and bounds only.

## Rollout state

Barry approved deployment. `de19580` passed lint but its Workers build failed; Cloudflare's build log API refused the local token, and the web build, typecheck and tests passed locally. The D75 push `33917c3`, with identical web and template code, passed lint and the Workers build, so production carries v33. The live server render and the physical check on the X are still to be done.
