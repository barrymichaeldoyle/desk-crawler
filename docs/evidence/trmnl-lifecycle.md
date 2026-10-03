# TRMNL lifecycle evidence — A07 (in progress)

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
