import type { ContentCatalog } from '../sim/core/types'
import { contentV5 } from './v5'

/*
 * Content catalog v6 (D80/D81): effects and affixes. Epic gear joins the
 * rarity table at one in a hundred, rare and epic gear roll one affix at
 * generation, and three temporary effects come from trap hits, elite
 * victories and the cake choice. Owned gear from earlier catalogs has no
 * affix and plays exactly as before; everything else is v5.
 */
export const contentV6: ContentCatalog = {
  ...contentV5,
  contentVersion: 'v6',
  rarities: [
    { rarity: 'common', weight: 70, statBonus: 0, saleMultiplier: 1 },
    { rarity: 'uncommon', weight: 25, statBonus: 2, saleMultiplier: 2 },
    { rarity: 'rare', weight: 4, statBonus: 4, saleMultiplier: 4 },
    { rarity: 'epic', weight: 1, statBonus: 7, saleMultiplier: 8 },
  ],
  affixRarities: ['rare', 'epic'],
  affixes: [
    { id: 'vampiric', name: 'Vampiric', blurb: 'Heals a little after every win.', modifiers: { healOnVictoryPct: 5 } },
    { id: 'lucky', name: 'Lucky', blurb: 'More gold from wins and finds.', modifiers: { goldPct: 20 } },
    { id: 'sturdy', name: 'Sturdy', blurb: 'Traps hurt much less.', modifiers: { trapDamagePct: 40 } },
    { id: 'thrifty', name: 'Thrifty', blurb: 'Loses less gold when things go wrong.', modifiers: { goldLossPct: 5 } },
  ],
  effects: [
    { id: 'fired_up', name: 'Fired up', blurb: 'Hits harder after beating an elite.', kind: 'boon', durationTicks: 8, modifiers: { attackPct: 10 } },
    { id: 'bruised', name: 'Bruised', blurb: 'A trap left a mark; defense is down until a rest.', kind: 'bane', durationTicks: 4, modifiers: { defensePct: -15 } },
    { id: 'well_fed', name: 'Well fed', blurb: 'Learns a little more from each win.', kind: 'boon', durationTicks: 8, modifiers: { xpPct: 10 } },
  ],
  effectSources: { trapHit: 'bruised', eliteVictory: 'fired_up' },
  choices: {
    ...contentV5.choices!,
    events: contentV5.choices!.events.map((event) =>
      event.id === 'break_room_cake'
        ? { ...event, options: event.options.map((option) => (option.id === 'chip_in' ? { ...option, effect: { ...option.effect, effectId: 'well_fed' } } : option)) }
        : event,
    ),
  },
}
