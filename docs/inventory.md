# Inventory cadence, retained finds and sleep

Approved policy: D18/D19/D29. This supersedes full-bag auto-sale and the suggested 24-hour-inactivity trigger. Numerical capacity/acquisition values are approved tuning starting points, not measured outcomes.

## Cadence and capacity

Target management every three to seven days. Initial bag capacity is 30 gear, including equipped gear; warn quietly at 24. Two starters leave 28 slots. A target around five gear/day gives an expected 5.6 days before full without selling; measure distributions, useful upgrades and harder-biome survival. Manual equip/sell/biome choices remain intentional.

Separate potion stack: quantity 1–20, with no empty stack row. Loot selects a documented gold outcome before generation when the stack is full; it never creates and discards/sells an excess potion. Do not force inventory sleep for potion capacity.

## First overflow and held find

At 30 bag gear, keep adventuring until another actual gear find. Store that find in one held slot with its original copied stats/template/version/rarity. Apply the encounter's earned XP/gold/level-up once, then set gameplay status `sleeping`. Never automatically sell/discard the find. No further encounter, XP or passive HP healing while sleeping; previous window XP continues aging out.

The authoritative held reference is `heroes.heldItemId`; held gear uses an ordinary owned item row and is excluded from bag/equipment until claimed. Maximum reads: 30 bag gear + one held gear + one potion row = 32. No independent location/equipped flags or expanding queue. A full bag alone does not sleep, and no browser/device/check-in clock triggers it.

## Return journey

1. Review bag and held find. Equip/unequip/sell bag gear remain available while sleeping; held gear cannot equip/sell before claiming.
2. Free a bag slot and call `inventory.claimHeld`: clear the held reference atomically, keeping the same owned item and stats. A duplicate receipt cannot claim again.
3. Leave at least one free bag slot and select Resume adventures. Claiming into a full bag requires another sale before waking; UI explains this.
4. `inventory.resumeAdventures(biomeId?)` sets `wakeAtTick = world.currentTick + 1` and optionally a pending unlocked destination, preserving `sleeping` until that evaluation. Repeating it with the same arguments is a no-op. At that tick clear the wake deadline; with a destination, depart (travelling, arriving the following tick, no encounter); otherwise set exploring and continue normal sustain/one-encounter rules. No catch-up. This lets a returning player sell, claim, resume and move on in one visit (D29).

Selling many items one at a time is tedious on mobile and close to the intent rate limit. `inventory.sellMany` sells up to 30 player-selected bag items in one atomic intent. Selection remains explicit: no automatic or rule-based disposal.

Commands do not advance gameplay evaluation markers or XP. Pending wake shows “Adventures resume next tick.” No new find can appear while sleeping or waiting for wake. Owner/activation/quarantine checks remain mandatory.

## State rules and display

Inventory sleep is distinct from HP rest, voluntary pause and service quarantine. Manual potions/travel/pause cannot run while sleeping. Death/travel cannot occur simultaneously with sleep; overflow arises from an exploring loot/victory outcome after survival/level-up processing. Existing auto-revival and one-tick travel rules remain unchanged.

Device text when held: “Bag full, holding a new find” with the attention line “Make room in your bag in the companion, then resume.” and a QR code to the bag. After claim/full bag: explain free-space requirement. Keep status distinct from service failure; use the idle sprite. Recent rank remains eligible, though XP accrual stops and old XP ages out; once window XP reaches zero the sleeping hero is dormant and leaves recent boards until it resumes (D32). Hardware Sleep Mode/offline/uninstall still never determine progress.

## Acceptance

Test exact capacity boundaries, rare gear retention, potion cap fallback, copied-stat integrity, duplicate acquisition/claim/wake/sale, simultaneous tick/intent races, sleep without HP/XP/log spam, next-tick wake, no catch-up, and space checks after claiming. Measure cadence percentiles for all biomes and player policies. Update [gameplay](gameplay.md), [domain](domain-contracts.md), [model](data-model.md), [API](api.md), [quality](quality.md) and fixtures together when tuning changes.
