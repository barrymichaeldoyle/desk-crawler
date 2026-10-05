import type { BiomeNarrative, ContentCatalog } from '../sim/core/types'
import { contentV3 } from './v3'

/** v4 adds mishaps and deliberate callbacks; v3's gameplay numbers are unchanged. */
const extraMishaps: Readonly<Record<string, readonly string[]>> = {
  office_cubicles: [
    'The printer spat a toner cloud. -{damage} HP.',
    'A desk drawer attacked a knee. -{damage} HP.',
    'Stepped on an abandoned plug. -{damage} HP.',
    'A filing cabinet opened at shin height. -{damage} HP.',
    'The whiteboard rolled downhill. -{damage} HP.',
    'Lost a duel with the revolving door. -{damage} HP.',
    'Sat on a chair that was mostly optimism. -{damage} HP.',
    'A falling hole punch made its point. -{damage} HP.',
    'Caught a finger in the paper shredder lid. -{damage} HP.',
    'The coat rack staged an ambush. -{damage} HP.',
    'Slipped on a freshly laminated memo. -{damage} HP.',
    'The desk plant had surprisingly sharp opinions. -{damage} HP.',
  ],
  server_room: [
    'A cable tray dropped its entire workload. -{damage} HP.',
    'Bumped into a very solid UPS. -{damage} HP.',
    'A loose drive sled found a toe. -{damage} HP.',
    'Caught a sleeve in a cooling fan. -{damage} HP.',
    'The raised floor became a lowered floor. -{damage} HP.',
    'A rack rail snapped back. -{damage} HP.',
    'Walked into a dangling patch panel. -{damage} HP.',
    'A backup tape stack gave way. -{damage} HP.',
    'Dropped a spare power supply. Onto a foot. -{damage} HP.',
    'The cable ties refused to negotiate. -{damage} HP.',
    'Knelt on a forgotten rack screw. -{damage} HP.',
    'A maintenance hatch closed unexpectedly. -{damage} HP.',
  ],
  cafeteria_depths: [
    'The wet-floor sign caused the fall. -{damage} HP.',
    'A tray stack collapsed at the worst moment. -{damage} HP.',
    'The toaster launched a warning shot. -{damage} HP.',
    'A freezer door clipped an elbow. -{damage} HP.',
    'Stepped on a fork. Business end up. -{damage} HP.',
    'The coffee urn had no chill. -{damage} HP.',
    'Lost footing in a puddle of custard. -{damage} HP.',
    'A bag of flour burst overhead. -{damage} HP.',
    'The vending machine returned a bruise. -{damage} HP.',
    'A swinging kitchen door landed first. -{damage} HP.',
    'The blender lid surrendered. -{damage} HP.',
    'Caught a rolling pin with a shin. -{damage} HP.',
  ],
}

const biomes: Record<string, BiomeNarrative> = Object.fromEntries(
  Object.entries(contentV3.narrative.biomes).map(([id, narrative]) => [id, {
    ...narrative,
    trapHit: [...narrative.trapHit, ...(extraMishaps[id] ?? [])],
    ...(id === 'office_cubicles' ? { trapHitCallbacks: {
      'Tripped over a loose cable. -{damage} HP.': 'Tripped over another loose cable. -{damage} HP.',
    } } : {}),
  }]),
)

export const contentV4: ContentCatalog = {
  ...contentV3,
  contentVersion: 'v4',
  narrative: { ...contentV3.narrative, biomes, avoidConsecutiveRepeats: true },
}
