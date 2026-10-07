# Companion and backend API contracts

These are planned Convex function contracts. Public companion functions use Clerk authentication unless explicitly stated. HTTP contracts are in [TRMNL integration](trmnl.md).

## Desk keepsakes (D46, implemented locally)

`keepsakes.mine({})` returns only the authenticated activated owner’s `{ totalCollected, lastClaimWeek, nextAvailableAt, connected }` or null. It contains no claim code; next availability derives from the last server-selected claim week, not a wall-clock read in the query.

`keepsakes.claim({ operationId, code })` returns `{ operationId, changed, outcome: claimed | already_claimed | invalid_code, totalCollected }`. Current owner/week/connection are resolved server-side; current or prior-week codes award at most once in the current UTC week. Codes are six digits (D73); letter codes from earlier screens are accepted until 2026-10-19. Invalid codes return a definite outcome and commit the limiter/receipt; ten wrong codes in a UTC day return `RATE_LIMITED` for the rest of that day, and `RATE_LIMITED` otherwise retains the normal intent contract. No gameplay or ranking changes. Both account and game deletion deny the operation. [Full contract](playlist-retention.md).

## Common intent contract

State-changing companion functions receive `operationId` (client-generated UUID, retained across retries) alongside the listed arguments. For gameplay intents, server resolves the user's active hero; clients do not send a user ID or authoritative stats. Item IDs identify an intent but never prove ownership.

Every mutation performs identity/revoked-auth-hash/owner-state checks, receipt lookup, validation, rate limit, state change and successful receipt. Append an appropriate hero/audit event when state changes and a hero exists; onboarding/settings do not require an invented hero log. Gameplay intents first require `activationState: active`, otherwise reject with `TRMNL_REQUIRED`; quarantined heroes reject with `SERVICE_PAUSED`; settings/disconnect/deletion remain available; own read/support views remain available. The same operation ID + arguments returns the original result, including if a network failure hid the first result. A different operation/argument hash for that ID returns `OPERATION_CONFLICT`.

Companion visit acknowledgement is presentation bookkeeping: no hero log/reward/rank changes, and it remains available during pause/sleep/quarantine under active-owner authorization. It uses the same operation-ID/receipt rules.

Error contract: `{ code, message, retryable, retryAfterMs? }` through a structured Convex error. User-visible messages are short; include no stack, token, private identity or internal document details. Successful state-changing results return `{ operationId, changed, ...resultFields }`.

Failures are not receipts for successful operations. Transport retries are bounded; do not retry a rejected state/ownership validation blindly.

## Public queries

| Function | Arguments | Result | Bounded reads |
| --- | --- | --- | --- |
| `users.me` | none | public alias, legacy timezone (D39), owner/game state, sanitized hero name/status/activation state, analytics consent, `hasActiveInstallation` | Identity index + user/current game profile/hero + first owned active installation + revoked-identity hash lookup when no user row exists |
| `heroes.mine` | none | sanitized hero state including activation state, derived stats, XP threshold, biome unlocks, stance and every stance's thresholds and victory XP share (D76), `merchantTicksLeft` (D78), server tick/health | User + active hero + bounded equipped items/world/run |
| `heroes.returnSummary` | none | Nullable visit baseline, observed level/lifetime XP/log sequence, nullable gains, current bag/unequipped counts, held name and status/wake/simulation state | Own user + current hero + <=32 inventory rows; no history scan |
| `heroes.recentLog` | `paginationOpts` | Own log page with id/time/tick/kind/summary/source and display deltas; continuation. Additive `deltas.potionsFound` is 0 or 1, derived from the stored loot outcome, including same-tick use. No raw simulation detail | Hero-index page |
| `inventory.mine` | none | Bag gear (≤20 unequipped) + equipped + ≤1 held gear + ≤1 potion stack, equipment/held IDs, capacity/used, D61 `ladder` (current bag name; next bag with capacity, price, milestone and whether it can be bought now) and wake readiness | Hero inventory index |
| `achievements.mine` | none | Catalog/evaluated versions, own unlock rows (`id`, `unlockedAt`), one progress row per family (tier, earned id/name/blurb/date, next tier, value/target) and the current publication's rarity tally (`counts`, `totalPlayers`, `scoreAt`) or null before the first publication (D65) | User + active hero + ≤1,024 unlock rows + keepsake row + publication + stats document |
| `leaderboard.view` | board overall/recent_24h/recent_7d (default recent_7d), optional validated cohort | Scoped Top 100, own rank/score/delta if in selected group, period/cohort/group/global counts and as-of | Published set + own scoped row + selected generation + bounded privacy masking |
| `trmnl.myConnections` | limit 1–20, cursor? | Instance page/continuation plus <=5 recent pending attempts; UUID/label/state and validated return link | Own instance page + bounded own pending-attempt index; never token/hash |
| `admin.health` | none | operational run/cost/cleanup summary | Admin authority + bounded recent rows |

