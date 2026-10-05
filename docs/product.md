# Product and Month 1 scope

## Promise

“A little office adventure for your TRMNL.” Desk Crawler is a calm, passive game designed around the desk display, with occasional decisions in its web companion. The e-ink screen is a readable account of what happened, not a demand to act now.

The game is useful with one player. Multiplayer in Month 1 consists of a shared global leaderboard. It does not require coordinated play, live combat, chat, or synchronous sessions.

## Audience and play modes

- TRMNL owner: signs in, names a hero, installs the public Third Party plugin, and watches progress on the desk.
- Prospective player: explores a public static/sample preview; no persistent playable hero before a verified TRMNL installation.
- Occasional player: may leave the app closed for days. Auto-rest/revival prevent survival blockage; inventory sleep preserves overflow until deliberate management/resume.

Every account has one current hero, including a pending onboarding hero. Multiple plugin installations display that same hero and never multiply rewards. The browser and device are views of server-authoritative state.

## Access and activation

A verified saved Third Party installation is required once to activate the persistent hero. Clerk sign-in or a browser account alone cannot start rewarded play. Proposed onboarding prepares a named Warrior after verified code exchange, then authenticated Save confirmation activates it. Until activation it earns no XP, gold, encounters or rank; gameplay controls remain unavailable.

After activation, sleep, slow refresh, offline hardware and removal of every installation leave progress and leaderboard eligibility intact. Explicit pause, inventory sleep, suspension and deletion follow their separate rules. The first gear overflow sleeps adventures until management; hardware Sleep Mode never does. Installation proof establishes entry to the TRMNL ecosystem; it is not proof of physical hardware ownership and needs no device API access.

The website remains the owner's companion for gear, biomes, history, rank and account controls. Public previews use clearly labeled sample data and cannot create a rewarded hero. Free gameplay and intended Creator Fund revenue are defined in [monetization](monetization.md).

D46 adds optional [Desk keepsakes](playlist-retention.md) to the current release: a permanent illustrated souvenir collection, one per account/week via a TRMNL screen code. The companion preview hides the code. Designs wait through missed weeks and repeat after a full set; there are no combat or ranking benefits and no polling/device-count advantage.

## MVP feature boundary

| Area | Included in Month 1 | Deferred |
| --- | --- | --- |
| Hero | Warrior, name/alias, level, current-level XP, HP, gold, status | Class selection, MP, passive skills, prestige, hardcore |
| World | Office Cubicles, Server Room, Cafeteria Depths; level-gated travel arriving the following world tick | Other biomes, dungeons, shared bosses |
| Encounters | Combat, loot, trap, rest | Events/choices, merchants, multi-tick fights, player meetings |
| Gear | Weapon/armor, three rarities; 30-slot tuning baseline, one held overflow, inventory sleep/manual wake | Affixes, crafting, salvage, materials, more slots |
| Sustain | Potions, automatic potion use, automatic rest, auto-revival | Manual resurrection currencies, guild healing, status effects |
| User controls | Change biome, equip/unequip, potion, sell, pause/resume, held-find claim/Resume adventures, restricted name repair | Stances, configurable auto-policy, spells |
| Multiplayer | Both recent-XP level-group Top 100 views, secondary lifetime web board, seven-day own-group device Top 5 and exact scoped rank | Friends, guilds, class/season boards, trading |
| Web | Public sample preview; Clerk sign-in, installation-gated onboarding and owner companion: home/log, inventory, leaderboard, connections, account controls | Discord bot, push notifications, social profiles |
| TRMNL | OAuth install/manage/uninstall, canonical JSON, markup envelope, four usable layouts | Fancy customization and device-specific art variants |
| Operations | CI, staging, deploy checks, run health, cleanup, simple abuse limits | Additional paid analytics/APM services |

No coding for deferred features in the first release. Extension points and migrations belong in docs until needed.

## Primary journeys

1. Discover on the website → view a sample adventure → choose “Install on TRMNL” to enter the marketplace flow.
2. Install through TRMNL → sign in with Clerk → pick a public alias/name → authorize linking → exchange code and prepare the pending Warrior → return to TRMNL → Save → authenticated confirmation activates the hero for the next eligible tick.
3. Return later → read recent adventures → equip better gear or choose a harder unlocked biome → close the app.
4. Hero dies → the device explains the revival countdown → automatic revival returns the hero to the safe biome.
5. Disconnect TRMNL after activation → the connection stops serving the hero; progress and companion access remain intact unless explicitly paused.

