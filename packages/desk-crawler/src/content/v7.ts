import type { ContentCatalog } from '../sim/core/types'
import { contentV6 } from './v6'

/*
 * Content catalog v7 (D110): desk raids. On an exploring tick a hero may raid
 * another active hero's desk instead of meeting an encounter; how often
 * depends on its stance, and who wins is 50/50 moved only by the two stances.
 * The loser gives up 5% of its gold to the winner and both lose a share of
 * maximum HP, the loser more. Everything else is v6.
 */
export const contentV7: ContentCatalog = {
  ...contentV6,
  contentVersion: 'v7',
  raids: {
    launchPermille: { cautious: 5, balanced: 10, bold: 20 },
    edgePct: { cautious: 10, balanced: 0, bold: -5 },
    goldLossPct: 5,
    loserHpPct: 30,
    winnerHpPct: 10,
    targetCooldownTicks: 24,
    narrative: {
      // The amounts travel as change chips beside the story (D48), so the lines carry none.
      raidWon: [
        "Raided {rival}'s desk while they were at lunch.",
        "Slipped into {rival}'s cubicle and helped itself to the petty cash.",
        "Emptied {rival}'s desk drawer of loose change.",
      ],
      raidLost: [
        "Caught red-handed at {rival}'s desk and chased off.",
        "The raid on {rival}'s desk went badly. Dropped the loot on the way out.",
        '{rival} was at their desk after all. Fled empty-handed.',
      ],
      raided: [
        '{rival} raided the desk while nobody was looking.',
        'Came back to find {rival} had been through the drawers.',
        '{rival} made off with the petty cash.',
      ],
      repelled: [
        'Caught {rival} raiding the desk and sent them packing.',
        'Caught {rival} at the drawers. They fled and dropped their loot.',
        'Found {rival} under the desk and showed them out.',
      ],
      rescue: ['A narrow escape; resting now.', 'Barely made it out of the scuffle; resting now.'],
    },
  },
}