No unbounded public hero lists, arbitrary hero-ID reads, or public token lookup function. Public shareable hero profiles are Month 3.

## Public mutations

`users.setAnalyticsConsent({ allowed: boolean })` is a D67 presentation/support preference, outside the operation-ID receipt contract. It resolves the caller from authentication, updates only an active owner's optional `analyticsConsent`, and returns null. No hero log, reward or advancement. See [analytics](analytics.md) for browser consent and server event semantics.

| Function | Arguments (plus operation ID) | Behavior / result | Preconditions |
| --- | --- | --- | --- |
| `users.ensure` | `publicAlias`, `timezone` for first onboarding | Upsert server-derived identity; return user ID | Signed in; normalized alias unique |
| `users.setTimezone` | `timezone` | Legacy compatibility endpoint; validate IANA timezone, same value no-op; absent from current UI (D39) | Active signed-in owner; no game advancement |
| `heroes.create` | `name`, `installAttemptId` | Prepare pending Warrior + starter kit/welcome; return hero ID and activation state | Active user; no current hero; owned unexpired server-verified TRMNL attempt and active grant |
| `heroes.recordCompanionVisit` | `expectedLogSequence` | Capture current server level/lifetime XP/sequence/time; receipt replay idempotent | Active signed-in owner and activated hero; guarded sequence; no game advancement |
| `heroes.changeBiome` | `biomeId` | Set one-tick travel; return arrival tick | Exploring/resting; destination unlocked |
| `inventory.usePotion` | no item ID needed for one potion kind | Consume one; return healed HP | Exploring/resting, below full HP, potion available |
| `inventory.equip` | `itemId` | Equip bag gear and return derived stats | Owned non-held gear, required level; exploring/resting/sleeping |
| `inventory.unequip` | `slot: weapon | armor` | Clear slot; empty slot is no-op | Exploring/resting/sleeping; a free bag slot (`BAG_FULL`, D61) |
| `inventory.buyBag` | `tierId` | D61: spend the tier's gold price, set the hero's bag capacity, log the purchase with `bagSlots`. The client names the bag it saw; a changed offer is refused | Exploring/resting/sleeping; `tierId` is the next tier and at most one ahead of the guaranteed tier (`BAG_UNAVAILABLE`); enough gold (`NOT_ENOUGH_GOLD`) |
| `inventory.sell` | `itemId` | Sell one bag gear item; return awarded gold | Owned unequipped non-held gear; exploring/resting/sleeping |
| `inventory.sellMany` | `itemIds` (1–30 distinct) | Sell every listed bag item atomically; return total gold and count. Any invalid item rejects the whole request with no sale | Each item owned, unequipped, non-held gear; exploring/resting/sleeping. Counts as one committed intent for rate limiting |
| `inventory.buyPouch` | `tierId` | D77: spend the pouch tier's gold price and set `potionCap`; log the purchase | Exploring/resting/sleeping; the tier must be the next early one |
| `inventory.buyOffer` | `offerId: potions \| pouch \| bag` | D78: buy one merchant offer once; potions join the stack, a pouch or bag sets its cap; the visit closes after its last offer | Exploring/resting/sleeping; open unexpired visit; gold; a potion bundle must fit the pouch |
| `inventory.claimHeld` | none | Clear held reference, preserve same item/stats | Sleeping, held find exists, at least one free bag slot |
| `inventory.resumeAdventures` | `biomeId?` | Set next-tick wake deadline and optional pending destination (D29); return wake tick and arrival tick if travelling. Repeating with the same arguments while wake is pending is a no-op; a different destination replaces the pending one before wake | Sleeping, no held item, at least one free bag slot; destination unlocked and not the current biome |
| `users.replacePublicNames` | required alias/hero replacement fields | Validate restricted repair, increment public-name version, clear completed repair flags; preserve progress | Active owner with admin-set repair requirement; not ordinary rename |
| `heroes.pause` | none | Save exploring/resting status and pause | Already paused is no-op; dead/travelling/sleeping rejected |
| `heroes.setStance` | `stance: cautious \| balanced \| bold` | Set the sustain stance (D76); counts `stanceChanges` and logs a command story | Any gameplay status; quarantined rejected; current stance is a no-op; unknown stance rejected |
| `heroes.resume` | none | Restore prior status; no catch-up | Exploring/resting already unpaused is no-op; sleeping uses resumeAdventures |
| `trmnl.disconnect` | `instanceId` | Tombstone that instance, preserve hero | Own instance; repeated disconnect no-op |
| `deletion.requestDeletionEmail` | None; authenticated action | Reserve a confirmation and email the verified primary Clerk address; no deletion | Own account; one request per 30 minutes |
| `deletion.requestDeletion` | `operationId`, `confirm: DELETE`, email `token` | Disable authority/mask public names; start durable whole-account deletion | Same signed-in identity, delivered/unexpired email proof and explicit POST |

