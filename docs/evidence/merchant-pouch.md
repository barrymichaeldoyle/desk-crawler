# Potion pouch and wandering merchant (D77/D78) — 2026-10-07

Second and third v1.1 systems, built under Barry's instruction to work through every v1.1 item. Content v4 adds the potion pouch ladder and the wandering merchant; stances (v3) and everything before are untouched.

## Behavior

**Pouch.** The potion cap is a per-hero ladder, Thermos 20 → Lunchbox 30 (level 6, 120 gold) → Cooler Bag 40 (level 10, 450) → Vending Cart 60 (level 14, 1,500), stored as `potionCap` (absent means the catalog's 20, so every existing hero and every earlier catalog play as before). Milestones land before loot, a dedicated 8‰ draw per loot encounter after the bag draw can find the next pouch, `inventory.buyPouch` and the merchant can buy it, and finds and purchases run at most one rung ahead of the guaranteed tier. The cap never shrinks. The Bag page shows a Potion pouch card beside the bag ladder.

**Merchant.** Six of every hundred loot draws (taken from the gold share) are a visit: one to three offers drawn from the reward stream (a potion bundle of one to three at 12 gold × biome tier each, the next pouch and the next bag at ladder prices when the hero may take them early), stored on the hero with a four-tick expiry. Each offer sells once through `inventory.buyOffer` (receipted, gold checked, a bundle that would overflow the pouch refused whole); the last sale or the expiry closes the visit, and the simulator clears an expired visit quietly in any status. The device shows one outlined `notice` line in the attention slot (template v34) that leaves the stories and recap alone; the hero page links to the Bag page's Wandering Merchant card. No push, email or device alert.

## Local verification

- Typechecks and the full suite pass (see the decision record for the count). New tests: the ladder helpers and validator, the pouch milestone on the level tick, the pouch find on its draw and a bigger pouch keeping a find the old cap would have sold, the cap invariant; the merchant's offers, prices and determinism, its four-tick stay and quiet exit while paused, no visits under v3; `buyPouch` once and never two rungs ahead; `buyOffer` for potions, pouch and bag, each once, gold and pouch-cap refusals, closing on the last sale, refusal after expiry; the payload notice and its suppression by expiry or an attention line; the template notice in every layout with the stories kept.
- Official TRMNL lint passes; 276 renders identical in liquidjs and Ruby Liquid.
- A `merchant` preview scenario renders the notice in all four layouts, OG/X/BWRY, both orientations: 24 settled previews, no overflow, stories kept beneath the chip.
- Balance: a 300-hero, 30-day v4 run ([report](balance-v4-merchant-30-days.json)) shows pacing within 0.2 days of v3 for every managed cohort; the harness never buys, so this is the floor.

## Rollout state

Deployed from `571acee` (lint and Workers build green) and production switched to content v4 at 15:58 UTC on 2026-10-07 (`{"from":"v3","to":"v4"}`). A follow-up commit fixed the notice chip: it collapsed to zero height inside the story column's flex layout and overlapped its neighbours; both the notice and the attention line are now `no-shrink`, the notice sits in a padded wrapper, and the text was shortened to one OG line. The merchant preview scenario (24 renders, both orientations, three devices) passes the sweep with the chip clear of the divider and the stories. Live server render unverified.
