# Bottom recap line and wider ranking — 2026-10-06

Barry requested a full-width twelve-hour summary at the bottom because the recap felt crowded beneath the QR, more leaderboard width and a smaller bag QR. Local template **v28** implements these refinements. Barry explicitly authorized production deployment on October 6; rollout and live verification are in progress.

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

[Sanitized results](recap-ribbon-results.json) omit player identifiers and story text. Review image: `.previews/recap-ribbon-recordedHistory.png`; other inspected captures use `.previews/recap-ribbon-*.png`. Fixture hero/stats and shifted timestamps are illustrative. Barry approved deployment on October 6. Complete the production rollout, live existing-installation render and progress checks. No listing update, submission or marketplace publication was performed.
