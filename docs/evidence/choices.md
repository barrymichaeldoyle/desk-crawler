# Narrative choices (D79) — 2026-10-07

Fourth v1.1 system. Content v5 adds six authored office situations; everything before is v4.

## Behavior

Four of every hundred loot draws (from the gold share) offer an event: the prompt is the tick's story and a pending choice lands on the hero for 96 ticks (a day). One is pending at a time; another draw falls through to gold. The hero page shows the situation, one button per option with its concrete change in brackets, and which option decides itself in how many adventures. `heroes.choose` applies the chosen option's authored effect (gold, a share of maximum HP or potions, never XP) through the same pure resolver the simulator uses, and clears the choice in that transaction. If the day passes, the first exploring or resting tick at or after expiry applies the default option as the whole event (no encounter that tick), while dead, travelling, paused and sleeping heroes keep it pending. The device shows "A decision is waiting in the companion." as its notice, above the merchant's.

Difference from the roadmap: no separate pending-choice table. There is at most one pending choice per hero, so it lives on the hero document and the resolution is the log entry (a `choose` command or a `choice` tick with `phase: defaulted`).

## Local verification

- Catalog validation (two or three options, distinct ids, a default among them, effects bounded, prompts and stories within 90 code points); the resolver's clamps (gold at what the hero has, HP never below 1 nor above the maximum, potions within the pouch); the draw and the single-pending rule; no events under v4; expiry resolving by the default as the whole tick and only while exploring or resting; an unknown event rejected; the intent showing concrete changes, applying once, logging, refusing again and refusing after expiry; potions granted within the pouch; the device notice and its priority over the merchant; a `choice` preview scenario.
- Full suite, lint and cross-check: see the decision record.

## Rollout state

Deployed from `51e8e9c` (lint and Workers build green); production switched to content v5 (`{"from":"v4","to":"v5"}`) and then to v6 the same day.
