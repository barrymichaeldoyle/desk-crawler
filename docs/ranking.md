# Approved recent-performance ranking

D17/D20 as amended by D31 (hourly publication and buckets) and D32 (dormant heroes). Both rolling views are in MVP. This supplies product semantics; [leaderboards](leaderboards.md) and [data model](data-model.md) own persistence/publication details.

## Views and groups

Companion offers `recent_24h`, `recent_7d` and secondary `overall` lifetime; default recent seven-day own group. TRMNL uses `recent_7d` only, with no per-installation selector. Show period, level group, earned XP and snapshot time. Recent ranks are group ranks, never an unlabeled global rank.

Groups use captured current level: 1–3, 4–7, 8–11, 12–15, then four-level bands. For L >= 4, lower boundary is `4 + 4 * floor((L - 4) / 4)`, upper is lower + 3. No level cap; don't silently merge sparse groups. Promote at the next published snapshot, carry earned window XP, and return null delta when group changes.

All activated active-owner heroes are eligible for lifetime. Recent boards include every eligible hero except dormant ones (below): new and zero-score heroes, waiting dead, travelling, quarantined and disconnected heroes all appear without a full-window qualification. Pending/suspended/deleting heroes remain excluded everywhere. Recent comparator: earned window XP descending, activation time ascending, stable hero ID ascending. Ranks are ordinal; lifetime retains its level/XP comparator.

## Dormant heroes (D32)

At a publication, a hero is **dormant** for a recent board when it is paused, or sleeping with no wake scheduled, **and** has zero XP in that board's window. A dormant hero is left out of that board's generation, its group population and `global_total_players`; it keeps its lifetime rank. Once it resumes or earns XP it rejoins at the next publication with a null delta, like a first appearance.

This keeps "of N players" meaningful as abandoned heroes accumulate, and the device board is not padded with zero-score sleepers. A hero that has only just fallen asleep stays listed until its window XP expires. The device shows its own rank as null with `rank_status: dormant`; attention text already explains the sleep or pause.

## Hourly windows and publication (D31)

Simulation stays every 15 minutes. Rankings publish once per UTC hour: a run publishes when its accepted wall slot is the last quarter-hour slot of its UTC hour (minute 45 under D42), or when no publication has completed for more than 60 minutes (one catch-up after an outage, never a burst). A publication pins `scoreAt` to its run's accepted scheduled wall-slot time and `scoreHour = floor_to_hour(scoreAt)`.

Score is granted XP before current-level subtraction, never current XP, visits or gold. Each run credits granted XP to the hour bucket of that run's `scoreAt`, at most once per hero per run, even during later recovery. Published windows are whole UTC hour buckets: 24 hours covers buckets with start in `(scoreHour - 24h, scoreHour]`, and seven days covers `(scoreHour - 168h, scoreHour]`. Device labels disclose the snapshot/window cutoff; they are not live scores between publications or during an outage.

Downtime earns no missed-slot rewards and does not stretch a day into 96 successful ticks. Pause/sleep/quarantine earn no new XP; old XP expires at the next coherent publication. Recovery of the same run never credits XP twice or changes its cutoff.

## Bounded history

Each tick adds granted XP to a small current-hour accumulator on the hero document (`scoreHour`, `scoreHourXp`), written in the same mutation as the hero outcome. `heroScoreWindows` holds at most 168 positive hourly buckets plus materialized 24-hour/seven-day totals. It is read and written only when a publication run folds the accumulator in. A tick that finds an accumulator from an older hour (only possible after a missed publication) folds it first; folding adds to an existing bucket for the same hour. Empty hours are implicit zero. The pure score projection receives `scoreAt`, never reads a wall clock.

Read one bounded score-history document per hero per publication; no per-poll history traversal and no need to extend three-day detailed log retention. Measure bucket bytes, fold/expiry CPU, page size and cleanup under V04/V05. Between publications, dormant heroes need no writes; at publication every eligible hero folds/expires history and writes one frozen rank projection.

## Coherent publication and reads

Build both grouped recent views and lifetime overall from frozen projections written by the publication run. Atomically publish one `leaderboardPublications` pointer only after every generation is complete. Top 5/100, personal rank/score, total and delta refer to the same board/group within that publication. Current/previous publication sets and active build are protected from cleanup.

Look up the hero's scoped rank first to obtain its captured cohort, then that generation; a live level-up cannot select a different group from an older snapshot. Newly activated/unranked or dormant heroes use current level only as a group fallback and show null own rank. Browsing another group returns no personal rank for that group and links back to the own group. Lifetime is a web alternative.

Delta compares consecutive publications of the same board and group (normally one hour apart), not a day/week of improvement. Use null on first appearance, group change or return from dormancy. `total_players` on device is selected group population; `global_total_players` is the population ranked on `recent_7d` across all groups in the same publication. See [TRMNL](trmnl.md) for v1 fields.

## Verification

Test hour-bucket cutoff/expiry edges, two windows disagreeing, accumulator fold at publication and after a missed publication, catch-up publication after an outage, current-level rollover, promotion/zero/new scores, dormant exclusion and return with null delta, deterministic ties, sleeping/paused/quarantined expiry, outage/recovery and duplicate credit, outside-Top-100 rank, privacy deletion, partial build failure and cleanup. A03/A05 own credit/projection; A06 publication; A08/A09/A10 scoped labels; A11 capacity/cost. No live gate is complete by this specification.
