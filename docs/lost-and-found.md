# Lost-and-found box (P32)

Proposed 2026-10-09 for Barry's review; not approved, nothing built. This spec is the v1.1 "Lost-and-found" stretch row in the [roadmap](roadmap.md), which says to "extend the single held-find/inventory-sleep system only with a bounded migration; never reintroduce silent disposal". Its companions are [quests](quests.md) (P31) and [alerts](alerts.md) (P33).

## The problem it solves

Inventory sleep is the largest cause of lost play. The [bag-ladder evidence](evidence/bag-ladder.md) measures it: once the bag is full, the next gear find becomes the held find and the hero stops until the player makes room ([inventory](inventory.md)). At 20 slots and about 4.7 gear a day, an unattended hero is asleep 91.8% of its first 30 days, and a player who manages the bag weekly is asleep 48% of the time. That last figure hits the weekly players hardest, even though D61 accepted it as a consequence of the ladder. The bag ladder was never meant to cost the hero half the week.

The fix can't be automatic selling. [Inventory](inventory.md) forbids automatic or rule-based disposal because players hate losing a rare item to a rule, and that rule stays. The fix is somewhere to put finds that is not the bag.

## The idea in one paragraph

The office has a lost-and-found box. When the bag is full, the hero drops each new gear find into the box and keeps adventuring. Only when the box is also full does the next find become the held find and the hero sleeps, exactly as today. The box holds six items. In the companion the player can sell straight from the box, move an item into the bag, or equip it directly. Nothing in the box is ever sold, discarded or lost automatically.

## What a player sees

- **Device:** the D83 bag count in the HUD gains the box when it holds anything: "bag 20/20 +3". When the box fills, nothing changes until the next find, which sleeps the hero with today's held-find text and attention line. When the box is first used, the log line reads "Bag full, so the Keyboard Mace went in the lost-and-found box."; later box finds use the ordinary find line with a box glyph. At 4 of 6 the device shows the existing quiet bag warning style, worded "Lost-and-found box filling up", in the attention line. It is the only new attention text, and it gives way to anything more urgent, as the notice line always does.
- **Companion:** the Bag page gets a "Lost and found" section under the bag, with up to six item cards and the same stats, rarity and affix display. Each card has Sell, Equip and "Move to bag" (shown only when the bag has a free slot). Sell many covers box items as well as bag items. The home screen's bag summary reads "Bag 20/20 · 3 in the lost-and-found".
- **Help page:** the Bag section gains one paragraph saying the box catches finds when the bag is full and the hero only stops when the box is full too.

## Rules

### Placement

In apply step 10 of the [simulation order](gameplay.md#simulation-order), when a new gear find would exceed bag capacity:

1. The find goes into the box when the box has a free slot. The hero keeps its status, and the find counts in `itemsFound` as usual, plus a new `boxFinds` counter.
2. When the box is full, the find becomes the held find and the hero enters sleeping, which is today's rule unchanged.

The box never takes potions, since potions already fall back to gold at the pouch cap, and it never takes bag-ladder or pouch finds, since those are upgrades and not items. Rare and epic finds go into the box like any other gear. No find skips the box or is chosen over another.

### Capacity

Six slots, a catalog number (`lostAndFound.capacity`), with one size for every hero. A box ladder would turn it into a second bag ladder that players have to grind. Six is the starting point because:

- The tick and companion reads stay within the 32-row bound: 20 bag + 2 equipped + 1 held + 1 potion = 24, plus 6 in the box = 30. When v2.0 introduces bags past 20, that release has to revisit this bound in any case.
- At about 4.7 finds a day it adds about 1.3 days before sleep. The harness has to show the seven-day cohort's time asleep falling from 48% to under 30% while the three-day cohort stays near 0%. If it doesn't, the size changes and the shape stays.
- It stays clearly smaller than the bag, so bag upgrades still matter.

### Where box items live

There is no location flag on items ([inventory](inventory.md) rules out independent location flags). The box is an ordered list of item ids on the hero, `lostAndFound?: Id<'items'>[]`, at most `capacity` long, newest last. It is the held-find reference widened to a short list. A box item is an ordinary owned item row and keeps its copied stats. The bag count is unequipped gear that isn't held and isn't in the box, and the tick computes it as it does today, with box ids excluded the same way the held id already is.

### Intents

All of these are receipted, follow the ownership, activation and quarantine checks, and are allowed while sleeping:

- `inventory.claimFromBox(itemId)`: moves an item into the bag. It needs a free bag slot, the same rule as `claimHeld`.
- `inventory.equipFromBox(itemId)`: equips the item, and the replaced piece goes into the box slot just freed, so space is never a problem. The level requirement still applies.
- `inventory.sell` and `inventory.sellMany` accept box items, within the same limit of 30 per call.
- When the box has a free slot and the hero is sleeping on a held find, `claimHeld` can claim into the box, so a player can resume without first selling something from the bag. That gives the held find a second destination and leaves its semantics unchanged.

### Sleep and wake

Sleep behaves the same: the find that arrives with the box full is held, and the hero stops. Resume needs the held slot empty and at least one free slot in the bag or the box. Today it requires a free bag slot. The new rule says "room for the next find", which is what the bag rule was protecting.

### Versions and migration

The box exists only under a catalog with `lostAndFound` rules (content v8, alongside [quests](quests.md) if both are approved, or on its own). Earlier catalogs replay unchanged, because the box changes only where an overflow find goes and draws no randomness.

The migration is bounded and runs once on each hero's first content v8 evaluation. It needs no job:

- A hero with no held find gets an empty box when it first overflows.
- A sleeping hero keeps its held find and keeps sleeping. Its box starts empty, and the player can now claim the held find into the box and resume. The hero isn't woken automatically, because the player chose when to come back and nothing changes without them.

## Deliberate limits

- No automatic selling, discarding, expiry or "oldest falls out" rule. A full box means sleep, as a full bag does today.
- No box upgrades or gold-bought capacity in this version.
- No buy-back of sold items. That would be a separate feature, and the source brief never asked for it.
- No shared or public box. Graveyard items and gear other heroes find stay deferred ([roadmap](roadmap.md) v1.2 stretch).
- No new alert. If [alerts](alerts.md) is approved, the existing "hero is asleep" alert covers a full box, because that is the moment the hero stops.

## Work slices

| Slice | Scope | Done when |
| --- | --- | --- |
| L1 Rules and harness | Content v8 `lostAndFound` rules and validator, placement in apply step 10, the box-aware bag count, the resume rule, `boxFinds`, the first-use log line. Harness: time asleep and first unattended sleep by cohort at capacities 4, 6 and 8 | v7 replays unchanged; seven-day time asleep under 30% at the chosen size; no find is ever lost (property test over random runs: every find ends up equipped, in the bag, in the box, held or sold by an intent) |
| L2 Backend | Hero field, the four intents, the bag query and payload count, deletion covers box items (they are ordinary item rows, so this is a test, not new code) | Duplicate-receipt and tick-versus-intent race tests for each intent; reads stay within 32 rows |
| L3 Companion and help | Box section, the three item actions, sell many over both, home summary, help paragraph | Phone previews pass at 390 wide |
| L4 Device | HUD "+N", box glyph, first-use line, the filling-up notice, template bump, preview sweep | The widest HUD (bag 20/20 +6) renders in every layout |

## Questions for Barry

1. Size six? Eight is the most the current read bound allows, and the harness can show both.
2. Should the "box filling up" notice exist at all? Without it the device stays calmer, and the HUD count already shows the box.
3. Name: "Lost and found" fits the office theme. An alternative is "Desk drawer", which would suggest the hero owns the space.
