import type { ContentCatalog } from '../sim/core/types'
import { contentV2 } from './v2'

/*
 * Content catalog v3 (D76): stances. A hero can choose how carefully it looks
 * after itself; each stance replaces the three sustain thresholds and scales
 * victory XP, so the careful hero pays for its safety with pace and the bold
 * one is paid for its knockouts. Fights, gold, narrative, gear and the bag
 * ladder are exactly v2 and owned items keep their meaning. Balanced mirrors
 * the v2 constants at 100% XP, so a hero that never chooses plays as before.
 */
export const contentV3: ContentCatalog = {
  ...contentV2,
  contentVersion: 'v3',
  stances: {
    cautious: { id: 'cautious', name: 'Cautious', blurb: 'Drinks early, rests early, heals up before heading back out. Learns a little less from each win.', autoPotionBelowPct: 65, restBelowPct: 50, resumeExploringAtPct: 90, victoryXpPct: 90 },
    balanced: { id: 'balanced', name: 'Balanced', blurb: 'The office standard.', autoPotionBelowPct: contentV2.constants.autoPotionBelowPct, restBelowPct: contentV2.constants.restBelowPct, resumeExploringAtPct: contentV2.constants.resumeExploringAtPct, victoryXpPct: 100 },
    bold: { id: 'bold', name: 'Bold', blurb: 'Saves potions, keeps exploring on low health, back out the moment it can stand. Learns more from each win.', autoPotionBelowPct: 35, restBelowPct: 20, resumeExploringAtPct: 60, victoryXpPct: 115 },
  },
}
