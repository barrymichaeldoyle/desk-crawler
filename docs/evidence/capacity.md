# Capacity measurement — 2026-10-04

**October 5 update:** [engineering checks](engineering-readiness.md) records the revised builder's actual 1,000-row worker measurements, current shared-plan headroom and updated scenario estimate. The cost fix was [deployed on October 6](engineering-deploy.md). The measurements below are the original v2 baseline, not current candidate results.

Measured on disposable Convex preview `precious-pheasant-866`; no real players or TRMNL account load. Simulation v1, content v2, template v11. Sanitized measurements: [capacity-results.json](capacity-results.json).

The harness seeded 100, then 1,000 synthetic heroes with six evenly mixed states (exploring, resting, travelling, dead, paused, sleeping), 30 gear rows plus potions, and 168 hourly score buckets. Sleeping heroes also had a held item: 32 inventory rows. A forced publication run exercised all three boards. Ten authenticated pause commands raced with the scheduled simulation chain. Fifty sequential authorized screen requests followed each run.

| Measurement | 100 heroes | 1,000 heroes |
| --- | ---: | ---: |
| Complete tick + publication | 3.282 s | 34.293 s |
| Processed / eligible / quarantined | 100 / 100 / 0 | 1,000 / 1,000 / 0 |
| Simulation worker calls | 5 | 41 |
| Simulation read / write bytes | 2,850,733 / 847,010 | 28,476,375 / 8,538,028 |
| Simulation user execution, total / page p95 | 269 / 70 ms | 2,602 / 76 ms |
| Ranking worker calls | 6 | 33 |
| Ranking read / write bytes | 587,268 / 299,089 | 60,992,486 / 2,398,897 |
| Ranking user execution, total / page p95 | 115 / 33 ms | 1,254 / 49 ms |
| Ready board populations: overall / 24h / 7d | 100 / 100 / 100 | 1,000 / 1,000 / 1,000 |
| Screen requests / HTTP 200 | 50 / 50 | 50 / 50 |
| Screen latency p50 / p95 | 301 / 350 ms | 288 / 413 ms |
| Mean / maximum envelope bytes | 22,221 / 22,454 | 22,316 / 22,498 |
| Payload query read bytes per screen | 38,512 | 39,273 |
| Command accepted / rejected | 8 / 2 | 8 / 2 |

Both cohorts met the proposed two-minute complete-run and one-second screen p95 targets. Convex's user execution timings are the available function-execution proxy here, not independently profiled CPU samples. Each screen used one HTTP action plus one internal query, with no database writes. Two commands correctly returned `INVALID_STATE` after simulation changed the hero's state; neither committed a receipt. Selected runs had zero recorded conflict retries. An earlier discarded run had one command retry, so this is not a claim that concurrent commands never conflict.

Replaying a completed worker at sequence zero changed neither processed count, world tick nor sampled XP. The sampled sleeping inventory retained 32 rows; score history retained 167 buckets after the oldest expired. Cleanup drained 250 logs older than 100 hours in 2.441 seconds.

## Zero-payout operating forecast

Assume N activated heroes and D polling installations, each polling every 15 minutes throughout a 30-day month. N and D are independent: disconnected heroes still exist. Forecast uses 2,880 ticks/screens per hero/installation and 720 hourly publications. It scales the measured publication simulation cost to every tick as a conservative baseline for this mixed cohort; gameplay, history growth, cleanup and web subscriptions can change it.

| Scenario (N = D) | Measured worker + screen calls/month | Database I/O/month | Envelope egress/month |
| --- | ---: | ---: | ---: |
| 100 | 594,720 | 22.38 GB | 6.40 GB |
| 1,000 | 5,901,840 | 265.35 GB | 64.27 GB |

GB here is decimal. Calls omit coordinators, watchdogs, cleanup, lifecycle, companion and static-art requests. I/O includes measured simulation reads/writes, ranking reads/writes and screen query reads, but omits retention deletion, live subscriptions and other app traffic. Egress omits art and retries. This is a scenario estimate, not a measured month or a spend ceiling.

The [official Convex pricing page](https://www.convex.dev/pricing), checked 2026-10-04 for Professional / US East, lists 25M calls, 50 GB database I/O and 50 GB egress included; additional units are $2/M calls, $0.20/GB I/O and $0.12/GB egress. With otherwise unused allowances, the 1,000-installation scenario implies approximately **$44.78/month additional I/O and egress**, before omitted services and traffic. Existing subscriptions are shared with other projects; their actual remaining allowances were not measured. Zero Creator Fund revenue is assumed.

Ranking reads grew faster than population in these two samples. The builder updates a generation document for every hero, including its retained Top 100 entries on later pages; reducing those repeated document accesses is a useful follow-up. No cost optimization or gameplay change was deployed during this measurement.

## Reproduction and limits

Prepare an isolated checkout with `node tools/review/prepare-preview.mjs`. The harness source is [preview-functions.ts.txt](../../tools/review/preview-functions.ts.txt), deliberately outside `convex/`. Deploy it only to a disposable preview with `REVIEW_VALIDATION_ENABLED=true`, empty crons and synthetic identities. [capacity.mjs](../../tools/review/capacity.mjs) targets the named preview explicitly; [summarize-capacity.mjs](../../tools/review/summarize-capacity.mjs) deduplicates completion log IDs and selects the measured run intervals. Scripts reference private temporary raw results; those are not release artifacts.

These are single runs with small sequential latency samples, one level group and low-level mixed states, not sustained or clustered load. Maximum inventories and near-maximum history were exercised; simultaneous late-game combat, many cohorts, pending-heavy scans and forced worker failure/recovery under load remain unmeasured. Both preview worlds were paused after testing and automatic crons disabled. V05 has useful live measurements, but its full failure-under-load matrix remains open.

## D54 candidate read-budget change (2026-10-06)

The pending twelve-hour device recap adds one indexed owner/time range read, capped at 201 logs (aggregate 200; partial label on overflow), alongside the existing ten-story read. An ordinary twelve-hour sample contained 48 tick events. No per-tick aggregation writes/table are added. Earlier screen-cost/load measurements predate this extra read and are not a measured cost certification of v25; include it in the next authorized deployed capacity sample and funding forecast. Existing funding decisions remain open.

D54 live one-hero sample after the approved October 6 release: the noncached `trmnlPayload:forInstance` call took 46.02 ms, read 51,358 bytes / 78 documents, wrote zero bytes and returned 4,643 bytes. The 52-completion health sample had zero errors/retries. This measures the new read path at current population, without recertifying the historical 100/1,000-hero cost scenario ([release](activity-recap.md)).
