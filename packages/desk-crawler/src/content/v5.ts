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
        prompt: 'An intern hands over an expense form nobody ever filed. It is made out to no one.',
        options: [
          { id: 'file', label: 'File it under your name', story: 'Filed the stray expense form. Finance paid out without a question.', effect: { goldPerTier: 12 } },
          { id: 'return', label: 'Hand it back', story: 'Handed the expense form back to the intern. Somebody will claim it eventually.', effect: {} },
        ],
        defaultOptionId: 'return',
      },
      {
        id: 'break_room_cake',
        title: 'A whip-round for cake',
        prompt: 'The break room is collecting for a birthday cake. The jar is already half full.',
        options: [
          { id: 'chip_in', label: 'Chip in 15 gold', story: 'Chipped in for the cake. Had two slices and felt much better.', effect: { gold: -15, hpPct: 15 } },
          { id: 'pass', label: 'Keep walking', story: 'Walked past the cake collection. The jar did not notice.', effect: {} },
        ],
        defaultOptionId: 'pass',
      },
      {
        id: 'first_aid_restock',
        title: 'The first-aid kit is being restocked',
        prompt: 'The first-aid kit is being restocked. A potion sits on top and the clerk is looking away.',
        options: [
          { id: 'take', label: 'Take one, leave 8 gold in the tin', story: 'Took a potion from the restock and left some gold in the honesty tin.', effect: { gold: -8, potions: 1 } },
          { id: 'leave', label: 'Leave it for whoever needs it', story: 'Left the restocked first-aid kit alone. Very noble. Slightly regretted it.', effect: {} },
        ],
        defaultOptionId: 'leave',
      },
      {
        id: 'overtime_request',
        title: 'An overtime request',
        prompt: 'A manager wants the back corridor cleared tonight. Good pay, bad corridor.',
        options: [
          { id: 'stay', label: 'Stay late', story: 'Worked the late shift. Cleared the corridor, collected the overtime, lost some sleep.', effect: { goldPerTier: 25, hpPct: -10 } },
          { id: 'clock_out', label: 'Clock out on time', story: 'Clocked out on time. The corridor can wait for someone else.', effect: {} },
        ],
        defaultOptionId: 'clock_out',
      },
      {
        id: 'stuck_vending_machine',
        title: 'A stuck vending machine',
        prompt: 'The vending machine has eaten a coin and is holding a snack hostage. It looks sturdy.',
        options: [
          { id: 'kick', label: 'Kick it', story: 'Kicked the vending machine. Two snacks and a handful of change fell out. So did a bruise.', effect: { goldPerTier: 6, hpPct: -5 } },
          { id: 'walk_on', label: 'Walk on', story: 'Left the vending machine to its own devices.', effect: {} },
        ],
        defaultOptionId: 'walk_on',
      },
      {
        id: 'lost_wallet',
        title: 'A lost wallet',
        prompt: 'A wallet is lying by the lifts, full of gold, with a photo of a cat inside.',
        options: [
          { id: 'hand_in', label: 'Hand it in at reception', story: 'Handed the wallet in. The owner came by later with a thank-you potion.', effect: { potions: 1 } },
          { id: 'keep', label: 'Keep the gold', story: 'Kept the gold from the wallet. The cat in the photo looked disappointed.', effect: { goldPerTier: 30 } },
        ],
        defaultOptionId: 'hand_in',
      },
    ],
  },
}
