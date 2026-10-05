# Protected recovery checkpoints and reconciliation

Prepared 2026-10-05. The local tools below are implemented and tested. **Ongoing capture, operator reconciliation and the isolated cloud restore have not been performed.** This advances D27 preparation; it does not close the live recovery gate.

## Independent evidence

An older snapshot cannot reveal a later account deletion, game-progress deletion, disconnect or uninstall. Preserve a minimal encrypted checkpoint outside the database and outside this repository. The current implementation derives it from a consistent Convex export, using only identity/token hashes, hashed installation references and game-deletion cutoffs. It also captures a deletion request whose purge is still running.

Use a private directory (0700) on an encrypted volume and a separate password-manager-held 32-byte key. Files are created exclusively with mode 0600; the tool refuses output inside the repository, including symlinked paths. Losing the key loses the checkpoint. A local file is independent of the database, but still needs a protected second copy to survive loss of this machine.

Convex's [snapshot format](https://docs.convex.dev/database/backup-restore) stores table rows at `<table>/documents.jsonl`; backups omit code, environment variables and pending scheduled functions. Download/export is a separate authorized action. Unpack a snapshot into a private directory without committing it. Supply explicit empty `documents.jsonl` files for empty required tables if the export omits them.

The capture command needs `users`, `trmnlGrants`, `trmnlInstances`, `revokedAuthIdentities`, `revokedTrmnlCredentials` and `gameDeletionJobs`. Use the actual snapshot timestamp in milliseconds, not the download time. Set `RECOVERY_CHECKPOINT_KEY` securely in the process environment; never place it in shell history, command arguments, `.env.production` or this repository.

```sh
pnpm tsx tools/recovery/checkpoint.ts capture \
  --tables-dir /private/protected/latest-export \
  --source exciting-cormorant-948 \
  --snapshot-at-ms SNAPSHOT_TIMESTAMP_MS \
  --out /private/protected/checkpoint-TIMESTAMP.dcr
```

`/private/protected` is an example operator-owned path, not a directory provisioned by this task. The tool reads local files and writes a local encrypted checkpoint; it makes no network call.

## Restore preparation

1. Keep the restoration target isolated: disable serving, auth/intents, callbacks, crons and outgoing provider deletion/email before importing. Pausing game ticks alone does not deny display credentials or gameplay intents. Preserve current state and do not direct public traffic to the target.
2. Restore compatible code and environment configuration separately. Obtain the newest protected checkpoint and record the incident/recovery cutoff.
3. Generate a review plan against the unpacked older snapshot. This step needs `users`, `heroes`, `trmnlGrants` and `trmnlInstances` from that snapshot.

```sh
pnpm tsx tools/recovery/checkpoint.ts plan \
  --tables-dir /private/protected/older-export \
  --source exciting-cormorant-948 \
  --checkpoint /private/protected/checkpoint-TIMESTAMP.dcr \
  --recovery-cutoff-ms INCIDENT_CUTOFF_MS \
  --out /private/protected/reconciliation-plan.json
```

The plan contains internal document IDs and denial hashes; keep it private. It never modifies a deployment or sets `servingMayResume` to true. It rejects a checkpoint from another source or one newer than the recovery cutoff. It reports the uncovered interval after the checkpoint explicitly.

## Apply and prove

The apply step is intentionally an operator-reviewed, bounded recovery mutation or dashboard repair on the isolated target. The CLI prepares its inputs; it does not execute writes.

- Insert missing identity/token tombstones first. Mark listed users deleting and affected Desk Crawler profiles deleting before purging their data. A token tombstone alone does not deny an already-restored Clerk owner.
- Purge listed old heroes, inventory, history, score windows and game-scoped receipts/keepsakes through resumable deletion jobs. Game-only deletion keeps the shared account. A hero created after the game's deletion cutoff must survive; inspect the cutoff before applying user-level game cleanup.
- Revoke listed grants and disconnect listed instances. Match an instance using both its grant token hash and UUID; never revoke every installation for an installation-only disconnect.
- Reconcile provider identity state and newer deletion/disconnect evidence for the uncovered interval. The checkpoint cannot reconstruct events it never captured. If evidence is incomplete, keep affected authority denied and keep serving closed.
- Recreate recognized missing scheduled continuations from durable run/deletion/ranking state. Prove duplicate receipt/worker replay causes no second reward, sale or potion use, and that partial boards do not publish.
- Test deleted identity, deleted-game old token, disconnected UUID, unaffected second installation and unaffected owner through the actual backend/HTTP routes. Check copied leaderboard names are hidden immediately.
- Record the target, checkpoint time/hash, uncovered interval, assertions, duration and loss estimate. Only an explicit operator decision can reopen traffic and tick starts.

## Remaining production setup

Choose and approve a capture schedule, protected independent destination and monitoring before launch. Daily game backups do not provide complete revocation evidence between checkpoints. Hourly full exports would also consume bandwidth; prefer a small authenticated, paginated revocation export or provider-supported streaming capture when implementing automation. Do not claim a daily checkpoint protects deletions made later that day.

Retain minimal denial evidence while old TRMNL tokens can still be replayed; retain multiple protected checkpoint generations and do not replace a newer checkpoint with an older one. Capturing from a restored database is not new authoritative deletion evidence. Delete temporary raw exports after verification under the privacy retention policy.

The local tests prove encrypted checkpoint integrity, missing-source planning, pending purge capture, two deletion levels, cutoff preservation and installation scoping. The live isolated rehearsal and interrupted scheduler/provider failure scenarios remain open in [release preparation](../evidence/release.md).
