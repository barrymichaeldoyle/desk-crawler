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

## Recovery procedure and reproduction

1. Keep serving and cron starts disabled during restore; retain the pre-restore state for rollback.
2. Deploy the compatible code from the recorded commit and restore environment/external configuration separately.
3. Import the completed snapshot into an isolated target; inspect hero/inventory/history counts, receipts, run guards and complete rank publications.
4. Reconcile protected post-snapshot deletion and credential revocation records before enabling any restored authority. If reconciliation is uncertain, keep credentials denied.
5. Inspect restored scheduled work, resume recognized guarded work only, and prove duplicate workers cannot grant rewards again.
6. Verify authorized and revoked paths, then request explicit production promotion approval.

[verify-restore.mjs](../../tools/review/verify-restore.mjs) deliberately targets only `usable-snail-909` and asserts a paused, drained world. It requires the private synthetic snapshot at its documented temporary path. Harness preparation and limits are described in [capacity](capacity.md). Neither preview runs automatic jobs; cleanup of those external resources remains an explicit action.
