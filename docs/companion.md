# Companion application plan

[API](api.md) owns function contracts; [decisions](decisions.md) own policy.

## Platform and visual direction

TanStack Start + Vite on Cloudflare Workers, React, Clerk, Convex reactive queries. The web app is mobile-first and keyboard-accessible. A basic web app manifest ships with the icons; offline support and game mutations are not an MVP feature. Favicons, app icons and the social card are generated from the marketplace icon art by `pnpm tsx tools/art/web.ts` into `public/`.

Tone: an office adventure ledger with original pixel hero artwork, legible typography and clear action labels. Device art may be monochrome; the web UI may use restrained color. Do not make every stat a competing dashboard card. Hero state and latest story come first; inventory and rank are secondary.

Use semantic HTML, visible focus, labeled buttons, sufficient contrast, 44px touch targets, reduced-motion support and appropriate live-region messages for actions. No sound or nagging prompts. Specific visual comps are an implementation design task, not created in this planning phase.

## Routes and information hierarchy

| Route | Audience | Main content |
| --- | --- | --- |
| `/` | Public | TRMNL-focused promise, labeled static/sample adventure, “Install on TRMNL”; no persistent demo hero |
| `/sign-in`, `/sign-up` | Public | Clerk controls with safe local return destinations |
| `/onboarding` | Authenticated, no activated hero | Public alias/name/timezone; begin or resume TRMNL installation; pending starter preview and Save guidance |
| `/app` | Authenticated | Hero, latest outcome/log, HP/XP/status, unlocked biome control |
| `/app/inventory` | Authenticated | Equipped weapon/armor, comparison, bag, potion, overflow explanation |
| `/app/leaderboard` | Authenticated | 24-hour/seven-day level-group Top 100, secondary lifetime, exact scoped rank/score, period/group/freshness |
| `/app/connections` | Authenticated | Install TRMNL, existing instances, disconnect, connection help |
| `/app/settings` | Authenticated | Timezone, pause/resume, account-deletion flow |
| `/connect/trmnl/install` | TRMNL landing | Pending install → auth/onboarding → hero link → callback |
| `/connect/trmnl/manage` | TRMNL landing | Verified short-lived management handoff → auth → owned connection |
| `/help/trmnl` | Public | Setup, save/playlist step, delayed refresh, reconnect/uninstall |
| `/privacy`, `/terms`, `/support`, `/changelog` | Public | Privacy policy, terms of use, launch support and release notes |
| `/admin` | Verified admin | Tick/board health, failures, cleanup, guarded recovery |

Mobile navigation: Hero, Bag, Rankings, Connections; settings under account menu. Desktop may use a compact side navigation. No guild/daily/merchant placeholders in MVP.

## Onboarding

Sign in before creating game state. Ask for a public alias separately from imported Clerk/TRMNL real names. Explain that leaderboard/device aliases are public to other players. Hero name has a default suggestion but can be edited before creation.

No class chooser when there is one class. Show the Warrior's simple identity and starter kit. Timezone is inferred in browser and validated server-side, with UTC fallback and an editable control.

A website visitor begins the TRMNL marketplace installation before creating a hero. Preserve name/alias choices through the secure flow. After explicit owner confirmation and verified server-side code exchange, `heroes.create` consumes the owned install-attempt ID and prepares one pending Warrior with starter kit/welcome. Use an operation ID and disable duplicate clicks.

Return to the exact validated TRMNL callback, explain Save, and show “Save in TRMNL to start adventures.” Authenticated saved-instance confirmation activates the prepared hero for the next eligible tick. Pending time earns no rewards or rank. Expiry offers restart against the same pending hero, never a second kit; lost-callback recovery follows V06.

Own queries expose pending activation so every private route can show setup guidance. Gameplay controls reject pending heroes at the backend as well as the UI. Settings, connections, support and deletion remain available. After activation the companion works even when every installation is disconnected.

## Hero screen

Lead with sprite/name, level and readable status (“Exploring the Server Room,” “Resting,” “Revives in 3 ticks”). HP and XP are both bar + numbers, with no color-only meaning. Gold is secondary; explain it has no MVP spending use and is retained for planned merchants.

