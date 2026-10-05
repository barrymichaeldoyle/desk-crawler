# Backup, restore and notices — 2026-10-04

## Production configuration observed

Convex production `exciting-cormorant-948` has daily backups at 09:03 UTC with seven-day retention. The Oct 4 backup completed at 09:03 UTC in one second, 16.89 KB, tables only. Its name was `barry-michael-doyle-desk-crawler-exciting-cormorant-948-1791104580012`. This confirms completion and cadence, not a production restore. Database backups do not restore code, secrets or external account configuration.

Production Clerk's `user.deleted` endpoint had a trailing comma in its URL. The comma was removed and the endpoint saved as `https://exciting-cormorant-948.convex.site/auth/clerk/webhook`. A signed example event for a synthetic subject was delivered successfully: Clerk/Svix showed one success and zero errors for message `msg_3KDvq0UcnMQYpBxVecrCjNShkpb` at 11:12 SAST. Barry's account was not deleted. Existing [live deletion evidence](deletion.md) covers the dedicated test-account purge separately.

## Isolated synthetic restore

Source `precious-pheasant-866`; target `usable-snail-909`. Both are disposable previews with automatic crons disabled and paused worlds. No production data was exported or imported. Source code/configuration was deployed separately before import; only required preview environment variables were set.

Snapshot: 2,614,708 bytes; SHA-256 `9789e9d05aa3904558b21ff42403be6fee3d5628decb720bfd1ac3bbefc6792f`. It contained 45,303 data documents across the application's tables, including:

| Data | Count |
| --- | ---: |
| Users / heroes / grants / instances / score windows | 1,000 each |
| Items | 31,202 |
| Hero ranks / rank inputs | 6,000 / 2,000 |
| Logs / operation receipts / rate-limit buckets | 1,064 / 16 / 8 |
| Simulation runs / publications / generations / world | 4 / 2 / 6 / 1 |

An initial import and a timed repeat both succeeded. The timed repeat used `convex import ... --deployment usable-snail-909 --replace -y`: **27.276 seconds** for import, then **6.051 seconds** for checks and synthetic checkpoint replay. [recovery-results.json](recovery-results.json) records the result. These durations exclude provisioning/code deployment and are not a production recovery-time guarantee.

Assertions verified 1,000 heroes; world/completed tick 4; no active run; paused world; the same publication; all three boards ready with 1,000 players; sampled XP 168, last tick 4, 32 item rows and 167 hourly buckets. Replaying a completed simulation worker did not change world or sample progress. Receipts and run/rank rows survived import; exhaustive command replay and recovery of an in-flight restored scheduler job were not exercised.

After the source snapshot, a synthetic deletion/revocation checkpoint was recorded on the source, then manually replayed on the target. It sets owner denial, an authentication-identity hash tombstone and token hash tombstone, and revokes the grant. The restored token returned HTTP 404; the deleted identity's link attempt returned `ACCOUNT_UNAVAILABLE`. No real Clerk deletion was involved.

**Remaining recovery gate:** this proves replay mechanics while the source is available. It does not prove an independent protected production source of post-backup deletions and disconnects. Before production disaster recovery, preserve that source outside the database being restored and prove reconstruction from it. Restored display credentials must remain denied until reconciled. Import success alone must not reopen serving or restart jobs.

## Staging incident/recovery notice

One synthetic incident was opened twice, recovered twice, and produced one alert and one recovery notice. Both Resend actions were marked `sent`, each at attempt 1, after Resend API acceptance ([notice-results.json](notice-results.json)). The disposable checkout added `[STAGING]` to subjects and used the official `delivered+desk-crawler-review@resend.dev` test recipient, so no false production incident was emailed to Barry. The preview's temporary Resend key was removed afterward.

This verifies real API acceptance and deduplication. Delivery events/inbox receipt were not verified because automatic browser review rejected the Resend dashboard. Existing automated tests cover retry/failed-notice behavior; live retry exhaustion remains open. Production has its approved sender/recipient and Resend key configured.

## Production alert sender check, 2026-10-04

After the sender moved to `TRMNL Games <alerts@trmnlgames.com>` (decisions revision 24; Resend domain verified, DMARC `p=none` published), `npx convex run --prod incidents:sendTestNotice` sent one `[TEST]` message through the production key, sender and recipient without writing any data. Resend email `01a10821-ac90-783f-8ab5-e5c7440700b1` recorded Sent and Delivered at 20:16 SAST to barry@barrymichaeldoyle.com. Delivered means the recipient server accepted it; inbox versus spam placement is Barry's observation. Live retry exhaustion remains covered by automated tests only.

## Recovery procedure and reproduction

1. Keep serving and cron starts disabled during restore; retain the pre-restore state for rollback.
2. Deploy the compatible code from the recorded commit and restore environment/external configuration separately.
3. Import the completed snapshot into an isolated target; inspect hero/inventory/history counts, receipts, run guards and complete rank publications.
4. Reconcile protected post-snapshot deletion and credential revocation records before enabling any restored authority. If reconciliation is uncertain, keep credentials denied.
5. Inspect restored scheduled work, resume recognized guarded work only, and prove duplicate workers cannot grant rewards again.
6. Verify authorized and revoked paths, then request explicit production promotion approval.

[verify-restore.mjs](../../tools/review/verify-restore.mjs) deliberately targets only `usable-snail-909` and asserts a paused, drained world. It requires the private synthetic snapshot at its documented temporary path. Harness preparation and limits are described in [capacity](capacity.md). Neither preview runs automatic jobs; cleanup of those external resources remains an explicit action.

## Independent protected checkpoint preparation — 2026-10-05

[checkpoint.ts](../../tools/recovery/checkpoint.ts) now captures minimal denial evidence from an already-exported consistent snapshot: authentication-identity hashes, revoked token hashes, scoped installation hashes and game-deletion creation cutoffs. It includes pending account purges. AES-256-GCM protects the checkpoint with a separately held key; CLI output must be outside the repository, is created exclusively with mode 0600, and refuses a repository path even through a symlinked parent. No email, public name, raw token or installation UUID is retained in the checkpoint. The tool performs no network call or database write.

Four automated tests cover encrypted roundtrip, tampering/wrong key, missing tables, source/time mismatch, pending purge and replay. A synthetic CLI rehearsal wrote a protected file, **removed its source directory before planning**, then generated denial instructions from the checkpoint and an older fictional export. The deleted owner's hero/installation were denied while the unaffected owner/hero were preserved. The plan was also mode 0600. Redacted results: [recovery-checkpoint-results.json](recovery-checkpoint-results.json). Capture took 127ms and planning 70ms for that tiny fixture; this is not a cloud recovery-time measurement.

The planner distinguishes account deletion from game-only deletion, preserves a newer hero created after the game-deletion cutoff and retains unaffected installations. Every plan sets `servingMayResume: false` and reports the uncovered interval; it never applies a purge or approves serving. The [runbook](../release/recovery-runbook.md) specifies denial-first repair, cutoff-aware bounded purge, interrupted-work checks and independent interval reconciliation.

**Gate remains open:** this is source-independent offline proof, not an independently configured production capture source or an isolated live restore applying the checkpoint. Ongoing cadence/storage/key handling and monitoring must be configured with explicit authorization. Validate the actual restored backend's negative authorization paths, interrupted scheduler/deletion/ranking work, receipt replay and delivery failures before reopening. A snapshot export alone cannot reconstruct changes after its timestamp.
