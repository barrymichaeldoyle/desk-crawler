# Effects and affixes (D80/D81) — 2026-10-07

Fifth and sixth v1.1 systems. Content v6 adds the epic rarity, four affixes and three temporary effects; everything before is v5.

## Behavior

See the decision record: affixes are rolled on rare and epic gear at generation (a draw only v6 has), effects come from trap hits, elite wins and the cake choice, and one resolver sums every live modifier for the simulator and the hero page. Order of operations: expired effects drop at the start of any evaluation; a knockout clears every effect; any rest cleanses banes and keeps boons; modifiers apply at one place each (attack and defense before combat, XP and gold after the reward roll, trap damage after the roll, a heal after each win, gold-loss points on retreat and knockout).

## Local verification

- Tests: the v6 catalog validates; across 6,000 seeds only rare and epic gear carry an affix and v5 never does; the epic find story names the affix and counts; each affix's modifier lands exactly where documented (Lucky +20% gold with XP unchanged, Sturdy −40% trap damage, Vampiric +5% maximum HP after a win, Thrifty zeroes the 5% retreat loss); modifier summing ignores unknown ids and the bound of three pushes out the effect ending soonest; Bruised after a trap hit and Fired up after an elite win with their stories; silent expiry in any status; a knockout clears effects; rest cleanses banes and keeps boons; v5 heroes play identically under v6 wherever no epic roll, affix or effect is involved; the cake choice grants Well fed through `heroes.choose` and the hero page lists it; the device celebrates an epic find.
- Balance: a 300-hero, 30-day v6 run ([report](balance-v6-effects-30-days.json)) for the pacing effect of Bruised and Fired up; see the balance evidence for the numbers.

## Rollout state

Deployed from `0894e14` (lint and Workers build green); production switched to content v6 (`{"from":"v5","to":"v6"}`) on 2026-10-07. Live render unverified.
