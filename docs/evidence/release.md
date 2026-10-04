# Release preparation — 2026-10-04

**Review submission is not ready to send.** Useful live evidence is complete, while the revised layout, recovery reconciliation and final reviewer video still have open checks. No submission, reviewer email, video publication or new production code deployment was performed in this preparation pass.

| Artifact | Version / state |
| --- | --- |
| Base production/source commit | `306ea3a`; local review changes uncommitted |
| Hero schema / simulator / catalog | 1 / 1 / v2 |
| Production template | v11 |
| Candidate template | v12, generated locally; visual verification blocked |
| Brand | simpler hero, sword and circular border; separate 16px favicon; TRMNL icon updated |
| Plugin | 564, `desk_crawler`, Third Party / games / development |
| Companion | https://trmnlgames.com (Desk Crawler under `/app/desk-crawler`) |
| Production backend | `exciting-cormorant-948` |

## Verified in this pass

- Production companion responds and signed-in management works; plugin lifecycle/screen URLs target production.
- Original installation timeline recorded a render at 11:12:47 SAST (1,222 ms, 21.4 KB) and delivery to Barry's TRMNL X at 11:22:18. A later render at 12:27:09 took 3,568 ms, 23.4 KB. Firmware 1.8.17, battery 82%, mixed playlist. Barry described the full-screen layout as decent and requested readability improvements.
- [Fresh installation/manage/render/uninstall](install-demo/README.md) succeeded; original installation and hero preserved.
- Production daily backups completed; corrected signed Clerk deletion webhook delivered successfully; [synthetic restore](recovery.md) and a deduplicated staging alert/recovery pair accepted by Resend.
- [100/1,000-hero capacity](capacity.md) met run and screen latency targets; measured [zero-payout forecast](creator-fund.md).
- `pnpm check`: all typechecks and 71 tests passed. `pnpm build`: client/Worker build passed, with existing TanStack `inputValidator` deprecation notices. Template v12 generated 88 HTML cases (11 states × four sizes × OG/X).

## Display support and remaining checks

OG: 800×480, 1-bit local framework previews. TRMNL X: 1040×780 logical, 1872×1404 device, full-screen production delivery and Barry's feedback. Four layout sizes exist: full, half horizontal, half vertical, quadrant. The prior v11 local normal-state screenshots were inspected; v12's 88 generated pages have **not** been visually inspected. OG live rendered screenshots, latest half/quadrant mashups, theme/text-scale variants and outage behavior remain acceptance checks. Do not infer all-layout hardware acceptance from a full-screen delivery.

Before submission:

1. Visually verify v12 on OG/X and all four sizes, including maximum text and status/attention cases. Fix clipping and verify latest full/mashup delivery after an explicitly approved deploy. Automatic browser review currently blocks `http://127.0.0.1:4173` despite Barry's approval; TRMNL screenshot download was also rejected.
2. Prove independent protected post-snapshot deletion/revocation reconciliation, restored in-flight work, live alert failure behavior and remaining lifecycle/outage matrix items described in the evidence. Existing automated tests do not replace these live gates.
3. Update the stale marketplace featured image after final layout acceptance. Complete and host the installation demonstration; the current artifact is a returning-owner screenshot walkthrough.
4. Confirm owner sender email and promotion answer in the [review email draft](../review-email.md). Ask TRMNL to confirm games/Third Party Creator Fund eligibility and payment onboarding; assume zero payouts meanwhile.
5. Obtain explicit authorization for production deployment, video hosting, Submit for Review and sending the email. Pushing `main` runs the production deployment pipeline.

The [evidence checklist](README.md), [quality requirements](../quality.md) and confirmed decisions remain authoritative. This document records partial readiness rather than closing every release gate.
