# Account deletion evidence — D22 (partial V09)

**October 5 update:** [engineering checks](engineering-readiness.md) adds independent-checkpoint reconciliation of both deletion levels, interrupted cloud purge/restore, negative restored HTTP access and a network-retry fix. Synthetic provider acknowledgement does not close the real provider-originated deletion gate.

## Live run, 2026-10-03 (Convex dev `superb-bobcat-74`, Clerk development instance)

Clerk test identity `desk-crawler+clerk_test@example.com` with a seeded hero ("Testy"). From the companion Settings page: typed DELETE, confirmed.

| Check | Observed |
| --- | --- |
| Immediate denial | Request transaction set the owner to `deleting` and recorded a revoked auth-identity hash; the UI signed out to `/` |
| Durable purge | Job advanced connections → gameplay → provider → finalize → done; `state: completed`, no user reference kept |
| Game data | Hero, items, logs, score window, receipts and user row removed; Baz (another account) untouched |
| Provider deletion | Clerk Backend API `DELETE /v1/users/{id}` succeeded; `clerk users list` finds no remaining test user |
| Copied names | Published boards mask missing owners until the next two publications rotate the old sets out |

## Automated (convex-test)

- Commands fail immediately after the request, before the purge runs.
- Purge leaves only `revokedTrmnlCredentials` (token hash) and `revokedAuthIdentities` (identity hash).
- A replayed Clerk identity cannot recreate the account; the old TRMNL token cannot relink to another account.
- Provider failures retry with backoff and block visibly (`PROVIDER_DELETE_FAILED`) while the account stays denied.

## Still open for V09

- Clerk `user.deleted` webhook reconciliation when deletion starts on Clerk's side.
- Real TRMNL token reuse after uninstall/reinstall for a returning player (does reinstall issue a new token?).
- Backup-restore reconciliation of post-backup deletions (D27 drill).
