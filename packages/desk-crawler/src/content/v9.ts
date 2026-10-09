import type { ContentCatalog } from '../sim/core/types'
import { contentV8 } from './v8'

/*
 * Content catalog v9 (P31): the office to-do list. Every hero carries three
 * small tasks that progress while it explores and pay gold when ticked off.
 * The 07:00 stand-up refills finished slots only, at least 20 hours after the
 * last refill, and swaps a task left unfinished for two refills. Two of three
 * tasks are finishable where the hero stands. Generation draws only from the
 * new `quest` stream, so everything else is v8 and replays unchanged.
 *
 * Targets are sized so a typical exploring hero finishes a task in about 4 to
 * 16 hours (docs/evidence/quests.md); rewards are gold only, never XP.
 */
export const contentV9: ContentCatalog = {
  ...contentV8,
  contentVersion: 'v9',
  todo: {
    templates: [
      { kind: 'defeat_monster', label: 'Defeat {target} {monsters}', labelOne: 'Defeat a {monster}', target: { 1: { min: 2, max: 4 }, 2: { min: 2, max: 5 }, 3: { min: 2, max: 5 } } },
      { kind: 'defeat_any', label: 'Win {target} fights', labelOne: 'Win a fight', target: { 1: { min: 6, max: 14 }, 2: { min: 8, max: 18 }, 3: { min: 8, max: 20 } } },
      { kind: 'explore_biome', label: 'Explore the {biome} for {target} adventures', labelOne: 'Explore the {biome}', target: { 1: { min: 16, max: 40 }, 2: { min: 16, max: 40 }, 3: { min: 16, max: 40 } } },
      { kind: 'find_gear', label: 'Find {target} pieces of gear', labelOne: 'Find a piece of gear', target: { 1: { min: 1, max: 2 }, 2: { min: 1, max: 2 }, 3: { min: 1, max: 2 } } },
      { kind: 'earn_gold', label: 'Earn {target} gold adventuring', labelOne: 'Earn {target} gold adventuring', target: { 1: { min: 15, max: 40 }, 2: { min: 50, max: 140 }, 3: { min: 100, max: 260 } } },
      { kind: 'avoid_traps', label: 'Dodge {target} traps', labelOne: 'Dodge a trap', target: { 1: { min: 1, max: 1 }, 2: { min: 1, max: 2 }, 3: { min: 1, max: 2 } } },
      { kind: 'elite', label: 'Beat {target} elites', labelOne: 'Beat an elite', target: { 2: { min: 1, max: 1 }, 3: { min: 1, max: 1 } }, minLevel: 4 },
    ],
    rewardByTier: { 1: 5, 2: 16, 3: 30 },
    refillHour: 7,
    minRefillGapTicks: 80,
    staleAfterRefills: 2,
    awayPct: 34,
    monsterPlurals: {
      paper_imp: 'Paper Imps',
      rogue_roomba: 'Rogue Roombas',
      stapler_mimic: 'Stapler Mimics',
      dust_daemon: 'Dust Daemons',
      cable_serpent: 'Cable Serpents',
      overheated_rack: 'Overheated Racks',
      firewall_gremlin: 'Firewall Gremlins',
      legacy_mainframe: 'Legacy Mainframes',
      coffee_slime: 'Coffee Slimes',
      crumb_golem: 'Crumb Golems',
      microwave_wraith: 'Microwave Wraiths',
      leftovers_hydra: 'Leftovers Hydras',
    },
  },
}