Target onboarding is under five minutes **excluding** email delivery delays and the next scheduled TRMNL refresh. Show the starter preview after preparation, labeled “Save in TRMNL to start adventures”; show tick expectations only after activation. Do not promise a hardware screen within five minutes.

## Calmness and fairness requirements

- No button mashing, paid XP boosts, streak penalties, expiring MVP rewards, or daily login requirements.
- Polling, browser reactivity, manual refresh, and number of installed devices do not advance the game.
- New content is additive. Routine releases do not wipe XP, gold, inventory or ranking history.
- Explain rank freshness and service delays without blaming the player.
- Paused and sleeping heroes remain eligible. Their recent XP ages out and ordinal ranks can change; once it reaches zero they are dormant and leave recent boards until they resume (D32). Lifetime progress and rank stay earned. Suspension/deletion is separate.
- Public display uses aliases, never email or imported TRMNL real names automatically.

## First public release acceptance

| Requirement | Evidence |
| --- | --- |
| Verified TRMNL install prepares exactly one hero; authenticated Save activates it once | End-to-end onboarding, duplicate/recovery and direct API authorization tests |
| No-install accounts/public samples cannot earn progress, rank or execute gameplay intents | Backend gate, demo and pending-state tests |
| After activation, closed browser and absent/disconnected devices do not stop progression | Scheduled integration scenario |
| Duplicate/delayed jobs do not duplicate rewards or publish partial ranks | Scheduler recovery tests |
| Death/revival and travel have the documented tick boundary behavior | Deterministic fixtures and transaction tests |
| Player rank, score, Top 5/group population and period refer to one generation in a coherent publication of all views | Contract/integration assertions |
| Real TRMNL install, management, rendering and uninstall work | Recorded staging or owner's development-plugin check |
| Four layouts remain readable in worst-case states | Screenshot matrix and a physical e-ink check |
| Existing app builds and authenticates on Workers | Runtime spike and deployed smoke checks |
| Logs, score history and board publication sets have bounded retention | Cleanup integration checks and measured document growth |
| Capacity and recurring costs are measured for a stated load | 100/1,000-hero report with per-poll cost |
| Public marketplace approval | TRMNL review; independent of code completion |
| Intended Creator Fund route and zero-revenue costs are assessed | V10 eligibility evidence and measured cost model; no guaranteed payout |

These gates apply to the first public release. Subsequent small changes use the change-specific CI checks in [quality](quality.md), with continuous delivery after checks pass. No beta population, retention quota, or one-week device program is required.

Approved inventory acceptance: first overflow is retained without auto-sale/disposal, its earned rewards commit once, sleeping stops encounters/XP, manual claim and future-tick resume are race/idempotency safe. Measure three-to-seven-day cadence and useful upgrades rather than promise a fixed fill time.

Approved account/name acceptance: game + dedicated Clerk deletion is resumable and replay-safe under V09; temporary masking/restricted repair never resets progress or exposes stale offending copies. Support owner/channel/response target follow D23; actual mailbox is launch configuration.

[Build refinements](build-readiness.md) add a bounded companion return recap, 12-monster/48-variant content floor, measured first-day/days-2–4/days-8–14 unlock targets, deduplicated owner incident/recovery emails and daily/pre-migration backups with a safe restore drill. Targets are tested baselines, not guaranteed player deadlines or an SLA. Early install-to-display integration precedes content/polish expansion; public release still requires all acceptance gates.

## Success measurement

Use game/run data and lightweight operational counts initially. Track install starts, verified exchanges, saved confirmations/hero activations, successful renders, game-tick completion, returning users and optional biome/equipment changes. Review retained playlist use and realized payouts only where TRMNL supplies that evidence; backend screen requests are not Creator Fund impressions. Device polling is a service-health signal, not proof that a human looked at the screen.

Month 1 success is reliable passive progression and a readable display. Month 2/3 engagement targets are hypotheses; do not turn “opens three times/week” into a product pressure to nag players.

## Display-experience acceptance

Apply [TRMNL experience](trmnl-experience.md) to all sizes. Distinguish linked, saved, generated preview and displayed milestones. Device layouts omit date/time and timezone labels (D39); death/pause/delays remain clear after missed refreshes. Mixed playlists, slower intervals and sleeping devices never reduce progress.

First release also requires V07 author entitlement/reviewer access and V08 playlist/hardware evidence. Record tested model/bit-depth/orientation/theme settings. Calm glance/story goals are design acceptance; marketplace review establishes publication suitability.

Premium means a polished installation, readable first screen, charming authored story, dependable progression and good support. It does not mean charging players or requiring extra refreshes.