Latest outcome is prominently readable; below it show a reactive recent log with local time. Do not animate each refresh or auto-scroll while someone reads older entries. History beyond retained rows ends with a clear retention note.

Approved return recap (D25): show level/earned-XP gains since the previous acknowledged visit with its date, current unequipped bag gear available to review, held find and current attention/status. Use one server checkpoint and [guarded acknowledgement](build-readiness.md#a-compact-return-summary) after visible rendering; keep this visit's recap stable. No historical-log scan, longer log retention, hidden-tab/SSR acknowledgement or assumption that all bag gear is new. First visit is a welcome; sleep/service delay explains why progress stopped and links to the relevant action. The recap changes neither rewards nor wake eligibility.

Biome control shows unlocked choices and locked requirements. Explain travel arrives on the following logical world tick, with no reward on arrival; an already running evaluation may also observe waiting travel. Selection while already travelling/dead/paused/sleeping is disabled with explanation. A boundary-race rejection re-reads state and explains the updated status.

Use potion shows available count and projected heal. Hide or explain unavailable/full-HP cases. Manual actions affect live web state promptly; e-ink will reflect them on its next scheduled render.

## Inventory

Show the two equipped slots and a simple bag list. Item details: name, rarity word, slot, level requirement, stat and sale value. Equipped references are authoritative; comparison uses the same shared stats logic as the backend.

Equip swaps slot gear without increasing bag count. Unequip is permitted. Sell has an intentional confirmation for rare gear, while common/uncommon sales may use a simple clear action. Multi-select sale shows the item count, total gold and any rare items before one confirmation. Keep the same operation ID when retrying a submitted sale; do not claim an “undo” unless the backend supports reversal.

At 24/30 gear, quietly warn that storage is filling. At 30/30 continue until the next gear find, then preserve that item in the held slot and show inventory sleep. Offer bag review/equip/sell, including multi-select sale of chosen items (`sellMany`), claim once space exists, and Resume when no held item and at least one slot free. Resume includes an optional destination picker of unlocked biomes, so one visit can manage gear and move on (D29). Explain that claiming into the last free slot requires another sale before Resume. Wake joins the next eligible tick, no catch-up. No gear is auto-sold/expired. Potion cap selects gold before new-potion generation; no potion-overflow sale or sleep.

## Leaderboard and privacy

Default ranking view: Last 7 days in the hero's captured current-level group; toggle Last 24 hours or secondary Lifetime. Show XP earned/group/period/cutoff and exact own rank outside Top 100. Browsing another group returns no unrelated personal rank and links back to the own group. Promotion carries window XP and clears delta; new/zero-score heroes need no waiting period. Lifetime still uses level/current XP.

Pending hero: “Save in TRMNL to start adventures.” First snapshot/activated new hero: “Ranking within the hour.” Dormant hero (D32): “Unranked while adventures are stopped” with its lifetime rank still available. Rankings refresh hourly; label each board's as-of time. Zero-player board: deliberate empty state. Suppressed users: masked placeholder/gap consistent with snapshot ranks. Never show emails, Clerk IDs or raw TRMNL names.

Barry confirmed a required public pseudonym and no automatically imported real name. Disclose public leaderboard visibility during onboarding. There is no ranking opt-out in MVP; any future change requires updating eligibility and the contract.

## Connections

Explain that saving a TRMNL installation starts the hero once; continued connectivity is not required afterwards. Installation link starts the public Third Party flow; it does not ask users to copy Liquid or a polling URL. List paginated **plugin instances**, not physical devices unless device identity is actually known. Use bounded Load more rather than fetching all historical installations.

States: linked/waiting for TRMNL Save, confirmed, locally disconnected, uninstalled, connection needs repair. Show “Last data served to TRMNL” only if telemetry exists; it proves neither rendering nor display. Follow the [display journey](trmnl-experience.md), including expired attempts and explicit owned repair.

Disconnect requires a short confirmation because it revokes that installation locally; hero keeps progressing unless the user separately pauses it. “Back to TRMNL” uses a server-validated plugin setting ID when available. Offer “Back to TRMNL” and a separate “Refresh preview in TRMNL” when the validated setting ID is known. Only the latter uses `force_refresh=true` when clicked, consuming manual-refresh allowance without promising instant hardware delivery. Do not attach it to ordinary navigation. [Refresh return link](https://docs.trmnl.com/go/plugin-marketplace/plugin-management-flow)

## Error/loading/offline states

| Situation | UI behavior |
| --- | --- |
| Auth loading | Stable shell, avoid signed-out flicker |
| Query loading | Layout-preserving skeleton, no invented zero stats |
| Browser offline | Show last visible state with offline label; disable intents |
| Pending activation | Starter preview and Save/resume-install guidance; no tick countdown, earned progress or gameplay controls |
| Expired install attempt | Restart the TRMNL installation for the same pending hero; no extra starter kit |
| Invalid mutation state | Explain current state; refresh reactively; no optimistic rewards |
| Expired management token/flow | Offer restart via TRMNL Configure/install |
| Connection linked to another account | Explain account mismatch; never auto-merge |
| Stale world/run | “Updates delayed,” last complete tick/time, usable read views |
| Quarantined hero | Service pause explanation and support path; no repeated action retry |
| Dead hero | Recovery countdown and safe return destination; no paid revive button |
| Sleeping hero | Bag/held-find review, multi-select sale, claim and explicit Resume with optional destination; XP stopped, window XP ages out, scheduled-wake label |
| Paused hero | Clear pause badge, voluntary resume action; no catch-up |

No offline queue of sell/potion commands. Unknown-outcome requests may retry their original operation ID within the 24-hour receipt horizon. Beyond it, re-read state and require a deliberate new intent; never automatically replay an old potion/sale.

## Auth and caching boundaries

Use current Clerk TanStack SDK middleware/provider and Convex token integration, with email + Google + GitHub sign-in as confirmed. Verify current Vite/Workers support in the foundation spike. SSR data clients are request-scoped; private pages and serialized hero data cannot be public-cacheable. Clerk route guards are supplementary to backend authorization.

Pending install and management handoff state use secure short-lived HttpOnly cookies. Do not place raw bearer tokens in browser local storage or URLs. Scrub landing query strings and logs containing installation codes/JWTs. Return URLs must be local/allowlisted.

## Art brief

Warrior: a tiny office adventurer wielding a letter opener and wearing a cardigan. Two original monochrome sprite states (idle, dead/recovering), square source art with transparent or clean white background, readable at small size, no fine gray outlines. Provide title icon and immutable filenames with license/source notes. Generate art only during implementation/design authorization.

## Display help and cached images

`/help/trmnl` includes Save/playlist/mashup, dated snapshots, slower refresh/sleep, account mismatch and repair using the [diagnosis table](trmnl-experience.md). A companion preview is game data unless it is an actually generated TRMNL image.

Disconnect/deletion explains future access is revoked but generated/displayed e-ink images cannot be remotely erased. Provide user-controlled playlist removal/replacement guidance. Keep hero pause separate from Sleep Mode.

Timezone changes call `users.setTimezone` and affect formatting only, not logical deadlines/rewards. Public names have a supported-character policy; imported instance labels fall back/truncate safely.

Public-name policy is approved (D23): forbid hateful/slur-based names, sexual abuse content, threats/targeted harassment, private contact details and impersonation. Barry initially handles private reports through the support address barry@barrymichaeldoyle.com (D36), targeting two business days; public GitHub issues are for non-private bugs. Admin temporary masking and restricted owner replacement preserve progress and increment name version; normal rename is deferred. Suspension is separate and audited; provide a private appeal path, no chat/ticketing service.

Deletion is game + dedicated Desk Crawler Clerk identity (D22). Explain immediate denial/masking, resumable live-data/provider purge and disclosed minimal revocation while tokens remain usable. A fresh start requires new verified authorization; V09 still proves safe token reuse/returning-player behavior. No promise of cached-image/backup erasure on request.
Restricted name repair shows a focused replacement form only when admin-required, validates required alias/hero fields, and preserves all game assets. Managing sign-in methods must keep the same Clerk subject; never merge separate game accounts by imported/reported email. Account/provider removal cannot bypass the durable game-deletion workflow.
