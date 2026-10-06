# Achievement evidence (D65)

Local run on 2026-10-06, `pnpm balance --heroes 200 --days 30`, content v1, simulation v1. Shares are the percentage of each cohort's heroes holding the achievement at the end of the day; the harness applies no keepsakes, so that family stays at zero.

## Tests

- `tests/sim/achievements.test.ts`: catalog integrity (131 ids, unique, catalog-backed), shared monster ladder, rarity bands, threshold crossing, fast path over many small steps equals one full pass, set pieces, level/bag/keepsake predicates, family progress, and the nine simulator counters.
- `tests/convex/achievements.test.ts`: unlock on the crossing tick with its log after the event and the device celebration; retroactive full pass for a hero behind the catalog; unlock written once under repeated evaluation; publication tally equals a direct count with pending heroes excluded and dormant heroes included; `achievements.mine` shape; sale and potion intents; game deletion purge.
- `tests/sim/screen.test.ts`: the longest name, "Achievement: Nine Lives (Expired)", as a badge on full and both half layouts, and the achievement glyph on all four.
- Suite: 41 files, 275 tests passing.

## Harness unlock shares at day 30

| Cohort | Office Cubicles monster tiers I–V (paper_imp) | Cafeteria tiers (coffee_slime) | Bands common / uncommon / rare / legendary |
| --- | --- | --- | --- |
| Daily | 100 / 100 / 94.5 / 0 / 0 | 100 / 100 / 100 / 100 / 0 | 77 / 4 / 2 / 48 |
| Three-day | 100 / 100 / 99.5 / 4.5 / 0 | 100 / 100 / 100 / 86.5 / 0 | 76 / 3 / 6 / 46 |
| Seven-day | 100 / 100 / 96.5 / 1 / 0 | 93 / 72.5 / 15.5 / 0 / 0 | 60 / 5 / 10 / 56 |
| Unattended | 100 / 98.5 / 19.5 / 0 / 0 | 0 | 17 / 8 / 4 / 102 |
| Safe-farming three-day | 100 / 100 / 100 / 100 / 0 | 0 | 40 / 2 / 1 / 88 |

Gate check: tier V of an Office Cubicles monster is held by nobody at day 30 (Legendary) in every cohort; tier IV is Rare for managed heroes who move up (0–6.5%) and only Common for heroes who deliberately stay on that floor. Tier IV of a Cafeteria monster is Common for daily managers by day 30, which is the intended shape: the top floor is where an engaged hero lives, and tier V (500) there is roughly 45 further days.

Day 1 and day 7 snapshots are in the JSON report (`achievements.day1`, `achievements.day7`): at day 1 every cohort holds First Day, Shredder Duty and its three cubicle siblings, with 112 of 131 ids still Legendary.
