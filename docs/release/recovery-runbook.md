# Protected recovery checkpoints and reconciliation

Updated 2026-10-05. Local checkpoint tools and the isolated synthetic cloud restore have passed, including denial reconciliation, interrupted deletion, simulation/ranking continuation and receipt replay ([engineering evidence](../evidence/engineering-readiness.md)). **Ongoing production capture and real-provider reconciliation remain unconfigured.** The target stayed closed and no production data was restored.

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
- Purge listed old heroes, inventory, history, score windows, achievement unlocks (`heroAchievements`, keyed by owner) and game-scoped receipts/keepsakes through resumable deletion jobs. Game-only deletion keeps the shared account. A hero created after the game's deletion cutoff must survive; inspect the cutoff before applying user-level game cleanup.
- Revoke listed grants and disconnect listed instances. Match an instance using both its grant token hash and UUID; never revoke every installation for an installation-only disconnect.
- Reconcile provider identity state and newer deletion/disconnect evidence for the uncovered interval. The checkpoint cannot reconstruct events it never captured. If evidence is incomplete, keep affected authority denied and keep serving closed.
- Recreate recognized missing scheduled continuations from durable run/deletion/ranking state. Prove duplicate receipt/worker replay causes no second reward, sale or potion use, and that partial boards do not publish.
- Test deleted identity, deleted-game old token, disconnected UUID, unaffected second installation and unaffected owner through the actual backend/HTTP routes. Check copied leaderboard names are hidden immediately.
- Record the target, checkpoint time/hash, uncovered interval, assertions, duration and loss estimate. Only an explicit operator decision can reopen traffic and tick starts.

## Remaining production setup

Choose and approve a capture schedule, protected independent destination and monitoring before launch. Daily game backups do not provide complete revocation evidence between checkpoints. Do not claim a daily checkpoint protects deletions made later that day.

[capture-export.ts](../../tools/recovery/capture-export.ts) now performs a read-only consistent export, derives a minimal encrypted checkpoint using the actual snapshot timestamp, and removes its temporary raw archive in `finally`. It requires an explicit source, refuses mismatched deployment keys and repository output, and writes the encrypted output exclusively with mode 0600. A real preview capture was decrypted and checked. It uses the full export in memory with bounded subprocess buffers; large datasets fail closed rather than producing an incomplete checkpoint.

```sh
pnpm tsx tools/recovery/capture-export.ts \
  --source exciting-cormorant-948 \
  --out /private/protected/checkpoint-TIMESTAMP.dcr
```

That production command needs authorization. Since 2026-10-07 the [hourly capture workflow](../../.github/workflows/protected-checkpoint.yml) is checked in and scheduled (minute 17 of every hour, plus manual dispatch) against the `recovery-checkpoints` GitHub environment, with encrypted artifacts retained for 14 days and the [watchdog workflow](../../.github/workflows/checkpoint-watchdog.yml) failing (which emails the committer) when no successful capture is newer than 90 minutes. Captures start only once the owner adds both environment secrets, which is the approval step; until then the capture job ends with a warning and the watchdog stays quiet. Barry added both secrets on 2026-10-07 and the first capture succeeded (run 37636261238, a 1,076-byte sealed artifact at 14:23 UTC) after two fixes: the export error now carries the Convex CLI's message, and under a deploy key the tool no longer passes `--deployment`, which had made the CLI query the dashboard API that deploy keys cannot authenticate against. Barry then downloaded that artifact and opened it with his own copy of the sealing key: `exciting-cormorant-948`, snapshot 2026-10-07T14:23:36Z, six identities. Key custody and the capture path are proven end to end; the recovery drill from a checkpoint remains the separate, authorized exercise.

Owner setup, once: create a production deploy key for `exciting-cormorant-948` in the Convex dashboard (Settings → Deploy keys, name it `recovery-checkpoints`), generate the sealing key and keep it in the password manager, then store both as environment secrets:

```sh
openssl rand -hex 32   # save this in the password manager first
gh secret set RECOVERY_CHECKPOINT_KEY --env recovery-checkpoints   # paste the 64 hex characters
gh secret set RECOVERY_CONVEX_DEPLOY_KEY --env recovery-checkpoints   # paste the Convex deploy key
```

The repository is public, so anyone can download a workflow artifact; the artifact is only the AES-256-GCM sealed checkpoint and is useless without the key, which never enters GitHub except as the environment secret. Rotate the sealing key by replacing the secret; older artifacts stay readable with the key they were sealed with. Destination/access, secrets, notifications and a >90-minute missing-checkpoint alert must be configured before activation. Workflow failure notification alone does not detect a disabled schedule. No production capture or secrets setup occurred.

Full exports include unrelated gameplay data temporarily. At the measured synthetic size, an archive is about 2.6 MB, or roughly 1.9 GB transferred over 720 hourly captures; full table reads, snapshot/storage charges and other traffic are additional. The 700-byte encrypted preview checkpoint is not evidence that producing it costs only 700 bytes. Prefer a consistent minimal export or streaming capture if full-export cost becomes material.

## Pagination compatibility

New simulation runs and ranking publications use portable index-key cursors (`paginationVersion: 1`, `convex-helpers` 0.1.126). The cloud rehearsal resumed simulation after 25 heroes and ranking after its first page; duplicate workers were harmless and the previous publication stayed visible.

Legacy rows without the version retain native pagination so a rolling release can drain them on the original deployment. A restored in-flight native cursor fails on another deployment. Before a planned legacy snapshot, drain work on the source and capture a completed-run boundary. An older backup already containing a native cursor needs a separately rehearsed conversion/recovery procedure; this patch does not retroactively make that backup resumable. Never clear cursors or reset tick markers to bypass the failure.

Retain minimal denial evidence while old TRMNL tokens can still be replayed; retain multiple protected checkpoint generations and do not replace a newer checkpoint with an older one. Capturing from a restored database is not new authoritative deletion evidence. Delete temporary raw exports after verification under the privacy retention policy.

The local tests prove encrypted checkpoint integrity, missing-source planning, pending purge capture, two deletion levels, cutoff preservation and installation scoping. The isolated synthetic cloud rehearsal, guarded scheduler recovery and live failed-notice exhaustion now pass. Real Clerk-provider deletion/reconciliation and ongoing production capture remain open in [release preparation](../evidence/release.md).
