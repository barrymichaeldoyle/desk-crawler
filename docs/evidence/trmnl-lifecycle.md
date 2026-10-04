# TRMNL lifecycle evidence — A07 (in progress)

## Production second installation, 2026-10-04

Plugin 564, companion `desk-crawler.grandprixpicks.com`, Convex `exciting-cormorant-948`, existing owner/hero. Created fresh plugin setting 495833, linked the account, saved with a 15-minute interval, and followed Configure through the verified management landing. TRMNL recorded a successful render at 13:13:13 SAST (941 ms, 22.6 KB). Then uninstalled only that disposable instance.

Read-only production inspection confirmed setting 495833 `uninstalled`, setting 495747 `active`, both originally `confirmedBy: success_callback`. The original hero persisted; creating a second installation did not issue a second starter kit or reset progress. The new setting was removed before its expected device slot, so its render is not claimed as hardware delivery. [Screenshots and local video](install-demo/README.md) document this flow.

This closes a real second-instance/management/uninstall demonstration. It does not cover every V06 condition: expired/abandoned attempts, wrong owner, delayed callback, and same/different credential reinstall live variants remain open alongside the automated protocol tests.

## Live install, 2026-10-03 (development plugin, Barry's account)

Plugin `Desk Crawler`, status development, plugin setting 495493. App on `http://localhost:3000`, lifecycle and screen on Convex dev `superb-bobcat-74`.

| Step | Observed |
| --- | --- |
| Registration | Form accepts `http://localhost` for Installation and Management URLs. Description limit is **50** characters (docs said 35). Icon optional. TRMNL issues Client ID + Client Secret; the documented code exchange does not use either |
| Installation URL | Browser arrives with `code` and `installation_callback_url`; captured into an encrypted HttpOnly cookie, then redirected to a clean URL |
| Bug found and fixed | Cookie `Path=/connect/trmnl` was not sent to TanStack server functions (`/_serverFn/...`), so finishing reported "installation expired". Fixed with `Path=/` (still HttpOnly, Secure, SameSite=Lax, 20 minutes) |
| Code exchange | `POST https://trmnl.com/oauth/token` with `code` only returned `access_token`; hash stored, raw token discarded |
| Owner link | Grant active for the Clerk owner; pending hero "Baz" + starter kit prepared in the same transaction |
| Save → success webhook | Arrived with Bearer token; body `user.uuid` + `plugin_setting_id`. Instance created `confirmedBy: success_callback`; attempt completed; hero activated once (`eligibleFromTick 1`, `lastTick 0`). Name/email fields in the body are ignored |
| Screen | TRMNL called `POST /trmnl/v1/screen` and rendered the four-key envelope. Preview renders exist at 1872×1404 (TRMNL X) and 800×480 (OG) |
| Rendering finding | The vendored guide's `progress-bar data-progress` form does not render on the hosted framework; 3.4 needs `content` + `track` + `fill` with an inline width (P18 exception). Fixed in template v2 |
| Layout | Minimal layout is legible but vertically centred with empty bands; top-aligned in template v3, not yet re-verified on a fresh render (forced refresh needs TRMNL's own control) |

Not yet exercised: uninstall, management/JWT landing, second instance, reinstall, lost-callback recovery, expired attempt, wrong owner (V06 matrix).
