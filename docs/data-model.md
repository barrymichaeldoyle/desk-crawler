# Planned Convex data model

This specifies the eventual `schema.ts`; no application schema is implemented during planning. IDs below are typed Convex table IDs. Timestamps are UTC epoch milliseconds, ticks/counters/stat values are safe integers, and optional fields must be omitted rather than written as `undefined`.

Each table gets explicit argument/return validators. Status, item slot, rarity and event detail are extendable string unions with schema versions. Avoid `v.any()` for gameplay data.

## Identity and hero ownership

### `deskKeepsakes` (D46)

One fixed-size row per player: `userId`, `totalCollected`, `lastClaimWeek`, `lastClaimedAt`; index `by_userId`. The ordered twelve-design shelf and repeated-copy counts derive from the safe-integer total. No unbounded array or claim-history table. Both account and game deletion deny reads/claims immediately and purge this row in their bounded jobs. `operationReceipts.result.keepsakeOutcome?` records claimed/already-claimed/invalid-code outcomes; invalid guesses commit their rate-limit charge. `trmnlInstances.by_userId_and_state` finds the active code grant without scanning historical tombstones. See the [authority contract](playlist-retention.md#authority-and-storage).

### `users`

Fields: `tokenIdentifier` (Clerk issuer + subject identity), `publicAlias`, `normalizedAlias`, `timezone` (legacy compatibility field, validated IANA, UTC for new installs; no current UI preference, D39), `state: active | suspended | deleting`, `createdAt`, `activeHeroId?`, `deletionRequestedAt?`, `publicNameVersion` (initial 1), `nameRepairRequired?` (bounded alias/hero-name field set).

Indexes: `by_identity[tokenIdentifier]`, `by_alias[normalizedAlias]`, `by_state[state]`.

Check a minimal revoked-auth-identity hash before upsert/authorization, including after user-row purge. Do not store email, TRMNL real name or extra Clerk profile fields merely because they are available. User is upserted through an authenticated onboarding mutation. Admin permissions use a server-controlled allowlist/verified claim rather than a client-editable `isAdmin` field.

### `heroes`

Fields:

- Ownership: `userId`, `name`, `class: warrior`, `createdAt`, `isActive`, `schemaVersion`.
- Activation: `activationState: pending_trmnl | active`, `activatedAt?`. Proposed separate entry gate; `isActive` still means the current/non-retired hero, and gameplay `status` remains the six-state union including inventory sleep.
- Progress: `level`, `xp`, `lifetimeXp`, `hp`, `gold`, `lastLevelUpTick`.
- State: `status: exploring | resting | travelling | dead | paused | sleeping`, `biomeId`, `targetBiomeId?`, `arriveAtTick?`, `reviveAtTick?`, `pausedFromStatus?`, `wakeAtTick?` (sleep-only, explicit resume deadline). While sleeping with a pending wake, `targetBiomeId` may hold the D29 Resume destination without `arriveAtTick`; the wake evaluation converts it to ordinary travel.
- Equipment: `weaponId?`, `armorId?`, `heldItemId?`; equipment/held references alone determine those roles. Held gear is owned but excluded from bag capacity and cannot be equipped until claimed.
- Score accumulator (D31): `scoreHour?` (UTC hour start) and `scoreHourXp` (granted XP credited in that hour, not yet folded into `heroScoreWindows`).
- Inventory count (P23 candidate): `bagGearCount`, maintained transactionally with every gear insert/delete/claim, if V05 shows the narrow tick read is worthwhile.
- Tick markers: `eligibleFromTick`, `lastTick` (last evaluated tick; dormant heroes skipped between publications do not advance it), `lastProgressTick` (last successful gameplay evaluation), `lastAdvancedAt?`, `logSequence` (transactionally incremented for each new log).
- Safety: `simulationState: healthy | quarantined`, `quarantineReasonCode?`.
- Lifetime counters: `combatWins`, `retreats`, `deaths`, `rescues`, `goldEarned`, `itemsFound`, `ticksExplored`.
- Companion: `companionVisitBaseline?` containing server-captured `{ at, level, lifetimeXp, logSequence }`. One checkpoint, no visit history; never changed by TRMNL polling. See [return-summary contract](build-readiness.md#a-compact-return-summary).

Indexes: `by_user_active[userId,isActive]`, `by_created[createdAt]`, `by_simulation_state[simulationState]`.

Maximum HP/ATK/DEF/XP threshold are derived, not competing authoritative columns. Hero documents are bounded and do not embed ever-growing logs or inventory.

An authenticated creation transaction validates the owned TRMNL install attempt and active grant, then reads the user's active-hero pointer and active-hero index before insertion. The pointer and `isActive` uniqueness include pending heroes. Concurrent create requests conflict/retry and result in exactly one current hero/starter kit. Convex indexes are not declared unique: enforce uniqueness transactionally for every logical unique key.

`createdAt` is assigned by the server. A run uses the stable creation index and cutoff; it does not iterate an index whose sort key it changes while simulating.

### `items`

Fields: `heroId`, `templateId`, `contentVersion`, `kind: weapon | armor | potion`, `name`, `rarity: common | uncommon | rare`, `requiredLevel`, `attack`, `defense`, `saleValue`, `quantity`, `createdAt`.

Indexes: `by_hero[heroId]`, `by_hero_kind[heroId,kind]`.

Gear quantity is exactly 1; potion quantity is 1–20, and zero quantity removes the document. At most 30 bag gear + one held gear + one potion row (32 total); gear count minus the authoritative held reference is bag usage. No independent location flag. `attack` and `defense` are zero when not applicable. Stats are copied from content on acquisition. There is no independent `equipped` boolean to drift from hero references.

Item ownership must match equipment references. Sell/equip/consume always recheck ownership in the same transaction. Never accept a client-supplied sale value or derived stat.

## Game orchestration

### `worldState`

Singleton fields: `key: world`, `currentTick`, `lastStartedWallSlot?`, `activeRunId?`, `publishedPublicationId?`, `lastPublishedAt?`, `activeContentVersion`, `activeSimulationVersion`, `activeTemplateVersion`, `worldSeed`, `ticksPaused`, `maintenanceMode`, `schemaVersion`.

Index: `by_key[key]`.

Create the singleton with an idempotent internal initialization operation. Seeds are generated server-side and never included in public queries. No account creation mutation may replace the singleton.

### `simulationRuns`

Fields: `tick`, `wallSlot`, `scoreAt`, `publishes` (boolean fixed at start, D31), `startedAt`, `cohortCutoff`, `contentVersion`, `simulationVersion`, `seedVersion`, `state: simulating | ranking | completed | blocked`, `cursor?`, `batchSequence`, `nextScheduledFunctionId?`, `lastProgressAt`, `simulatedAt?`, `finishedAt?`, `processed`, `eligible`, `skippedDormant`, `paused`, `sleeping`, `heldFinds`, `deadWaiting`, `quarantined`, `batches`, `encounterCounts` (fixed object), `deaths`, `levelUps`, `failureCode?`, `recoveryAttempts`.

Indexes: `by_tick[tick]`, `by_state_started[state,startedAt]`, `by_started[startedAt]`.

The run carries the continuation and progress counters so a duplicate worker or watchdog can resume safely. The active-run guard spans simulation **and ranking**, until publication or an explicit blocked state.

### `simulationFailures`

Fields: `runId`, `heroId`, `reasonCode`, `simulationVersion`, `contentVersion`, `seedReference`, `inputSnapshot` (bounded validated domain state + inventory, no identity/token fields), `createdAt`, `resolvedAt?`.

Indexes: `by_run[runId]`, `by_created[createdAt]`, `by_hero[heroId]`.

Only pure-input/core validation failures are isolated per hero. Database/orchestration failures roll back the batch. The snapshot enables replay; a seed alone is insufficient if manual intents changed the starting state.

### `tickLogs`

Fields: `heroId`, `source: tick | command | lifecycle`, `tick?`, `runId?`, `commandId?`, `sequence`, `at`, `kind: combat | loot | trap | rest | travel | death | revive | levelup | system`, `summary`, `detail` (versioned discriminated union), `deltas: { xpEarned, gold, hp }`.

Indexes: `by_hero_at[heroId,at,sequence]`, `by_run_hero[runId,heroId]`, `by_at[at]`.

Tick logs are one combined event per processed gameplay tick; secondary level-up/death information is inside detail and summary. Commands append their own system logs. A server-assigned sequence/tie-break keeps simultaneous log order stable; use document creation ordering as a final tie-break. Device history returns the newest six across both sources with ISO UTC timestamps and date-aware local labels.

Detail variants contain bounded combat rounds, template IDs, applied item changes, outcome and version. Bound summaries to 90 code points; detail target <= 1.5 KiB. Retain 72 hours, with paginated cleanup.

## Leaderboard snapshots and score history

### `heroScoreWindows`

Fields: `heroId`, `buckets` (max 168 `{hourStart,xp}` positive hourly buckets, ascending), `cutoffHour`, `xp24h`, `xp7d`, `lastFoldedRunId?`, `scoreVersion`. Index: `by_hero[heroId]`.

Per tick, credit granted XP to the hero's `scoreHour`/`scoreHourXp` accumulator (folding an older-hour accumulator first). On publication runs only, fold the accumulator into its hour bucket (adding to an existing bucket), expire buckets at/before each window start, and compute both totals in the same hero transaction. Hourly keys bound seven-day history to 168 buckets; empty hours imply zero. Sleep/pause/quarantine still expire history at publication. Pure projection receives pinned time. Read one bounded document per publication; measure row bytes/CPU. Pending heroes have no earned score history.

### `rankInputs`

Fields: `runId`, `heroId`, `userId`, `eligible`, `ranked24h`, `ranked7d` (false when dormant for that board, D32), `cohortKey`, `negativeScore24h`, `negativeScore7d`, `activatedAt`, lifetime `negativeLevel`, `negativeXp`, `lastLevelUpTick`, `heroCreatedAt`, `heroKey`, `heroName`, `ownerAlias`, `publicNameVersion`, `class`, `level`, `xp`.

Indexes: `by_run_hero[runId,heroId]`, `by_hero[heroId]`, `by_run_order[runId,eligible,negativeLevel,negativeXp,lastLevelUpTick,heroCreatedAt,heroKey]`, `by_run_recent24[runId,ranked24h,cohortKey,negativeScore24h,activatedAt,heroKey]`, `by_run_recent7[runId,ranked7d,cohortKey,negativeScore7d,activatedAt,heroKey]`.

Written only by publication runs (D31): one immutable projection per eligible hero covers all views. Pending/ineligible owners excluded; waiting/sleeping/quarantined included in lifetime and, unless dormant, recent boards. Uniqueness is transactionally enforced.

### `leaderboardPublications`

Fields: `runId`, `state: building | ready | published | obsolete`, `previousPublicationId?`, `asOfTick`, `scoreAt`, `totalPlayers`, `currentBoard: overall | recent_24h | recent_7d`, `currentCohort?`, `cursor?`, `batchSequence`, `nextScheduledFunctionId?`, `rankRowsBuilt`, `generationsBuilt`, `lastProgressAt`, `builtAt?`, `publishedAt?`.

Indexes: `by_run[runId]`, `by_state[state]`, `by_published[publishedAt]`. No unbounded group map. Guarded builder validates one lifetime rank row per eligible hero, one recent row per board for each included hero, and complete board/cohort coverage, then promotes this pointer atomically with run completion.

### `leaderboardGenerations`

Fields: `publicationId`, `runId`, `board: overall | recent_24h | recent_7d`, `cohortKey` (`all` for lifetime), `cohortMinLevel?`, `cohortMaxLevel?`, `state: building | ready`, `nextRank`, `totalPlayers`, `entries` (max 100), `asOfTick`, `scoreAt`, `windowStartAt?`, `windowEndAt?`, `builtAt?`.

Indexes: `by_publication_board_cohort[publicationId,board,cohortKey]`, `by_publication[publicationId]`. Entries contain internal hero/user IDs for privacy checks, aliases/hero name/public-name version, class/level/current XP, rank and recent score where applicable. Public projection omits IDs.

### `heroRanks`

Fields: `publicationId`, `generationId`, `board`, `cohortKey`, `heroId`, `rank`, `previousRank?`, `rankDelta?`, `level`, `xp`, `score?`.

Indexes: `by_publication_board_hero[publicationId,board,heroId]`, `by_generation_rank[generationId,rank]`, `by_publication[publicationId]`, `by_hero[heroId]`.

The own scoped row identifies the captured cohort; do not derive it from newer live level. First appearance/group change has null delta. Retain current/previous publication sets plus active build. Bounded cleanup deletes whole obsolete sets and related inputs; no protected pointer may be removed.

## TRMNL connection model

### `trmnlGrants`

Fields: `userId`, `tokenHash` (SHA-256 of high-entropy TRMNL token), `state: active | revoked`, `createdAt`, `lastVerifiedAt?`.

Indexes: `by_token_hash[tokenHash]`, `by_user[userId]`.

The grant binds a token to a companion account. Do not infer one grant equals one physical device or one installation. Repeated code exchange can return an existing token; ordinary installs cannot reassign that token to another Clerk account. A deleted-account fresh-start exception requires V09-proven current authorization and explicit new-instance proof; old code/token alone is denied.

### `trmnlInstallAttempts`

Proposed recovery state: `userId`, `grantId`, `flowHash` (hashed browser secret), `targetUuid?` for owned repair, `state: pending | completed | expired`, `createdAt`, `expiresAt`, `completedUuid?`. Indexes: `by_grant_state[grantId,state]`, `by_user_state[userId,state]`, `by_flow_hash[flowHash]`, `by_expires[expiresAt]`.

Create after authenticated exchange and owner-preserving linking; one pending attempt per grant, expiring/superseding older pending attempts transactionally. Propose 20-minute validity and purge within 24 hours. No raw code, JWT or installation token here; the encrypted pending cookie holds the approved callback/code for its browser lifetime.

Confirmation atomically checks grant/owner, pending intent and UUID. New attempts accept only previously unknown UUIDs; repairs accept only their explicit target. Tombstones/revoked grants remain authoritative without current repair authorization. Completion is idempotent for that UUID. Delayed callbacks cannot create fresh intent. Remaining correlation ambiguity is a V06 gate, not proof of a new installation.

### `trmnlInstances`

Fields: `grantId`, `userId`, `uuid`, `pluginSettingId?`, `label?`, `state: active | uninstalled | disconnected`, `confirmedBy: success_callback | screen_request`, `createdAt`, `lastScreenServedAt?`.

Indexes: `by_uuid[uuid]`, `by_grant[grantId]`, `by_user[userId]`.

The authenticated success callback normally creates/upserts the instance. An authenticated first screen request may confirm it if the one-shot callback was lost. Uninstalled/disconnected UUID tombstones are not automatically reactivated by an old screen request. Tombstone reinstallation requires a current owner-authorized attempt targeting that UUID; success events alone are insufficient. Verify token/UUID behavior before implementation.

Optional `lastScreenServedAt` records successful response assembly, not renderer/display acknowledgement. Do not count screens as hero ticks. Poll telemetry, if enabled, is throttled to at most one write per hour per instance and is outside the critical response path. A missed telemetry write must not fail a valid screen response.

### `trmnlManagementHandoffs`

Fields: `tokenHash` (hash of generated handoff secret), `uuid`, `expiresAt`, `createdAt`, `claimedBy?`, `claimedAt?`.

Indexes: `by_token_hash[tokenHash]`, `by_expires[expiresAt]`.

Only a validated management JWT creates a handoff. Return the raw short-lived secret once to an HttpOnly browser flow; no installation bearer or TRMNL JWT in client local storage. Claim requires Clerk identity matching the already linked instance's owner. Claimed retries by that same owner may return the same management destination; never permit cross-account relinking.

## Intents and abuse limits

### `operationReceipts`

Fields: `userId`, `operationId`, `operation`, `argumentHash`, `result` (small validated union), `createdAt`, `expiresAt`.

Indexes: `by_user_operation[userId,operationId]`, `by_expires[expiresAt]`.

State-changing companion requests carry a generated operation ID. Successful result + receipt commit with state change. Same ID and arguments returns the original result; changed arguments return a conflict. Retention 24 hours; duplicate safety beyond that window is not promised. Failed transactions create no successful receipt.

### `rateLimitBuckets`

Proposed simple MVP table: `key`, `windowStart`, `count`, `expiresAt`; indexes `by_key_window[key,windowStart]`, `by_expires[expiresAt]`. Use bounded per-user/per-operation windows; see [API](api.md). A current Convex rate-limiter component may replace this table after inspection; record the decision before adding either implementation.

## Deletion checkpoints, revocation and administrative audit

### `accountDeletionJobs`

Fields: `userId?`, `clerkSubject?` (only until provider deletion verified), `state: pending | running | blocked | completed`, `phase`, `cursor?`, `sequence`, `nextScheduledFunctionId?`, `providerDeletionState`, `createdAt`, `lastProgressAt`, `completedAt?`, `reasonCode?`, `recoveryAttempts`.

Indexes: `by_user[userId]`, `by_state_progress[state,lastProgressAt]`. One active job per owner, guarded durable phases: deny/mask, capture minimal credential revocation, batched purge/scrub, dedicated-Clerk deletion, verify/remove local identity, complete. Keep bounded checkpoints through failure/deploy/retry; remove subject/user references from retained completed diagnostics. If a blocked build holds inputs, scrub display identity without altering order/eligibility and defer structural removal until safe.

### `revokedTrmnlCredentials`

Fields: `tokenHash`, `revokedAt`, `reasonCode`, `policyVersion`; index `by_token_hash[tokenHash]`. No old owner/profile/raw credential. Retain while an old external credential can authenticate; no short arbitrary TTL. Remove only after proven external revocation or retirement of the accepting integration. Reused-token fresh linking is denied until V09 proves a separately authenticated new-instance path; ordinary screen/code replay never clears this record.

### `revokedAuthIdentities`

Fields: hash of Clerk issuer/subject identity, `revokedAt`, `reasonCode`; index `by_identity_hash[identityHash]`. No profile/raw subject. Deny replay of still-valid Clerk JWTs after local/provider purge before users.ensure can recreate that identity. Retain while this identity could authenticate to the integration; returning players require a genuinely new auth identity. V09 verifies this boundary with real tokens.

### `adminAuditEvents`

Fields: verified admin actor reference, bounded action/target references, `reasonCode`, `at`, bounded public-safe outcome. Indexes: `by_at[at]`, `by_target[targetRef]`. Proposed 30-day diagnostic retention; scrub deleted-player references and avoid offending-name/profile/token copies. Used for recovery, release selection, suspension/restoration and name repair.

### `operationalIncidents`

Fields: `incidentKey` (run + stall kind), `runId`, `state: open | recovered`, `openedAt`, `recoveredAt?`, and fixed alert/recovery delivery objects: `state: pending | sent | failed` (recovery omitted until resolved), bounded `attempts`, `lastAttemptAt?`, `providerReference?`, `nextScheduledFunctionId?`. No player identity, token or unbounded delivery history. Indexes: `by_key[incidentKey]`, `by_state_opened[state,openedAt]`, `by_opened[openedAt]`. Transactionally create one incident per run/stall; guard one notice worker per type. Provider idempotency and unknown-outcome recovery are A11 verification work. Email failure does not block simulation recovery. Retain unresolved incidents; clean recovered delivery-complete records after a proposed 30 days. See [incident policy](build-readiness.md#operational-alerts).

## Referential integrity and lifecycle

- Foreign keys are enforced by application transactions, not SQL constraints.
- Deletion first sets `users.state=deleting`, immediately denying intents, display reads and future simulation/rank eligibility through owner checks. Disconnect/revoke large connection sets in bounded continuations; do not scan every installation in the initial transaction.
- Mask that user's copied names in all public board reads immediately. A bounded Top 5 read may look up the five associated user states; do not return stale personal names.
- Delete items (including held), recent-XP history, logs, receipts, connection/install-attempt/management records and historical rank rows in batches. Purge copied identity fields in retained generations/failure snapshots before the account is considered deleted. The durable deletion job also deletes the dedicated Clerk user; network steps have explicit retry/completion evidence and never regain game authority.
- Do not delete or change ordering/eligibility fields in a building run's rank inputs/rows during account purge. Mask names immediately using the deleting owner state, let the coherent generation finish, then scrub/delete that owner's retained rows and copies. Keep the minimal deleting user tombstone until the purge is verified complete.
- Leaderboard ranks may retain gaps for a suppressed user until the next published snapshot; do not silently renumber some entries while returning an old per-hero rank.
- Suspended users cannot simulate or submit intents; old public names are masked until the next generation. Pause and inventory sleep are different and remain ranked, while recent scores expire. Public-name version mismatch/missing owner masks copied names even after restricted repair finishes; identity edits never change frozen ordering.

## Retention plan

| Data | Retention/default | Cleanup rule |
| --- | --- | --- |
| Hero / owned items | Persistent until account deletion | No TTL |
| Companion visit checkpoint | One per current hero | Replace only from guarded rendered-view acknowledgement; purge with hero |
| Tick/command logs | 72 hours | Indexed batches, oldest first |
| Runs | 30 days | Completed/old only; never delete active/blocked run |
| Failure replay inputs | 7 days | Redacted input domain only |
| Publication/generation/rank rows | Current + previous + building sets | Protect publication pointer and all associated rows |
| Recent-XP history | Seven days, <=168 hourly buckets/hero plus one accumulator | Expire at publication; purge on deletion |
| Deletion jobs | Until verified complete; 30-day scrubbed diagnostics | Never drop active/blocked checkpoint |
| Admin audits | Proposed 30 days | Scrub deleted-player references; indexed batches |
| Operational incidents | Proposed 30 days after recovery/delivery resolution | Protect open incidents and pending/failed delivery requiring triage |
| Revoked credential/auth-identity hashes | While external credential/identity can authenticate | Purpose-disclosed, no arbitrary TTL; V09 governs fresh authorization |
| Rank inputs | Until generation obsolete | Delete with generation cleanup |
| Operation receipts | 24 hours | Indexed expiry pages |
| Install attempts | 20-minute validity; purge within 24 hours | Deny expired confirmation immediately; preserve active connections |
| Handoffs | 10-minute validity; purge within 24 hours | Deny expired immediately regardless of cleanup |
| Rate buckets | Until expired | Daily bounded cleanup |
| Uninstall tombstones | Until explicit relink/account deletion | Prevent stale request resurrection |

Each cleanup job has a per-invocation row/byte budget and a continuation. Monitor oldest retained row and backlog. Retention is a product proposal and must be disclosed where relevant.

## Deletion boundary verification

D22 confirms deletion of game data and the dedicated Desk Crawler Clerk identity. Authority/display are denied immediately; completion is only after provider deletion and batched purge are verified. Returning players may start fresh only through genuinely new authorization; never restore deleted progress or treat old code/token replay as proof.

V09 must demonstrate replay denial after purge and a safe returning-player path under real token reuse. Minimal hash revocation records are retained while credentials remain usable; UI/privacy discloses purpose/lifetime. If fresh reuse cannot be proven safe, deny reuse. Do not imply local row deletion revokes TRMNL or erases backups/cached images.

## TRMNL-exclusive activation invariant

Creation prepares `pending_trmnl` only after verified code exchange and a current owned install attempt. The bounded starter kit/welcome are initialization, not earned rewards. Pending heroes have no simulation, gameplay intents or rank inputs.

Within saved-instance confirmation, an internal activation helper validates active owner/grant/instance and the authorized attempt, then atomically changes the existing current hero to `active` and stamps `activatedAt`. It never creates a hero or starter kit. A confirmed instance linked through an already completed, unexpired attempt can satisfy the same gate during Clerk-authenticated creation if confirmation raced ahead; match its UUID/owner/grant and require it still active.

At first activation initialize `eligibleFromTick = world.currentTick + 1`, `lastTick = world.currentTick`, `lastProgressTick = world.currentTick` and `lastLevelUpTick = world.currentTick`; leave `lastAdvancedAt` absent until real gameplay. These are the pre-play baseline, not earned progress. Pending creation may provision those markers, but activation replaces that baseline exactly once. Replays, second installations and repairs never reset it.

Grant linking, claimed client connection flags and a screen query alone cannot activate a hero. Only authenticated success confirmation or the V06-verified first-screen lifecycle recovery can consume the authorized install attempt. Expiry/restart keeps the existing pending hero/kit. Activation is permanent until the existing retirement/deletion lifecycle; disconnect/uninstall does not revert it.
