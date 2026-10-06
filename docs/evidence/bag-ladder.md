# Bag ladder balance (D61)

Date: 2026-10-06 · Simulation version 1 · Release catalog v1 (D63; identical to the former v5 where this was first measured) · Harness: `pnpm balance --heroes 300 --days 30 --content v1 --json docs/evidence/balance-v1-30-days.json` (deterministic; raw report [balance-v1-30-days.json](balance-v1-30-days.json)).

Visiting cohorts now also buy the next bag whenever they can afford it and the purchase is allowed, after selling spares. The unattended cohort never buys. All other policies are unchanged from the [earlier balance report](balance.md).

## Bag growth

Median day each capacity is first held (p10 / p90):

| Cohort | Tote Bag 10 | Backpack 13 | Messenger 16 | Suitcase 20 | Finds / buys per hero |
| --- | --- | --- | --- | --- | --- |
| Unattended | 0.1 (0.1 / 0.1) | 2.7 (0.3 / >30) | >30 | >30 | 0.46 / 0 |
| Daily | 0.1 | 1.5 (0.3 / 2.0) | 4.1 (3.0 / 5.0) | 9.6 (8.1 / 12.2) | 1.02 / 1.99 |
| Three-day | 0.1 | 2.3 (0.3 / 3.5) | 6.3 (3.5 / 9.1) | 12.0 (9.3 / 12.9) | 1.25 / 1.49 |
| Seven-day | 0.1 | 2.3 (0.3 / 7.5) | 14.0 (3.5 / 21.1) | 21.8 (16.4 / 28.7) | 1.33 / 1.37 |

The guaranteed Tote Bag arrives at a median 0.1 days (about 2.4 hours) for every hero, as intended. Rare finds give about one early bag per hero per month. Purchases are mostly limited by the one-tier-ahead rule rather than by gold: managed heroes spend a median 2,000–2,150 gold on bags by day 30 and still retain 2,000–12,800.

## Cost of the smaller bag

| Measure | Before D61 (30 slots incl. equipped, former v4) | Bag ladder to 20 |
| --- | --- | --- |
| Unattended first sleep, median days | 5.6 | 2.3 |
| Unattended time asleep, 30 days | 81.4% | 91.8% |
| Three-day time asleep | ~0% | 4.1% |
| Seven-day time asleep | 15.9% | 48.0% |
| Level 8, three-day median days | 8.3 | 9.5 |
| Level 8, seven-day median days | 11.4 | 17.2 |

At 20 slots and ~4.7 gear/day the bag holds about four days of finds, so the comfortable cadence is now three to four days. Seven-day managers miss D24's days 8–14 Cafeteria target and lose much of each week to inventory sleep, which widens their gap on recent boards. A 24-slot ceiling barely changes this (seven-day sleep 45.4% vs 47.9% in a 200-hero comparison), because a week of finds needs about 33 slots. D61 accepts this trade-off: the smaller ceiling leaves room for crafting, raids and later content to sell bigger bags.

## Not measured

The harness sells every spare at each visit, so real players who keep gear will fill bags sooner. It does not model the companion warning or recent-board publication.
