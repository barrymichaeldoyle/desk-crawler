# Desk keepsakes and playlist retention

Implemented and deployed on 2026-10-05 under Barry’s request to choose and implement a playlist incentive and subsequent “approved, deploy”. D46 adds this cosmetic feature to the current release; it leaves D09’s earned gameplay and ranking guarantees intact. Barry waived the remaining live visual/claim check on 2026-10-05; it is recorded as waived, not passed, in the evidence below.

## Player experience

The TRMNL title bar shows `Keepsake code 482 917` in all four layouts (`Keepsake 482 917` in the narrow side/quarter portrait bars, where the code replaces the plugin name on 480-pixel panels) while the account has an unclaimed weekly souvenir. The companion home links to Settings → Desk keepsakes. The owner types that code on the companion's numeric keypad (D73) to collect a permanent, illustrated office souvenir. The companion/public preview never contains the code.

Twelve authored designs arrive in a fixed sequence: stapler, mug, save disk, fern, cabinet key, debugging duck, clock, badge, lamp, tape, pager and trophy. After the first set, each further claim adds another copy of the next design. The shelf shows lifetime counts rather than ending after twelve weeks. Missing weeks does not advance the sequence, expire a design, reset a count or break a streak. There is no streak.

The cap is one keepsake per account per UTC week, starting Monday 00:00 UTC. The current or immediately preceding week’s code can claim the current week’s souvenir, accommodating a cached screen. Both codes still share that one cap. Earlier codes require an ordinary scheduled refresh; faster refreshes, more devices, extra playlist slots and repeated requests confer no advantage. Successful claims suppress the code until the next week. Existing cached images can still contain a used code.

Keepsakes have no XP, gold, gear, combat, leaderboard or progression effect. Paused, inventory-sleeping, recovering and quarantined heroes may collect; inactive, pending, suspended or deleting accounts may not. Disconnecting every installation stops new claims but preserves the shelf and gameplay. Game deletion and account deletion purge the collection and deny its reads/claims immediately.

## Why this policy

An installed connection does not establish playlist inclusion. The [official screen-generation contract](https://docs.trmnl.com/go/plugin-marketplace/plugin-screen-generation-flow), checked 2026-10-05, documents scheduled and manual refreshes, with device metadata even when the instance belongs to no playlist. It provides no authenticated physical-display acknowledgement. Pausing adventures from screen-request inactivity would misclassify legitimate slow/offline players and still would not reliably enforce playlist membership.

A device-channel collectible gives the screen additional value without those false penalties. It is an incentive, **not verified playlist presence or a guaranteed payout**. The TRMNL dashboard’s own preview can expose the code; owners can collect there without viewing hardware. That limitation is intentional and documented. No extra account API permission or personal device key is collected. Creator Fund eligibility remains a separate V10 gate.

## Authority and storage

- `deskKeepsakes`: one fixed-size owner row (`userId`, `totalCollected`, `lastClaimWeek`, `lastClaimedAt`), indexed by owner. Shelf counts derive from the lifetime count; no growing arrays or weekly history.
- `trmnlInstances.by_userId_and_state`: selects the newest active installation. Its active grant’s private token hash keys a domain-separated HMAC-SHA256 over owner and server-selected week. All installations serve the same owner code. Newest-grant changes can change a code; the next scheduled screen supplies it. No new secret configuration is required.
- The code is six digits shown as `482 917` (D73): HMAC output reduced modulo 10^6 under the `desk-keepsake-v2` domain tag, typed on a numeric keypad, with spaces and a hyphen accepted. Twenty bits are enough only with the separate miss limit below. The earlier eight-character letter code (40 bits, `desk-keepsake-v1`) is still accepted until `LETTER_CODES_UNTIL` (2026-10-19 00:00 UTC) so screens rendered before the switch keep their grace week; it is never generated. Tokens/hashes never leave backend authority. Screen generation remains read-only apart from existing one-time activation recovery.
- `trmnlPayload.forInstance` returns the code separately from the canonical payload after existing bearer/UUID/ownership checks. Only the authenticated HTTP screen envelope adds `desk_keepsake_code`; `trmnlPayload.mine` and `keepsakes.mine` never reveal it. Client-supplied preview time cannot generate a code.
- `keepsakes.claim` derives owner and current week server-side. It uses the existing transactional intent envelope, receipt horizon and rate limit. Invalid guesses return an `invalid_code` result **and commit their receipt/limiter charge**, avoiding rollback-based unlimited guesses. A separate `keepsake:<userId>` bucket allows ten wrong codes per UTC day; after that every claim, including a correct one, returns `RATE_LIMITED` until the next UTC day. With two valid codes per check, that caps a guesser at about 0.014% a week. Account deletion purges the bucket with the intent buckets. Concurrent claims serialize; multiple installations never multiply awards.
- Deletion purges the collection through both bounded deletion jobs. Ordinary snapshot backups include it. Additive schema only; no backfill, hero reset or change to the deterministic simulator.

## Verification

See [keepsake evidence](evidence/playlist-retention.md). Integration tests cover authenticated HTTP delivery, preview secrecy, read-only generation, owner scope, weekly boundaries/grace, replay/concurrency, multiple grants, revoked/disconnected credentials, committed failed attempts, persistent bounded repeat collections and both deletion paths. Template tests render the code in all four sizes and omit it without the device-envelope field.

The preview harness accepts `--keepsakes` after the art origin to supply a clearly fictional sample code for the layout matrix. Local screenshots are layout evidence, not proof of hardware delivery or Creator Fund impressions. Authorized production deployment and a successful live server render are recorded; Barry waived the remaining physical glance and real claim checks on 2026-10-05; they were not performed.

## Slow Cast's fly box (D115)

Slow Cast uses the same mechanism for its fly box: a weekly six-digit code in the device's title bar ("Fly code", or "Fly" in narrow portrait columns), minted with the keepsake HMAC under the tag `slow-cast-fly-v1` and keyed with the Slow Cast installation's token hash. One fly per account a week, last week's code accepted, ten wrong codes a day, no missed-week penalty, and no effect on catches, XP or rank. The newest fly is drawn on the angler's hat. Twelve designs fill a box; the Flies achievement family is 1, 6, 12 and 24.
