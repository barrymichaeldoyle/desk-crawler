# TRMNL marketplace review package (draft)

**Status: draft for Barry's review. Nothing here has been submitted or sent.** Barry authorized the listing update and companion deployment; those actions are complete ([evidence](../evidence/listing-polish-deploy.md)). Submission and reviewer contact still need explicit authorization.

## Listing

| Field | Draft |
| --- | --- |
| Name | Desk Crawler |
| Description (≤35) | A quiet office RPG for your TRMNL (33 characters; saved and verified 2026-10-05) |
| Icon | [`docs/assets/plugin-icon.png`](../assets/plugin-icon.png) (512×512, 1-bit pixel art; saved in plugin 564) |
| Featured image candidate | [Current full-layout sample](featured-image.png), 800×480; v24 source template with fictional hero/ranks, no redeemable code. Prepared locally; not uploaded |
| Saved featured image | Regenerated from the original live installation; current 800×480 Baz scene verified on the install page, blob `19296090`, no redeemable code |
| Categories | games, entertainment (saved and verified 2026-10-05) |
| Supported refresh | Every 15 minutes (slower is fine; progress never depends on refresh) |
| Installation URL | `https://trmnlgames.com/connect/trmnl/desk-crawler/install` |
| Installation success webhook | `https://exciting-cormorant-948.convex.site/trmnl/install/success` |
| Management URL | `https://trmnlgames.com/connect/trmnl/desk-crawler/manage` |
| Markup URL | `https://exciting-cormorant-948.convex.site/trmnl/v1/screen` |
| Uninstall webhook | `https://exciting-cormorant-948.convex.site/trmnl/uninstall` |
| Knowledge base | `https://trmnlgames.com/help/desk-crawler` |

## Focus-first rationale

Desk Crawler is designed for a brief glance. The hero adventures every 15 minutes on its own; the screen shows one pixel-art scene, the latest outcome and the hero's health. A QR code links to the companion for setup and bag management. There are no push notifications, streak penalties or benefits from repeated refreshing. Progress never depends on refresh rate, Sleep Mode or playlist position. Occasional companion visits manage gear: the first overflow find is retained safely, then adventures sleep until the player makes room and deliberately resumes. Earned XP and equipment remain intact while sleeping; recent ranking scores still age out. Optional weekly keepsakes are permanent cosmetics; missed weeks lose nothing and each design waits for the player. Free, no purchases, no ads.

## Reviewer access

- Install from the plugin page; sign up on the companion with any email (one-time code), Google or GitHub. No passwords to share and no special bypass.
- Pick a public name and hero name, click Connect, then Save in TRMNL. The first adventure appears on the next world tick (within 15 minutes).
- Companion: `https://trmnlgames.com/app/desk-crawler` (Desk Crawler is the first game on the TRMNL Games companion). Support: barry@barrymichaeldoyle.com.

## Install video script (≈90 seconds, no audio)

TRMNL asks for the plugin "being installed from scratch". Our recording will include a first-account signup to demonstrate the entire onboarding flow; a new companion account is our coverage choice, not a separate published TRMNL requirement. See the [recording checklist](recording-checklist.md). The existing [slideshow](../evidence/install-demo/README.md) remains supporting evidence, not the final video.

1. TRMNL → Plugins → Desk Crawler → Install → Connect with Desk Crawler.
2. trmnlgames.com: sign up (email code, Google or GitHub), pick a public name and hero name, Connect this TRMNL installation.
3. Back in TRMNL: Save. Show the preview: the first-run screen with the QR code.
4. Scan or open the companion: hero page with the same scene; open the Bag and Rankings tabs.
5. After the next 15-minute tick: show the first adventure with "Next adventure HH:MM". Cut the wait with a clear “After the next game tick” caption; do not imply device delivery is immediate.
6. Configure: the companion management page for this installation.
7. Optional: a half-size mashup next to another plugin, then the device after its next refresh.

## Before submitting (from [status](../status.md))

Use [release preparation](../evidence/release.md) for the current gate checklist. Real install/manage/render/uninstall and current previews are recorded; D43 assigns layout/mashup coverage to previews, and the D46 keepsake live-claim checks were waived. Barry confirmed owner/sender barry@barrymichaeldoyle.com and plans to promote TRMNL at launch on 2026-10-05; channels/timing remain unspecified. The author-entitlement check is complete ([evidence](../evidence/author-entitlement.md)). The install video is recorded and hosted, and its link is in Barry's email draft (2026-10-07). Submit for Review and sending remain Barry's actions. The [engineering pass](../evidence/engineering-readiness.md) proves isolated synthetic recovery and preview edges. The tested fixes are deployed; ongoing protected capture, real-provider verification and funding/tuning decisions remain launch gates.
