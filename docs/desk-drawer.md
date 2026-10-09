# Desk drawer (P32, the "lost-and-found" row)

Proposed 2026-10-09 for Barry's review and revised the same day with the open questions settled (see [Decisions taken in this revision](#decisions-taken-in-this-revision)); not approved, nothing built. This spec is the v1.1 "Lost-and-found" stretch row in the [roadmap](roadmap.md), which says to "extend the single held-find/inventory-sleep system only with a bounded migration; never reintroduce silent disposal". The roadmap row keeps the brief's name; the player-facing feature is the hero's **desk drawer**. Its companions are [quests](quests.md) (P31) and [alerts](alerts.md) (P33).

## The problem it solves

Inventory sleep is the largest cause of lost play. The [bag-ladder evidence](evidence/bag-ladder.md) measures it: once the bag is full, the next gear find becomes the held find and the hero stops until the player makes room ([inventory](inventory.md)). At 20 slots and about 4.7 gear a day, an unattended hero is asleep 91.8% of its first 30 days, and a player who manages the bag weekly is asleep 48% of the time. That last figure hits the weekly players hardest, even though D61 accepted it as a consequence of the ladder. The bag ladder was never meant to cost the hero half the week.

The fix can't be automatic selling. [Inventory](inventory.md) forbids automatic or rule-based disposal because players hate losing a rare item to a rule, and that rule stays. The fix is somewhere to put finds that is not the bag.

## The idea in one paragraph

The hero has a desk drawer. When the bag is full, the hero drops each new gear find into the drawer and keeps adventuring. Only when the drawer is also full does the next find become the held find and the hero sleeps, exactly as today. The drawer holds six items. In the companion the player can sell straight from the drawer, move an item into the bag, or equip it directly. Nothing in the drawer is ever sold, discarded or lost automatically.

## What a player sees

- **Device:** the D83 bag count in the HUD gains the drawer when it holds anything: "bag 20/20 +3". When the drawer is first used, the log line reads "Bag full, so the Keyboard Mace went in the desk drawer."; later drawer finds use the ordinary find line with a drawer glyph. When the drawer fills, nothing changes until the next find, which sleeps the hero with today's held-find text and attention line. There is no "drawer filling up" notice: the HUD count already shows it, and the attention line stays for the moment the hero actually stops.
- **Companion:** the Bag page gets a "Desk drawer" section under the bag, with up to six item cards and the same stats, rarity and affix display. Each card has Sell, Equip and "Move to bag" (shown only when the bag has a free slot). Sell many covers drawer items as well as bag items. The home screen's bag summary reads "Bag 20/20 · 3 in the drawer".
- **Help page:** the Bag section gains one paragraph saying the drawer catches finds when the bag is full and the hero only stops when the drawer is full too.

## Rules

### Placement

