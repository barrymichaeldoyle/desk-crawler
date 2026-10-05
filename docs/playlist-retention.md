# Desk keepsakes and playlist retention

Implemented locally on 2026-10-05 under Barry’s request to choose and implement a playlist incentive. Deployment and the live TRMNL render check require separate authorization. D46 adds this cosmetic feature to the current release; it leaves D09’s earned gameplay and ranking guarantees intact.

## Player experience

The TRMNL title bar shows `Keepsake ABCD-EFGH` in all four layouts while the account has an unclaimed weekly souvenir. The companion home links to Settings → Desk keepsakes. The owner enters that code to collect a permanent, illustrated office souvenir. The companion/public preview never contains the code.

Twelve authored designs arrive in a fixed sequence: stapler, mug, save disk, fern, cabinet key, debugging duck, clock, badge, lamp, tape, pager and trophy. After the first set, each further claim adds another copy of the next design. The shelf shows lifetime counts rather than ending after twelve weeks. Missing weeks does not advance the sequence, expire a design, reset a count or break a streak. There is no streak.

The cap is one keepsake per account per UTC week, starting Monday 00:00 UTC. The current or immediately preceding week’s code can claim the current week’s souvenir, accommodating a cached screen. Both codes still share that one cap. Earlier codes require an ordinary scheduled refresh; faster refreshes, more devices, extra playlist slots and repeated requests confer no advantage. Successful claims suppress the code until the next week. Existing cached images can still contain a used code.

Keepsakes have no XP, gold, gear, combat, leaderboard or progression effect. Paused, inventory-sleeping, recovering and quarantined heroes may collect; inactive, pending, suspended or deleting accounts may not. Disconnecting every installation stops new claims but preserves the shelf and gameplay. Game deletion and account deletion purge the collection and deny its reads/claims immediately.

## Why this policy

An installed connection does not establish playlist inclusion. The [official screen-generation contract](https://docs.trmnl.com/go/plugin-marketplace/plugin-screen-generation-flow), checked 2026-10-05, documents scheduled and manual refreshes, with device metadata even when the instance belongs to no playlist. It provides no authenticated physical-display acknowledgement. Pausing adventures from screen-request inactivity would misclassify legitimate slow/offline players and still would not reliably enforce playlist membership.

A device-channel collectible gives the screen additional value without those false penalties. It is an incentive, **not verified playlist presence or a guaranteed payout**. The TRMNL dashboard’s own preview can expose the code; owners can collect there without viewing hardware. That limitation is intentional and documented. No extra account API permission or personal device key is collected. Creator Fund eligibility remains a separate V10 gate.

## Authority and storage

- `deskKeepsakes`: one fixed-size owner row (`userId`, `totalCollected`, `lastClaimWeek`, `lastClaimedAt`), indexed by owner. Shelf counts derive from the lifetime count; no growing arrays or weekly history.
- `trmnlInstances.by_userId_and_state`: selects the newest active installation. Its active grant’s private token hash keys a domain-separated HMAC-SHA256 over owner and server-selected week. All installations serve the same owner code. Newest-grant changes can change a code; the next scheduled screen supplies it. No new secret configuration is required.
- The human-readable eight-character code carries 40 bits, excludes ambiguous I/O/0/1, and accepts lowercase, spaces and a hyphen. Tokens/hashes never leave backend authority. Screen generation remains read-only apart from existing one-time activation recovery.
- `trmnlPayload.forInstance` returns the code separately from the canonical payload after existing bearer/UUID/ownership checks. Only the authenticated HTTP screen envelope adds `desk_keepsake_code`; `trmnlPayload.mine` and `keepsakes.mine` never reveal it. Client-supplied preview time cannot generate a code.
- `keepsakes.claim` derives owner and current week server-side. It uses the existing transactional intent envelope, receipt horizon and rate limit. Invalid guesses return an `invalid_code` result **and commit their receipt/limiter charge**, avoiding rollback-based unlimited guesses. Concurrent claims serialize; multiple installations never multiply awards.
- Deletion purges the collection through both bounded deletion jobs. Ordinary snapshot backups include it. Additive schema only; no backfill, hero reset or change to the deterministic simulator.

## Verification

See [keepsake evidence](evidence/playlist-retention.md). Integration tests cover authenticated HTTP delivery, preview secrecy, read-only generation, owner scope, weekly boundaries/grace, replay/concurrency, multiple grants, revoked/disconnected credentials, committed failed attempts, persistent bounded repeat collections and both deletion paths. Template tests render the code in all four sizes and omit it without the device-envelope field.

The preview harness accepts `--keepsakes` after the art origin to supply a clearly fictional sample code for the layout matrix. Local screenshots are layout evidence, not proof of hardware delivery or Creator Fund impressions. The live release check remains open until authorized deployment.
