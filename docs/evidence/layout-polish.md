# Compact layout polish and QR coverage — 2026-10-06

Barry requested further OG/X polish, a QR in every view, and more space between the X full-view divider and its logs/recap. Template **v29** is prepared and verified locally. **Production remains v28; this change has not been deployed.**

## Behavior

Every active layout reserves a companion QR area. Normal screens open **Your bag**; an action destination replaces that link and shows its action caption. Setup and first-adventure screens keep their setup QR without duplicating the standing bag code. Normal/action assets use existing scale 3 on OG and scale 4 on X; setup scales are unchanged. No new URL, backend read, gameplay write or image asset is introduced. A payload without an art endpoint intentionally omits the QR.

Full OG uses the smaller existing scene and a compact personal-rank heading, with **7/3/2 history/ranking/QR columns**. X retains **6/4/2**, its large scene and Top 5. OG retains Top 3. Both have a separate bottom recap: compact on OG, full detail on X. The full story columns have four logical pixels of padding below their divider on OG and eight on X. Recap text has eight logical pixels below its own rule. Smaller surrounding gaps recover room while preserving tight story/stat pairs.

Half horizontal uses **3/7/2 hero/history/QR**, with its recap at the bottom. Side pairs hero/HP with the QR; X keeps XP and the scene, while OG omits those decorative/secondary elements to reserve history. The old side-view personal-rank line is omitted; ranking remains in full view and the companion. Quarter uses **8/4 history/QR**, combines the compact recap label and text, and places the X scene beneath the QR. All sizes continue fitting the longest complete newest-first prefix, retaining individual time/change rows. Attention replaces the recap and limits history to the latest story.

## Local verification

- Typechecks and **205 tests / 31 files** pass. New contracts cover standing/action/setup QR destinations in every layout, action priority and missing-art fallback. QR decoding covers every served module scale, including scale 4.
- Official TRMNL markup lint and production build pass. Existing TanStack `inputValidator` deprecation notices remain unrelated to this change.
- **256 settled previews**: 32 states × four layouts × OG/X, using pinned framework **3.4.0**. No footer clipping, failed visible images, header/rank overflow, incomplete fitting or hidden complete next story that could fit. Every bottom recap fits one line without horizontal overflow.
- **248 previews with a destination show exactly one visible, loaded QR within the view bounds**. The remaining eight are the intentional missing-art fixture; destination/presence mismatch count is zero. Setup, first-run, full-bag, long-text, large-rank, delayed, paused and recovery states are included.
- The Impeccable layout detector reports zero findings. Paired finished screenshots were inspected for reading order, alignment, recap spacing and QR placement.

Ordinary illustrative fixture counts, not guaranteed row counts:

| Layout | OG | X |
| --- | ---: | ---: |
| Full | 4 | 6 |
| Half horizontal | 3 | 6 |
| Side | 4 | 5 |
| Quarter | 1 | 4 |

Ten short entries without metadata fit eight/ten in full and side (OG/X). Long marked descriptions and metadata need more room; clamping and whole-entry fitting preserve the newest outcome and its changes. The twelve-hour recap remains independent of the recent-story count.

[Sanitized runtime results](layout-polish-results.json) retain counts and bounds, without player identifiers or story text. Finished comparisons are `.previews/polish29-og-vs-x-{markup,markup_half_horizontal,markup_half_vertical,markup_quadrant}.png`. OG is shown at native size; X is reduced for comparison, not equal physical scale. Figures use synthetic or identifier-free shifted history.

A production rollout, actual TRMNL server render and physical readability check remain separate gates. No listing update, email, marketplace publication or production mutation was performed.
