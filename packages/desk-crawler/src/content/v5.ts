import type { ContentCatalog } from '../sim/core/types'
import { contentV4 } from './v4'

/*
 * Content catalog v5 (D79): narrative choices. Four of every hundred loot
 * draws (taken from the gold share) put a small office situation to the
 * player: two or three options, one of which happens by itself a day later.
 * Effects are gold, health or potions, never XP, so answering in the
 * companion and letting the default run are the same code path. Everything
 * else is v4.
 */
export const contentV5: ContentCatalog = {
  ...contentV4,
  contentVersion: 'v5',
  constants: {
    ...contentV4.constants,
    lootWeights: { gear: 15, potion: 20, gold: 55, merchant: 6, event: 4 },
  },
  choices: {
    expiresAfterTicks: 96,
    events: [
      {
        id: 'misfiled_expense',
        title: 'A misfiled expense form',
        prompt: 'An intern found an unfiled expense form with no name on it.',
        options: [
          { id: 'file', label: 'File it under your name', story: 'Filed the stray expense form. Finance paid out without a question.', effect: { goldPerTier: 12 } },
          { id: 'return', label: 'Hand it back', story: 'Handed the expense form back to the intern.', effect: {} },
        ],
        defaultOptionId: 'return',
      },
      {
        id: 'break_room_cake',
        title: 'A whip-round for cake',
        prompt: 'The break room is collecting for a birthday cake. The jar is already half full.',
        options: [
          { id: 'chip_in', label: 'Chip in 15 gold', story: 'Chipped in for the cake. Had two slices and felt much better.', effect: { gold: -15, hpPct: 15 } },
          { id: 'pass', label: 'Keep walking', story: 'Walked past the cake collection without chipping in.', effect: {} },
        ],
        defaultOptionId: 'pass',
      },
      {
        id: 'first_aid_restock',
        title: 'The first-aid kit is being restocked',
        prompt: 'The first-aid kit is being restocked. A potion sits on top and the clerk is looking away.',
        options: [
          { id: 'take', label: 'Take one, leave 8 gold in the tin', story: 'Took a potion from the restock and left some gold in the honesty tin.', effect: { gold: -8, potions: 1 } },
          { id: 'leave', label: 'Leave it for whoever needs it', story: 'Left the restocked first-aid kit alone.', effect: {} },
        ],
        defaultOptionId: 'leave',
      },
      {
        id: 'overtime_request',
        title: 'An overtime request',
        prompt: 'A manager will pay overtime to clear the back corridor tonight.',
        options: [
          { id: 'stay', label: 'Stay late', story: 'Worked late, cleared the corridor and got paid overtime.', effect: { goldPerTier: 25, hpPct: -10 } },
          { id: 'clock_out', label: 'Clock out on time', story: 'Clocked out on time and left the corridor for someone else.', effect: {} },
        ],
        defaultOptionId: 'clock_out',
      },
      {
        id: 'stuck_vending_machine',
        title: 'A stuck vending machine',
        prompt: 'The vending machine ate a coin and a snack is stuck behind the glass.',
        options: [
          { id: 'kick', label: 'Kick it', story: 'Kicked the vending machine: two snacks, some change and a sore toe.', effect: { goldPerTier: 6, hpPct: -5 } },
          { id: 'walk_on', label: 'Walk on', story: 'Left the vending machine alone.', effect: {} },
        ],
        defaultOptionId: 'walk_on',
      },
      {
        id: 'lost_wallet',
        title: 'A lost wallet',
        prompt: 'A wallet is lying by the lifts, full of gold, with a photo of a cat inside.',
        options: [
          { id: 'hand_in', label: 'Hand it in at reception', story: 'Handed the wallet in. The owner came by later with a thank-you potion.', effect: { potions: 1 } },
          { id: 'keep', label: 'Keep the gold', story: 'Kept the gold and left the empty wallet by the lifts.', effect: { goldPerTier: 30 } },
        ],
        defaultOptionId: 'hand_in',
      },
    ],
  },
}