In apply step 10 of the [simulation order](gameplay.md#simulation-order), when a new gear find would exceed bag capacity:

1. The find goes into the drawer when the drawer has a free slot. The hero keeps its status, and the find counts in `itemsFound` as usual, plus a new `drawerFinds` counter.
2. When the drawer is full, the find becomes the held find and the hero enters sleeping, which is today's rule unchanged.

The drawer never takes potions, since potions already fall back to gold at the pouch cap, and it never takes bag-ladder or pouch finds, since those are upgrades and not items. Rare and epic finds go into the drawer like any other gear. No find skips the drawer or is chosen over another.

### Capacity

Six slots, a catalog number (`deskDrawer.capacity`), with one size for every hero. A drawer ladder would turn it into a second bag ladder that players have to grind. Six is the chosen size because:

- The tick and companion reads stay within the 32-row bound: 20 bag + 2 equipped + 1 held + 1 potion = 24, plus 6 in the drawer = 30. When v2.0 introduces bags past 20, that release has to revisit this bound in any case.
- The drawer adds six slots at **every** bag tier, which matters more than a bigger ceiling: the seven-day cohort reaches the 20-slot bag at a median of 21.8 days, so for most of its first month it carries a 10, 13 or 16-slot bag, and six more slots on a Tote Bag is 60% more room. That is why a 24-slot ceiling barely moved the seven-day figure (45.4% against 47.9%) while a drawer should. The harness has to show the seven-day cohort's time asleep falling from 48% to under 30% while the three-day cohort stays near 0%. If six misses that, the size moves to eight, the most the read bound allows, and the shape stays.
- It stays clearly smaller than the bag, so bag upgrades still matter.

### Where drawer items live

There is no location flag on items ([inventory](inventory.md) rules out independent location flags). The drawer is an ordered list of item ids on the hero, `drawer?: Id<'items'>[]`, at most `capacity` long, newest last. It is the held-find reference widened to a short list. A drawer item is an ordinary owned item row and keeps its copied stats. The bag count is unequipped gear that isn't held and isn't in the drawer, and the tick computes it as it does today, with drawer ids excluded the same way the held id already is.

### Intents

All of these are receipted, follow the ownership, activation and quarantine checks, and are allowed while sleeping:

- `inventory.claimFromDrawer(itemId)`: moves an item into the bag. It needs a free bag slot, the same rule as `claimHeld`.
- `inventory.equipFromDrawer(itemId)`: equips the item, and the replaced piece goes into the drawer slot just freed, so space is never a problem. The level requirement still applies.
- `inventory.sell` and `inventory.sellMany` accept drawer items, within the same limit of 30 per call.
- When the drawer has a free slot and the hero is sleeping on a held find, `claimHeld` can claim into the drawer, so a player can resume without first selling something from the bag. That gives the held find a second destination and leaves its semantics unchanged.

### Sleep and wake

Sleep behaves the same: the find that arrives with the drawer full is held, and the hero stops. Resume needs the held slot empty and at least one free slot in the bag or the drawer. Today it requires a free bag slot. The new rule says "room for the next find", which is what the bag rule was protecting.

### Versions and migration

The drawer exists only under a catalog with `deskDrawer` rules. It takes its own content version (v8, since it is first in the suggested build order), and [quests](quests.md) take the next one, so each system's replay gate stands alone. Earlier catalogs replay unchanged, because the drawer changes only where an overflow find goes and draws no randomness.

The migration is bounded and runs once on each hero's first evaluation under the new catalog. It needs no job:

- A hero with no held find gets an empty drawer when it first overflows.
- A sleeping hero keeps its held find and keeps sleeping. Its drawer starts empty, and the player can now claim the held find into the drawer and resume. The hero isn't woken automatically, because the player chose when to come back and nothing changes without them.

## Deliberate limits

- No automatic selling, discarding, expiry or "oldest falls out" rule. A full drawer means sleep, as a full bag does today.
- No drawer upgrades or gold-bought capacity in this version.
- No buy-back of sold items. That would be a separate feature, and the source brief never asked for it.
- No shared or public drawer. Graveyard items and gear other heroes find stay deferred ([roadmap](roadmap.md) v1.2 stretch).
- No new device notice and no new alert. If [alerts](alerts.md) is approved, the existing "hero is asleep" alert covers a full drawer, because that is the moment the hero stops.

## Work slices

| Slice | Scope | Done when |
| --- | --- | --- |
| L1 Rules and harness | Content v8 `deskDrawer` rules and validator, placement in apply step 10, the drawer-aware bag count, the resume rule, `drawerFinds`, the first-use log line. Harness: time asleep and first unattended sleep by cohort at capacities 4, 6 and 8 | v7 replays unchanged; seven-day time asleep under 30% at the chosen size; no find is ever lost (property test over random runs: every find ends up equipped, in the bag, in the drawer, held or sold by an intent) |
| L2 Backend | Hero field, the four intents, the bag query and payload count, deletion covers drawer items (they are ordinary item rows, so this is a test, not new code) | Duplicate-receipt and tick-versus-intent race tests for each intent; reads stay within 32 rows |
| L3 Companion and help | Drawer section, the three item actions, sell many over both, home summary, help paragraph | Phone previews pass at 390 wide |
| L4 Device | HUD "+N", drawer glyph, first-use line, template bump, preview sweep | The widest HUD (bag 20/20 +6) renders in every layout |

## Decisions taken in this revision

Barry asked on 2026-10-09 for the three stretch specs to be revised for the best gameplay, with the open questions settled rather than left for him.

1. **Size six**, with eight as the only fallback if the harness misses the seven-day gate. Six at every bag tier is where the value is, and six keeps the bag ladder worth climbing.
2. **No "filling up" notice.** The device has no bag warning today either; the HUD count carries the information and the attention line is kept for the moment the hero stops. One fewer line competing for the notice slot.
3. **Name: desk drawer**, not lost-and-found box. The game promises that nothing is ever lost, so a storage feature should not have "lost" in its name, and a drawer at the hero's own desk says ownership where a shared office box says the item is out of the hero's hands. The roadmap row keeps the brief's title.
