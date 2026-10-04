# TRMNL marketplace review package (draft)

**Status: draft for Barry's review. Nothing here has been submitted or sent.** Submission, reviewer contact and listing changes need Barry's explicit go-ahead (AGENTS.md).

## Listing

| Field | Draft |
| --- | --- |
| Name | Desk Crawler |
| Description (≤50) | A calm office RPG that plays itself on your desk |
| Icon | [`docs/assets/plugin-icon.png`](../assets/plugin-icon.png) (512×512, 1-bit pixel art), draft |
| Categories | games, entertainment |
| Supported refresh | Every 15 minutes (slower is fine; progress never depends on refresh) |
| Installation URL | `https://trmnlgames.com/connect/trmnl/desk-crawler/install` |
| Installation success webhook | `https://exciting-cormorant-948.convex.site/trmnl/install/success` |
| Management URL | `https://trmnlgames.com/connect/trmnl/desk-crawler/manage` |
| Markup URL | `https://exciting-cormorant-948.convex.site/trmnl/v1/screen` |
| Uninstall webhook | `https://exciting-cormorant-948.convex.site/trmnl/uninstall` |
| Knowledge base | `https://trmnlgames.com/help/desk-crawler` |

## Focus-first rationale

Desk Crawler is designed to be glanced at, not played. The hero adventures every 15 minutes on its own; the screen shows one pixel-art scene, the latest outcome and the hero's health. A QR code back to the companion appears only when the player has to act (setup, full bag). There are no notifications, streaks, timers, urgency badges or reasons to keep refreshing, and nothing is lost by ignoring it for days. Progress never depends on refresh rate, Sleep Mode or playlist position, so it never competes with a user's other plugins. Occasional companion visits (every few days) manage gear; that is optional. Free, no purchases, no ads.

## Reviewer access

- Install from the plugin page; sign up on the companion with any email (one-time code), Google or GitHub. No passwords to share and no special bypass.
- Pick a public name and hero name, click Connect, then Save in TRMNL. The first adventure appears on the next world tick (within 15 minutes).
- Companion: `https://trmnlgames.com/app/desk-crawler` (Desk Crawler is the first game on the TRMNL Games companion). Support: barry@barrymichaeldoyle.com.

## Install video script (≈90 seconds, no audio)

TRMNL asks for the plugin "being installed from scratch", so record with an account that has never used TRMNL Games.

1. TRMNL → Plugins → Desk Crawler → Install → Connect with Desk Crawler.
2. trmnlgames.com: sign up (email code, Google or GitHub), pick a public name and hero name, Connect this TRMNL installation.
3. Back in TRMNL: Save. Show the preview: the first-run screen with the QR code.
4. Scan or open the companion: hero page with the same scene; open the Bag and Rankings tabs.
5. After the next 15-minute tick: force refresh and show the first adventure with "Next adventure HH:MM".
6. Configure: the companion management page for this installation.
7. Optional: a half-size mashup next to another plugin, then the device after its next refresh.

## Before submitting (from [status](../status.md))

Production deploy and URLs, daily backups enabled, one test incident alert (`RESEND_API_KEY` is set), Clerk production OAuth credentials, real-device photo and mashup check, Creator Fund eligibility notes (V10), final icon approval.
