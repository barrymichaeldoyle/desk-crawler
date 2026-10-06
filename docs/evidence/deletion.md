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

## Production follow-up, 2026-10-06

Barry manually tested deletion of his main account. Read-only verification found the Clerk identity and all account/game/connection rows removed, a completed scrubbed deletion job, and retained credential/auth revocation hashes. Account intent rate buckets and a migration audit target remained; the local D68 implementation now purges those buckets and scrubs audit references, with a guarded historical repair. [Confirmation flow and rollout](../release/account-deletion-confirmation.md) records local checks and production gates. No production repair has run yet.

Barry then reported the revoked-installation error on a fresh installation. Read-only Clerk inspection confirms a newly created identity; the production game `users` table is still empty. The exact error originates from the token-tombstone check in `trmnl.linkInstall`, before game-account creation. This reproduces the outstanding returning-player gap: fresh installation is not sufficient to recover when TRMNL presents an old credential. Keep the revoked identity/token protections and require separately proven reconnection; a working real returning-player rehearsal remains required.

## 2026-10-06 returning-player fix candidate (D69)

Barry confirmed the blocked link came from a fresh TRMNL installation. The local candidate now routes revoked-token code exchanges into a bounded draft, then requires an independently backend-verified fresh Configure JWT and explicit same-account confirmation. Only the signed UUID receives a scoped grant; old token/code replay and old UUID polling stay denied. Deleted progress is never restored. Tests use actual RS256 signing/JWKS verification and cover consecutive deletion/reinstall cycles, account/game deletion, expiry, other-account isolation, HTTP success/screen/uninstall, and explicit own-scope repair without another hero/kit. No production tombstone was removed. The live failure remains unresolved in production until the approved rollout and Barry’s new-install rehearsal complete.

### Approved rollout follow-up, 2026-10-06 20:15 UTC

Backend and website deployed; seven old rate-limit records and one audit reference scrubbed and verified absent. Current Clerk user direct-deletion disabled; Barry subsequently disabled the global default, and both settings are verified false. Initial credential redirects now send private/no-store and no-referrer headers, verified on the live Worker. All 255 isolated tests/typechecks/build pass. Actual TRMNL reconnection and inbox/deletion rehearsal remain open. [Detailed rollout record](../release/account-deletion-confirmation.md#production-rollout--2026-10-06-verified-2015-utc).
