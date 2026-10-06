# Bottom recap line and wider ranking — 2026-10-06

Barry requested a full-width twelve-hour summary at the bottom because the recap felt crowded beneath the QR, more leaderboard width and a smaller bag QR. Template **v28** implements these refinements. Barry explicitly authorized deployment on October 6; production rollout, the actual X server image and natural tick 222 are verified.

## Behavior

X full uses **6/12 logs, 4/12 ranking and 2/12 bag**, doubling the ranking column from v27. The bag label remains centered in its divider. The standing X bag QR uses integer module scale **4 instead of 5**, reducing each dimension by **20%** while keeping the same destination. OG keeps scale 3, and action/setup QRs retain their existing sizes.

The X recap sits in a dedicated full-width row immediately above the title bar, below all three columns. One line includes its existing label (including partial status), gains, activity and highlights. Framework fitting preserves the complete text on one line. The row is reserved before adaptive log fitting; no recap shares the QR column. Attention still suppresses optional recaps and older stories. Without a bag QR, full X uses a 6/6 history/ranking split with the same bottom summary. OG and compact layouts retain their existing recap placement.

The own rank and its context sit beside each other again. The ordinal has a separate fit container after reserving context width; a five-digit ordinal cannot overlap population/cohort text. Names retain their one-line clamp, with substantially more X width. Backend reads, payload fields, simulation and stored progress are unchanged.

## Verification

- `pnpm check`: typechecks and **202 tests / 31 files** passed. Existing ordinal checks now assert rendered text independently of presentation wrappers.
- Official `pnpm lint:trmnl` and `pnpm build` passed; the Impeccable layout detector reports zero findings.
- **256 unique settled previews** (32 generated states × four layouts × OG/X) passed: no footer overflow, broken visible images, incomplete fitter or additional complete log that would fit. All 64 full header/rank text-bounds checks pass. Every visible X bottom summary is complete on one line without horizontal overflow.
- Reviewed paired OG/X ordinary recorded history, long marked stories, milestone summaries and five-digit ranks/six-digit scores. A discovered large-ordinal overlap was fixed by reserving context width before fitting the ordinal.
- X full representative log counts are **5 recorded-history entries, 6 short entries, 3 long entries, and 10 short entries without metadata**. The recorded-history fixture drops from six to five when the restored leaderboard width wraps one story. The fitter still keeps the longest complete prefix; the bottom recap summarizes the twelve-hour window independently.

[Sanitized results](recap-ribbon-results.json) omit player identifiers and story text. Review image: `.previews/recap-ribbon-recordedHistory.png`; other inspected captures use `.previews/recap-ribbon-*.png`. Fixture hero/stats and shifted timestamps are illustrative. Production verification follows below. No listing update, submission or marketplace publication was performed.

## Production rollout

- Source `422b2b3ab7c68e88c20c60379018e93532fc37b5` deployed through the existing `main` pipeline. Build `47e13a19-d274-4b1d-a11b-9de294068702` succeeded. Production Convex is `exciting-cormorant-948`; Worker `trmnl-games` deployment `fe1846d2-91ed-4059-a718-0efae1dfbeb0` serves version `df1455a6-e81f-4fd8-b41f-8348cf39c565` at 100%, deployed **14:14:32 UTC**.
- The signed-in companion confirms the bottom recap, restored leaderboard width and scale-four X bag QR. All eight layout/device previews were captured from its rendered iframe markup and re-rendered with pinned framework 3.4. They settled without footer overflow, broken images or incomplete fitting; the preview was restored to X Full. These are live-data browser approximations, not physical display acceptance.
- Existing installation 495747 automatically rendered at **16:15:01 SAST / 14:15:01 UTC** (2,783 ms, 33 KB). Manual refresh rendered at **16:15:29 SAST / 14:15:29 UTC** (989 ms, 31.8 KB). Its actual **1872×1404 server image** was inspected: six complete log/stat pairs, wider ranking, smaller QR and complete one-line summary above a clear footer. Capture: `.previews/recap-ribbon-trmnl-server-image.png`.
- Natural tick **222** completed at **14:15:06.051 UTC**, processing one hero with zero quarantines. Hero count, identity, creation, activation, lifetime XP, level and last tick were preserved/nonregressing. All three published boards are ready with one player; no pause, maintenance or blocked deletion job. No tick was forced and verification did not mutate gameplay.
- **130 post-deployment completion records**, **14:15:01.036735–14:15:29.577422 UTC**, contain zero errors. One `inventory:equip` transaction retried during the tick and completed without error under the same request 79 ms later. The screen request and payload query completed without error.

Explicit v28 physical delivery and physical-screen readability are not yet observed. Post-deployment evidence stays local until the next source change, avoiding another documentation-only deployment.

## OG versus X review

Barry asked to compare deployed OG/X after observing that OG was crowded. The eight live-data captures have complete recent-story counts:

| Layout | OG | X |
| --- | ---: | ---: |
| Full | 1 | 6 |
| Half horizontal | 4 | 6 |
| Side | 1 | 5 |
| Quarter | 2 | 2 |

Comparison screenshots: `.previews/deployed28-og-vs-x-{full,half,side,quarter}.png`. OG is shown at 800×480; X’s 1872×1404 screen is displayed at 45% beside it for comparison, not equal physical scale. Each capture uses the deployed template and live owner data from this check; keepsake codes remain omitted from companion previews. Other mashup slots represent other plugins.

The OG full scene uses about half its usable height; recap and ranking then compete with recent history. Side has the same density limitation. A future OG-specific refinement should shorten the scene and simplify ranking/recap arrangement to reserve more complete story rows. This is a design finding, not a certified additional-row target or a deployed OG redesign.
