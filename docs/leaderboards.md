# Exact immutable leaderboard publications

Approved product rules: D17/D20 as amended by D31/D32; [ranking specification](ranking.md). MVP builds grouped `recent_24h`, grouped `recent_7d`, and ungrouped lifetime `overall`, published together once per UTC hour. Device uses recent seven-day own group; companion offers all three.

## Eligibility and comparators

Eligible: activated current heroes with active owners, including paused/sleeping/waiting dead/quarantined/disconnected. Pending, suspended/deleting owners and retired heroes are excluded from their next snapshot. Connections never determine eligibility. New and zero-score heroes are included without a waiting period. Dormant heroes (paused, or sleeping without a scheduled wake, with zero window XP) are omitted from that recent board and its counts but stay on lifetime (D32).

Recent groups use captured current level: 1–3, 4–7, 8–11, then four-level bands. Compare window XP descending, activation time ascending, stable hero ID lexical ascending. Promotion carries window XP; delta is null if group changed. All ranks are ordinal.

Lifetime comparator: level descending, current-level XP descending, current-level reached tick ascending, server creation time ascending, stable hero ID ascending. No packed floating-point scores. First activation stamps level-reached tick; first eligible snapshot introduces rank.

## Frozen inputs and score history

Each publication run writes one immutable `rankInputs` row per eligible hero, containing both recent scores/cohort, per-board recent inclusion flags and lifetime tuple/public fields. Non-publication runs write no rank inputs. Scoring uses run-pinned `scoreAt` and bounded hourly `heroScoreWindows`, folded/expired atomically with that hero's publication-run evaluation. Manual gear/name/state commands never alter earned XP. Captures form one logical-tick snapshot, not one global transaction.

Index order: lifetime `[runId,eligible,negativeLevel,negativeXp,lastLevelUpTick,heroCreatedAt,heroKey]`; recent `[runId,ranked24h,cohortKey,negativeScore24h,activatedAt,heroKey]` and the corresponding `ranked7d` seven-day index. Verify ordering, ties, pagination and resources in V04/V05. [Convex indexes](https://docs.convex.dev/database/reading-data/indexes)

## Publication builder

1. On a publication run only (D31), begin/recover one `leaderboardPublications` row for the active run, pin previous publication and window cutoff.
2. Process boards in fixed order: overall, recent_24h, recent_7d. Paginate frozen projections with guarded sequence/cursor. Proposed page size 100 requires measurement.
3. Overall uses cohort `all`; recent index groups contiguous rows by cohort. On group boundary create/recover a generation and reset next rank to 1. Keep entries at most 100 per generation, total count, and exactly one scoped `heroRanks` row per hero/board/publication.
4. Fetch previous publication's hero rank; compare only the same board/cohort for delta. New/group-changed heroes get null.
5. Validate counts (one lifetime row per eligible hero and one recent row per board for each hero included in that board), complete board/group coverage, sequential ranks and matching run/cutoff. Empty population publishes a complete zero-population publication without fabricated groups.
6. Atomically mark the set published, update the world pointer, finish the run and clear its active guard. Failure anywhere keeps the previous complete publication available. No reader uses building/ready rows.

Persist current board/group/cursor/sequence and scheduled job ID; duplicates cannot increase totals/ranks or schedule extra continuations. Do not store an unbounded group-to-generation map on the world/publication document: fixed indexed lookup by publication/board/cohort supplies any generation.

Publications pin `paginationVersion: 1` for portable index-key cursors. Keep `nextRank` and Top 100 additions in memory during each page and persist once per cohort/page. The October 5 [engineering rehearsal](evidence/engineering-readiness.md) verifies cohort boundaries, restore continuation and atomic publication.

## Read contracts

Device resolves published pointer, own `heroRanks` row for recent_7d, its captured cohort generation, Top 5/count, global publication count/cutoff. If own rank is absent, use current-level cohort only to locate an existing board and show null rank. Fixed bounded lookups; no global scans, live count or history scan.

Web `leaderboard.view` selects board/cohort and returns Top 100, own rank only if it belongs to that selected cohort, score/period/cohort/count/cutoff/publication identity. Offer a link back to the own group when browsing another. Public entries contain aliases/hero name/level/class plus recent score where applicable; never auth IDs/private gear/logs.

All shown rank/Top 5/count belong to the same generation/publication. Live hero stats may be newer; label ranks with board cutoff/group. Privacy masking reads current user state and treats missing users as hidden. Preserve cached ordinal gaps/counts until a new coherent publication; never renumber only part of a board.

## Delta, empty states and retention

`rank_delta = previousRank - currentRank`: positive gained places since the previous publication (normally one hour earlier) on that same board/cohort. Null for first appearance, group change or return from dormancy. It does not mean weekly improvement. No generation: null rank/time/window/score, population 0, empty entries; no rank 0.

Retain current and previous publication sets plus active build, including all associated generations/rank rows. Generation-aware bounded cleanup cannot delete protected pointers/inputs. Scrub/mask names immediately on deletion/suspension; immutable ordering/eligibility remains stable until builder completion. Keep minimal deleting-owner state until copied identities are safely purged; absent owner never makes a copied name public.

## Required verification

- Exact 24-hour/seven-day boundaries and one pinned cutoff despite page timing/recovery; at most one XP credit per hero/run.
- Lifetime tuple/ties, recent score/activation/ID ties, sparse groups and zero/new heroes.
- Promotion carries score, clears delta; all cohorts work without a level cap.
- Hero outside Top 100 gets exact scoped rank; other-group browsing never presents an unrelated personal rank.
- Top 5/100, personal score/rank, group/global populations and timestamps share a publication.
- Failing/duplicate pages or promotion never expose a partial board set; validate all three views.
- Pause/sleep/quarantine expire scores without earned XP; disconnected heroes remain eligible.
- Dormant heroes leave recent boards/counts only once their window XP is zero, stay on lifetime and return with null delta; non-publication runs write no rank rows; a missed publication triggers exactly one catch-up.
- Privacy masking/missing owners, deletion during a build and cleanup concurrent with reads.

Prestige/seasons require new comparator/eligibility contracts. This plan is not measured capacity or running-product proof.
