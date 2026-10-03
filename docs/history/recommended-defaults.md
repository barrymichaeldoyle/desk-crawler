# Approved product defaults — 2026-10-03

> **Historical record.** Superseded by the current specifications and [decisions](../decisions.md). Kept for context; do not implement from this file.

Status: Barry approved all six recommendations. D18–D23 record policy and O07–O10 are resolved. Capacity/acquisition numbers are approved tuning baselines; technical proof remains required. This approval does not authorize implementation or external actions.

## 1. Companion management every three to seven days

Target an enjoyable check-in twice a week, with no daily requirement. Start balance experiments with 30 gear slots, including equipped gear, and about five gear finds per healthy day. The two starter items leave 28 slots, an expected 5.6 days before capacity without sales. Measure early-upgrade timing, harder-biome survival and capacity percentiles rather than promise that every player gets exactly six days.

Warn quietly at 24/30 slots. Manual equip/sell/biome decisions remain the useful companion activities. Keep gear comparisons quick and explain capacity before overflow. Rarer acquisition should still produce interesting gold/rest/story outcomes; define their content weights during tuning.

## 2. Sleep only when a new gear find cannot fit

Allow a full bag to continue until the next actual gear find. Keep that find in one held slot, apply that tick's legitimately earned rewards once, then enter an explicit inventory-sleep state. No further encounters or XP while sleeping; already-earned recent XP continues aging out of both rolling windows. No sleep merely because the website has not been visited for 24 hours.

Device text: “Taking a break — bag full. A new find is waiting.” On return the player may review/equip/sell, free space, and claim the held item. Require a deliberate Resume action once the held slot is empty and the bag has at least one free gear slot. Receiving and claiming the item must not depend on today's template values or regenerate its rarity/stats. No missed-tick catch-up; waking joins the next eligible logical tick.

This creates a capacity-dependent stop to progression and supersedes the earlier uninterrupted-adventures promise. Activation and hardware independence remain permanent: device sleep, disconnected installations and refresh never trigger inventory sleep.

Allow inventory review/equip/sell during inventory sleep; manual potions, travel and voluntary pause remain unavailable in that state. Do not repurpose HP rest, voluntary pause or service quarantine as the inventory-sleep state. Clear ownership/race/resume tests remain necessary.

Approved potion rule: keep the separate stack bounded. When it is full, exclude potion rewards before generating a new find and select a documented gold/story outcome instead. Do not create an excess potion and silently sell/delete it. This prevents a full potion stack from forcing sleep while the hero has full HP and the existing UI offers no valid way to consume/sell it. Publish that rule and measure potion supply separately; five gear/day is not a potion-rate target.

## 3. Seven-day ranking on TRMNL, both periods in the companion

Use current-level bands 1–3, 4–7, 8–11, 12–15, then four-level bands. Score actual XP earned within the selected rolling wall-time window. Default TRMNL to seven days: it smooths random encounters and fits occasional play. The companion offers both 24-hour/seven-day views and a secondary lifetime-overall tab. No per-installation period setting in MVP.

Move groups on level-up at the next completed snapshot; carry the hero's earned window XP and clear rank delta for that group change. Include newly activated heroes and zero scores without a full-window waiting requirement. Exact-score ties use activation time, then stable hero ID, as the existing ranking proposal suggests. This gives older activations precedence only on exact ties; report how common ties are in balance evidence.

Use clear labels such as “Last 7 days · Levels 4–7.” A hero can place differently in the two periods, and promotion can change its group rank. The system must show those differences honestly; it is not a claim that level groups remove every gear/biome advantage.

Both recent views and any lifetime generation publish coherently for one tick. Bounded exact score-history and costs need the ranking proposal's engineering amendment. Broad groups may still be thin at launch; render one-player boards deliberately instead of silently merging groups and changing their meaning.

## 4. Gold is a reserve until the merchant

Keep gold acquisition/sale/penalty rules for MVP, but give gold secondary visual prominence. Explain that there is no spending mechanic in this release and merchant purchasing is planned for the next theme. Do not promise a release date or specific future buying power.

Measure gold balances over 30/90 days and design merchant prices against those retained balances. Never wipe accumulated gold to repair launch inflation. Avoid adding a rushed shop/upgrade system solely to give the counter a use.

## 5. Delete the game account and its dedicated Clerk identity

Use a dedicated Desk Crawler Clerk application. “Delete account” should immediately deny gameplay/display authority and hide public identity, then perform a resumable purge of game data and deletion of that application's Clerk user. This does not delete the person's Google/GitHub account or a login record in another application. Confirm authority before the request; do not rely on the browser remaining signed in to finish the job.

Returning players should be able to start a new hero after genuinely fresh, verified installation authorization; deleted progress is not restored. Retain only minimal credential-revocation data while an old credential can still authenticate, with a disclosed purpose/lifetime and no old profile or raw token. A fixed short expiry for that record would be unsafe if the external credential remains valid.

The platform documents non-expiring tokens and same-code token reuse. Therefore fresh-start/relink feasibility remains V09: replayed old codes/tokens alone never constitute fresh authorization, and any reused-token relink needs separately verified current owner authorization. If this cannot be proven, deny reuse rather than promise returning-player access. See [TRMNL installation](https://docs.trmnl.com/go/plugin-marketplace/plugin-installation-flow) and [Clerk deletion support](https://clerk.com/docs/reference/backend/user/delete-user).

Finalize purge completion/backup retention wording with the actual recoverable workflow; do not imply instantaneous erasure from backups or cached e-ink images.

## 6. Simple owner-run support and name moderation

Barry is the first support/admin owner. Use a private support email on the chosen domain for account/name/security reports; public GitHub issues handle reproducible non-private bugs. Do not build chat, a public report feed or a ticketing service for MVP. Set a working response target of two business days without presenting it as guaranteed service availability.

Public-name rules forbid hateful/slur-based names, sexual abuse content, threats/targeted harassment, private contact details and impersonation of players/staff. Use concise examples in onboarding/help, retain technical font/length validation, and avoid a broad automated profanity filter that rejects innocent names.

Admins can immediately mask a reported name after review, assign a safe temporary alias/name, and let the owner choose a valid replacement through a restricted repair flow. Preserve hero progress and gear. Audit actor/reason/time/action/result. Name repair alone should not suspend progression; reserve suspension for deliberate/repeated abuse or compromised authority, with a private appeal path.

Allow users to manage linked sign-in methods within the same Clerk identity. Do not merge distinct game accounts by reported/imported email; start with safe support guidance and documented ownership proof rather than a manual database reassignment.

## Verification boundary

The six policies are approved. Authoritative detail lives in the synchronized gameplay/data/API/ranking/display specifications. Exact balance numbers need measurement; V09 still proves deletion/relink and V04/V05 prove ranking/cost. No services, dependencies or game functions are created by this document.