No manual revival, policy editing, ordinary rename, buy merchant item, spell, prestige or guild mutation in MVP. Unused controls must not appear disabled in the web UI as if they are implemented.

Return-summary first visit/pending setup has no invented delta. Earned XP is the lifetime-XP difference; current gear counts do not claim every item is new/unreviewed. `recordCompanionVisit` rejects a stale observed sequence with `RECAP_CHANGED` before writes. The client renders refreshed data before a bounded retry; it never submits authoritative checkpoint stats. No SSR/prefetch/hidden-page/device acknowledgement. Keep the displayed recap stable for the current visit. Full [recap semantics](build-readiness.md#a-compact-return-summary) apply.

Potion sale and equipment swapping while dead/travelling are deferred. Bag equip/unequip/sell work in exploring/resting/sleeping so storage can be managed. Held gear must be claimed before equip/sale. Potion use, `changeBiome` and voluntary pause remain exploring/resting-only. Wake schedules next-tick eligibility, not an immediate encounter. A sleeping hero chooses its next biome through `resumeAdventures(biomeId)`: on the wake tick it begins travelling instead of rolling an encounter and arrives on the following tick, matching ordinary travel.

## Public actions for TRMNL UI

| Function | Authority | Input / output |
| --- | --- | --- |
| `trmnl.completeInstall` | Clerk identity + valid TRMNL install code | `code`, `gameSlug`, legacy `timezone`, optional `publicAlias`/`heroName` and D67 `analyticsConsent`; exchange remotely, link hash/attempt internally, return `activationState` and `heroCreated`. The web server holds the validated callback URL in its encrypted cookie and returns the approved redirect |
| `trmnl.prepareManagement` | Valid TRMNL signed management JWT | UUID/JWT; validate against TRMNL JWKS, create short-lived handoff, return opaque handoff token + expiry |
| `trmnl.claimManagement` | Clerk identity + opaque handoff | Atomically claim only if linked owner matches; return own connection management destination |

Actions are not single transactions. Token exchange is retried only because TRMNL documents repeated code exchange returns the same token; linking still checks hash uniqueness and owner identity. `completeInstall` never returns the raw installation token to the browser.

Management verification alone does not grant gameplay-mutation authority. The user signs in with Clerk to manage the previously linked account. A TRMNL UUID cannot be used to take over a different companion user.

## Internal functions

| Function | Purpose |
| --- | --- |
| `sim.startTick` | Guard and create one logical run per accepted wall slot |
| `sim.simulateBatch` | Process page under run/sequence guard |
| `sim.watchdog` | Inspect active run/scheduled job and recover or block |
| `leaderboard.beginBuild`, `buildBatch`, `publish` | Build all scoped recent/lifetime generations and atomically promote their complete publication |
| `trmnl.linkGrant` | Owner-preserving grant upsert after code validation |
| `trmnl.confirmInstance` | Idempotent authenticated success/first-render lifecycle; atomically activate an existing prepared hero under authorized install intent |
| `heroes.activateForConfirmedInstallation` | Internal transaction helper shared by confirmation and the completed-attempt creation race; proof checks and first-activation baseline only |
| `trmnl.uninstallInstance` | Tombstone UUID without deleting hero |
| `trmnl.payloadForInstance` | Fixed-cost canonical payload query under trusted grant/instance authority |
| `maintenance.cleanupBatch`, `purgeAccountBatch` | Bounded retention and durable game/provider deletion continuations |
| `admin.resumeRun`, `releaseHero` | Guarded recovery, reason required, audit event |
| `admin.repairPublicNames`, `suspendUser`, `restoreUser` | Verified admin, bounded reason/target, atomic name version/mask or state change, audit; never reset progress |

Never call internal functions directly from browser/Workers clients. A public authenticated action/server-facing contract mediates the authority and calls internals inside Convex.

## Rate limits and validation

Proposed defaults:

- Committed hero intents: 60 per 10 minutes per user; stricter creation/install limit of 5 per 10 minutes. A rejected mutation rolls back its in-transaction limiter write; do not claim this counts every invalid attempt.
- Alias/name length, biome IDs, gear quantity/stat invariants and operation IDs checked server-side.
- Invalid/expired install codes and management JWTs rejected without creating grant/hero state.
- Render credentials grant read-only screen/payload authority. The documented one-time lifecycle activation consumes prior Clerk-authorized install intent and prepares next-tick eligibility; it grants no simulation rewards. No companion gameplay intent is authorized by a TRMNL bearer.
- Screen endpoints remain tolerant of ordinary polling and manual refresh; a static user-agent or IP range is not authentication.

Rate limits must cover direct public Convex function calls as well as web routes. An edge-only rate limit cannot protect a mutation callable through the Convex SDK. Select one atomic limiter implementation in the foundation package; document window semantics and retry behavior. External-call actions use a separate committed preflight limiter before token/JWKS network work, with cheap input validation first. Do not persist “failed attempts” by throwing after a limiter write in the same mutation transaction.

## Stable error codes

`UNAUTHENTICATED`, `ACCOUNT_UNAVAILABLE`, `HERO_EXISTS`, `HERO_NOT_FOUND`, `INVALID_INPUT`, `ALIAS_TAKEN`, `INVALID_STATE`, `BIOME_LOCKED`, `ITEM_NOT_AVAILABLE`, `ITEM_EQUIPPED`, `ITEM_HELD`, `BAG_FULL`, `BAG_UNAVAILABLE`, `POUCH_UNAVAILABLE`, `POUCH_FULL`, `MERCHANT_GONE`, `OFFER_UNAVAILABLE`, `NOT_ENOUGH_GOLD`, `HELD_ITEM_PENDING`, `NAME_REPAIR_REQUIRED`, `LEVEL_REQUIREMENT`, `NO_POTION`, `FULL_HP`, `RATE_LIMITED`, `OPERATION_CONFLICT`, `INSTALL_INVALID`, `TRMNL_REQUIRED`, `CONNECTION_CONFLICT`, `CONNECTION_UNAVAILABLE`, `MANAGEMENT_EXPIRED`, `SERVICE_PAUSED`, `RECAP_CHANGED`.

Unknown transient backend errors map to a retryable generic service message. Do not classify a programmer invariant failure as an endlessly retryable user operation.

## Compatibility

Add optional fields/functions without changing existing meaning. Mutations should avoid returning complete database documents; return stable result fields and let reactive queries refresh views. Version any breaking external HTTP contract at the URL and payload level. Old TRMNL templates must continue to work during backend/web deploy ordering.

## Retry lifetime and settings consistency

Receipt idempotency lasts 24 hours. Retain original operation ID/arguments and first-submitted time for a bounded retry. Beyond that horizon stop automatic replay, refresh authoritative state and require a deliberate new intent if desired. An expired receipt cannot prove a potion was not already consumed.

`users.ensure` creates onboarding data; retries never reset an existing alias, timezone or owner state. `users.setTimezone` retains receipt/authority/validation rules for older clients only (D39). Current onboarding supplies UTC to the legacy backend argument without collecting a browser timezone; companion times use the browser's local timezone. Settings are not gameplay intents and remain available during quarantine; suspended/deleting accounts still fail authority. Disconnect/deletion likewise remain accessible during quarantine.

The installation action enforces callback allowlists at its own boundary, not only UI logic, and records the bounded attempt. Management verification uses only configured HTTPS JWKS: bounded fetch/cache, one unknown-key refresh, no JWT-supplied key URLs. It never extends an expired TRMNL token; verified landing creates our handoff.

## Activation gate and retry behavior

`installAttemptId` is a server record reference, never proof by itself. `heroes.create` validates Clerk owner, grant, expiry and attempt state inside the transaction. Pending attempts prepare a draft; completed attempts additionally verify the matching active confirmed instance and may activate immediately through the same helper. No-install, foreign-owner, stale, revoked or fabricated attempts fail without hero/item writes.

If a pending hero already exists, restart installation against it using `trmnl.completeInstall`; do not recreate it or award a second kit. A duplicate create receipt returns its original result. Saved-instance confirmation atomically activates that current pending hero at most once; an account without a prepared hero stays unlinked. Additional connections never alter activation/tick markers.

Own reads/settings/connections/deletion work during pending setup. Every gameplay mutation checks persisted activation, including direct Convex SDK calls. The canonical payload query only reads state; activation belongs to the preceding trusted lifecycle transaction. See [activation invariants](data-model.md#trmnl-exclusive-activation-invariant).

## Approved moderation and deletion boundary

Barry initially owns support/admin; private support email handles account/name reports, public GitHub issues handle non-private bugs, two-business-day response target. Admin repair assigns safe temporary names and repair flags/version; owner replacement is restricted to those flags. Ordinary rename stays deferred. Public reads mask stale name versions until refreshed, even after owner repair completes; all admin decisions are audited.

`deletion.requestDeletionEmail({})` reads the verified primary address from Clerk; no client can supply a recipient. A transactional indexed reservation deduplicates requests across tabs and concurrent actions. The email and its confirmation expire after 30 minutes. Retries use an immutable message and Resend idempotency key, with at most three attempts. Failed delivery does not start deletion or bypass the cooldown. `deletion.deletionEmailStatus({})` returns only the requesting identity's delivery state, recipient and expiry, never the secret or hash.

The `/account/delete` loader seals the email token into an encrypted HttpOnly/Secure/SameSite cookie and redirects to a clean URL. GET and email scanners never delete or consume the proof. The page and server functions use no-store responses; the page is noindex/no-referrer, and its contents are blocked from replay. The final explicit POST requires sign-in to the requesting account and typing DELETE. `deletion.requestDeletion` rejects former immediate calls without email proof. Confirmation consumes the proof and commits authority denial plus the durable job atomically; a consumed-proof retry acknowledges the already-started deletion without another job. The email reservation alone leaves the account active. Clerk direct self-deletion must be disabled during rollout; signed provider/admin `user.deleted` webhooks still reconcile genuine provider deletions.

Shared Clerk deletion is a retryable external step after denial, not a client action; completion does not depend on a logged-in browser. Finalization deletes the account's intent rate buckets and email records and scrubs exact user/hero/Clerk/identity references from administrative audit actors and targets in indexed batches. Minimal revoked hashes persist while external tokens remain usable; old code/token alone never authorizes a fresh start. V09 is still required for any returning-player relink exception. `internal.deletion.scrubDeletedAccountReferences` repairs old completed deletions only when the account is absent and its auth revocation exists.

Clerk user.deleted events use a verified signed webhook to enqueue the same idempotent deletion workflow when provider-side deletion occurs first. Register POST /auth/clerk/webhook in Convex through the integration lead; verify configured signing secret and bounded body before trusted mutation. No unsigned/client claim starts another owner's purge. Revoked-auth hash checks prevent stale JWTs from recreating purged identities. This mechanism is part of V09 proof, not a live integration.

Provider events are asynchronous and can arrive more than once or out of order; deletion/revocation is terminal for that Clerk subject, so late create/update events cannot restore authority. V09 must exercise duplicates, delayed delivery and failed-delivery recovery before promising provider-side deletion completion. See [Clerk's delivery contract](https://clerk.com/docs/guides/development/webhooks/overview) and [signature verification](https://clerk.com/docs/reference/backend/verify-webhook).

## D54 device activity recap

`trmnlPayload.mine` and the authenticated installation screen share the same nullable additive `recap` projection. It summarizes a separately bounded twelve-hour history read, independent of the ten recent stories and of `heroes.returnSummary`/`recordCompanionVisit`. The device projection never changes the companion checkpoint. No new registered public function or client-supplied authority is added; missing/cross-owner/deleting/pending identities retain their existing denial/null behavior. See [device contract](trmnl.md#d54-device-recap-template-v25-candidate).

## D69 returning-player reconnection

`trmnl.completeInstall` now optionally returns `reconnectionRequired: true` after a revoked-token exchange; it reserves a draft instead of creating a profile. The web page preserves its validated callback/cookie and shows Save → Configure instructions. Normal installation results are unchanged.

| Public function | Inputs | Authority / result |
| --- | --- | --- |
| `trmnl.reconnectionStatus` (query) | none | Clerk-owned draft only: ID, names, draft/proof expiry and verified UUID; never hashes or raw JWTs. Reactive query returns expiry fields; mutations enforce deadlines. |
| `trmnl.verifyReconnection` (action) | `attemptId`, `uuid`, `jwt` | Authenticated Clerk identity plus freshly verified TRMNL RS256 JWT, correct audience/subject/kid/iat/exp; internal mutation rechecks owner, identity revocation, draft deadline and UUID ownership. Opening does not create or activate game data. |
| `trmnl.completeReconnection` (mutation) | `operationId`, `attemptId`, `confirm: CONNECT` | Same owner and live proof; one atomic UUID-scoped connection and fresh profile/hero if absent, existing progress preserved, activation and receipt deduplicated. Foreign/live-owned UUIDs denied. |

`trmnl.recordReconnectionProof` is internal and accepts identity/timestamp only from the verifying action. Callback/first-screen recovery still cannot authorize revoked tokens for unknown UUIDs. A pending reconnect permits a Save callback acknowledgement without creating state; polling remains 404 until the explicit confirmed scope exists. See [returning flow](trmnl.md#returning-after-deletion-d68).
