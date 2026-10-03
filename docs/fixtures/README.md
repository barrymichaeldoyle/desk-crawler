# TRMNL documentation fixtures

Illustrative pre-release v1 examples for revision 6: seven-day group rank/score/period from an hourly publication (built at the 09:58 UTC slot, D31), `rank_status`, separate global population and bag/held-find/wake fields. These are not generated backend outcomes, markup envelopes, real merge variables or render evidence. Example sprite URLs are deliberately non-live.

| Case | Purpose |
| --- | --- |
| [Normal](trmnl-normal.json) | Level 4, six dated events, rank outside Top 5 |
| [Dead](trmnl-dead.json) | HP 0, automatic recovery, evaluated-tick ETA, old progress time |
| [Unlinked](trmnl-unlinked.json) | Empty/null stats, setup prompt, no private hero data |
| [Paused](trmnl-paused.json) | Old gameplay update without false staleness; evaluation current |
| [Travelling](trmnl-travelling.json) | Allocated tick ahead of evaluation; one tick to arrival |
| [Stale](trmnl-stale.json) | Recent assembly, old completed game snapshot |
| [Quarantined](trmnl-quarantined.json) | Service label without rewriting underlying gameplay status |
| [Unranked](trmnl-unranked.json) | New hero awaits eligible snapshot; old board coherent |
| [Long text](trmnl-long-text.json) | Maximum names/instance/item/summary/attention budgets |
| [Sleeping](trmnl-sleeping.json) | First gear overflow retained; ready gameplay data, not service pause |
| [Dormant](trmnl-dormant.json) | Long-sleeping hero with zero seven-day XP: omitted from the recent board, null rank, `rank_status: dormant` (D32) |
| [Wake pending](trmnl-wake-pending.json) | Held find claimed/free space; explicit next-tick wake still sleeping; evaluated-tick ETA |
| [Promoted](trmnl-promoted.json) | Recent XP carried to new group; delta null; own row matches Top 5 |
| [Rank lag](trmnl-rank-lag.json) | New live level with old snapshot group/rank; never rederive group from live level |
| [Score windows](ranking-score-windows.json) | Separate pure-score example: accumulator fold and hourly-bucket 24-hour/seven-day boundary exclusion |

Examples use UTC+02:00; source timestamps are UTC and labels include date. Planning validates lengths, percentages, time order, types/nulls, scoped score/group/rank consistency and <=8 KiB canonical size. Implementation adds empty populations, DST/offsets, first-run failure, missing fields, large valid stats and protocol errors from actual queries.

Real data must flow before markup work starts under the official skill. These fixtures do not satisfy that gate.
